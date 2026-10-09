// [S56] Starforge (SPEC 2.8, D09): Smith Nova turns all six relics into DAWNBREAKER, THE STARFORGED BLADE — weapon tier 9 in
// every hero's form, +STR/+hearts (stats.js), FIRE+ICE verbs on every gate (interactables.js) and the STARFALL special.
import { CONFIG } from '../config.js';
import { refreshHearts } from './progression.js';

export function canForge(data) { return !data.dawnbreaker && data.relics.length >= CONFIG.GEAR.DAWNBREAKER.relics; }

// Returns true when the blade is forged (equips it on the current hero).
export function forgeDawnbreaker(data) {
  if (!canForge(data)) return false;
  data.dawnbreaker = true;
  data.gearEquipped.weapon[data.hero] = 'wpn-' + data.hero + '-9';
  refreshHearts(data);
  return true;
}

export function forgeLines(data) {
  if (data.dawnbreaker) return ['Dawnbreaker suits you.', 'Every hero can swing it, every world fears it.'];
  if (canForge(data)) return ['All six relics! Stand back…', 'DAWNBREAKER, THE STARFORGED BLADE! Fire and ice in one. Try STARFALL (5 AP)!'];
  return ['Bring me all six relics,', 'and I will forge a blade of starlight. (' + data.relics.length + '/6)'];
}

// STARFALL: a meteor on the target zone (nearest foe ahead, else a spot along the facing).
export function starfallTarget(hero, foes) {
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[hero.facing], R = CONFIG.GEAR.DAWNBREAKER.starfallRange;
  let best = null, bd = R;
  for (const e of foes) { const d = Math.hypot(e.x - hero.x, e.y - hero.y); if (d < bd) { bd = d; best = e; } }
  return best ? { x: best.x, y: best.y - best.h / 2 } : { x: hero.x + D[0] * R / 2, y: hero.y - 8 + D[1] * R / 2 };
}
