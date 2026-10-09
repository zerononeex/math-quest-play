// Perf stress scene: 60 code-drawn sprites, 200 particles, full-screen tile layer, 10 labels.
import { CONFIG } from '../config.js';
import { Pool } from '../engine/pool.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function createStress(view) {
  const T = CONFIG.VIEW.TILE;
  const W = CONFIG.VIEW.W_MAX;
  const H = CONFIG.VIEW.H;
  const tiles = makeCanvas(W, H);
  const tc = tiles.getContext('2d');
  for (let y = 0; y < H / T; y++) {
    for (let x = 0; x < W / T; x++) {
      tc.fillStyle = (x + y) % 2 ? '#3c8c3c' : '#46a046';
      tc.fillRect(x * T, y * T, T, T);
      if ((x * 7 + y * 13) % 5 === 0) { tc.fillStyle = '#2a6a2a'; tc.fillRect(x * T + 4, y * T + 6, 3, 3); }
    }
  }
  const spr = makeCanvas(16, 16);
  const sc = spr.getContext('2d');
  sc.fillStyle = '#1a1a2a'; sc.fillRect(3, 1, 10, 14);
  sc.fillStyle = '#2aa8a0'; sc.fillRect(4, 6, 8, 8);
  sc.fillStyle = '#f0c8a0'; sc.fillRect(4, 2, 8, 5);
  const sprites = [];
  for (let i = 0; i < 60; i++) sprites.push({ x: (i * 53) % W, y: (i * 97) % H, vx: 30 + (i % 7) * 10, vy: 20 + (i % 5) * 12 });
  const parts = new Pool(200, () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0 }));
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const s of sprites) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < 0 || s.x > view.w - 16) s.vx = -s.vx;
        if (s.y < 0 || s.y > H - 16) s.vy = -s.vy;
      }
      parts.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) parts.kill(p); });
      while (parts.count < 200) {
        const p = parts.spawn();
        p.x = rnd() * view.w; p.y = rnd() * H; p.vx = (rnd() - 0.5) * 80; p.vy = (rnd() - 0.5) * 80; p.life = 0.5 + rnd() * 1.5;
      }
    },
    render(ctx) {
      ctx.drawImage(tiles, 0, 0);
      for (const s of sprites) ctx.drawImage(spr, s.x | 0, s.y | 0);
      ctx.fillStyle = '#fff7a0';
      parts.forEach((p) => ctx.fillRect(p.x | 0, p.y | 0, 2, 2));
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      for (let i = 0; i < 10; i++) ctx.fillText('Label ' + i + ' t=' + t.toFixed(1), 8 + (i % 5) * 130, 20 + ((i / 5) | 0) * 440);
    },
  };
}
