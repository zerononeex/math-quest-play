// [DUNGEON-LIFE] Lively W1 dungeon rooms: hand-designed decor spots per room kind (corners, beside doors, along the
// walls — never in a door lane, on a puzzle piece, chest, stairs or water), breakable pots with a chance of a heart or
// coins, flickering braziers with soft light pools, water drips, a scurrying mouse, fireflies and dust motes.
// Art: w<n>-dungeon-life (W1 #326, W2 #335; frames in prompt order) when uploaded, else code-drawn shapes (every sprite has one).
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite, codeArt } from '../engine/atlas.js';
import { spawn } from './entities.js';
import { sfx } from '../engine/audio.js';

const L = CONFIG.DUNGEON_LIFE;
// art frame per piece (prompt order of w1-dungeon-life)
// (the delivered sheet has 24 frames: brazier ×2 flicker, drip ×3 + splash ×3, mouse ×2, firefly ×2 — mapped by index)
const ART = { pot: 0, potBroken: 1, barrel: 2, crates: 3, cobweb: 4, roots: 5, shrooms: 6, brazier: 7, brazier2: 8, drip: 9, splash: 12, moss: 15, rubble: 16, statue: 17, banner: 18, mouse: 19, mouse2: 20, firefly: 21, firefly2: 22, crack: 23 };
const SOLID = new Set(['pot', 'barrel', 'crates', 'statue', 'brazier']);
const WALL = new Set(['cobweb', 'roots', 'banner', 'drip']); // hang on the top wall's face (row TOP - 1)

// Decor layouts per room kind: [piece, x, y] with x / y measured from the floor's corners
// (x >= 0: from the left floor edge, x < 0: from the right; same for y from the top / bottom floor rows; 'c' = centre col).
const LAYOUTS = {
  entrance: [['brazier', 'c-3', -1], ['brazier', 'c+2', -1], ['banner', 'c-4', 'w'], ['banner', 'c+3', 'w'], ['pot', 0, 0], ['pot', 1, 0], ['moss', 3, 2], ['cobweb', -1, 'w'], ['rubble', -2, -1], ['shrooms', 0, -1]],
  key: [['pot', 0, 0], ['pot', 1, 0], ['pot', 0, 1], ['barrel', -1, 0], ['crates', -2, 0], ['roots', 4, 'w'], ['cobweb', 0, 'w'], ['shrooms', -1, -1], ['moss', 5, -2], ['drip', -5, 'w']],
  puzzle: [['statue', 0, 0], ['statue', -1, 0], ['brazier', 0, -1], ['brazier', -1, -1], ['cobweb', -1, 'w'], ['roots', 2, 'w'], ['moss', 2, -1], ['crack', -3, -2]],
  bigkey: [['pot', 0, 0], ['pot', 0, -1], ['pot', 1, -1], ['barrel', -1, -1], ['crates', -1, 0], ['banner', 'c-4', 'w'], ['banner', 'c+3', 'w'], ['shrooms', 2, 0], ['rubble', -3, -1], ['drip', 3, 'w']],
  bigchest: [['statue', 'c-4', 0], ['statue', 'c+3', 0], ['brazier', 0, 0], ['brazier', -1, 0], ['pot', 0, -1], ['pot', -1, -1], ['moss', 3, -2], ['banner', 2, 'w'], ['cobweb', -1, 'w']],
  normal: [['pot', 0, 0], ['pot', 1, 0], ['barrel', -1, -1], ['crates', -2, -1], ['roots', 3, 'w'], ['roots', -4, 'w'], ['shrooms', 0, -1], ['shrooms', -1, 0], ['moss', 6, -2], ['rubble', -6, 2], ['drip', 'c+5', 'w']],
  wave: [['pot', 0, 0], ['pot', -1, 0], ['brazier', 0, -1], ['brazier', -1, -1], ['cobweb', 0, 'w'], ['roots', -3, 'w'], ['rubble', 4, -2], ['moss', -5, 2]],
  // [W8 Phase 5] a boss room that opts in (room.life): Astronova's observatory — corner braziers, star banners, cracked tiles; the floor stays clear
  // (the fight camera puts the top rows under the HUD: nothing on the top wall or the first rows)
  observatory: [['brazier', 0, 3], ['brazier', -1, 3], ['brazier', 0, -1], ['brazier', -1, -1], ['statue', 0, 9], ['statue', -1, 9], ['statue', 0, 15], ['statue', -1, 15], ['crack', 5, 6], ['crack', -6, -3], ['moss', 'c+7', -2], ['rubble', 3, -1]],
};
const BOSS_LIFE = new Set(['observatory']);
const ROOM_KINDS = new Set(Object.keys(LAYOUTS).filter((k) => k !== 'observatory'));

