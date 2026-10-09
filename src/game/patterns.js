// Attack-pattern primitives: every attack = telegraph (tell pose ≥ 0.5 s) → action → rest.
// Enemy projectiles ('eproj') and hazards ('hazard') are entities in the room registry.
import { CONFIG } from '../config.js';
import { spawn, overlap, remove } from './entities.js';
import { beatIn } from '../engine/audio.js';
// [A5] big bosses (artScale > 1): body-anchored attacks start at the body's edge, so their reach grows with the body
const reach = (e) => (e.artScale > 1 ? e.w / 2 : 0);

const TAU = Math.PI * 2;
const dirTo = (e, x, y) => { const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d, d]; };
export function moveBy(e, map, dx, dy) {
  const hw = e.w / 2;
  if (e.fly || !map || map.boxFree(e.x + dx - hw, e.y - e.h, e.x + dx + hw, e.y)) e.x += dx; else return false;
  if (e.fly || !map || map.boxFree(e.x - hw, e.y + dy - e.h, e.x + hw, e.y + dy)) e.y += dy; else return false;
  return true;
}

export function shoot(cx, e, vx, vy, opts = {}) {
  return spawn(cx.ents, { kind: 'eproj', x: e.x, y: e.y - e.h / 2, w: opts.r || 6, h: opts.r || 6, vx, vy, life: opts.life || 2.5, bounces: opts.bounces || 0, dmg: e.dmg, contact: false, ai: {} });
}
// Hazard: shape circle|ring|line|rect; `delay` s of marker before it becomes active; `life` s active.
export function hazard(cx, e, h) {
  return spawn(cx.ents, { kind: 'hazard', w: 0, h: 0, contact: false, delay: 0, life: 0.2, dmg: e ? e.dmg : 1, slow: 0, pull: 0, owner: e ? e.id : 0, ...h, ai: {} });
}

