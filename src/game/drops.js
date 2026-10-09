// Drops: coins + hearts on kills (G08), Luck raises the chance (D25). Pickups are entities of kind 'pickup'.
import { CONFIG } from '../config.js';
import { spawn, box, overlap, remove } from './entities.js';
import { dropMult } from './stats.js';
import { floatText } from './fx.js';
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';

export function rollDrops(ents, e, world, luck, rng = Math.random) {
  const m = dropMult(luck);
  const out = [];
  if (rng() < CONFIG.DROPS.COIN * m) out.push(spawn(ents, { kind: 'pickup', type: 'coin', value: CONFIG.DROPS.COIN_VALUE[world - 1] * (e.elite ? 2 : 1), x: e.x - 4, y: e.y, w: 8, h: 8, contact: false, life: CONFIG.DROPS.PICKUP_LIFE }));
  if (rng() < CONFIG.DROPS.HEART * m) out.push(spawn(ents, { kind: 'pickup', type: 'heart', value: 1, x: e.x + 4, y: e.y, w: 8, h: 8, contact: false, life: CONFIG.DROPS.PICKUP_LIFE }));
  return out;
}

export function collectPickups(ents, heroBox, data, dt) {
  const R = CONFIG.DROPS.PICKUP_REACH || 0, reach = { x: heroBox.x - R, y: heroBox.y - R, w: heroBox.w + 2 * R, h: heroBox.h + 2 * R }; // [R3-2] walking near a coin/heart is enough
  for (const p of ents.list) {
    if (!p.alive || p.kind !== 'pickup') continue;
    p.life -= dt;
    if (p.life <= 0) { remove(ents, p); continue; }
    if (!overlap(box(p), reach)) continue;
    if (p.type === 'coin') { data.gold += p.value; floatText(p.x, p.y - 10, '+' + p.value, '#ffd040'); }
    if (p.type === 'heart') data.hearts = Math.min(data.maxHearts, data.hearts + p.value);
    remove(ents, p);
  }
}

// [R1-2] Pickups drawn from the user's ui-hud-icons (coin, heart), bobbing on a small shadow; feet at (e.x+w/2, e.y+h).
const PICK_ICON = { coin: 'gold-coin', heart: 'full-heart' };
export function drawPickup(ctx, e, cam) {
  const cx = e.x + e.w / 2 - cam.x, fy = e.y + e.h - cam.y, bob = Math.round(Math.sin(performance.now() / 180 + e.x) * 1.5), size = CONFIG.DROPS.ICON_PX;
  if (e.life != null && e.life < 2 && Math.floor(performance.now() / 100) % 2) return; // blinks before it goes
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx, fy, size * 0.4, size * 0.15, 0, 0, Math.PI * 2); ctx.fill();
  const n = PICK_ICON[e.type], f = n && imgReady('ui-hud-icons') && ATLAS['ui-hud-icons'].meta.frames[n];
  if (f) { const k = size / Math.max(f.w, f.h); drawSprite(ctx, 'ui-hud-icons', n, Math.round(cx - (f.w * k) / 2), Math.round(fy - 2 - f.h * k + bob), { scale: k }); return; }
  ctx.fillStyle = e.type === 'coin' ? '#ffd040' : '#e83040'; ctx.beginPath(); ctx.arc(cx, fy - size / 2 + bob, size / 2, 0, Math.PI * 2); ctx.fill(); // code fallback (round, never a square)
}