// worlds whose w<n>-dungeon-life sheet is wired (24 frames, the ART order above) + that world's brazier glow
const LIFE_WORLDS = { 1: 'rgba(150,255,140,0.30)', 2: 'rgba(255,220,120,0.32)', 3: 'rgba(90,240,255,0.30)', 4: 'rgba(150,255,210,0.30)', 5: 'rgba(120,255,140,0.30)', 6: 'rgba(170,255,110,0.30)', 7: 'rgba(120,200,255,0.32)' , 8: 'rgba(255,224,120,0.32)'}; // W3: neon cyan; W4: mint sugar flame; W5: jungle-green flame; W6: lime spore flame; W7: sky-blue crystal flame; W8: gold starlight
export function lifeOn(dg, room) { return !!LIFE_WORLDS[dg.world] && ((ROOM_KINDS.has(room.type) && !room.boss) || BOSS_LIFE.has(room.life)); }

// Build a room's life once per visit. map: the room's TileMap (solid pieces are stamped into it).
export function createLife(dg, room, map, roomId, st, inter) {
  if (!lifeOn(dg, room)) return null;
  const W = map.w, H = map.h, TOP = 4, x0 = 2, x1 = W - 3, y0 = TOP, y1 = H - 3, cx = W >> 1, cy = H >> 1;
  const taken = new Set(), key = (x, y) => x + ',' + y;
  const keep = (x, y, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) taken.add(key(x + dx, y + dy)); };
  // keep clear: door lanes, chest + its approach, stairs, pit, puzzle / gate objects, water
  for (const side of Object.keys(room.doors || {}).concat(roomId === dg.start ? ['s'] : [])) {
    const lane = { n: [cx - 2, y0, cx + 1, y0 + 2], s: [cx - 2, y1 - 2, cx + 1, y1], w: [x0, cy - 2, x0 + 2, cy + 1], e: [x1 - 2, cy - 2, x1, cy + 1] }[side];
    for (let y = lane[1]; y <= lane[3]; y++) for (let x = lane[0]; x <= lane[2]; x++) taken.add(key(x, y));
    if (side === 'n') for (let x = cx - 2; x <= cx + 1; x++) taken.add(key(x, 'w')); // nothing hangs over the north doorway
  }
  const Y = room.Y || ((v) => v);
  if (room.chest) { keep(cx, Y(12), 1); keep(cx, Y(12) + 2, 1); }
  if (room.stairs) for (let y = -1; y <= 3; y++) for (let x = -1; x <= 2; x++) taken.add(key(room.stairs.x + x, room.stairs.y + y));
  if (room.pit) keep(room.pit.x + 1, room.pit.y + 1, 2);
  if (inter) for (const o of inter.list) keep(o.tx, o.ty, 1);
  for (const [, fx, fy] of room.foes || []) taken.add(key(fx, fy));
  const free = (x, y, wall) => wall ? x >= x0 && x <= x1 && !taken.has(key(x, 'w')) : x >= x0 && x <= x1 && y >= y0 && y <= y1 && !taken.has(key(x, y)) && !map.isSolid(x, y);
  const pos = (v, lo, hi, c) => (typeof v === 'string' ? c + Number(v.slice(1)) : v >= 0 ? lo + v : hi + v + 1);
  const pieces = [];
  for (const [k, ax, ay] of LAYOUTS[room.life || room.type]) {
    const wall = WALL.has(k);
    let x = pos(ax, x0, x1, cx), y = wall ? TOP - 1 : pos(ay, y0, y1, cy);
    if (!free(x, y, wall)) { // slide one or two tiles along the wall / inwards before giving up
      const alt = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]].map(([dx, dy]) => [x + dx, wall ? y : y + dy]).find(([a, b]) => free(a, b, wall));
      if (!alt) continue; [x, y] = alt;
    }
    if (wall) taken.add(key(x, 'w')); else keep(x, y, 0);
    const p = { k, tx: x, ty: y, solid: SOLID.has(k), broken: false, seed: (x * 7 + y * 13) % 17 };
    if (p.solid) map.solid[map.idx(x, y)] = 1;
    pieces.push(p);
  }
  // little life: a mouse along the bottom wall, fireflies, dust motes
  const mice = room.type === 'puzzle' ? [] : [{ x: (x0 + 3) * 16, y: (y1 + 1) * 16 - 2, dir: 1, t: 0, wait: 2 }];
  const flies = Array.from({ length: L.FIREFLIES }, (_, i) => ({ x: (x0 + 3 + ((i * 7) % (x1 - x0 - 5))) * 16, y: (y0 + 2 + ((i * 5) % (y1 - y0 - 3))) * 16, a: i * 1.7 }));
  const motes = Array.from({ length: L.MOTES }, (_, i) => ({ x: ((i * 97) % (W * 16)), y: ((i * 53) % (H * 16)), s: 0.3 + (i % 3) * 0.2 }));
  return { sheet: 'w' + dg.world + '-dungeon-life', glow: LIFE_WORLDS[dg.world], pieces, mice, flies, motes, t: 0, drips: pieces.filter((p) => p.k === 'drip').map((p) => ({ p, y: 0, t: p.seed / 10 })) };
}

