import { system, world } from "@minecraft/server";
import { getRank } from "./ranks.js";
import { ShopTestHandle } from "./shop.js";

// Scoreboard Objectives
export const objectives = {
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

export default objectives;

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


//
// Compass Panels
//

import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import main from "../commands/config.js";

world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;

    if (itemStack.typeId === "glitch:itemui" && source?.typeId === "minecraft:player") {
        showCompassUI(source);
        source.playSound("note.bell", { pitch: 1, volume: 0.4 });
    }
});

export function showCompassUI(player) {
    const form = new ActionFormData()
        .title("§l§dGlitch §0| §aPlayer Menu")
        .body("Choose an option:");

    form.button("Profile", "textures/items/book_portfolio")
        .button("Warp Area", "textures/ui/conduit_power_effect")
        .button("TPA", "textures/ui/FriendsIcon")
        .button("Server Info", "textures/ui/mashup_world");
    
    if (player.hasTag(main.adminTag)) {
        form.button("Shop Testing", "textures/items/gold_pickaxe");
    }
    
    form.show(player).then((response) => {
        if (response.canceled) return;

        switch (response.selection) {
            case 0:
                ProfileHandle(player);
                break;
            case 1:
                WarpHandle(player);
                break;
            case 2:
                PVPHandle(player);
                player.playSound("random.break", { pitch: 1, volume: 0.4 });
                break;
            case 3:
                ServerInfoHandle(player);
                break;
            case 4:
                ShopTestHandle(player);
                break;
        }
    }).catch((error) => {
        console.error("§7[§c-§7] §rFailed to show compass panel:§c", error);
    });
}

function ProfileHandle(player) {
    const rank = getRank(player);
    const money = formatNumber(getScore(player, objectives.money));
    const kills = getScore(player, objectives.kills);
    const deaths = getScore(player, objectives.deaths);
    const killstreak = getScore(player, objectives.killstreak);
    const kdr = getScore(player, objectives.kdr);
    const kdrd = getScore(player, objectives.kdrd);
    const online = getScore(player, objectives.online);

    const form = new ActionFormData()
        .title("§l§dGlitch §0| §aStatistics")
        .body(
            `§f================================\n` +
            `§l§aPlayer Status:\n\n` +
            `§l§i|§r §5IGN: §f${player.name}\n` +
            `§l§i|§r §9Rank: §b${rank}\n` +
            `§l§i|§r §5Money: §a$${money}\n` +
            `§l§i|§r §9Kills: §f${kills}\n` +
            `§l§i|§r §5Deaths: §f${deaths}\n` +
            `§l§i|§r §9Killstreak: §f${killstreak}\n` +
            `§l§i|§r §5K/D: §f[${kdr}] [${kdrd}]\n` +
            `\n\n§f================================`
        );

    form.button("§cBack", "textures/ui/arrow_left");

    form.show(player).then(response => {
        if (response.canceled) return;

        switch (response.selection) {
            case 0:
                showCompassUI(player);
                break;
        }
    }).catch(error => {
        console.error("§7[§c-§7] §rFailed to show profile panel:§c", error);
    });
}

//
// Warp Handling Systems
//

function WarpHandle(player) {
    const form = new ActionFormData()
        .title("§l§dGlitch §0| §aWarps Menu")
        .body("Choose an option:");

    form.button("Spawn", "textures/ui/conduit_power_effect")
        .button("Shop", "textures/ui/MCoin")
        .button("Mining Area", "textures/items/diamond_pickaxe")
        .button("Kit Opener", "textures/items/shulker_top_lime")
        .button("Coming Soon", "textures/ui/missing_item")
        .button("§cBack", "textures/ui/arrow_left");
        
    form.show(player).then((response) => {
        if (response.canceled) return;

        switch (response.selection) {
            case 0:
                SpawnHandle(player);
                break;
            case 1:
                ShopHandle(player);
                break;
            case 2:
                MiningHandle(player);
                break;
            case 3:
                WarpHandle(player);
                player.playSound("random.break", { pitch: 1, volume: 0.4 });
                break;
            case 4:
                WarpHandle(player)
                player.playSound("random.break", { pitch: 1, volume: 0.4 });
                break;
            case 5:
                showCompassUI(player);
                break;
        }
    }).catch((error) => {
        console.error("§7[§c-§7] §rFailed to show warp panel:§c", error);
    });
}

