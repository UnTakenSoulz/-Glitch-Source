import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import main from "../commands/config.js";

// Compass UI | Item

world.afterEvents.itemUse.subscribe((event) => {
    const { itemStack, source } = event;

    if (itemStack.typeId === "minecraft:compass" && source?.typeId === "minecraft:player") {
        showCompassUI(source);
        source.runCommandAsync(`playsound note.pling @s`);
    }
});

// Compass UI Panels 

function showCompassUI(player) {
    const form = new ActionFormData()
        .title("§l§bBlueMods §7| §aPlayer Menu")
        .body("Choose an option:");

    form.button("Spawn", "textures/items/lodestonecompass_item")
        .button("Teleport Request", "textures/items/ender_pearl")
        .button("RTP", "textures/items/redstone_dust")
        .button("Homes", "textures/items/bed_red")
        .button("About Addon", "textures/ui/icon_fall");

    if (player.hasTag("admin")) {
        form.button("Moderation Panel", "textures/ui/dev_glyph_color")
        form.button("Operator Panel", "textures/ui/dev_glyph_color")
        form.button("Modules", "textures/ui/icon_book_writable");
    }

    form.show(player).then((response) => {
        if (response.canceled) return;

        switch (response.selection) {
            case 0:
                handleSpawn(player);
                player.runCommandAsync('playsound note.pling @s');
                break;
            case 1:
                if (!isAuthorized(player, "!tpa")) return;
                    showTeleportRequestForm(player);
                    player.runCommandAsync('playsound note.pling @s');
                break;
            case 2:
                if (!isAuthorized(player, "!rtp")) return;
                    handleRTP(player);
                    player.runCommandAsync('playsound note.pling @s');
                break;
            case 3:
                if (!isAuthorized(player, "!home")) return;
                    homeForm(player);
                    player.runCommandAsync('playsound note.pling @s');
                break;
            case 4:
                AboutForm(player);
                player.runCommandAsync('playsound note.pling @s');
                break;
            case 5:
                if (player.hasTag("admin")) {
                    ModerationPanel(player);
                    player.runCommandAsync('playsound note.pling @s');
                }
                break;
            case 6:
                if (player.hasTag("admin")) {
                    OperatorPanel(player);
                    player.runCommandAsync('playsound note.pling @s');
                }
                break;
            case 7:
                if (player.hasTag("admin")) {
                    ModulesPanel(player);
                    player.runCommandAsync("playsound note.pling @s");
                }
                break;
        }
    }).catch((error) => {
        console.error("Failed to compass ui form:", error);
    });
}
