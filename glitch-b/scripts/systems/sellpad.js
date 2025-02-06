import { world, system } from '@minecraft/server';

const items = [
    { typeId: 'minecraft:diamond', price: 50 },
    { typeId: 'minecraft:emerald', price: 50 },
    { typeId: 'minecraft:diamond_block', price: 450 },  
    { typeId: 'minecraft:emerald_block', price: 450 },
    { typeId: 'minecraft:lapis_lazuli', price: 5 },
    { typeId: 'minecraft:stone', price: 1 },
    { typeId: 'minecraft:coal', price: 5 },
    { typeId: 'minecraft:coal_block', price: 50 },
    { typeId: 'minecraft:cobblestone', price: 1 }, 
    { typeId: 'minecraft:oak_log', price: 1 },
    { typeId: 'minecraft:raw_gold', price: 20 },
    { typeId: 'minecraft:gold_ingot', price: 35 },
    { typeId: 'minecraft:gold_block', price: 315 },
    { typeId: 'minecraft:raw_iron', price: 20 },
    { typeId: 'minecraft:iron_ingot', price: 35 },
    { typeId: 'minecraft:iron_block', price: 315 },
    { typeId: 'minecraft:redstone', price: 5 },
    { typeId: 'minecraft:redstone_block', price: 50 },
    { typeId: 'minecraft:ancient_debris', price: 75 },
    { typeId: 'minecraft:netherite_scrap', price: 100 },
    { typeId: 'minecraft:nethrite_ingot', price: 500 },
    { typeId: 'minecraft:nethrite_block', price: 4500 },
];

const sellBlockType1 = 'minecraft:beacon';

system.runInterval(checkSellBlock, 20);

function checkSellBlock() {
  world.getAllPlayers().forEach(player => {
      const blockBelow = player.dimension.getBlock({
          x: Math.floor(player.location.x),
          y: Math.floor(player.location.y) - 1,
          z: Math.floor(player.location.z)
      });

      if (blockBelow && blockBelow.typeId === sellBlockType1) {
          sell(player);
      }
  });
}

function sell(player) {
  const inv = inventory(player);
  inv.forEach(item => {
      const itemData = items.find(data => data.typeId === item.typeId);
      if (itemData) {
          const totalPrice = item.amount * itemData.price;
          const objective = 'Money';
          player.runCommand(`scoreboard players add @s ${objective} ${totalPrice}`);
          player.runCommand(`clear @s ${item.typeId} 0 ${item.amount}`);
          player.sendMessage(`§6You sold §f${item.amount} ${item.typeId.split(':')[1]} §6for §2${totalPrice}$!`);
      }
  });
}

function inventory(player) {
  const inv = player.getComponent('inventory').container;
  const itemObjects = Array.from({ length: 36 })
      .map((_, i) => inv.getItem(i))
      .filter(item => item)
      .map(item => ({ typeId: item.typeId, amount: item.amount }));
  return itemObjects;
}
