// Hero kits (SPEC 2.2, G12): melee, ranged ammo list (slot 2, press again cycles), specials (slot 3, press again cycles).
export const HEROES = {
  rowan: { name: 'Rowan', title: 'the Bladebound', melee: 'sword', ammo: ['boomerang', 'arrow', 'fireArrow', 'iceArrow'], specials: ['spin'], meleeCd: 0.30 },
  milo: { name: 'Milo', title: 'the Brawler', melee: 'fists', ammo: ['shellToss', 'fireFlower', 'frostFlower'], specials: ['spinDash', 'capeSwipe'], meleeCd: 0.20 },
  wren: { name: 'Wren', title: 'the Inkling', melee: 'roller', ammo: ['blaster', 'emberInk', 'frostInk', 'splatBomb'], specials: ['inkGatling'], meleeCd: 0.35 },
};
// Weapon look per tier: tint + size + badge (upgrades must LOOK different).
export const TIER_TINT = ['#c0c0c8', '#8ad04a', '#f0e060', '#40e0ff', '#ff90b0', '#50c050', '#a0c0ff', '#e0e0ff', '#ffd0ff'];
