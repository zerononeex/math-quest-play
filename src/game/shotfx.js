// [HERO-SHOTS] Every hero shot and special drawn from the user's fx-hero-a / fx-hero-b sheets (#… prompts):
// arrows, boomerang, shell, flowers, inks, Splat Bomb, bombs, gust; spin ring, Spin Dash, Cape Swipe, Ink Gatling,
// Starfall meteor. Directional shots rotate to their travel angle; round ones spin. Code shapes stay as the fallback.
import { CONFIG } from '../config.js';
import { Pool } from '../engine/pool.js';
import { drawSprite, imgReady } from '../engine/atlas.js';

const F = CONFIG.SHOT_FX;
// ammo → [sheet, frame(s), size px, mode] — mode: 'dir' rotates to the travel angle, 'spin' turns, 'still' stays upright
const SHOT = {
  arrow: ['fx-hero-a', ['arrow'], F.ARROW, 'dir'], fireArrow: ['fx-hero-a', ['fire-arrow'], F.ARROW, 'dir'], iceArrow: ['fx-hero-a', ['ice-arrow'], F.ARROW, 'dir'],
  boomerang: ['fx-hero-a', ['boomerang-spinning-frame-1', 'boomerang-frame-2'], F.BOOMERANG, 'flip'],
  fireFlower: ['fx-hero-a', ['flower-shaped-fire-shot'], F.FLOWER, 'spin'], frostFlower: ['fx-hero-a', ['flower-shaped-frost-shot'], F.FLOWER, 'spin'],
  shellToss: ['fx-hero-a', ['spinning-shell'], F.SHELL, 'spin'],
  blaster: ['fx-hero-a', ['blue-paint-blob'], F.BLOB, 'dir'], emberInk: ['fx-hero-a', ['orange-ember-ink-blob'], F.BLOB, 'dir'], frostInk: ['fx-hero-a', ['pale-frost-ink-blob'], F.BLOB, 'dir'],
  splatBomb: ['fx-hero-a', ['round-paint-bomb'], F.BOMB, 'still'], bomb: ['fx-hero-b', ['round-bomb-with-lit'], F.BOMB, 'still'],
  gust: ['fx-hero-a', ['swirling-wind-gust'], F.GUST, 'spin'],
};
const BURST = { SPLAT: ['fx-hero-a', 'paint-bomb-splat-burst'], BOMB: ['fx-hero-b', 'meteor-impact-burst'] };

// frame drawn centred at (0, 0) at `size` world px (frames are 32 world px)
function centred(ctx, sheet, frame, size) { const s = size / 32; return drawSprite(ctx, sheet, frame, -16 * s, -16 * s, { scale: s }); }