// Re-stamp solid pieces after a room rebuild (doors opening, puzzles solved).
export function stampLife(life, map) { if (life) for (const p of life.pieces) if (p.solid && !p.broken) map.solid[map.idx(p.tx, p.ty)] = 1; }

// Per frame: a sword swing or a projectile next to a pot smashes it (sometimes a heart / coins); little life moves.
export function updateLife(life, cx, dt) {
  if (!life) return;
  life.t += dt;
  const { hero, map, ents, inter, world, projs } = cx;
  for (const p of life.pieces) {
    if (p.k !== 'pot' || p.broken) continue;
    const px = p.tx * 16 + 8, py = p.ty * 16 + 8;
    let hit = false;
    if (hero.swing) { const f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[hero.facing]; hit = Math.hypot(hero.x + f[0] * 14 - px, hero.y - 8 + f[1] * 14 - py) < L.POT_REACH; }
    if (!hit && projs) projs.forEach((q) => { if (Math.hypot(q.x - px, q.y - py) < 10) hit = true; });
    if (!hit) continue;
    p.broken = true; map.solid[map.idx(p.tx, p.ty)] = 0;
    if (inter && inter.base) inter.base.set(map.idx(p.tx, p.ty), 0);
    sfx('hit');
    const r = ((p.tx * 31 + p.ty * 17 + Math.floor(life.t * 10)) % 100) / 100;
    if (r < L.POT_HEART) spawn(ents, { kind: 'pickup', type: 'heart', value: 1, x: px - 4, y: py + 4, w: 8, h: 8, contact: false, life: CONFIG.DROPS.PICKUP_LIFE });
    else if (r < L.POT_HEART + L.POT_COIN) spawn(ents, { kind: 'pickup', type: 'coin', value: CONFIG.DROPS.COIN_VALUE[world - 1], x: px - 4, y: py + 4, w: 8, h: 8, contact: false, life: CONFIG.DROPS.PICKUP_LIFE });
  }
  for (const m of life.mice) { // scurry along the wall, pause, turn back
    if (m.wait > 0) { m.wait -= dt; continue; }
    m.x += m.dir * L.MOUSE_SPEED * dt; m.t += dt;
    if (m.t > 2.5 + (m.x % 3)) { m.t = 0; m.wait = 1.5; m.dir = -m.dir; }
    if (m.x < 3 * 16 || m.x > (map.w - 4) * 16) { m.dir = -m.dir; m.x = Math.max(3 * 16, Math.min((map.w - 4) * 16, m.x)); }
  }
  for (const d of life.drips) { d.t += dt; if (d.t > L.DRIP_S) { d.t = 0; d.y = 0; } d.y = d.t < L.DRIP_S * 0.6 ? 0 : (d.t - L.DRIP_S * 0.6) * 90; }
}

