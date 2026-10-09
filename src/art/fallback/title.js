// [S57] Living title painting (SPEC 2.11), code-layered: dithered sky (prerendered once), twinkling star bits, 8 floating
// world-islands, the Wayfarer with its engine glow, drifting clouds and sparkles. Uses the atlas `title` sheet (frame `vista`)
// when an image is present (painted `image` frame, with the twinkles on top); this is its fallback.
import { ATLAS, drawSprite, imgReady } from '../../engine/atlas.js';

// [S59] A painted full-screen sheet (title / intro-1 / intro-2 / screen-*, frame `image`) drawn to cover the view, centred.
export function drawPainting(ctx, sheet, w, h) { return painted(ctx, sheet, w, h); }
function painted(ctx, sheet, w, h) {
  if (!imgReady(sheet)) return false;
  const f = ATLAS[sheet].meta.frames.image; if (!f) return false;
  const k = Math.max(w / f.w, h / f.h);
  return drawSprite(ctx, sheet, 'image', (w - f.w * k) / 2, (h - f.h * k) / 2, { scale: k });
}

// ground / top / accent per world (matches each world's palette)
const ISLANDS = [
  ['#58a848', '#68b858', '#3a8ad8'], ['#7ccc5a', '#90dc70', '#58b8f0'], ['#e8d8a0', '#f0e4b0', '#2a2a6a'], ['#f8d8e0', '#fce8ee', '#f070a0'],
  ['#4a8a3a', '#5a9a4a', '#3a7ab0'], ['#6ab04a', '#80c060', '#8ad0f0'], ['#b8c8e8', '#d0d8f0', '#f06020'], ['#3a3a6a', '#5a5a8a', '#a0e0ff'],
];
// island centres as fractions of the view (a loose ring around the logo, clear of the hero cards' middle)
const SPOTS = [[0.08, 0.22], [0.22, 0.12], [0.78, 0.12], [0.92, 0.22], [0.05, 0.62], [0.95, 0.62], [0.12, 0.9], [0.88, 0.9]];
const SKY = ['#0a1030', '#141a44', '#1e2458', '#2a2a6a', '#3a2a6a', '#4a2e6e'];

let skyCache = null;
function sky(w, h) {
  if (skyCache && skyCache.width === w && skyCache.height === h) return skyCache;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), band = Math.ceil(h / SKY.length);
  for (let i = 0; i < SKY.length; i++) {
    g.fillStyle = SKY[i]; g.fillRect(0, i * band, w, band);
    if (i + 1 < SKY.length) { // 16-bit style checker dither between bands
      g.fillStyle = SKY[i + 1];
      for (let y = (i + 1) * band - 6; y < (i + 1) * band; y += 2) for (let x = (y / 2) % 2 ? 0 : 2; x < w; x += 4) g.fillRect(x, y, 2, 2);
    }
  }
  // fixed far stars
  let s = 12345;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#c0c8ff';
  for (let i = 0; i < 90; i++) g.fillRect(Math.floor(rnd() * w), Math.floor(rnd() * h * 0.7), 1, 1);
  skyCache = c;
  return c;
}

function island(ctx, x, y, pal, s, k) {
  const [ground, top, acc] = pal;
  ctx.fillStyle = '#4a3020'; // rocky underside
  ctx.beginPath(); ctx.moveTo(x - 22 * s, y); ctx.lineTo(x + 22 * s, y); ctx.lineTo(x + 8 * s, y + 16 * s); ctx.lineTo(x, y + 24 * s); ctx.lineTo(x - 10 * s, y + 14 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ground; ctx.fillRect(x - 22 * s, y - 5 * s, 44 * s, 6 * s);
  ctx.fillStyle = top; ctx.fillRect(x - 20 * s, y - 7 * s, 40 * s, 3 * s);
  ctx.fillStyle = acc; ctx.fillRect(x - 6 * s + (k % 3) * 4 * s, y - 12 * s, 6 * s, 6 * s); // a landmark block in the world's accent
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 5 * s + (k % 3) * 4 * s, y - 11 * s, 2 * s, 2 * s);
}

