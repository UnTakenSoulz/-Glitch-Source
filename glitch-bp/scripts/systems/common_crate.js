import { world, ItemStack, system } from "@minecraft/server";

const lootTable = [
    { id: "minecraft:diamond", amount: 1, chance: 5 },      // 5% chance
    { id: "minecraft:iron_ingot", amount: 3, chance: 25 },  // 25% chance
    { id: "minecraft:gold_ingot", amount: 5, chance: 40 },  // 40% chance
    { id: "minecraft:emerald", amount: 2, chance: 15 },     // 15% chance
    { id: "minecraft:apple", amount: 10, chance: 15 }       // 15% chance
];

const targetChestLocation = { x: 0, y: -54, z: 0 };
const requiredItem = "item.myname:common_key";
const requiredName = "Special Key";

function spawnFirework(dimension, location) {
    const firework = dimension.spawnEntity("fireworks_rocket", location);
    firework.nameTag = "Crate Celebration";
    system.runTimeout(() => firework.triggerEvent("explode"), 5);
}

async function resetChest(dimension, location) {
    const { x, y, z } = location;
    await dimension.runCommand(`setblock ${x} ${y} ${z} minecraft:air`);
    await dimension.runCommand(`setblock ${x} ${y} ${z} minecraft:chest`);
}

function giveRandomLoot(player) {
    const container = player.getComponent("inventory").container;
    
    // Calculate total weight
    const totalWeight = lootTable.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalWeight;
    
    // Find selected loot
    let selectedLoot;
    for (const item of lootTable) {
        random -= item.chance;
        if (random < 0) {
            selectedLoot = item;
            break;
        }
    }
    
    // Create item stack
    const itemStack = new ItemStack(selectedLoot.id, selectedLoot.amount);
    
    // Try to add to inventory
    const leftover = container.addItem(itemStack);
    if (leftover) {
        player.sendMessage("§4[!] §cInventory full! Clear space and try again.");
        world.playSound("block.anvil.land", player.location);
        return false;
    }
    return true;
}

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const { block, player } = event;
    const { x, y, z } = block.location;
    
    // Check if interacting with target chest
    if (block.typeId !== "minecraft:chest" || 
        !Object.entries(targetChestLocation).every(([coord, val]) => block.location[coord] === val)) {
        return;
    }

    const container = player.getComponent("inventory").container;
    let keySlot = -1;

    // Search for required key
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === requiredItem && item.nameTag === requiredName) {
            keySlot = i;
            break;
        }
    }

    // Always reset chest after interaction
    system.run(async () => {
        await resetChest(block.dimension, block.location);
    });

    if (keySlot === -1) {
        player.sendMessage("§4[!] §cAccess Denied! Required: §6Special Key");
        world.playSound("mob.enderdragon.growl", player.location);
        return;
    }

    // Attempt to give loot
    if (!giveRandomLoot(player)) return;

    // Remove key
    const keyStack = container.getItem(keySlot);
    if (keyStack.amount > 1) {
        keyStack.amount--;
        container.setItem(keySlot, keyStack);
    } else {
        container.setItem(keySlot, undefined);
    }

    // Success effects
    system.run(() => {
        spawnFirework(block.dimension, block.location);
        world.sendMessage(`§6★ ${player.name} §ahas unlocked a special crate!`);
        world.playSound("firework.launch", block.location);
    });
});

console.log("Premium Crate System Activated!");