// World map (M / pause → Map): discovered cells, region names, player marker, marks (dungeons, relic hints, Star Compass).
import { layoutBegin, record } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { pressed, input } from '../engine/input.js';
import { overworldNextStep, dungeonNextStep } from '../game/nextstep.js';
import { CELL } from '../game/overworld.js';
import { CONFIG } from '../config.js';
import { secretKey } from '../game/secrets.js';
import { codeArt } from '../engine/atlas.js';

const CPX = CELL * CONFIG.VIEW.TILE; // one macro cell in pixels

const PAD = 14;
const rgb = (h) => h.match(/\w\w/g).map((v) => parseInt(v, 16));
const shade = (h, k) => '#' + rgb(h).map((v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
const rnd = (x, y, s) => { let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h >>> 0) / 4294967296; };

// [V4b] The chart: parchment + wooden frame (ship-map look), each seen cell drawn as terrain in the world's palette
// (forest canopies, cliff ridges, waves, dotted roads, a little town), unexplored cells under soft drifting fog.
function paintChart(ow, sk, W, H, cs, seen) {
  const P = ow.world.palette, cw = cs * W + PAD * 2, ch = cs * H + PAD * 2;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  // wooden frame + parchment with stains and a burnt edge
  g.fillStyle = '#5a3420'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#3a2014'; for (let y = 3; y < ch; y += 7) g.fillRect(0, y, cw, 1);
  g.fillStyle = '#10101a'; g.fillRect(PAD - 3, PAD - 3, cw - 2 * PAD + 6, ch - 2 * PAD + 6);
  g.fillStyle = '#e8d3a2'; g.fillRect(PAD - 2, PAD - 2, cw - 2 * PAD + 4, ch - 2 * PAD + 4);
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(150,110,60,' + (0.04 + rnd(i, 1, 9) * 0.06) + ')'; g.beginPath(); g.arc(PAD + rnd(i, 2, 9) * (cw - 2 * PAD), PAD + rnd(i, 3, 9) * (ch - 2 * PAD), 6 + rnd(i, 4, 9) * 26, 0, Math.PI * 2); g.fill(); }
  for (const [x, y] of [[4, 4], [cw - 12, 4], [4, ch - 12], [cw - 12, ch - 12]]) { g.fillStyle = '#c0a060'; g.fillRect(x, y, 8, 8); g.fillStyle = '#10101a'; g.fillRect(x + 3, y + 3, 2, 2); }
  const X = (x) => PAD + x * cs, Y = (y) => PAD + y * cs, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : sk[y][x]);
  const land = P.ground, ink = '#4a3018';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!seen.has(y * W + x)) continue;
    const t = sk[y][x], px = X(x), py = Y(y);
    const water = t === '~' ? P.liqA : t === '=' ? P.liqB : null;
    g.fillStyle = water || (t === '^' || t === 'H' || t === 'v' ? shade(P.cliff, 1.15) : land);
    g.fillRect(px, py, cs, cs);
    if (!water) { g.fillStyle = shade(land, 0.85); for (let i = 0; i < 3; i++) g.fillRect(px + rnd(x, y, 40 + i) * (cs - 3), py + rnd(x, y, 50 + i) * (cs - 3), 2, 2); }
    if (water) { g.fillStyle = shade(water, 1.35); for (let i = 0; i < 2; i++) g.fillRect(px + 3 + rnd(x, y, i) * (cs - 10), py + 4 + i * cs / 2, 6, 1); continue; }
    if (t === '#' || t === 'o') { for (let i = 0; i < 3; i++) { const tx = px + 4 + rnd(x, y, i + 3) * (cs - 8), ty = py + 4 + rnd(x, y, i + 6) * (cs - 8); g.fillStyle = shade(P.tree, 0.7); g.beginPath(); g.arc(tx, ty + 1, cs / 5, 0, Math.PI * 2); g.fill(); g.fillStyle = P.treeTop || P.tree; g.beginPath(); g.arc(tx, ty, cs / 5.5, 0, Math.PI * 2); g.fill(); } }
    if (t === '^' || t === 'H') { g.strokeStyle = ink; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < 3; i++) { const bx = px + (i + 0.5) * cs / 3; g.moveTo(bx - cs / 7, py + cs * 0.7); g.lineTo(bx, py + cs * 0.3); g.lineTo(bx + cs / 7, py + cs * 0.7); } g.stroke(); }
    if (t === 'H') { g.fillStyle = shade(P.cliffTop, 1.2); for (let i = 0; i < 3; i++) g.fillRect(px + cs * 0.35, py + cs * (0.2 + i * 0.25), cs * 0.3, 2); }
    if (t === 'v') { g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 2, py + cs / 2); g.lineTo(px + cs - 2, py + cs / 2); g.stroke(); }
    const road = (t === ':' || t === 'T' || t === 'S' || /[1-4BR]/.test(t));
    if (road) { // dotted trail toward road neighbours
      g.fillStyle = shade(P.path, 0.75);
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const n = at(x + dx, y + dy); if (!(n === ':' || n === 'T' || n === 'S' || n === 'H' || /[1-4BR]/.test(n))) continue; for (let k = 0; k < 3; k++) g.fillRect(px + cs / 2 + dx * k * cs / 6 - 1.5, py + cs / 2 + dy * k * cs / 6 - 1.5, 3, 3); }
    }
    if (t === 'T') { const hx = px + cs / 2, hy = py + cs / 2; g.fillStyle = '#c84a30'; g.beginPath(); g.moveTo(hx - 7, hy - 1); g.lineTo(hx, hy - 8); g.lineTo(hx + 7, hy - 1); g.fill(); g.fillStyle = '#f0e0c0'; g.fillRect(hx - 5, hy - 1, 10, 7); g.fillStyle = ink; g.fillRect(hx - 1, hy + 2, 3, 4); }
    if (t === 'S') { g.strokeStyle = '#a07a30'; g.lineWidth = 2; g.beginPath(); g.arc(px + cs / 2, py + cs / 2, cs / 4, 0, Math.PI * 2); g.stroke(); }
  }
  // soft fog over the unexplored (layered translucent puffs, no flat blocks), kept inside the parchment
  g.save(); g.beginPath(); g.rect(PAD - 2, PAD - 2, cw - 2 * PAD + 4, ch - 2 * PAD + 4); g.clip();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (seen.has(y * W + x)) continue;
    for (let i = 0; i < 2; i++) {
      const fx = X(x) + cs / 2 + (rnd(x, y, 20 + i) - 0.5) * cs * 0.6, fy = Y(y) + cs / 2 + (rnd(x, y, 30 + i) - 0.5) * cs * 0.6;
      const gr = g.createRadialGradient(fx, fy, 0, fx, fy, cs * 0.95);
      gr.addColorStop(0, 'rgba(236,226,200,0.75)'); gr.addColorStop(1, 'rgba(236,226,200,0)');
      g.fillStyle = gr; g.fillRect(fx - cs, fy - cs, cs * 2, cs * 2);
    }
  }
  g.restore();
  // compass rose (bottom-right)
  const rx = cw - PAD - cs * 1.4, ry = ch - PAD - cs * 1.4, r = cs * 1.1;
  g.fillStyle = '#7a5a30'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.4 : r; g.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr); } g.closePath(); g.fill();
  g.fillStyle = '#e8d3a2'; g.beginPath(); g.arc(rx, ry, r * 0.18, 0, Math.PI * 2); g.fill();
  g.fillStyle = ink; g.font = 'bold ' + Math.round(cs * 0.5) + 'px monospace'; g.textAlign = 'center'; g.fillText('N', rx, ry - r - 2);
  return c;
}


