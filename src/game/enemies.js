// Enemy archetypes (8) composed from pattern primitives. Each enemy: move → tell (≥ 0.5 s) → act → rest.
// Data shape: { id, name, archetype, pattern: [{ type, ...params }], look: { shape, body, accent }, stats? }
import { CONFIG } from '../config.js';
import { PRIMS, tellTime, moveBy } from './patterns.js';
import { enemyHp, rawDamage } from './stats.js';

// move: chase | keep (keep distance) | still | hop | drift (sine flyer) | wander
export const ARCHETYPES = {
  melee: { move: 'chase', speed: 40, range: 44, rest: 1.0, pattern: [{ type: 'lunge' }], shape: 'blob' },
  hopper: { move: 'hop', speed: 50, range: 70, rest: 0.8, pattern: [{ type: 'hop' }, { type: 'lunge' }], shape: 'bug' },
  ranged: { move: 'keep', speed: 36, range: 160, rest: 1.4, pattern: [{ type: 'fanShot', n: 3 }], shape: 'fish' },
  turret: { move: 'still', speed: 0, range: 180, rest: 1.6, pattern: [{ type: 'fanShot', n: 3, spread: 0.7 }], shape: 'bush' },
  shielded: { move: 'chase', speed: 28, range: 90, rest: 1.2, pattern: [{ type: 'charge', speed: 150 }], shape: 'knight', shield: true },
  flyer: { move: 'drift', speed: 45, range: 140, rest: 1.2, pattern: [{ type: 'dive' }], shape: 'bird', fly: true },
  burrower: { move: 'wander', speed: 30, range: 150, rest: 1.4, pattern: [{ type: 'burrow' }], shape: 'mole' },
  roller: { move: 'wander', speed: 35, range: 150, rest: 1.2, pattern: [{ type: 'charge', speed: 200 }], shape: 'ball' },
};

export const TEST_ENEMIES = Object.keys(ARCHETYPES).map((a) => ({ id: 'test-' + a, name: 'Test ' + a, archetype: a, look: { shape: ARCHETYPES[a].shape, body: '#c04040', accent: '#f0d060' } }));

// Entity fields for a data enemy in world w.
export function enemyDef(data, w, tier = 'adventurer', elite = false) {
  const A = ARCHETYPES[data.archetype];
  const hp = enemyHp(w, data.archetype, elite);
  return {
    kind: 'enemy', archetype: data.archetype, name: data.name, look: data.look || { shape: A.shape }, pattern: data.pattern || A.pattern,
    hp, maxHp: hp, dmg: rawDamage(w, tier) + (elite ? 1 : 0), elite, xp: Math.round((data.xp || 0) * CONFIG.XP.KILL_MULT[w - 1] * (elite ? CONFIG.XP.ELITE_MULT : 1)), shield: !!A.shield, shieldFace: 'down', turnT: 0, fly: !!A.fly, tier, dataId: data.id,
    ai: { state: 'move', t: 0.5 + Math.random() * 0.8, step: 0, aim: 0 },
  };
}

// AI step. cx: { hero, map, ents, hurt, tier, summon? }. Logs tell/act times into e.log (tests).
export function updateEnemy(e, cx, dt) {
  const A = ARCHETYPES[e.archetype];
  const ai = e.ai;
  const h = cx.hero;
  const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  if (e.shield && (e.turnT -= dt) <= 0 && ai.state === 'move') { e.shieldFace = e.face; e.turnT = 0.8; } // slow turn: flanking works
  if (e.kbt > 0) return;
  ai.t -= dt;
  if (ai.state === 'move') {
    const sp = A.speed * (e.speedMul || 1) * dt; // speedMul: Survival wave scaling
    if (A.move === 'chase' && d < 200) moveBy(e, cx.map, (dx / d) * sp, (dy / d) * sp);
    else if (A.move === 'keep') { const k = d < 90 ? -1 : d > 130 ? 1 : 0; moveBy(e, cx.map, (dx / d) * sp * k, (dy / d) * sp * k); }
    else if (A.move === 'hop' && d < 200) moveBy(e, cx.map, (dx / d) * sp, (dy / d) * sp);
    else if (A.move === 'drift') { ai.dir += dt * 3; moveBy(e, cx.map, (dx / d) * sp + Math.cos(ai.dir) * 20 * dt, (dy / d) * sp + Math.sin(ai.dir) * 20 * dt); }
    else if (A.move === 'wander') { ai.dir += dt * 0.7; moveBy(e, cx.map, Math.cos(ai.dir) * sp, Math.sin(ai.dir) * sp); }
    if (ai.t <= 0 && d <= A.range) {
      ai.state = 'tell'; ai.t = tellTime(cx.tier || e.tier); ai.aim = Math.atan2(dy, dx);
      if (e.log) e.log.push({ ev: 'tell', t: cx.time });
    } else if (ai.t <= 0) ai.t = 0.3;
  } else if (ai.state === 'tell') {
    if (ai.t <= 0) {
      const p = e.pattern[ai.step % e.pattern.length];
      ai.state = 'act'; ai.cur = p; ai.st = PRIMS[p.type].start(e, cx, p) || {};
      if (e.log) e.log.push({ ev: 'act', t: cx.time, type: p.type });
    }
  } else if (ai.state === 'act') {
    if (PRIMS[ai.cur.type].update(e, cx, ai.cur, dt, ai.st)) {
      ai.step++;
      const next = e.pattern[ai.step % e.pattern.length];
      if (ai.step % e.pattern.length !== 0 && next) { ai.state = 'tell'; ai.t = tellTime(cx.tier || e.tier); if (e.log) e.log.push({ ev: 'tell', t: cx.time }); }
      else { ai.state = 'rest'; ai.t = A.rest; }
    }
  } else if (ai.state === 'rest' && ai.t <= 0) { ai.state = 'move'; ai.t = 0.4; }
}

// Shield: blocks melee coming from the side it faces (the hero's side), unless special.
export function blocksHit(e, fromX, fromY, special) {
  if (!e.shield || special) return false;
  const dx = fromX - e.x, dy = fromY - e.y;
  const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  return side === e.shieldFace && e.ai.state !== 'act';
}