// Primitive actions: start(e, cx, p) → state; update(e, cx, p, dt, st) → true when done. `aim` = where the tell pointed.
export const PRIMS = {
  hop: { start: (e, cx) => ({ t: 0.4, d: dirTo(e, cx.hero.x, cx.hero.y) }), update: (e, cx, p, dt, s) => { moveBy(e, cx.map, s.d[0] * 110 * dt, s.d[1] * 110 * dt); e.z = Math.sin((1 - s.t / 0.4) * Math.PI) * 10; return (s.t -= dt) <= 0 && ((e.z = 0), true); } },
  lunge: { start: (e, cx) => ({ t: 0.2, d: dirTo(e, cx.hero.x, cx.hero.y) }), update: (e, cx, p, dt, s) => { moveBy(e, cx.map, s.d[0] * 300 * dt, s.d[1] * 300 * dt); return (s.t -= dt) <= 0; } },
  charge: { start: (e, cx) => ({ t: 1.0, d: dirTo(e, cx.hero.x, cx.hero.y) }), update: (e, cx, p, dt, s) => { // [R3-fix] a wall bonk dazes (no instant re-shell)
    if (!s.bonk && !moveBy(e, cx.map, s.d[0] * (p.speed || 170) * dt, s.d[1] * (p.speed || 170) * dt)) { s.bonk = true; s.t = CONFIG.COMBAT.CHARGE_BONK_S; }
    return (s.t -= dt) <= 0; } },
  fanShot: { start: (e, cx, p) => {
    const [dx, dy] = dirTo(e, cx.hero.x, cx.hero.y); const n = p.n || 3, spread = p.spread || 0.5, a0 = Math.atan2(dy, dx);
    for (let i = 0; i < n; i++) { const a = a0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread); shoot(cx, e, Math.cos(a) * 110, Math.sin(a) * 110); }
    return {};
  }, update: () => true },
  bounceShot: { start: (e, cx) => { const [dx, dy] = dirTo(e, cx.hero.x, cx.hero.y); shoot(cx, e, dx * 100, dy * 100, { bounces: 2, life: 4 }); return {}; }, update: () => true },
  lob: { start: (e, cx, p) => { hazard(cx, e, { shape: 'circle', x: cx.hero.x, y: cx.hero.y, r: p.r || 14, delay: 0.6, life: 0.15 }); return {}; }, update: () => true },
  zone: { start: (e, cx, p) => { hazard(cx, e, { shape: 'circle', x: e.x, y: e.y, r: (p.r || 20) + reach(e) * 0.5, delay: 0.1, life: 2 }); return {}; }, update: () => true },
  slowPuddle: { start: (e, cx) => { hazard(cx, e, { shape: 'circle', x: e.x, y: e.y, r: 18, delay: 0, life: 3, dmg: 0, slow: 0.5 }); return {}; }, update: () => true },
  slamRing: { start: (e, cx, p) => { hazard(cx, e, { shape: 'ring', x: e.x, y: e.y, r: 0, grow: ((p.r || 80) + reach(e)) / 0.6, delay: 0, life: 0.6 }); return {}; }, update: () => true },
  sweep: { start: (e, cx) => ({ t: 0.5, a: Math.atan2(cx.hero.y - e.y, cx.hero.x - e.x) - Math.PI / 2, h: null }), update: (e, cx, p, dt, s) => {
    if (!s.h) s.h = hazard(cx, e, { shape: 'line', x: e.x, y: e.y - (e.artScale > 1 ? e.h / 2 : 6), len: (p.len || 40) + reach(e), a: s.a, spin: Math.PI / 0.5, delay: 0, life: 0.5 });
    return (s.t -= dt) <= 0;
  } },
  beam: { start: (e, cx) => { hazard(cx, e, { shape: 'line', x: e.x, y: e.y - 6, len: 300, a: e.ai.aim, delay: 0, life: 0.3, wide: 6 }); return {}; }, update: () => true },
  // root snare: marked circles on and around the hero that hold them briefly (no damage)
  snare: { start: (e, cx) => { for (const [dx, dy] of [[0, 0], [-40, 20], [40, -20]]) hazard(cx, e, { shape: 'circle', x: cx.hero.x + dx, y: cx.hero.y + dy, r: 16, delay: 0.6, life: 1.0, dmg: 0, slow: 0.95 }); return {}; }, update: () => true },
  // vine storm: rotating vine walls with gaps around the caster
  vineStorm: { start: () => ({ t: 2.0, hs: null }), update: (e, cx, p, dt, s) => {
    if (!s.hs) s.hs = [0, 1, 2].map((i) => hazard(cx, e, { shape: 'line', x: e.x, y: e.y - 8, len: 150, a: (i * Math.PI * 2) / 3, spin: 1.6, delay: 0, life: 2.0, wide: 5 }));
    return (s.t -= dt) <= 0;
  } },
  spin: { start: () => ({ t: 0.6 }), update: (e, cx, p, dt, s) => { if (!s.h) s.h = hazard(cx, e, { shape: 'circle', x: e.x, y: e.y, r: 24, delay: 0, life: 0.6, follow: true }); return (s.t -= dt) <= 0; } },
  burrow: { start: (e, cx) => { e.hidden = true; e.invuln = true; e.contact = false; const x = cx.hero.x, y = cx.hero.y; hazard(cx, e, { shape: 'circle', x, y, r: 16, delay: 0.6, life: 0.15 }); return { t: 0.6, x, y }; },
    update: (e, cx, p, dt, s) => { if ((s.t -= dt) > 0) return false; e.x = s.x; e.y = s.y; e.hidden = false; e.invuln = false; e.contact = true; return true; } },
  dive: { start: (e, cx) => { const x = cx.hero.x, y = cx.hero.y; e.z = 40; hazard(cx, e, { shape: 'circle', x, y, r: 14, delay: 0.6, life: 0.15 }); return { t: 0.6, x, y, x0: e.x, y0: e.y }; },
    update: (e, cx, p, dt, s) => { s.t -= dt; const k = 1 - Math.max(0, s.t) / 0.6; e.x = s.x0 + (s.x - s.x0) * k; e.y = s.y0 + (s.y - s.y0) * k; e.z = 40 * (1 - k); return s.t <= 0 && ((e.z = 0), true); } },
  // W2 Shellback: tuck into the shell (invulnerable) for p.t seconds.
  shellHide: { start: (e, cx, p) => { e.invuln = true; e.shelled = true; return { t: p.t || 0.8 }; }, update: (e, cx, p, dt, s) => ((s.t -= dt) <= 0 && ((e.invuln = false), (e.shelled = false), true)) },
  // W2 Spikeball: roll straight at the hero; every wall bounce reflects and speeds up (×p.gain, capped at p.max).
  rollBounce: { start: (e, cx, p) => ({ t: p.t || 2.0, d: dirTo(e, cx.hero.x, cx.hero.y), sp: p.speed || 120 }), update: (e, cx, p, dt, s) => {
    if (!moveBy(e, cx.map, s.d[0] * s.sp * dt, s.d[1] * s.sp * dt)) {
      if (!cx.map || !cx.map.boxFree(e.x + s.d[0] * 4 - e.w / 2, e.y - e.h, e.x + s.d[0] * 4 + e.w / 2, e.y)) s.d[0] = -s.d[0]; else s.d[1] = -s.d[1];
      s.sp = Math.min(p.max || 240, s.sp * (p.gain || 1.25));
    }
    return (s.t -= dt) <= 0;
  } },
  // W3 Shieldbuddy: shuffle sideways (perpendicular to the hero) for p.t seconds.
  sidestep: { start: (e, cx, p) => { const [dx, dy] = dirTo(e, cx.hero.x, cx.hero.y); const s = Math.random() < 0.5 ? 1 : -1; return { t: p.t || 0.4, d: [-dy * s, dx * s] }; },
    update: (e, cx, p, dt, s) => { moveBy(e, cx.map, s.d[0] * (p.speed || 90) * dt, s.d[1] * (p.speed || 90) * dt); return (s.t -= dt) <= 0; } },
  // W3 Skimmer: glide in a circle around where it started for p.t seconds.
  circleGlide: { start: (e, cx, p) => ({ t: p.t || 1.0, cx: e.x, cy: e.y, a: 0 }), update: (e, cx, p, dt, s) => {
    s.a += dt * 5; e.x = s.cx + Math.cos(s.a) * (p.r || 24) - (p.r || 24); e.y = s.cy + Math.sin(s.a) * (p.r || 24); return (s.t -= dt) <= 0; } },
  // W3 Inkblot: sink, slide under the floor, pop up behind the hero (telegraphed ring where it will surface).
  popBehind: { start: (e, cx) => { e.hidden = true; e.invuln = true; e.contact = false; const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[cx.hero.facing] || [0, 1];
      const x = cx.hero.x + back[0] * 28, y = cx.hero.y + back[1] * 28; hazard(cx, e, { shape: 'circle', x, y, r: 14, delay: 0.6, life: 0.15 }); return { t: 0.6, x, y }; },
    update: (e, cx, p, dt, s) => { if ((s.t -= dt) > 0) return false; if (!cx.map || cx.map.boxFree(s.x - e.w / 2, s.y - e.h, s.x + e.w / 2, s.y)) { e.x = s.x; e.y = s.y; } e.hidden = false; e.invuln = false; e.contact = true; return true; } },
  // W3 Vex: ink rain — p.n marked splash zones scattered around the hero.
  inkRain: { start: (e, cx, p) => { for (let i = 0; i < (p.n || 5); i++) hazard(cx, e, { shape: 'circle', x: cx.hero.x + (Math.random() - 0.5) * 140, y: cx.hero.y + (Math.random() - 0.5) * 100, r: p.r || 16, delay: 0.8, life: 0.2 }); return {}; }, update: () => true },
  // W3 Vex: hypno-lights — lit pools appear; when the daze wave fires, only a hero standing in a pool is safe.
  hypno: { start: (e, cx, p) => {
      const pools = [[-60, -30], [55, 20], [-10, 60]].map(([dx, dy]) => ({ x: cx.hero.x + dx, y: cx.hero.y + dy }));
      for (const q of pools) hazard(cx, e, { shape: 'circle', x: q.x, y: q.y, r: p.r || 22, delay: 0, life: p.t || 1.6, dmg: 0, safe: true });
      return { t: p.t || 1.6, pools };
    },
    update: (e, cx, p, dt, s) => {
      if ((s.t -= dt) > 0) return false;
      const safe = s.pools.some((q) => Math.hypot(cx.hero.x - q.x, cx.hero.y - q.y) < (p.r || 22));
      if (!safe) hazard(cx, e, { shape: 'circle', x: cx.hero.x, y: cx.hero.y, r: 20, delay: 0, life: 0.15 });
      return true;
    } },
  // W3 Vex phase 2: grayscale wave — the screen goes grey for p.t s; a hero standing still > p.still s gets hit.
  grayWave: { start: (e, cx, p) => { e.grayT = p.t || 3; return { t: p.t || 3, still: 0, x: cx.hero.x, y: cx.hero.y }; },
    update: (e, cx, p, dt, s) => {
      const moved = Math.hypot(cx.hero.x - s.x, cx.hero.y - s.y) > 0.5; s.x = cx.hero.x; s.y = cx.hero.y;
      s.still = moved ? 0 : s.still + dt;
      if (s.still > (p.still || 0.6)) { hazard(cx, e, { shape: 'circle', x: cx.hero.x, y: cx.hero.y, r: 12, delay: 0, life: 0.15 }); s.still = 0; }
      e.grayT = Math.max(0, s.t - dt);
      return (s.t -= dt) <= 0;
    } },
  // W4 Brollygust: gust — a wind zone that pushes the hero away (negative pull).
  gust: { start: (e, cx, p) => { hazard(cx, e, { shape: 'circle', x: e.x, y: e.y, r: p.r || 110, delay: 0, life: p.t || 1.0, dmg: 0, pull: -(p.push || 80) }); return {}; }, update: () => true },
  // [D46] Seraphel's Supernova Countdown: a NOVA_S clock (×1.5 Little Hero); staggers shatter it (bosses.js novaHit)
  supernova: { start: (e, cx) => { e.nova = { t: CONFIG.BOSS.NOVA_S * (cx.tier === 'little' ? CONFIG.PUZZLE.TIMING_LITTLE_MULT : 1), hits: 0, staggers: 0 }; return {}; }, update: (e) => !e.nova },
  // [W7] Nocturne's nightfall: the room goes dark for t s — only telegraph glows (hazards), the hero and a small halo stay visible
  nightfall: { start: (e, cx, p) => { e.darkT = p.t || 3; return { t: p.t || 3 }; }, update: (e, cx, p, dt, s) => { e.darkT = Math.max(0, (s.t -= dt)); return s.t <= 0; } },
  // [W5] wait for the music's next beat (the playing track's clock; a steady CONFIG.BOSS.BEAT_BPM clock without audio)
  beatWait: { start: (e, cx) => { const b = beatIn(), spb = 60 / CONFIG.BOSS.BEAT_BPM; return { t: b != null ? b : spb - ((cx.time || 0) % spb) }; }, update: (e, cx, p, dt, s) => (s.t -= dt) <= 0 },
  summon: { start: (e, cx, p) => { for (let i = 0; i < (p.n || 2); i++) if (cx.summon) cx.summon(e, i); return {}; }, update: () => true },
  pull: { start: (e, cx) => { hazard(cx, e, { shape: 'circle', x: e.x, y: e.y, r: 90, delay: 0, life: 0.8, dmg: 0, pull: 60 }); return {}; }, update: () => true },
};