// seen cells are keyed cy × width + cx (width = the world's sketch width: 24 for W1–W6, 30 W7, 36 W8 [D45])
export function markSeen(data, world, cx, cy, width = 24) {
  const w = data.worlds[world - 1];
  if (!w.seen) w.seen = [];
  const k = cy * width + cx;
  if (!w.seen.includes(k)) w.seen.push(k);
}

// [R2-19] The explored land is the real painted overworld in miniature (TileMap.mini: ground chunks as they were painted
// for play, plus the live-drawn buildings, castle, landmarks and big trees from opts.drawStatic), clipped to the seen
// cells; the parchment chart stays under it (cells not painted yet) and its fog over the unexplored.
export function createMap(view, data, ow, heroPos, onClose, opts = {}) {
  const s = { name: 'map', modal: true }, M = ow.map;
  const seenRects = () => (data.worlds[ow.world.id - 1].seen || []).map((k) => { const W = ow.world.sketch[0].length, cx = k % W, cy = Math.floor(k / W); return [cx * CPX, cy * CPX, (cx + 1) * CPX, (cy + 1) * CPX]; });
  s.update = () => {
    if (pressed('map') || pressed('pause') || input.pointer.tapped) { onClose(); return; }
    if (M.mini && M.fillMini(seenRects(), 1)) s.filling = true; // seen land from earlier visits: one chunk per frame
  };
  s.render = (ctx) => {
    layoutBegin();
    const sk = ow.world.sketch, W = sk[0].length, H = sk.length;
    const cs = Math.floor(Math.min((view.w - 60) / W, (view.h - 110) / H));
    const x0 = Math.round((view.w - cs * W) / 2), y0 = 70;
    const wd = data.worlds[ow.world.id - 1];
    const seen = new Set(wd.seen || []);
    // [V4b] parchment explorer's chart (painted once per opening): wood frame, terrain in the world's colours, soft fog
    if (!s.chart || s.chart.cs !== cs || s.chart.vw !== view.w) s.chart = { cs, vw: view.w, canvas: paintChart(ow, sk, W, H, cs, seen) };
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.drawImage(s.chart.canvas, x0 - 14, y0 - 14);
    if (M.mini) {
      if (!s.overlay && opts.drawStatic) { const k = M.mini.k, c = document.createElement('canvas'); c.width = M.mini.canvas.width; c.height = M.mini.canvas.height; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.scale(k, k); opts.drawStatic(g); s.overlay = c; }
      ctx.save(); ctx.beginPath(); for (const k of seen) ctx.rect(x0 + (k % W) * cs, y0 + Math.floor(k / W) * cs, cs, cs); ctx.clip();
      ctx.imageSmoothingEnabled = true; ctx.drawImage(M.mini.canvas, x0, y0, cs * W, cs * H); if (s.overlay) ctx.drawImage(s.overlay, x0, y0, cs * W, cs * H);
      ctx.restore(); ctx.imageSmoothingEnabled = false;
      ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 1, y0 - 1, cs * W + 2, cs * H + 2);
    } else codeArt('map-terrain');
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // marks: dungeon entrances (once seen), boss, relic (hint heard or Star Compass)
    const f = ow.feat;
    const mark = (e, label, color, show) => { if (!e || !show) return; const mx = x0 + e.cx * cs + cs / 2, my = y0 + e.cy * cs + cs / 2; ctx.fillStyle = '#10101a'; ctx.fillRect(mx - 7, my - 7, 14, 14); ctx.fillStyle = color; ctx.fillRect(mx - 6, my - 6, 12, 12); ctx.font = font(10); drawOutlined(ctx, label, mx, my + 1, '#ffffff', '#10101a', 1); record('mark', 'mark-' + label, mx - 7, my - 7, 14, 14); };
    for (const [k, e] of Object.entries(f.dungeons)) mark(e, k, '#3a3a8a', seen.has(e.cy * W + e.cx));
    mark(f.boss, 'B', '#8a2a2a', seen.has(f.boss.cy * W + f.boss.cx));
    const relicKnown = (data.mapMarks || []).includes('relic-w' + ow.world.id) || data.tools.includes('starCompass');
    mark(f.relic, 'R', '#8a3aa8', relicKnown);
    // [S55] the Star Compass also points out every secret nook not yet emptied
    if (data.tools.includes('starCompass')) for (const s of f.secrets) mark(s, '*', '#b08a10', !(data.secrets || []).includes(secretKey(ow.world.id, s)));
    // region names
    ctx.font = font(11);
    for (const r of ow.regions) drawOutlined(ctx, r.name, x0 + ((r.x0 + r.x1 + 1) / 2) * cs, y0 + ((r.y0 + r.y1 + 1) / 2) * cs, '#ffffff', '#10101a', 1);
    // [D40] next step: a glowing gold star + one line in words
    const next = overworldNextStep(data, ow, { cx: Math.floor(heroPos.x / CPX), cy: Math.floor(heroPos.y / CPX) });
    if (next) {
      const sx = x0 + next.cx * cs + cs / 2, sy = y0 + next.cy * cs + cs / 2, glow = 0.5 + 0.5 * Math.sin(performance.now() / 200);
      ctx.fillStyle = 'rgba(255,220,64,' + (0.25 + 0.35 * glow) + ')'; ctx.beginPath(); ctx.arc(sx, sy, cs * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.font = font(Math.max(16, cs)); drawOutlined(ctx, '★', sx, sy + 1, '#ffd020');
      record('mark', 'next-step', sx - cs / 2, sy - cs / 2, cs, cs);
      ctx.font = font(14); drawOutlined(ctx, next.label, view.w / 2, y0 + cs * H + 22, '#ffe070');
      record('text', 'next-hint', view.w / 2 - 150, y0 + cs * H + 12, 300, 20);
    }
    // [D40] you are here: a big blinking marker with a facing arrow
    const hx = x0 + (heroPos.x / CPX) * cs, hy = y0 + (heroPos.y / CPX) * cs;
    const on = Math.floor(performance.now() / 350) % 2 === 0;
    ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = on ? '#ff3030' : '#ffffff'; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
    const [fx, fy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[heroPos.facing || 'down'];
    ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.moveTo(hx + fx * 16, hy + fy * 16); ctx.lineTo(hx + fx * 8 - fy * 5, hy + fy * 8 + fx * 5); ctx.lineTo(hx + fx * 8 + fy * 5, hy + fy * 8 - fx * 5); ctx.fill();
    ctx.font = font(11); drawOutlined(ctx, 'You are here', hx, hy - 16, '#ffffff');
    record('mark', 'you-are-here', hx - 8, hy - 8, 16, 16);
    ctx.font = font(18); drawOutlined(ctx, ow.world.name, view.w / 2, 36, '#ffe070');
    ctx.font = font(12); drawOutlined(ctx, 'M or tap to close', view.w / 2, view.h - 16, '#c0d0ff');
    record('panel', 'map-panel', x0 - 8, y0 - 8, cs * W + 16, cs * H + 16);
  };
  return s;
}

// [D40] Dungeon map: one grid per floor — visited rooms, the current room, stairs, the boss room once found, the next step.
export function createDungeonMap(view, d, onClose) {
  const s = { name: 'map', modal: true, dungeon: true };
  s.update = () => { if (pressed('map') || pressed('pause') || input.pointer.tapped) onClose(); };
  s.render = (ctx) => {
    layoutBegin();
    ctx.fillStyle = '#10182a'; ctx.fillRect(0, 0, view.w, view.h);
    const rooms = d.dg.rooms, st = d.st, floors = d.dg.floors || ['1F'];
    const next = dungeonNextStep(d);
    const cell = 34, gap = 24;
    const seen = new Set(st.visited || []);
    const shown = (id) => seen.has(id) || Object.values(rooms[id].doors || {}).some((x) => seen.has(x.to)); // visited or next door to one
    let ox = Math.round(view.w / 2 - (floors.length * (5 * cell + gap)) / 2), maxY = 0;
    floors.forEach((fl) => {
      ctx.font = font(13); ctx.textAlign = 'center'; drawOutlined(ctx, fl, ox + 2.5 * cell, 78, fl === d.room.floor ? '#ffe070' : '#c0d0ff');
      for (const [id, r] of Object.entries(rooms)) {
        if (r.floor !== fl || !shown(id)) continue;
        const x = ox + r.gx * cell, y = 92 + r.gy * cell; maxY = Math.max(maxY, y + cell);
        ctx.fillStyle = '#10101a'; ctx.fillRect(x, y, cell - 4, cell - 4);
        ctx.fillStyle = id === d.roomId ? '#f0c040' : seen.has(id) ? '#6a7aa0' : '#3a3a4a'; ctx.fillRect(x + 2, y + 2, cell - 8, cell - 8);
        if (r.stairs) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + cell - 12, y + 4, 6, 6); }
        if (r.type === 'sub' && seen.has(id)) { ctx.font = font(12); drawOutlined(ctx, 'B', x + (cell - 4) / 2, y + (cell - 4) / 2 + 1, '#ff6060'); }
        if (next && next.roomId === id) { ctx.font = font(16); drawOutlined(ctx, '★', x + (cell - 4) / 2, y + (cell - 4) / 2 + 1, '#ffd020'); record('mark', 'next-step', x, y, cell - 4, cell - 4); }
        if (id === d.roomId) record('mark', 'you-are-here', x, y, cell - 4, cell - 4);
      }
      ox += 5 * cell + gap;
    });
    ctx.textAlign = 'center';
    ctx.font = font(18); drawOutlined(ctx, d.dg.name, view.w / 2, 40, '#ffe070');
    if (next) { ctx.font = font(14); drawOutlined(ctx, next.label, view.w / 2, Math.max(maxY, 200) + 26, '#ffe070'); record('text', 'next-hint', view.w / 2 - 150, Math.max(maxY, 200) + 16, 300, 20); }
    ctx.font = font(12); drawOutlined(ctx, 'Gold = you are here · M or tap to close', view.w / 2, view.h - 16, '#c0d0ff');
    record('panel', 'map-panel', 0, 60, view.w, view.h - 90);
  };
  return s;
}
