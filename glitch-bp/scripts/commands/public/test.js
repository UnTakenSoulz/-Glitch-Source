import { world, system } from "@minecraft/server";
import { Command } from "../CommandHandler.js";
import main from "../config.js";

Command.register({
    name: "test",
    description: "dummy command",
    aliases: [],   
    // <- (remove if the command is for admin) | permission: (player) => player.hasTag(main.adminTag),
}, async (data) => {
    // Start Editing Here
    player.sendMessage(`Successfully Executed`);
    player.runCommandAsync(`playsound random.levelup`);
});
