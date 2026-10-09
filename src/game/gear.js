// Equip rules: armor shared, weapon per hero (must own it). Heart stash: swapping gear never heals (bug registry).
import { GEAR } from '../data/gear.js';
import { maxHeartsOf } from './progression.js';
import { apCapOf } from './ap.js';

export function owns(data, id) { return data.gearOwned.includes(id) || (id.startsWith('wpn-') && id.endsWith('-9') && data.dawnbreaker); }

// Hearts: when the max drops, the lost hearts go to a stash; when gear raises it again, at most the stash comes back.
function applyHearts(data, before) {
  const after = maxHeartsOf(data);
  data.heartStash = data.heartStash || 0;
  if (after < before) { const lost = Math.max(0, data.hearts - after); data.heartStash += lost; data.hearts -= lost; }
  else if (after > before) { const back = Math.min(data.heartStash, after - before); data.hearts += back; data.heartStash -= back; }
  data.maxHearts = after;
  data.hearts = Math.min(data.hearts, after);
}

export function equip(data, id, hero = data.hero) {
  const it = GEAR[id];
  if (!it || !owns(data, id)) return false;
  if (it.slot === 'weapon' && it.hero !== hero) return false;
  const before = maxHeartsOf(data);
  if (it.slot === 'weapon') data.gearEquipped.weapon[hero] = id; else data.gearEquipped[it.slot] = id;
  applyHearts(data, before);
  data.ap = Math.min(data.ap, apCapOf(data));
  return true;
}

export function unequip(data, slot, hero = data.hero) {
  const before = maxHeartsOf(data);
  if (slot === 'weapon') data.gearEquipped.weapon[hero] = null; else data.gearEquipped[slot] = null;
  applyHearts(data, before);
  data.ap = Math.min(data.ap, apCapOf(data));
  return true;
}

export function ownedFor(data, slot, hero = data.hero) {
  return Object.values(GEAR).filter((g) => g.slot === slot && owns(data, g.id) && (slot !== 'weapon' || g.hero === hero));
}

export function grantGear(data, id) {
  if (!GEAR[id] || data.gearOwned.includes(id)) return false;
  data.gearOwned.push(id);
  return true;
}
