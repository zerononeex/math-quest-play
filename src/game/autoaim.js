// Tap a far target (torch, crystal, ice, water…) → pick the ranged ammo whose tags can act on it and fire (TAP TARGETS).
import { CONFIG } from '../config.js';
import { AMMO, heroAmmo, HERO_AMMO } from './projectiles.js';
import { PROJECTILE_TARGETS } from './interactables.js';

const NEEDS = { torch: (o) => (o.lit ? null : 'FIRE'), iceBlock: (o) => (o.melted ? null : 'FIRE'), water: (o) => (o.frozen ? null : 'ICE'), crystal: () => '', crackedWall: () => 'BOMB', dreamTorch: (o) => (o.lit ? null : 'FIRE'), vent: (o) => (o.frozen ? null : 'ICE') };

export function findTapTarget(inter, wx, wy) {
  let best = null, bd = CONFIG.COMBAT.TAP_TARGET_RADIUS + 8;
  for (const o of inter.list) {
    if (!PROJECTILE_TARGETS.includes(o.type) && !NEEDS[o.type]) continue;
    const c = inter.center(o), d = Math.hypot(c.x - wx, c.y - wy);
    if (d <= bd) { best = o; bd = d; }
  }
  return best;
}

// Returns { ammo } to fire, or { need: 'FIRE' } when the hero lacks it, or null when nothing to do.
export function chooseAmmo(data, heroId, o) {
  const need = NEEDS[o.type] ? NEEDS[o.type](o) : null;
  if (need === null) return null;
  const owned = heroAmmo(data, heroId);
  const pick = need === '' ? owned.find((id) => AMMO[id].tags.length === 0) || owned[0] : owned.find((id) => AMMO[id].tags.includes(need));
  if (pick) return { ammo: pick };
  const exists = HERO_AMMO[heroId].some((id) => AMMO[id].tags.includes(need));
  return { need: need || 'AMMO', exists };
}

// [D35] Keyboard / D-pad ranged assist: nearest enemy or switch-like target inside the aim cone around (fx, fy).
// Returns a direction { dx, dy } toward it, or null (fire straight along the facing).
export function coneAim(hx, hy, fx, fy, ents, inter) {
  const half = (CONFIG.COMBAT.AIM_CONE_DEG / 2) * Math.PI / 180, range = CONFIG.COMBAT.AIM_RANGE;
  const f = Math.atan2(fy, fx);
  let best = null, bd = range;
  const consider = (x, y) => {
    const dx = x - hx, dy = y - hy, d = Math.hypot(dx, dy);
    if (d < 4 || d > bd) return;
    let a = Math.atan2(dy, dx) - f; while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
    if (Math.abs(a) <= half) { best = { dx, dy }; bd = d; }
  };
  for (const e of (ents && ents.list) || []) if (e.alive && e.kind === 'enemy' && !e.hidden) consider(e.x, e.y - e.h / 2);
  if (inter) for (const o of inter.list) if (PROJECTILE_TARGETS.includes(o.type) || /switch/i.test(o.type)) { const c = inter.center(o); consider(c.x, c.y); }
  return best;
}
