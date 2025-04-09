import { system, world } from "@minecraft/server";
import main from "../commands/config.js"

// All rights reserved @bluemods.lol - discord account. | Please report any bugs or glitches in our discord server https://dsc.gg/bluemods

function getRank(player) {
    const tags = player.getTags();
    const rankTag = tags.find(tag => tag.startsWith("rank:"));
    return rankTag ? rankTag.replace("rank:", "") : "§6Member"; // Default to "Member" if no rank is found
}

function formatChatMessage(player, message) {
    const rank = getRank(player); // Get player's rank from tags

    return `§l§7<§r${rank}§l§7>§r§7 ${player.nameTag} §l§b»§r §f${message}`;
}

function chat(data) {
    const player = data.sender;
    const message = data.message;

    const chatMessage = formatChatMessage(player, message);
    system.run(() => world.getDimension("overworld").runCommand(`tellraw @a {"rawtext":[{"translate":${JSON.stringify(chatMessage)}}]}`));
    
    data.cancel = true;
}

system.runInterval(() => {
    system.run(() => world.getDimension("overworld").runCommand(`scoreboard players reset @a Sents`));
}, 6000);

world.beforeEvents.chatSend.subscribe((data) => {
    if (!data.message.startsWith(main.prefix)) {
        chat(data);
    }
});

export { getRank };