function ship(ctx, x, y, t) {
  const glow = 0.5 + 0.5 * Math.sin(t * 8);
  ctx.fillStyle = `rgba(255,160,60,${0.35 + glow * 0.4})`; ctx.beginPath(); ctx.arc(x - 26, y + 2, 8 + glow * 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe070'; ctx.fillRect(x - 30, y - 1, 6, 6);
  ctx.fillStyle = '#c8d0e0'; ctx.beginPath(); ctx.moveTo(x - 24, y - 8); ctx.lineTo(x + 18, y - 6); ctx.lineTo(x + 30, y + 2); ctx.lineTo(x + 18, y + 10); ctx.lineTo(x - 24, y + 12); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a7a9a'; ctx.fillRect(x - 24, y + 6, 42, 6);
  ctx.fillStyle = '#e04a3a'; ctx.fillRect(x - 18, y - 14, 14, 6); // fin
  ctx.fillStyle = '#80d0ff'; for (let i = 0; i < 3; i++) ctx.fillRect(x - 8 + i * 9, y - 2, 5, 4); // portholes
}

// t = seconds since the title opened
export function drawTitleVista(ctx, w, h, t) {
  const art = painted(ctx, 'title', w, h);
  if (!art) ctx.drawImage(sky(w, h), 0, 0);
  // twinkling star bits
  for (let i = 0; i < 24; i++) {
    const a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7);
    if (a < 0.4) continue;
    ctx.fillStyle = `rgba(255,240,160,${a})`;
    const x = (i * 97) % w, y = (i * 53) % Math.floor(h * 0.75);
    ctx.fillRect(x, y, 2, 2); if (a > 0.9) { ctx.fillRect(x - 2, y, 6, 1); ctx.fillRect(x, y - 2, 1, 6); }
  }
  if (art) return; // the painting has its own islands, ship and clouds
  // far clouds drift left
  ctx.fillStyle = 'rgba(200,190,240,0.18)';
  for (let i = 0; i < 5; i++) { const x = ((i * 190 - t * (8 + i * 2)) % (w + 160) + w + 160) % (w + 160) - 80, y = 90 + i * 70; ctx.fillRect(x, y, 110, 10); ctx.fillRect(x + 20, y - 6, 60, 6); }
  // the eight world-islands bob gently
  for (let k = 0; k < 8; k++) island(ctx, SPOTS[k][0] * w, SPOTS[k][1] * h + Math.sin(t * 1.2 + k) * 4, ISLANDS[k], k < 4 ? 0.9 : 1.1, k);
  // the Wayfarer cruises across the sky
  const sx = ((t * 24) % (w + 160)) - 80, sy = h * 0.3 + Math.sin(t * 1.5) * 6;
  ship(ctx, sx, sy, t);
  // sparkles trailing the ship
  for (let i = 1; i < 6; i++) { ctx.fillStyle = `rgba(255,230,140,${0.8 - i * 0.14})`; ctx.fillRect(sx - 30 - i * 10, sy + 2 + Math.sin(t * 6 + i) * 3, 2, 2); }
  // near cloud bank at the bottom
  ctx.fillStyle = 'rgba(230,220,255,0.22)';
  for (let i = 0; i < 7; i++) { const x = ((i * 130 + t * 12) % (w + 140)) - 70; ctx.fillRect(x, h - 26 - (i % 3) * 6, 120, 26); }
}

// [S57] Intro cutscene panels (code-drawn): 0 = the Wayfarer crew aboard, 1 = the medallions scattering over the worlds.
const MEDAL = ['#e04a3a', '#f0a030', '#f0e040', '#50c050', '#40a0f0', '#8060e0', '#f070c0', '#ffffff'];
export function drawIntroPanel(ctx, w, h, i, t) {
  if (painted(ctx, 'intro-' + (i + 1), w, h)) return;
  ctx.drawImage(sky(w, h), 0, 0);
  if (i === 0) {
    // the Wayfarer, big, with three crew silhouettes at the portholes
    const x = w / 2, y = h * 0.42 + Math.sin(t * 1.5) * 4;
    ctx.save(); ctx.translate(x, y); ctx.scale(3, 3); ship(ctx, 0, 0, t); ctx.restore();
    ctx.fillStyle = '#10101a';
    for (let k = 0; k < 3; k++) { const cx = x - 24 + k * 27, cy = y - 10; ctx.fillRect(cx - 4, cy - 4, 9, 10); ctx.beginPath(); ctx.arc(cx, cy - 7, 5, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // eight medallions tumble down onto eight islands
    for (let k = 0; k < 8; k++) {
      const ix = (0.1 + k * 0.114) * w, iy = h * 0.7 + (k % 2) * 30;
      island(ctx, ix, iy, ISLANDS[k], 0.8, k);
      const fall = Math.min(1, (t * 0.6 + k * 0.07) % 1.6), mx = w / 2 + (ix - w / 2) * fall, my = h * 0.18 + (iy - 24 - h * 0.18) * fall;
      ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = MEDAL[k]; ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(mx - 3, my - 4, 2, 2);
    }
  }
}
