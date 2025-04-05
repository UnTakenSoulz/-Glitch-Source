import { system, world } from "@minecraft/server";
import { getRank } from "./ranks.js";

// Scoreboard Objectives
const objectives = {
    money: "Money",
    kills: "Kills",
    deaths: "Deaths",
    killstreak: "KS",
    kdr: "KDR",
    kdrd: "KDRD",
    hours: "H",
    minutes: "M",
    seconds: "S",
    online: "Online",
};

// Maximum money limit (prevents negative money)
const MONEY_LIMIT = 2_147_483_647;

// Function to Format Large Numbers
function formatNumber(value) {
    if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + "B";
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + "K";
    return value.toString();
}

// Initialize Scoreboards if Not Exists
system.run(() => {
    Object.values(objectives).forEach(obj => {
        if (!world.scoreboard.getObjective(obj)) {
            world.scoreboard.addObjective(obj, obj);
        }
    });
});

// Increase Score (Prevents Exceeding Money Limit & Adds Warning)
function increaseScore(player, objective, amount = 1) {
    if (!player.scoreboardIdentity) {
        console.warn(`Scoreboard identity for player ${player.name} is not available. Retrying...`);
        system.runTimeout(() => increaseScore(player, objective, amount), 20); // Retry after 1 second (20 ticks)
        return;
    }

    if (objective === objectives.money) {
        let currentMoney = getScore(player, objectives.money);

        if (currentMoney >= MONEY_LIMIT) {
            player.sendMessage(`§cWarning! Your balance is at the maximum limit ($${formatNumber(MONEY_LIMIT)}). You must spend or remove money before earning more.`);
            return;
        }

        let newMoney = currentMoney + amount;

        if (newMoney > MONEY_LIMIT) {
            newMoney = MONEY_LIMIT;
            player.sendMessage(`§cYou have reached the maximum balance of $${formatNumber(MONEY_LIMIT)}. You cannot earn more until you spend some money.`);
        }

        setScore(player, objectives.money, newMoney);
    } else {
        setScore(player, objective, getScore(player, objective) + amount);
    }
}

// Set Score on Scoreboard (Prevents Exceeding Money Limit & Fixes Reset Issue)
function setScore(player, objective, value) {
    if (!player.scoreboardIdentity) {
        console.warn(`Scoreboard identity for player ${player.name} is not available. Retrying...`);
        system.runTimeout(() => setScore(player, objective, value), 20); // Retry after 1 second (20 ticks)
        return;
    }

    if (objective === objectives.money) {
        if (value > MONEY_LIMIT) {
            value = MONEY_LIMIT;
            player.sendMessage(`§cYour balance is now at the maximum limit ($${formatNumber(MONEY_LIMIT)}). You must spend or remove money before earning more.`);
        } else if (value < 0) {
            value = 0;
        }
    }

    const obj = world.scoreboard.getObjective(objective);
    if (obj) obj.setScore(player.scoreboardIdentity, value);
}

// Ensure Money Stays Within Limit (Even When Using Commands)
system.runInterval(() => {
    world.getPlayers().forEach(player => {
        let money = getScore(player, objectives.money);
        if (money > MONEY_LIMIT) {
            setScore(player, objectives.money, MONEY_LIMIT);
        } else if (money < 0) {
            setScore(player, objectives.money, 0);
        }
    });
}, 5);

// Set Default Score to 0 When Player Joins
system.runInterval(() => {
    const overworld = world.getDimension("overworld");

    Object.values(objectives).forEach(objective => {
        overworld.runCommand(`scoreboard players add @a ${objective} 0`);
    });
}, 100);

// Get Score from Scoreboard (Returns 0 if Undefined)
function getScore(player, objective) {
    if (!player.scoreboardIdentity) {
        console.warn(`Scoreboard identity for player ${player.name} is not available. Retrying...`);
        return 0; // Return 0 temporarily and retry later if needed
    }

    const obj = world.scoreboard.getObjective(objective);
    return obj && player.scoreboardIdentity ? obj.getScore(player.scoreboardIdentity) ?? 0 : 0;
}

