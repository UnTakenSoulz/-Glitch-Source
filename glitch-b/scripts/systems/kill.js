// Script example for ScriptAPI
// Author: JaylyDev <https://github.com/JaylyDev>
// Project: https://github.com/JaylyDev/ScriptAPI
import { world, Player, EntityHealthComponent } from "@minecraft/server";

const overworld = world.getDimension("overworld"),
  nether = world.getDimension("nether"),
  end = world.getDimension("the end");

overworld
  .runCommandAsync("scoreboard objectives add Deaths dummy")
  .catch((error) => console.warn(error));
overworld
  .runCommandAsync("scoreboard objectives add Kills dummy")
  .catch((error) => console.warn(error));
  overworld
  .runCommandAsync("scoreboard objectives add killstreak dummy")
  .catch((error) => console.warn(error));
world.afterEvents.entityHurt.subscribe(
  ({ hurtEntity, damageSource }) => {
    /** @type {EntityHealthComponent} */
    // @ts-ignore
    const health = hurtEntity.getComponent("health");
    if (health.currentValue > 0) return;
    hurtEntity.runCommandAsync("scoreboard players add @s Deaths 1");
    if (health.currentValue > 0) return;
    hurtEntity.runCommandAsync("scoreboard players set @s killstreak 0");
    if (!(damageSource.damagingEntity instanceof Player)) return;
    damageSource.damagingEntity.runCommandAsync("scoreboard players add @s Kills 1");
    if (!(damageSource.damagingEntity instanceof Player)) return;
    damageSource.damagingEntity.runCommandAsync("scoreboard players add @s killstreak 1");

  },
    
);