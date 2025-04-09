import { system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { showCompassUI } from "./scoreboard.js";

// Armor options
const ARMOR_OPTIONS = [
    { name: "Leather Armor", cost: 5000, texture: "textures/items/leather_chestplate", structure: "armor:leather" },
    { name: "Iron Armor", cost: 10000, texture: "textures/items/iron_chestplate", structure: "armor:iron" },
    { name: "Gold Armor", cost: 20000, texture: "textures/items/gold_chestplate", structure: "armor:gold" },
    { name: "Diamond Armor", cost: 50000, texture: "textures/items/diamond_chestplate", structure: "armor:diamond" },
    { name: "Netherite Armor", cost: 100000, texture: "textures/items/netherite_chestplate", structure: "armor:netherite" }
];

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getScore(player, objective) {
    try {
        return world.scoreboard.getObjective(objective).getScore(player);
    } catch {
        return 0;
    }
}

function deductMoney(player, amount) {
    try {
        const obj = world.scoreboard.getObjective("Money");
        const current = obj.getScore(player);
        obj.setScore(player, current - amount);
    } catch {}
}

export function ShopTestHandle(player) {
    const form = new ActionFormData()
        .title("§l§dGlitch §0| §aShopping Menu")
        .body("Choose an option:");

    ARMOR_OPTIONS.forEach(opt =>
        form.button(`§f${opt.name}\n§7[ §2$§a${formatNumber(opt.cost)} §7]`, opt.texture)
    );
    form.button("§cBack", "textures/ui/arrow_left");

    form.show(player).then(response => {
        if (response.canceled) return;

        if (response.selection === ARMOR_OPTIONS.length) {
            showCompassUI(player);
            return;
        }

        const selected = ARMOR_OPTIONS[response.selection];
        ConformationHandle(player, selected);
    }).catch(error => {
        console.error("Failed to show shop menu:", error);
    });
}

function ConformationHandle(player, option) {
    const money = getScore(player, "Money");

    const preview = new ActionFormData()
        .title("§l§aConfirm Purchase")
        .body(
            `§7You're about to purchase:\n\n` +
            `§e${option.name}\n§7Cost: §a$${formatNumber(option.cost)}\n\n` +
            `§7Your balance: §a$${formatNumber(money)}\n\n` +
            `Proceed with this purchase?`
        )
        .button("§aConfirm", "textures/ui/confirm")
        .button("§cCancel", "textures/ui/cancel");

    preview.show(player).then(res => {
        if (res.canceled || res.selection === 1) return;

        if (money < option.cost) {
            player.sendMessage("§cYou don't have enough money!");
            return;
        }

        player.runCommand(`structure load ${option.structure} ~ ~1 ~`);
        deductMoney(player, option.cost);
        player.sendMessage(`§aYou purchased §e${option.name}§a for §2$§a${formatNumber(option.cost)}!`);
    }).catch(err => {
        console.error("Failed to show confirmation panel:", err);
    });
}