// Light pools under braziers / glowing mushrooms (drawn before the pieces), then the pieces, then motes + fireflies.
export function drawLife(ctx, life, cam) {
  if (!life) return;
  const t = life.t, S = life.sheet, art = imgReady(S);
  for (const p of life.pieces) if (p.k === 'brazier' || p.k === 'shrooms') {
    const x = p.tx * 16 + 8 - cam.x, y = p.ty * 16 + 8 - cam.y, r = (p.k === 'brazier' ? 34 : 22) + Math.sin(t * 7 + p.seed) * 2;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r); g.addColorStop(0, p.k === 'brazier' ? (art ? life.glow : 'rgba(255,190,90,0.35)') : 'rgba(120,200,255,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of life.pieces) {
    const x = Math.round(p.tx * 16 - cam.x), y = Math.round(p.ty * 16 - cam.y);
    const k = p.k === 'pot' && p.broken ? 'potBroken' : p.k;
    const fk = k === 'brazier' && Math.floor((t + p.seed) * 6) % 2 ? 'brazier2' : k; // the art flickers between its two flame frames
    if (art && drawArt(ctx, S, ART[fk], x + 8, WALL.has(k) ? y + 16 : y + 16)) continue;
    drawCode(ctx, k, x, y, t + p.seed);
  }
  for (const d of life.drips) { const x = d.p.tx * 16 + 8 - cam.x, y = (d.p.ty + 1) * 16 - cam.y + Math.min(d.y, 22); ctx.fillStyle = '#9ad8ff'; if (d.y < 22) ctx.fillRect(Math.round(x) - 1, Math.round(y), 2, 3); else if (!(art && drawArt(ctx, S, ART.splash + Math.min(2, Math.floor((d.y - 22) / 10)), x, y + 4))) { ctx.fillStyle = 'rgba(154,216,255,0.5)'; ctx.fillRect(Math.round(x) - 3, Math.round(y) + 2, 6, 1); } }
  for (const m of life.mice) {
    const x = Math.round(m.x - cam.x), y = Math.round(m.y - cam.y);
    if (art && drawArt(ctx, S, ART[m.wait > 0 || Math.floor(life.t * 8) % 2 ? 'mouse' : 'mouse2'], x, y, m.dir < 0)) continue;
    codeArt('life:mouse'); ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x - 3, y - 3, 6, 3); ctx.fillRect(x + (m.dir > 0 ? 3 : -5), y - 4, 2, 2); ctx.fillStyle = '#c08080'; ctx.fillRect(x + (m.dir > 0 ? -5 : 3), y - 2, 2, 1);
  }
  for (const m of life.motes) { const x = ((m.x + t * 6 * m.s) % (cam.w + 40)) - 20, y = m.y + Math.sin(t * m.s + m.x) * 6 - cam.y * 0.2; ctx.fillStyle = 'rgba(255,250,220,0.25)'; ctx.fillRect(Math.round(x), Math.round(y % cam.h), 1, 1); }
  for (const f of life.flies) {
    const x = f.x + Math.sin(t * 0.7 + f.a) * 24 - cam.x, y = f.y + Math.sin(t * 1.1 + f.a * 2) * 14 - cam.y, on = 0.5 + 0.5 * Math.sin(t * 3 + f.a);
    ctx.fillStyle = 'rgba(230,255,120,' + (0.25 * on).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    if (art) { ctx.globalAlpha = 0.5 + 0.5 * on; drawArt(ctx, S, ART[on > 0.5 ? 'firefly' : 'firefly2'], x, y + 3); ctx.globalAlpha = 1; continue; }
    ctx.fillStyle = 'rgba(250,255,170,' + (0.5 + 0.5 * on).toFixed(2) + ')'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}

