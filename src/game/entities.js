// Entity registry, rebuilt per room (NO STALE INDEXES: always look up by id). Spawn applies AI defaults every time.
import { CONFIG } from '../config.js';
import { floatText } from './fx.js';

const C = CONFIG.COMBAT;
export const AI_DEFAULTS = { state: 'idle', t: 0, dir: 0, cooldown: 0, phase: 1, target: null, tell: 0, step: 0 };

export function createEntities() { return { list: [], byId: new Map(), nextId: 1 }; }

export function resetRoom(ents) { ents.list.length = 0; ents.byId.clear(); }

export function spawn(ents, def) {
  const e = {
    kind: 'enemy', x: 0, y: 0, w: C.ENEMY_BOX, h: C.ENEMY_BOX, hp: 1, maxHp: 1, archetype: 'melee', elite: false,
    iframes: 0, kbx: 0, kby: 0, kbt: 0, alive: true, contact: true, flash: 0, ...def,
  };
  e.id = ents.nextId++;
  e.ai = { ...AI_DEFAULTS, ...(def.ai || {}) }; // AI FIELD DEFAULTS on every spawn path
  if (!def.maxHp) e.maxHp = e.hp;
  ents.list.push(e);
  ents.byId.set(e.id, e);
  return e;
}

export function get(ents, id) { const e = ents.byId.get(id); return e && e.alive ? e : null; }

export function remove(ents, e) { e.alive = false; ents.byId.delete(e.id); }

export function prune(ents) {
  let j = 0;
  for (let i = 0; i < ents.list.length; i++) if (ents.list[i].alive) ents.list[j++] = ents.list[i];
  ents.list.length = j;
}

export const box = (e) => ({ x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h });
export const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Knockback: KNOCKBACK px over KB_TIME away from (fx, fy).
export function knock(e, fx, fy, dist = C.KNOCKBACK) {
  const dx = e.x - fx, dy = e.y - fy, d = Math.hypot(dx, dy) || 1;
  e.kbx = ((dx / d) * dist) / C.KB_TIME; e.kby = ((dy / d) * dist) / C.KB_TIME; e.kbt = C.KB_TIME;
}

export function stepKnockback(e, map, dt) {
  if (e.kbt <= 0) return;
  const t = Math.min(dt, e.kbt);
  e.kbt -= t;
  const nx = e.x + e.kbx * t, ny = e.y + e.kby * t;
  const hw = e.w / 2;
  if (!map || map.boxFree(nx - hw, e.y - e.h, nx + hw, e.y)) e.x = nx;
  if (!map || map.boxFree(e.x - hw, ny - e.h, e.x + hw, ny)) e.y = ny;
}

// Returns true when damage landed; false during i-frames.
export function damageEnemy(e, dmg, fx, fy) {
  if (!e.alive || e.iframes > 0) return false;
  e.hp -= dmg;
  e.iframes = C.ENEMY_IFRAMES;
  e.flash = 0.15;
  knock(e, fx, fy);
  floatText(e.x, e.y - e.h - 4, String(Math.round(dmg)), '#ffffff');
  return true;
}

export function tickEntity(e, map, dt) {
  if (e.iframes > 0) e.iframes -= dt;
  if (e.flash > 0) e.flash -= dt;
  stepKnockback(e, map, dt);
}