function SpawnHandle(player) {
    const startPos = player.location;
    let countdown = 5;

    const id = system.runInterval(() => {
        const currentPos = player.location;

        if (
            Math.floor(currentPos.x) !== Math.floor(startPos.x) ||
            Math.floor(currentPos.y) !== Math.floor(startPos.y) ||
            Math.floor(currentPos.z) !== Math.floor(startPos.z)
        ) {
            player.sendMessage("§cTeleport cancelled because you moved.");
            player.playSound("random.break", { pitch: 1, volume: 0.4 });
            system.clearRun(id);
            return;
        }

        if (countdown > 0) {
            player.sendMessage(`§aTeleporting in §e${countdown}§a...`);
            player.playSound("note.pling", { pitch: 1, volume: 0.4 });
            countdown--;
        } else {
            player.runCommand("tp @s 0 100 0"); 
            player.sendMessage("§aSuccesfully teleported to Spawn");
            player.playSound("random.levelup", { pitch: 1, volume: 0.4 });
            system.clearRun(id);
        }
    }, 20); 
}

function ShopHandle(player) {
    const startPos = player.location;
    let countdown = 5;

    const id = system.runInterval(() => {
        const currentPos = player.location;

        if (
            Math.floor(currentPos.x) !== Math.floor(startPos.x) ||
            Math.floor(currentPos.y) !== Math.floor(startPos.y) ||
            Math.floor(currentPos.z) !== Math.floor(startPos.z)
        ) {
            player.sendMessage("§cTeleport cancelled because you moved.");
            player.playSound("random.break", { pitch: 1, volume: 0.4 });
            system.clearRun(id);
            return;
        }

        if (countdown > 0) {
            player.sendMessage(`§aTeleporting in §e${countdown}§a...`);
            player.playSound("note.pling", { pitch: 1, volume: 0.4 });
            countdown--;
        } else {
            player.runCommand("tp @s 0 100 0"); 
            player.sendMessage("§aSuccesfully teleported to Shop");
            player.playSound("random.levelup", { pitch: 1, volume: 0.4 });
            system.clearRun(id);
        }
    }, 20);
}

function MiningHandle(player) {
    const startPos = player.location;
    let countdown = 5;

    const radius = 25;
    const center = { x: -16.67, y: -52.00, z: -489.06 };

    const id = system.runInterval(() => {
        const currentPos = player.location;

        if (
            Math.floor(currentPos.x) !== Math.floor(startPos.x) ||
            Math.floor(currentPos.y) !== Math.floor(startPos.y) ||
            Math.floor(currentPos.z) !== Math.floor(startPos.z)
        ) {
            player.sendMessage("§cTeleport cancelled because you moved.");
            player.playSound("random.break", { pitch: 1, volume: 0.4 });
            system.clearRun(id);
            return;
        }

        if (countdown > 0) {
            player.sendMessage(`§aTeleporting in §e${countdown}§a...`);
            player.playSound("note.pling", { pitch: 1, volume: 0.4 });
            countdown--;
        } else {
            const offsetX = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            const offsetZ = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            const finalX = center.x + offsetX;
            const finalZ = center.z + offsetZ;

            player.runCommand(`tp @s ${finalX.toFixed(2)} ${center.y} ${finalZ.toFixed(2)}`);
            player.sendMessage("§aSuccessfully teleported to the Mining Area!");
            player.playSound("random.levelup", { pitch: 1, volume: 0.4 });
            system.clearRun(id);
        }
    }, 20);
}