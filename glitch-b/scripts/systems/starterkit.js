import { world, system, ItemStack, EntityInventoryComponent } from "@minecraft/server";

// Map to store cooldowns for each player
const chestCooldowns = new Map();
const COOLDOWN_TIME = 30 * 1000; // 30 seconds in milliseconds

// Subscribe to the playerInteractWithBlock event
world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const player = event.player;
    const block = event.block;
    const playerId = player.name;

    // Define the coordinates of the chest
    const chestX = 100, chestY = 64, chestZ = 200;

    // Check if the interacted block is the specific chest
    if (block.typeId === "minecraft:chest" &&
        block.location.x === chestX &&
        block.location.y === chestY &&
        block.location.z === chestZ) {

        // Get the last time the player used the chest
        const lastUsed = chestCooldowns.get(playerId) || 0;
        const currentTime = Date.now();

        // Check if the cooldown has expired
        if (currentTime - lastUsed >= COOLDOWN_TIME) {
            // Create a diamond sword item using the item type ID
            const sword = new ItemStack("minecraft:diamond_sword", 1);

            // Add the sword to the player's inventory
            const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
            if (inventory) {
                inventory.addItem(sword);
                player.sendMessage("§aYou received the Starter Kit!");
            } else {
                console.error("Failed to access player inventory.");
            }

            // Update the cooldown time for the player
            chestCooldowns.set(playerId, currentTime);
        } else {
            // Calculate the remaining cooldown time
            const timeLeft = Math.ceil((COOLDOWN_TIME - (currentTime - lastUsed)) / 1000);
            player.sendMessage(`§cYou must wait ${timeLeft} more seconds to use this chest again!`);
        }
    }
});