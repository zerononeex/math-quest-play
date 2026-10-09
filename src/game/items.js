// Consumables (G13): Potion +3 hearts (carry 5, 10×world gold), Bombs (need Bomb Bag, carry 20, 5 for 8×world).
// V cycles the selected item (consumables + active tools); B uses it. Buy greys out at the cap; unique items refuse duplicates.
import { CONFIG } from '../config.js';
import { TOOL_VERBS } from './interactables.js';

const I = CONFIG.ITEMS;
export const ACTIVE_TOOLS = ['bombBag', 'vineHook', 'shrinkCap', 'powerGlove', 'gustJar'];

export function itemCycle(data) {
  const out = [];
  if (data.items.potions > 0) out.push('potion');
  if (data.tools.includes('bombBag')) out.push('bomb');
  for (const t of ACTIVE_TOOLS) if (t !== 'bombBag' && data.tools.includes(t)) out.push(t);
  return out;
}

export function cycleItem(data, sel) { const c = itemCycle(data); if (!c.length) return null; const i = c.indexOf(sel); return c[(i + 1) % c.length]; }

export function usePotion(data) {
  if (data.items.potions <= 0 || data.hearts >= data.maxHearts) return false;
  data.items.potions--;
  data.hearts = Math.min(data.maxHearts, data.hearts + I.POTION.hearts);
  return true;
}

export function shopPrice(item, world) { return item === 'potion' ? I.POTION.pricePerWorld * world : item === 'bombs' ? I.BOMBS.pricePerWorld * world : 0; }

// Returns 'ok' | 'cap' | 'gold' | 'locked'.
export function canBuy(data, item, world) {
  if (item === 'potion' && data.items.potions >= I.POTION.carry) return 'cap';
  if (item === 'bombs') { if (!data.tools.includes('bombBag')) return 'locked'; if (data.items.bombs >= I.BOMBS.carry) return 'cap'; }
  return data.gold >= shopPrice(item, world) ? 'ok' : 'gold';
}

export function buy(data, item, world) {
  const r = canBuy(data, item, world);
  if (r !== 'ok') return r;
  data.gold -= shopPrice(item, world);
  if (item === 'potion') data.items.potions++;
  else data.items.bombs = Math.min(I.BOMBS.carry, data.items.bombs + I.BOMBS.pack);
  return 'ok';
}

// Bombs (need the Bomb Bag): take one from the bag; the scene throws it (BOMB tag → blasts cracked walls/rocks, hurts foes).
export function takeBomb(data) { if (!data.tools.includes('bombBag') || data.items.bombs <= 0) return false; data.items.bombs--; return true; }

export function addPotion(data) { if (data.items.potions >= I.POTION.carry) return false; data.items.potions++; return true; }

// Hand tools (E, or B with the tool selected): use each owned tool's verbs on the object in front (lift a boulder, shrink into
// a pin hole, pull a block, yank …). Gates ask for verbs only [D28]. Returns true when something reacted.
export function useToolsAhead(data, inter, only = null) {
  const tools = only ? [only] : data.tools;
  for (const t of tools) for (const v of TOOL_VERBS[t] || []) if (inter.useVerb && inter.useVerb(v, data)) return true;
  return false;
}
// Vine Hook: grab the first hook post straight ahead (within I.HOOK.range tiles, over gaps) and zip to the tile before it.
// Posts accept the 'hook' verb (D28) — the check is on the verb, never the hero.
const HOOK_DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function startHook(data, hero, inter, map) {
  if (!data.tools.includes('vineHook') || hero.zip) return false;
  const [dx, dy] = HOOK_DIR[hero.facing], T = CONFIG.VIEW.TILE;
  const tx = Math.floor(hero.x / T), ty = Math.floor((hero.y - 2) / T);
  for (let k = 1; k <= I.HOOK.range; k++) {
    const post = inter.allAt(tx + dx * k, ty + dy * k).find((o) => o.type === 'hookPoint');
    if (!post) continue;
    if (!inter.use(post, 'hook', data)) return false;
    post.hooked = true; // counts as 'opened' for relic tool-gate rooms
    const lx = post.tx - dx, ly = post.ty - dy;
    if (k === 1 || map.isSolid(lx, ly)) return false; // already there / nowhere to land
    hero.zip = { t: 0, x0: hero.x, y0: hero.y, x1: lx * T + 8, y1: ly * T + 12 }; hero.path = null;
    return true;
  }
  return false;
}
// Moves a zipping hero; returns true while the zip is running (skip normal movement that frame).
export function updateHook(hero, dt) {
  const z = hero.zip; if (!z) return false;
  z.t += dt; const k = Math.min(1, z.t / I.HOOK.zip);
  hero.x = z.x0 + (z.x1 - z.x0) * k; hero.y = z.y0 + (z.y1 - z.y0) * k; hero.z = Math.sin(k * Math.PI) * 10;
  if (k >= 1) { hero.zip = null; hero.z = 0; hero.hooks = (hero.hooks || 0) + 1; }
  return true;
}
