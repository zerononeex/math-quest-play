// Hero projectiles (pooled): tags FIRE/ICE/BOMB/WIND, returning boomerang, bouncing shell, arcing bombs.
// They hit enemies AND interactables (bug registry PROJECTILES HIT SWITCHES). Element ammo locked until its Bloom (D05).
import { CONFIG } from '../config.js';
import { Pool } from '../engine/pool.js';
import { tagVerbs } from './interactables.js';
import { shotBurst } from './shotfx.js';

// ammo: { ap, speed, tags, kind: straight|boomerang|bounce|arc, needs? (tool id), range }
export const AMMO = {
  arrow: { ap: CONFIG.COMBAT.RANGED_AP, speed: 220, tags: [], kind: 'straight' },
  fireArrow: { ap: CONFIG.COMBAT.RANGED_AP, speed: 220, tags: ['FIRE'], kind: 'straight', needs: 'fireBloom' },
  iceArrow: { ap: CONFIG.COMBAT.RANGED_AP, speed: 220, tags: ['ICE'], kind: 'straight', needs: 'iceBloom' },
  boomerang: { ap: CONFIG.COMBAT.RANGED_AP, speed: 200, tags: [], kind: 'boomerang' },
  shellToss: { ap: CONFIG.COMBAT.SPECIAL_AP.shellToss, speed: 170, tags: [], kind: 'bounce' },
  fireFlower: { ap: CONFIG.COMBAT.RANGED_AP, speed: 190, tags: ['FIRE'], kind: 'straight', needs: 'fireBloom' },
  frostFlower: { ap: CONFIG.COMBAT.RANGED_AP, speed: 190, tags: ['ICE'], kind: 'straight', needs: 'iceBloom' },
  blaster: { ap: CONFIG.COMBAT.RANGED_AP, speed: 240, tags: [], kind: 'straight' },
  emberInk: { ap: CONFIG.COMBAT.RANGED_AP, speed: 240, tags: ['FIRE'], kind: 'straight', needs: 'fireBloom' },
  frostInk: { ap: CONFIG.COMBAT.RANGED_AP, speed: 240, tags: ['ICE'], kind: 'straight', needs: 'iceBloom' },
  splatBomb: { ap: CONFIG.COMBAT.SPECIAL_AP.splatBomb, speed: 150, tags: ['SPLAT'], kind: 'arc' },
  bomb: { ap: 0, speed: 120, tags: ['BOMB'], kind: 'arc' },
  gust: { ap: 0, speed: 200, tags: ['WIND'], kind: 'straight', needs: 'gustJar' }, // Gust Jar (item B): blows fans/fog/boats
};
// G12 ranged slot per hero (press again cycles).
export const HERO_AMMO = {
  rowan: ['boomerang', 'arrow', 'fireArrow', 'iceArrow'],
  milo: ['shellToss', 'fireFlower', 'frostFlower'],
  wren: ['blaster', 'emberInk', 'frostInk', 'splatBomb'],
};

export function ammoUnlocked(data, id) { const a = AMMO[id]; return !a.needs || data.tools.includes(a.needs) || !!data.dawnbreaker; }
export function heroAmmo(data, hero) { return HERO_AMMO[hero].filter((id) => ammoUnlocked(data, id)); }

export function createProjectiles() {
  return new Pool(64, () => ({ x: 0, y: 0, vx: 0, vy: 0, t: 0, ammo: '', tags: null, back: false, bounces: 0, hit: null, life: 0 }));
}

export function fire(pool, hero, ammoId, dx, dy) {
  const a = AMMO[ammoId];
  const d = Math.hypot(dx, dy) || 1;
  const p = pool.spawn();
  if (!p) return null;
  // [D37] arcs land where they were aimed: a real vector (tap / auto-aim) sets the flight time; a unit facing vector uses the default toss
  const arcLife = d > 4 ? Math.min(d, CONFIG.COMBAT.ARC_RANGE) / a.speed : 0.6;
  Object.assign(p, { x: hero.x, y: hero.y - 10, vx: (dx / d) * a.speed, vy: (dy / d) * a.speed, t: 0, ammo: ammoId, tags: a.tags, back: false, bounces: a.kind === 'bounce' ? 3 : 0, hit: new Set(), life: a.kind === 'arc' ? arcLife : 1.6 });
  return p;
}

// cx: { map, inter, ents, hero, hitEnemy(e, proj) }
export function updateProjectiles(pool, cx, dt) {
  const T = CONFIG.VIEW.TILE;
  pool.forEach((p) => {
    const a = AMMO[p.ammo];
    p.t += dt;
    if (a.kind === 'boomerang' && (p.t > 0.55 || p.back)) {
      p.back = true;
      const dx = cx.hero.x - p.x, dy = cx.hero.y - 10 - p.y, d = Math.hypot(dx, dy);
      if (d < 10) { pool.kill(p); return; }
      p.vx = (dx / d) * a.speed; p.vy = (dy / d) * a.speed;
    }
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    const tx = Math.floor(nx / T), ty = Math.floor(ny / T);
    const o = cx.inter && cx.inter.at(tx, ty);
    if (o) {
      for (const v of tagVerbs(p.tags)) cx.inter.apply(o, v, a.kind === 'boomerang' ? 'boomerang' : 'proj');
      if (!cx.inter.passProj(o) || (o.type === 'water' && p.tags.includes('ICE'))) { stop(p, pool, a, o); return; }
    }
    if (a.kind === 'boomerang' && cx.cutAt && cx.cutAt(tx, ty)) { /* [BUSHES] the boomerang cuts through bushes */ }
    if (cx.map.isSolid(tx, ty) && !(o && cx.inter.passProj(o))) {
      if (p.bounces > 0) { p.bounces--; if (cx.map.isSolid(Math.floor(nx / T), Math.floor(p.y / T))) p.vx = -p.vx; else p.vy = -p.vy; return; }
      stop(p, pool, a, null); return;
    }
    p.x = nx; p.y = ny;
    for (const e of cx.ents.list) {
      if (!e.alive || e.kind !== 'enemy' || p.hit.has(e.id)) continue;
      if (Math.abs(e.x - p.x) < e.w / 2 + 3 && Math.abs(e.y - e.h / 2 - p.y) < e.h / 2 + 3) {
        p.hit.add(e.id);
        cx.hitEnemy(e, p);
        if (a.kind === 'arc') burst(p, cx);
        if (a.kind === 'straight' || a.kind === 'arc') { pool.kill(p); return; }
      }
    }
    if (a.kind !== 'boomerang' && (p.life -= dt) <= 0) { if (a.kind === 'arc') burst(p, cx); pool.kill(p); }
  });
}

function stop(p, pool, a, o) {
  if (a.kind === 'boomerang') { p.back = true; return; }
  if (a.kind === 'arc') shotBurst(p.x, p.y, p.tags); // [HERO-SHOTS] a bomb stopped by a wall still bursts on screen
  pool.kill(p);
}

// Arc projectiles burst where they land: BOMB blasts cracked walls in a 1-tile radius.
function burst(p, cx) {
  shotBurst(p.x, p.y, p.tags); // [HERO-SHOTS] splat / blast art
  if (p.tags.includes('SPLAT') && cx.area) cx.area(p.x, p.y, 28);
  if (!cx.inter) return;
  const T = CONFIG.VIEW.TILE, tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) { for (const o of cx.inter.allAt(x, y)) for (const v of tagVerbs(p.tags)) cx.inter.apply(o, v, 'bomb'); }
}
