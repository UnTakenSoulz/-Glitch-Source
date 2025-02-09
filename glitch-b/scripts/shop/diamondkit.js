import { world, system, ItemStack, ItemTypes, EquipmentSlot, ScoreboardIdentiy } from "@minecraft/server";

// All rights reserved @bluemods.lol - discord account. || Please report any bugs or glitches in our Discord server https://dsc.gg/bluemods

// Chest Coordinates
const CHEST_X = 102;
const CHEST_Y = 64;
const CHEST_Z = 200;

const KIT_PRICE = 100; // Price of the kit
const KIT_ITEMS = [
    { id: "minecraft:diamond_sword", count: 1 },
    { id: "minecraft:diamond_pickaxe", count: 1 },
    { id: "minecraft:diamond_helmet", count: 1, slot: EquipmentSlot.Head },
    { id: "minecraft:diamond_chestplate", count: 1, slot: EquipmentSlot.Chest },
    { id: "minecraft:diamond_leggings", count: 1, slot: EquipmentSlot.Legs },
    { id: "minecraft:diamond_boots", count: 1, slot: EquipmentSlot.Feet },
];

const MONEY_SCOREBOARD = "money";

system.runInterval(() => {
    if (!world.scoreboard.getObjective(MONEY_SCOREBOARD)) {
        world.scoreboard.addObjective(MONEY_SCOREBOARD, "Money");
    }
}, 20); // runs 1 second loop

world.afterEvents.playerJoin.subscribe((event) => {
    const player = event.player;
    const objective = world.scoreboard.getObjective(MONEY_SCOREBOARD);
    if (objective && player.scoreboardIdentity && objective.getScore(player.scoreboardIdentity) === undefined) {
        objective.setScore(player.scoreboardIdentity, 0);
    }
});

function getPlayerMoney(player) {
    if (!player) {
        console.warn("[Shop] Error: Player is undefined in getPlayerMoney().");
        return 0;
    }

    const objective = world.scoreboard.getObjective(MONEY_SCOREBOARD);
    if (!objective || !player.scoreboardIdentity) {
        return 0; // Return 0 if scoreboard or identity is missing
    }
    return objective.getScore(player.scoreboardIdentity) || 0;
}

function deductMoney(player, amount) {
    const objective = world.scoreboard.getObjective(MONEY_SCOREBOARD);
    if (!objective || !player.scoreboardIdentity) return; // Ensure valid scoreboard & player
    const current = getPlayerMoney(player);
    objective.setScore(player.scoreboardIdentity, Math.max(0, current - amount)); // Prevent negative balance
}

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;

    if (!player) {
        console.warn("[Shop] Error: Undefined player in interaction event.");
        return;
    }

    // Check if the player interacted with the correct chest
    if (
        block.location.x === CHEST_X &&
        block.location.y === CHEST_Y &&
        block.location.z === CHEST_Z
    ) {
        // Close the chest immediately
        player.runCommandAsync(`setblock ${CHEST_X} ${CHEST_Y} ${CHEST_Z} chest replace`);

        const balance = getPlayerMoney(player);

        if (balance >= KIT_PRICE) {
            const inventory = player.getComponent("minecraft:inventory")?.container;
            const equipment = player.getComponent("minecraft:equippable");

            if (inventory && equipment) {
                KIT_ITEMS.forEach(item => {
                    const itemStack = new ItemStack(ItemTypes.get(item.id), item.count);

                    // Auto-equip armor if slot is empty
                    if (item.slot !== undefined) {
                        const equippedItem = equipment.getEquipment(item.slot);
                        if (!equippedItem) {
                            equipment.setEquipment(item.slot, itemStack);
                            return;
                        }
                    }

                    inventory.addItem(itemStack);
                });
            }

            deductMoney(player, KIT_PRICE);

            player.sendMessage(`§aPurchased kit for ${KIT_PRICE} coins!`);
            player.runCommandAsync('playsound random.levelup @s');
        } else {
            player.sendMessage(`§cYou need ${KIT_PRICE - balance} more coins!`);
            player.runCommandAsync('playsound random.break @s');
        }
    }
});
