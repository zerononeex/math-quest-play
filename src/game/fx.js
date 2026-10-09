// Non-blocking celebrations: confetti + floating text (pooled; never pauses the game).
import { Pool } from '../engine/pool.js';
import { font, drawOutlined } from '../engine/text.js';
import { drawSprite, imgReady } from '../engine/atlas.js';
import { updateShotFx } from './shotfx.js';

const COLORS = ['#ffe070', '#ff6a8a', '#60d0ff', '#80ff90', '#ffffff', '#c080ff'];
export const fx = { parts: new Pool(160, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, c: '' })), texts: new Pool(12, () => ({ x: 0, y: 0, life: 0, text: '', color: '' })) };

// [V2] hit sparks (user fx-hero-b sparkle) + a tiny screen shake read by Camera.follow.
export const shake = { t: 0, amp: 0 };
const sparks = new Pool(16, () => ({ x: 0, y: 0, life: 0 }));
export function hitSpark(x, y, amp = 2) {
  const p = sparks.spawn(); if (p) Object.assign(p, { x, y, life: 0.18 });
  shake.t = 0.12; shake.amp = Math.max(shake.t > 0 ? shake.amp : 0, amp);
}

export function confetti(x, y, n = 40, colors = COLORS) { // colors: e.g. a leaf burst
  for (let i = 0; i < n; i++) {
    const p = fx.parts.spawn(); if (!p) break;
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 90;
    Object.assign(p, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.8 + Math.random() * 0.6, c: colors[i % colors.length] });
  }
}

export function floatText(x, y, text, color = '#ffe070') {
  const t = fx.texts.spawn(); if (t) Object.assign(t, { x, y, text, color, life: 1.6 });
}

export function updateFx(dt) {
  updateShotFx(dt);
  sparks.forEach((p) => { p.life -= dt; if (p.life <= 0) sparks.kill(p); });
  if (shake.t > 0) shake.t -= dt;
  fx.parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.life -= dt; if (p.life <= 0) fx.parts.kill(p); });
  fx.texts.forEach((t) => { t.y -= 18 * dt; t.life -= dt; if (t.life <= 0) fx.texts.kill(t); });
}

export function drawFx(ctx, camX = 0, camY = 0) {
  sparks.forEach((p) => {
    const s = 0.6 + (0.18 - p.life) * 3;
    if (imgReady('fx-hero-b')) drawSprite(ctx, 'fx-hero-b', 'hit-spark', p.x - camX - 16 * s, p.y - camY - 16 * s, { scale: s });
    else { ctx.fillStyle = '#fff6a0'; ctx.fillRect(Math.round(p.x - camX - 3), Math.round(p.y - camY - 3), 6, 6); }
  });
  fx.parts.forEach((p) => { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), 2, 2); });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(8); // [P-A] drawn in the zoomed world layer (2×)
  fx.texts.forEach((t) => { ctx.globalAlpha = Math.min(1, t.life); drawOutlined(ctx, t.text, t.x - camX, t.y - camY, t.color); ctx.globalAlpha = 1; });
}
