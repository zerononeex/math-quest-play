import { CONFIG } from '../config.js';

// Canon gear names (SPEC 2.12). Ids: wpn-<hero>-<tier>, helmet-<tier>, chest-<tier>, boots-<tier> (tier 1–8; 9 = Dawnbreaker / Golden Star Tunic).
export const WEAPON_NAMES = {
  rowan: ['Sprout Sword', 'Bounce Blade', 'Neon Blade', 'Sugar Saber', 'Vine Sword', 'Dewblade', 'Skybrand', 'Starbrand'],
  milo: ['Sprout Gloves', 'Bounce Gloves', 'Neon Gloves', 'Sugar Gloves', 'Vine Wraps', 'Dew Gloves', 'Skyfists', 'Starforged Gloves'],
  wren: ['Sprout Roller', 'Bounce Roller', 'Neon Roller', 'Sugar Roller', 'Vine Roller', 'Dew Roller', 'Skyroller', 'Stellar Roller'],
};
export const ARMOR_NAMES = {
  helmet: ['Leaf Cap', 'Plip Cap', 'Reef Helm', 'Cherry Helm', 'Totem Helm', 'Acorn Helm', 'Gale Helm', 'Nova Helm'],
  chest: ['Bark Vest', 'Bop Vest', 'Tide Vest', 'Cream Vest', 'Jungle Vest', 'Petal Vest', 'Aether Vest', 'Cosmos Vest'],
  boots: ['Moss Boots', 'Spring Boots', 'Splash Boots', 'Gumdrop Boots', 'Pounce Boots', 'Sprout Boots', 'Cloud Boots', 'Comet Boots'],
};
export const DAWNBREAKER_FORMS = { rowan: 'Starforged Blade', milo: 'Starforged Fists', wren: 'Starforged Roller' };

export function slug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

export function gearTier(id) { const m = id && /-(\d+)$/.exec(id); return m ? Number(m[1]) : 0; }

// Icon for an equipped weapon id → { sheet, frame } in icons-weapons-a (tiers 1–4) / -b (5–8).
// [R2-19] the user's icon for a gear id → [sheet, frame] (null = no art: the caller draws its code fallback)
export function gearIcon(id) {
  const g = GEAR[id]; if (!g) return null;
  if (g.slot === 'weapon') { const w = weaponIcon(g.hero, g.id); return w && [w.sheet, w.frame]; }
  if (g.tier > 8) return ['icons-items', 'golden-star-tunic'];
  return [g.tier <= 4 ? 'icons-armor-a' : 'icons-armor-b', slug(ARMOR_NAMES[g.slot][g.tier - 1])];
}
export function weaponIcon(hero, id) {
  const t = gearTier(id);
  if (t >= 9) return { sheet: 'relics', frame: 'dawnbreaker-the-starforged-blade' };
  if (t < 1) return null;
  return { sheet: t <= 4 ? 'icons-weapons-a' : 'icons-weapons-b', frame: slug(WEAPON_NAMES[hero][t - 1]) };
}

// ---- catalog: 24 weapons + 24 armor + Dawnbreaker (tier 9, per-hero form) + Golden Star Tunic (chest tier 9, D14) ----

const G = CONFIG.GEAR;
function buildCatalog() {
  const out = {};
  for (let t = 1; t <= 8; t++) {
    const price = G.PRICES[t - 1];
    for (const hero of ['rowan', 'milo', 'wren']) out[`wpn-${hero}-${t}`] = { id: `wpn-${hero}-${t}`, slot: 'weapon', hero, tier: t, name: WEAPON_NAMES[hero][t - 1], price: price.weapon, str: G.WEAPON_STR[t - 1] };
    out[`helmet-${t}`] = { id: `helmet-${t}`, slot: 'helmet', tier: t, name: ARMOR_NAMES.helmet[t - 1], price: price.helmet, def: G.HELMET_DEF[t - 1] };
    out[`chest-${t}`] = { id: `chest-${t}`, slot: 'chest', tier: t, name: ARMOR_NAMES.chest[t - 1], price: price.chest, hearts: G.CHEST_HEARTS[t - 1], def: G.CHEST_DEF[t - 1] };
    out[`boots-${t}`] = { id: `boots-${t}`, slot: 'boots', tier: t, name: ARMOR_NAMES.boots[t - 1], price: price.boots, ap: G.BOOTS_AP[t - 1], luck: G.BOOTS_LUCK[t - 1] };
  }
  for (const hero of ['rowan', 'milo', 'wren']) out[`wpn-${hero}-9`] = { id: `wpn-${hero}-9`, slot: 'weapon', hero, tier: 9, name: DAWNBREAKER_FORMS[hero], unique: true, price: 0, str: G.DAWNBREAKER.str, hearts: G.DAWNBREAKER.hearts };
  out['chest-9'] = { id: 'chest-9', slot: 'chest', tier: 9, name: 'Golden Star Tunic', unique: true, price: 0, str: G.GOLDEN_STAR_TUNIC.str, hearts: G.GOLDEN_STAR_TUNIC.hearts };
  return out;
}
export const GEAR = buildCatalog();
export const SLOTS = ['weapon', 'helmet', 'chest', 'boots'];
