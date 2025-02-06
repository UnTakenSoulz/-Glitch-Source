import { system, world } from "@minecraft/server";
 import { getScore, formatNumbers } from "./index.js"; 

if (!world.getDynamicProperty("realmcode")) {
    world.setDynamicProperty("realmcode", "N/A");
}

const serverName = "§0Glitch §dPvP";
const objectives = {
    kills: "Kills",
    money: "Money",
    deaths: "Death",
    hour: "hour",
    minute: "minute",
    second: "second",
    killstreak: "killstreak",
    cps: "cps",
};

const members = world.getDynamicProperty("memberCount") ?? 0;
const discordcode = world.getDynamicProperty("discordCode") ?? "N/A";

let last_ticks = Date.now();
let tps = 20;
let time_array = [];

system.runInterval(() => {
    if (time_array.length === 20) time_array.shift();
    time_array.push(Math.round((1000 / (Date.now() - last_ticks)) * 100) / 100);
    tps = Math.min(
        time_array.reduce((a, b) => a + b) / time_array.length,
        20
    );
    last_ticks = Date.now();
});

function kdrDisplay(kills, deaths) {
    if (deaths === 0) return "0.000";
    const kdr = (kills / deaths).toFixed(3);
    return isNaN(parseFloat(kdr)) ? "0.000" : kdr.toString();
}

function CreateScoreboard(player, playerCount) {
    const kills = getScore(player, objectives.kills);
    const deaths = getScore(player, objectives.deaths);
    const money = getScore(player, objectives.money);
    const hour = getScore(player, objectives.hour);
    const minute = getScore(player, objectives.minute);
    const second = getScore(player, objectives.second);
    const killstreak = getScore(player, objectives.killstreak);
    const cps = getScore(player, objectives.cps);
    const kdr = kdrDisplay(kills, deaths);

    let scoreboard = "";

    if (player.getDynamicProperty("scoreboardEnabled")) {
        const style = player.getDynamicProperty("scoreboardStyle");
        switch (style) {
            case "Normal":
                scoreboard = `\n        §l${serverName}§r\n§f  ${player.name}'s stats\n--------------------\n`;
                if (player.getDynamicProperty("KillsEnabled")) scoreboard += ` §l§bKills: §r${kills}\n`;
                if (player.getDynamicProperty("DeathsEnabled")) scoreboard += ` §l§4Deaths: §r${deaths}\n`;
                if (player.getDynamicProperty("MoneyEnabled")) scoreboard += ` §l§2Money: §r${formatNumbers(money, 3)}\n`;
                if (player.getDynamicProperty("TimeEnabled")) {
                    scoreboard += ` §l§6Time: §r${hour}H ${validate(minute)}M ${validate(second)}S\n`;
                }
                if (player.getDynamicProperty("KillstreakEnabled")) scoreboard += ` §l§mKillstreak: §r§4${killstreak}\n`;
                if (player.getDynamicProperty("cpsEnabled")) scoreboard += ` §l§fCPS: §r§7${cps}\n`;
                if (player.getDynamicProperty("kdrEnabled")) scoreboard += ` §l§1K/D: §r§b${kdr}\n`;

                scoreboard += `§r§f--------------------\n      §l§fServer Stats\n §l§5Code: §r${discordcode}\n §r§l§fPlayers Online: §r§7${playerCount}\n §l§7Global Members: §r§f${members}`;
                if (player.hasTag("operator")) {
                    scoreboard += `\n §l§5TPS: §r§d${tps.toFixed(2)}\n`;
                }
                break;

            default:
                scoreboard += "§cNo valid scoreboard style found!\n";
        }
    }
    return scoreboard;
}

function validate(number) {
    return number < 10 ? `0${number}` : number;
}




export { CreateScoreboard, kdrDisplay, validate };
