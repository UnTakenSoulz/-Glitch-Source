import { world, system, ItemStack, MinecraftItemTypes } from "@minecraft/server";


const chestCooldowns = new Map();
const COOLDOWN_TIME = 30 * 1000;

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const  player = event.player;
    const  block = event.block; 
    const  playerId = player.name; 


    const chestX = 100, chestY = 64, chestZ = 200;

 

    if (block.typeId === "minecraft:chest" &&
        block.location.x === chestX &&
        block.location.y === chestY &&
        block.location.z === chestZ) {

           const lastUsed = chestCooldowns.get(playerId) || 0;
           const currentTime = Date.now();
    

            if (currentTime - lastUsed >= COOLDOWN_TIME) {
              
                const sword = new ItemStack(MinecraftItemTypes.diamondSword, 1);
                
            player.getComponent("inventory").container.addItem(sword);
            player.sendMessage("§aYou received the Starter Kit!");


            chestCooldowns.set(playerId, currentTime);
        } else {
            const timeLeft = Math.ceil((COOLDOWN_TIME - (currentTime - lastUsed)) / 1000);
            player.sendMessage(`§cYou must wait ${timeLeft} more seconds to use this chest again!`);
        }
    }
});