// One projectile at screen (x, y). Returns false when the art is missing (caller draws its code shape).
export function drawShot(ctx, p, x, y) {
  const d = SHOT[p.ammo]; if (!d || !imgReady(d[0])) return false;
  const [sheet, frames, size, mode] = d, ang = Math.atan2(p.vy, p.vx);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  if (p.ammo === 'splatBomb' || p.ammo === 'bomb') { // a lobbed bomb: shadow on the ground, bomb riding the arc above it
    const a = SHOT_ARC(p); ctx.fillStyle = 'rgba(16,16,26,0.35)'; ctx.beginPath(); ctx.ellipse(0, 2, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.translate(0, -a);
  }
  if (mode === 'dir') ctx.rotate(ang);
  else if (mode === 'spin') ctx.rotate(p.t * F.SPIN);
  else if (mode === 'flip') ctx.rotate(p.t * F.SPIN * 1.5);
  centred(ctx, sheet, frames[Math.floor(p.t * F.FRAME_HZ) % frames.length], size);
  ctx.restore();
  if (p.ammo === 'blaster' || p.ammo === 'emberInk' || p.ammo === 'frostInk') { // a droplet trail
    const k = 0.5 + 0.5 * Math.sin(p.t * 40);
    ctx.save(); ctx.translate(Math.round(x - Math.cos(ang) * 9), Math.round(y - Math.sin(ang) * 9)); ctx.globalAlpha = 0.6 * k; centred(ctx, 'fx-hero-a', 'small-ink-droplet', F.DROP); ctx.restore();
  }
  return true;
}
function SHOT_ARC(p) { const life = p.t + Math.max(0, p.life); return life > 0 ? Math.sin(Math.min(1, p.t / life) * Math.PI) * F.ARC_H : 0; }

// --- one-shot bursts (splat, bomb blast, meteor impact) and special-move effects --------------------------------
const bursts = new Pool(24, () => ({ x: 0, y: 0, t: 0, life: 0, sheet: '', frame: '', size: 0, rot: 0, fall: 0 }));
export function shotBurst(x, y, tags) {
  const k = tags.includes('SPLAT') ? 'SPLAT' : tags.includes('BOMB') ? 'BOMB' : null; if (!k) return;
  const b = bursts.spawn(); if (b) Object.assign(b, { x, y, t: 0, life: F.BURST_S, sheet: BURST[k][0], frame: BURST[k][1], size: F.BURST, rot: 0, fall: 0 });
}
export function starfallFx(x, y) { // a meteor falls onto the zone, then the impact burst
  const b = bursts.spawn(); if (b) Object.assign(b, { x, y, t: 0, life: F.METEOR_S, sheet: 'fx-hero-b', frame: 'falling-meteor-with-star', size: F.METEOR, rot: 0, fall: F.METEOR_FALL });
}
export function updateShotFx(dt) {
  bursts.forEach((b) => {
    b.t += dt;
    if (b.t >= b.life) { const meteor = b.fall > 0; const { x, y } = b; bursts.kill(b); if (meteor) { const n = bursts.spawn(); if (n) Object.assign(n, { x, y, t: 0, life: F.BURST_S, sheet: 'fx-hero-b', frame: 'meteor-impact-burst', size: F.BURST * 1.6, rot: 0, fall: 0 }); } }
  });
}

// Specials around the hero (spin ring, Spin Dash, Cape Swipe) + the bursts. World layer, cam = { x, y }.
export function drawSpecialFx(ctx, hero, cam) {
  const hx = Math.round(hero.x - cam.x), hy = Math.round(hero.y - 8 - cam.y), art = imgReady('fx-hero-b');
  if (hero.spinFx > 0) {
    const k = hero.spinFx / 0.3, r = hero.spinR * (1 - k * 0.5);
    if (art) { ctx.save(); ctx.translate(hx, hy); ctx.rotate((1 - k) * 6); ctx.globalAlpha = Math.min(1, k * 2); centred(ctx, 'fx-hero-b', 'spin-attack-ring', r * 2.2); ctx.restore(); }
    else { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, r, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (hero.dash) { // Spin Dash: a spinning ring on Milo + speed lines behind him
    const v = Math.hypot(hero.dash.vx, hero.dash.vy) || 1, ux = hero.dash.vx / v, uy = hero.dash.vy / v;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { const ox = -uy * i * 6, oy = ux * i * 6; ctx.beginPath(); ctx.moveTo(hx - ux * 10 + ox, hy - uy * 10 + oy); ctx.lineTo(hx - ux * (24 + 6 * (i & 1)) + ox, hy - uy * (24 + 6 * (i & 1)) + oy); ctx.stroke(); }
    if (art) { ctx.save(); ctx.translate(hx, hy); ctx.rotate(performance.now() / 40); centred(ctx, 'fx-hero-b', 'spin-attack-ring', F.DASH_RING); ctx.restore(); }
  }
  if (hero.capeFx > 0) { // Cape Swipe: a wide red sweep in front of Milo
    const k = 1 - hero.capeFx / F.CAPE_S, rot = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[hero.facing] || 0;
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(rot + (k - 0.5) * 1.4); ctx.globalAlpha = Math.min(1, (1 - k) * 2);
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(208,40,64,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(4, 0, 20, -0.9, 0.9); ctx.stroke();
    if (art) { ctx.translate(14, 0); centred(ctx, 'fx-hero-b', 'sword-swing-arc', F.CAPE); }
    ctx.restore();
  }
  bursts.forEach((b) => {
    const k = b.t / b.life;
    ctx.save();
    if (b.fall > 0) { ctx.translate(Math.round(b.x - cam.x + b.fall * 0.5 * (1 - k)), Math.round(b.y - cam.y - b.fall * (1 - k))); }
    else { ctx.translate(Math.round(b.x - cam.x), Math.round(b.y - cam.y)); ctx.globalAlpha = Math.min(1, (1 - k) * 2.5); }
    if (!centred(ctx, b.sheet, b.frame, b.size * (b.fall > 0 ? 1 : 0.7 + k * 0.5))) { ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.arc(0, 0, 6 + k * 10, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  });
}