// Tell duration: ≥ TELEGRAPH_MIN on every tier (Little Hero ×1.5).
export function tellTime(tier, base = 0.6) {
  const t = CONFIG.TIER_MODS[tier] || CONFIG.TIER_MODS.adventurer;
  return Math.max(CONFIG.COMBAT.TELEGRAPH_MIN, base * t.windup);
}

function hazardHits(h, hb) {
  const cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
  if (h.shape === 'circle') return Math.hypot(cx - h.x, cy - h.y) < h.r + 4;
  if (h.shape === 'ring') { const d = Math.hypot(cx - h.x, cy - h.y); return Math.abs(d - h.r) < 8; }
  if (h.shape === 'line') {
    const ux = Math.cos(h.a), uy = Math.sin(h.a), px = cx - h.x, py = cy - h.y, t = px * ux + py * uy;
    return t > 0 && t < h.len && Math.abs(px * uy - py * ux) < (h.wide || 5) + 4;
  }
  return overlap(h, hb);
}

// Moves projectiles / hazards; returns nothing. cx.hurt(raw, x, y) damages the hero.
export function updateHazards(cx, hb, dt) {
  cx.hero.slow = 0;
  for (const h of cx.ents.list) {
    if (!h.alive) continue;
    if (h.kind === 'eproj') {
      const nx = h.x + h.vx * dt, ny = h.y + h.vy * dt;
      const t = CONFIG.VIEW.TILE;
      if (cx.map && cx.map.isSolid(Math.floor(nx / t), Math.floor(ny / t))) {
        if (h.bounces-- > 0) { if (cx.map.isSolid(Math.floor(nx / t), Math.floor(h.y / t))) h.vx = -h.vx; else h.vy = -h.vy; } else { remove(cx.ents, h); continue; }
      } else { h.x = nx; h.y = ny; }
      if ((h.life -= dt) <= 0) { remove(cx.ents, h); continue; }
      if (Math.hypot(h.x - (hb.x + hb.w / 2), h.y - (hb.y + hb.h / 2)) < 8) { cx.hurt(h.dmg, h.x, h.y); remove(cx.ents, h); }
    } else if (h.kind === 'hazard') {
      if (h.follow) { const o = cx.ents.byId.get(h.owner); if (o) { h.x = o.x; h.y = o.y; } }
      if (h.delay > 0) { h.delay -= dt; continue; }
      if (h.grow) h.r += h.grow * dt;
      if (h.spin) h.a += h.spin * dt;
      if (hazardHits(h, hb)) {
        if (h.dmg) cx.hurt(h.dmg, h.x, h.y);
        if (h.slow) cx.hero.slow = Math.max(cx.hero.slow, h.slow);
        if (h.pull) { const [dx, dy] = dirTo(cx.hero, h.x, h.y); moveBy(cx.hero, cx.map, dx * h.pull * dt, dy * h.pull * dt); }
      }
      if ((h.life -= dt) <= 0) remove(cx.ents, h);
    }
  }
}