// Handle Killstreak
world.afterEvents.entityDie.subscribe(event => {
    const { damageSource, deadEntity } = event;

    // Ensure damageSource and damagingEntity exist
    if (!damageSource || !damageSource.damagingEntity) return;

    const killer = damageSource.damagingEntity;

    if (killer.typeId !== "minecraft:player") return;
    if (deadEntity.typeId !== "minecraft:player") return;

    // Increase killer's kills and killstreak
    increaseScore(killer, objectives.kills);
    increaseScore(killer, objectives.killstreak);

    // Calculate KDR (Kill-to-Death Ratio)
    const kills = getScore(killer, objectives.kills);
    const deaths = getScore(killer, objectives.deaths) || 1; // Avoid division by zero
    const kdr = (kills / deaths).toFixed(3); // Ensure a 3-decimal format

    setScore(killer, objectives.kdr, Math.floor(kdr)); // Store whole number
    setScore(killer, objectives.kdrd, Math.round((kdr % 1) * 1000)); // Store decimal separately

    // Reset dead player's killstreak and increase their deaths
    setScore(deadEntity, objectives.killstreak, 0);
    increaseScore(deadEntity, objectives.deaths);
});

// Time Tracking (Only While Online)
system.runInterval(() => {
    world.getPlayers().forEach(player => {
        increaseScore(player, objectives.seconds);

        if (getScore(player, objectives.seconds) >= 60) {
            setScore(player, objectives.seconds, 0);
            increaseScore(player, objectives.minutes);
        }

        if (getScore(player, objectives.minutes) >= 60) {
            setScore(player, objectives.minutes, 0);
            increaseScore(player, objectives.hours);
        }
    });
}, 20);

// Online Players Update  
system.runInterval(() => {  
    const onlinePlayers = world.getPlayers().length;  
    world.getPlayers().forEach(player => {  
        setScore(player, objectives.online, onlinePlayers);  
    });  
}, 20);

// Auto `/titleraw` Update
system.runInterval(() => {
    world.getPlayers().forEach(player => {
        const rank = getRank(player);
        const money = formatNumber(getScore(player, objectives.money));

        const statsJSON = {
            "rawtext": [
                { "text": `\n\n§9Player Stats:\n` },
                { "text": `§l§i|§r §5IGN: §f` }, { "selector": "@s" }, { "text": `\n` },
                { "text": `§l§i|§r §9Rank: §b${rank}\n` },
                { "text": `§l§i|§r §5Money: §a$${money}\n` },
                { "text": `§l§i|§r §9Kills: §f` }, { "score": { "name": "@s", "objective": objectives.kills } }, { "text": `\n` },
                { "text": `§l§i|§r §5Deaths: §f` }, { "score": { "name": "@s", "objective": objectives.deaths } }, { "text": `\n` },
                { "text": `§l§i|§r §9Killstreak: §f` }, { "score": { "name": "@s", "objective": objectives.killstreak } }, { "text": `\n` },
                { "text": `§l§i|§r §5K/D: §f[` }, { "score": { "name": "@s", "objective": objectives.kdr } }, { "text": "] [" }, { "score": { "name": "@s", "objective": objectives.kdrd } }, { "text": `]\n` },
                { "text": `§l§i|§r §9Time: §5H: §f` }, { "score": { "name": "@s", "objective": objectives.hours } }, { "text": ` §5M: §f` }, { "score": { "name": "@s", "objective": objectives.minutes } }, { "text": ` §5S: §f` }, { "score": { "name": "@s", "objective": objectives.seconds } }, { "text": `\n\n` },
                { "text": `§9Server Info:\n` },
                { "text": `§l§i|§r §5Online: §f` }, { "score": { "name": "@s", "objective": objectives.online } }, { "text": `/11\n` },
                { "text": `§l§i|§r §9Discord: §fe4pAc2J4e6\n` },
                { "text": `§l§i|§r §5Realm: §fD6WisWH4c4xqh9A\n\n` }
            ]
        };

        player.runCommand(`titleraw @s title ${JSON.stringify(statsJSON)}`);
    });
}, 1);
