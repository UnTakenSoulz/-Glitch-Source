import { world, system } from "@minecraft/server";

const CHEST_X = 104, CHEST_Y = 64, CHEST_Z = 200; // Coordinates of the chest
const COOLDOWN_TIME = 20 * 1000; // 20 seconds in milliseconds

const cooldowns = new Map();

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const player = event.player;
    const block = event.block;

    if (block.typeId === "minecraft:chest" &&
        block.location.x === CHEST_X &&
        block.location.y === CHEST_Y &&
        block.location.z === CHEST_Z) {

        const lastUsed = cooldowns.get(player.name) || 0;
        const currentTime = Date.now();

        if (currentTime - lastUsed >= COOLDOWN_TIME) {
            player.runCommand(`give @s diamond 5`)
                .then(() => {
                    player.runCommand("playsound random.levelup @s");
                    player.sendMessage("§aYou received a 5x Diamond Daily Reward!");
                    player.runCommand(`setblock ${CHEST_X} ${CHEST_Y} ${CHEST_Z} chest replace`);
                })
                .catch((error) => {
                    console.error("Failed to give item:", error);
                    player.sendMessage("§cError: Could not give you the item!");
                });

            cooldowns.set(player.name, currentTime);
        } else {
            const timeLeft = Math.ceil((COOLDOWN_TIME - (currentTime - lastUsed)) / 1000);

            player.runCommand("playsound random.break @s");
            player.sendMessage(`§cYou must wait ${timeLeft} more seconds to use this daily rewards again!`);
        }
    }
});