function drawArt(ctx, S, i, cx, footY, flip = false) {
  const names = Object.keys(ATLAS[S].meta.frames); if (i >= names.length) return false;
  const f = ATLAS[S].meta.frames[names[i]], b = f.bb || [0, 0, f.w, f.h];
  if (flip) { ctx.save(); ctx.translate(Math.round(cx), 0); ctx.scale(-1, 1); drawSprite(ctx, S, names[i], Math.round(-f.w / 2), Math.round(footY - b[3])); ctx.restore(); return true; }
  return drawSprite(ctx, S, names[i], Math.round(cx - f.w / 2), Math.round(footY - b[3]));
}
function flame(ctx, x, y, t) {
  const h = 6 + Math.sin(t * 12) * 1.5 + Math.sin(t * 19) * 1;
  ctx.fillStyle = '#ff8020'; ctx.beginPath(); ctx.moveTo(x - 4, y + 2); ctx.quadraticCurveTo(x, y - h * 1.6, x + 4, y + 2); ctx.fill();
  ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.moveTo(x - 2, y + 2); ctx.quadraticCurveTo(x, y - h, x + 2, y + 2); ctx.fill();
}
// code-drawn pieces in one tile (x, y = the tile's top-left)
function drawCode(ctx, k, x, y, t) {
  codeArt('life:' + k); // [R2-19a] audit
  const f = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  switch (k) {
    case 'pot': f('#10101a', 2, 3, 12, 13); f('#b0703a', 3, 5, 10, 10); f('#d89050', 4, 6, 3, 6); f('#7a4a22', 4, 3, 8, 3); f('#10101a', 5, 2, 6, 2); break;
    case 'potBroken': f('#7a4a22', 2, 12, 4, 3); f('#b0703a', 8, 13, 5, 2); f('#d89050', 6, 10, 3, 2); break;
    case 'barrel': f('#10101a', 2, 1, 12, 15); f('#8a5a2a', 3, 2, 10, 13); f('#5a3a1a', 3, 5, 10, 1); f('#5a3a1a', 3, 11, 10, 1); f('#b0803a', 5, 2, 2, 13); break;
    case 'crates': f('#10101a', 1, 2, 14, 14); f('#a0703a', 2, 3, 12, 12); f('#6a4a20', 2, 8, 12, 1); f('#6a4a20', 7, 3, 1, 12); f('#c8985a', 3, 4, 3, 1); break;
    case 'statue': f('#10101a', 3, -6, 10, 22); f('#7a8a7a', 4, -5, 8, 20); f('#a0b0a0', 5, -3, 2, 2); f('#a0b0a0', 9, -3, 2, 2); f('#4a8a3a', 4, 6, 3, 4); f('#5a6a5a', 3, 13, 10, 3); break;
    case 'brazier': f('#10101a', 3, 6, 10, 10); f('#7a7a8a', 4, 7, 8, 4); f('#5a5a6a', 6, 11, 4, 5); flame(ctx, x + 8, y + 6, t); break;
    case 'shrooms': for (const [a, b] of [[3, 9], [8, 6], [10, 11]]) { f('#e0e8f0', a + 1, b + 2, 2, 4); f('#60c0ff', a, b, 4, 3); f('#c0f0ff', a + 1, b, 1, 1); } break;
    case 'moss': f('#4a7a3a', 1, 8, 7, 4); f('#5a9a44', 7, 10, 7, 4); f('#6aaa50', 3, 7, 3, 2); break;
    case 'rubble': f('#10101a', 2, 10, 6, 5); f('#8a8a8a', 3, 11, 4, 3); f('#10101a', 9, 12, 5, 4); f('#7a7a7a', 10, 13, 3, 2); f('#9a9a9a', 7, 14, 2, 2); break;
    case 'crack': ctx.strokeStyle = 'rgba(16,16,26,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 2, y + 4); ctx.lineTo(x + 7, y + 8); ctx.lineTo(x + 6, y + 13); ctx.moveTo(x + 7, y + 8); ctx.lineTo(x + 13, y + 9); ctx.stroke(); f('#4a8a3a', 7, 7, 2, 2); break;
    case 'cobweb': ctx.strokeStyle = 'rgba(235,235,245,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); for (const [a, b] of [[16, 0], [16, 10], [10, 16], [0, 16]]) { ctx.moveTo(x, y); ctx.lineTo(x + a, y + b); } ctx.moveTo(x + 6, y); ctx.quadraticCurveTo(x + 5, y + 5, x, y + 6); ctx.moveTo(x + 12, y); ctx.quadraticCurveTo(x + 10, y + 10, x, y + 12); ctx.stroke(); break;
    case 'roots': ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.quadraticCurveTo(x + 2, y + 10, x + 5, y + 18); ctx.moveTo(x + 10, y); ctx.quadraticCurveTo(x + 13, y + 8, x + 11, y + 14); ctx.stroke(); f('#4a8a3a', 4, 12, 3, 2); break;
    case 'banner': f('#10101a', 2, 0, 12, 15); f('#3a7a3a', 3, 1, 10, 12); f('#e0c060', 6, 4, 4, 4); f('#3a7a3a', 3, 13, 3, 2); f('#3a7a3a', 10, 13, 3, 2); break;
    case 'drip': f('#2a4a5a', 6, 12, 4, 3); break;
    default:
  }
}
