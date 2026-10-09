// Code-drawn dungeon tiles: floor, walls, framed doorways flush with the wall, stairs, pit, portal, chest.
import { DT } from '../../game/dungeon.js';
import { ATLAS, imgReady, opaqueBox, drawOpaque, codeArt } from '../../engine/atlas.js';
import { CONFIG } from '../../config.js';
import { framePal, hash, hex, mix } from '../../game/owpaint.js';
import { vaultSheet } from '../../game/treasure.js';

export function dungeonPainter(theme = {}) {
  const floor = theme.floor || '#5a5a6a', floor2 = theme.floor2 || '#52525f', wall = theme.wall || '#3a3040', top = theme.wallTop || '#6a5a70';
  return (g, t, px, py, tx, ty) => {
    const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(px + x, py + y, w, h); };
    switch (t) {
      case DT.WALL: f(wall, 0, 0, 16, 16); f(top, 0, 0, 16, 4); f('rgba(0,0,0,0.25)', 0, 15, 16, 1); break;
      case DT.DOOR: f(floor, 0, 0, 16, 16); f('#2a1a10', 0, 0, 2, 16); f('#2a1a10', 14, 0, 2, 16); break;
      case DT.STAIRS: f(floor, 0, 0, 16, 16); for (let i = 0; i < 4; i++) f('#8a8a9a', 1, i * 4, 14, 2); break;
      case DT.PIT: f('#05050a', 0, 0, 16, 16); break;
      case DT.PORTAL: f(floor, 0, 0, 16, 16); f('#8060ff', 2, 2, 12, 12); f('#e0d0ff', 6, 6, 4, 4); f('#ffffff', 3, 3, 2, 2); f('#ffffff', 11, 10, 2, 2); break;
      case DT.PORTAL_OFF: f(floor, 0, 0, 16, 16); f('#2a2a3a', 2, 2, 12, 12); f('#3a3a50', 6, 6, 4, 4); break;
      case DT.MEDAL: f(floor, 0, 0, 16, 16); f('#10101a', 3, 9, 10, 7); f('#8a8a9a', 4, 10, 8, 5); f('#10101a', 4, 1, 8, 8); f('#ffd040', 5, 2, 6, 6); f('#fff0a0', 6, 3, 2, 2); break; // medallion on its pedestal
      case DT.WATER: f('#2a5aa0', 0, 0, 16, 16); f('#4a7ac0', (tx * 5) % 12, (ty * 3) % 12, 4, 1); break;
      case DT.CHEST: f(floor, 0, 0, 16, 16); f('#10101a', 1, 3, 14, 12); f('#b07a2a', 2, 4, 12, 10); f('#ffd040', 7, 8, 2, 3); break;
      default: f((tx + ty) % 2 ? floor : floor2, 0, 0, 16, 16);
    }
  };
}

// Closed doors are drawn over the doorway (locked: keyhole; big: gold; math: star; sealed: bars).
// [R1-20/21] Every door stands UPRIGHT on every wall (user decision): the user's w<n>-dungeon-objects door frames, never
// rotated — open archway, locked, big-key, shutter (sealed / boss). The way out is its own door: stairs up with daylight.
const DOOR_FRAME = { open: 0, small: 1, math: 1, big: 2, sealed: 3, boss: 3, puzzle: 3, exit: 5 };
export function doorRect(side, w = 40, h = 30) { // the doorway's box in world px (2 tiles wide, on the wall)
  const T = 16, cx = (w >> 1) - 1, cy = (h >> 1) - 1;
  return { n: [cx * T, 0, 32, 4 * T], s: [cx * T, (h - 2) * T, 32, 2 * T], w: [0, cy * T, 2 * T, 32], e: [(w - 2) * T, cy * T, 2 * T, 32] }[side];
}
export function drawDoor(ctx, side, kind, cam, world, room = null) {
  const r = doorRect(side, (room && room.w) || 40, (room && room.h) || 30), x = r[0] - cam.x, y = r[1] - cam.y, w = r[2], h = r[3];
  const obj = 'w' + world + '-dungeon-objects', fi = DOOR_FRAME[kind] ?? 0;
  // foot of the door: the floor edge of its wall (top wall: its bottom; side walls: the gap's bottom; bottom wall: the map edge)
  const foot = side === 'n' ? y + h : side === 's' ? y + h : y + h;
  if (kind === 'exit') { const g = ctx.createRadialGradient(x + w / 2, foot - 16, 2, x + w / 2, foot - 16, 40); g.addColorStop(0, 'rgba(255,240,170,0.55)'); g.addColorStop(1, 'rgba(255,240,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - 24, foot - 56, w + 48, 64); }
  if (world && imgReady(obj)) {
    const b = opaqueBox(obj, Object.keys(ATLAS[obj].meta.frames)[fi]), dw = side === 'w' || side === 'e' ? 30 : 34, dh = Math.round((dw * b.h) / b.w);
    drawOpaque(ctx, obj, fi, Math.round(x + w / 2 - dw / 2), Math.round(foot - dh), dw, dh);
  } else {
    ctx.fillStyle = '#10101a'; ctx.fillRect(x, foot - 34, w, 34);
    ctx.fillStyle = kind === 'open' || kind === 'exit' ? '#2a1a10' : kind === 'big' ? '#b08a20' : kind === 'math' ? '#3a4aa0' : kind === 'sealed' ? '#505060' : '#7a4a2a'; ctx.fillRect(x + 2, foot - 32, w - 4, 32);
  }
  if (kind === 'math') { const cy = foot - 16; ctx.fillStyle = '#10101a'; ctx.fillRect(x + w / 2 - 7, cy - 7, 14, 14); ctx.fillStyle = '#ffe070'; ctx.font = 'bold 12px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x + w / 2, cy + 1); }
  if (kind === 'exit') { ctx.font = 'bold 11px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#10101a'; ctx.fillText('EXIT', x + w / 2 + 1, foot - 41); ctx.fillStyle = '#fff4b0'; ctx.fillText('EXIT', x + w / 2, foot - 42); }
}

// [R3-15] A royal treasure-room door (the W1 keep's vault): prompt #330 royal-vault frames 2 closed / 3 open, drawn bigger
// than a plain door; until that art exists, gold pillars, an arch and a crown keystone frame the plain door, with a warm glow.
export function drawRoyalDoor(ctx, side, open, cam, room, t, world = 1) {
  const r = doorRect(side, (room && room.w) || 40, (room && room.h) || 30), x = r[0] - cam.x, y = r[1] - cam.y, w = r[2], h = r[3], foot = y + h, cx = x + w / 2;
  const W = CONFIG.TREASURE.ROYAL_DOOR_W, a = 0.3 + 0.15 * Math.sin(t * 3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(cx, foot - 18, 4, cx, foot - 18, W); g.addColorStop(0, 'rgba(255,215,110,' + (open ? a + 0.15 : a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,215,110,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - W, foot - 18 - W, W * 2, W * 2); ctx.restore();
  const S = vaultSheet(world);
  if (imgReady(S)) { const n = Object.keys(ATLAS[S].meta.frames)[open ? 3 : 2], b = opaqueBox(S, n), dh = Math.round((W * b.h) / b.w); drawOpaque(ctx, S, open ? 3 : 2, Math.round(cx - W / 2), Math.round(foot - dh), W, dh); return; }
  codeArt('royal-door');
  const f = (c, a2, b2, ww, hh) => { ctx.fillStyle = c; ctx.fillRect(Math.round(a2), Math.round(b2), ww, hh); };
  for (const px of [cx - W / 2, cx + W / 2 - 7]) { f('#3a2a00', px, foot - 40, 7, 40); f('#ffd040', px + 1, foot - 39, 5, 38); f('#fff0a0', px + 2, foot - 39, 1, 38); f('#c08a10', px, foot - 6, 7, 6); } // gold pillars
  f('#3a2a00', cx - W / 2, foot - 44, W, 6); f('#ffd040', cx - W / 2 + 1, foot - 43, W - 2, 4); // lintel
  f('#3a2a00', cx - 7, foot - 52, 14, 9); f('#ffd040', cx - 6, foot - 51, 12, 7); f('#ffd040', cx - 6, foot - 55, 2, 4); f('#ffd040', cx - 1, foot - 56, 2, 5); f('#ffd040', cx + 4, foot - 55, 2, 4); f('#e03040', cx - 2, foot - 49, 4, 3); // crown keystone + gem
  ctx.fillStyle = '#ffffff'; const k = Math.floor(t * 3) % 4; ctx.fillRect(Math.round(cx - W / 2 + 2 + k * 11), Math.round(foot - 42), 2, 2); // a glint running along the lintel
}

// [V6] Dungeon rooms in the user's w<n>-dungeon colours (the cut tiles carry Gemini borders, so colours come from each
// tile's inner crop): flagstone floors with mortar + moss, brick wall faces with a lit top rim, the code look for the rest.
export function dungeonArtPainter(worldId, theme, mapRef) {
  const sheet = 'w' + worldId + '-dungeon';
  if (!imgReady(sheet)) return null;
  const fl = framePal(sheet, 0, null, 'df'), moss = framePal(sheet, 1, null, 'dm'), wf = framePal(sheet, 5, null, 'dw'), wt = framePal(sheet, 4, null, 'dt');
  if (!fl || !wf) return null;
  const fb2 = dungeonPainter({ ...theme, floor: hex(fl.base), floor2: hex(fl.base) }); // special tiles sit on the art floor
  const top = { base: mix(wf.dark, [20, 16, 24], 0.3), dark: mix(wf.dark, [10, 8, 14], 0.5), light: mix(wf.base, wf.light, 0.5) }; // wall tops in the face colours (some sheets' tops read as grass)
  const C = (c) => (typeof c === 'string' ? c : hex(c));
  // [W2 Phase 4] dungeon water: the sheet's frame 11 when it is a water tile (W1 murky water); otherwise (W2 frame 11 is a
  // spring floor) the world's own overworld liquid A (W2: the soda river), so a soda gap reads as soda
  const n11 = Object.keys(ATLAS[sheet].meta.frames)[11] || '', liqA = 'w' + worldId + '-liquid-a';
  const water = /water/.test(n11) || !imgReady(liqA) ? [sheet, 11] : [liqA, 0];
  return (g, t, px, py, tx, ty) => {
    const m = mapRef(), at = (x, y) => (m && m.inside(x, y) ? m.ground[y * m.w + x] : DT.WALL);
    const f = (c, x, y, w, h) => { g.fillStyle = C(c); g.fillRect(px + x, py + y, w, h); };
    if (t === DT.DOOR) { g.fillStyle = '#0c0806'; g.fillRect(px, py, 16, 16); return; } // [R1-21] a dark gap: the upright door art is drawn over it (drawDoor)
    if (t === DT.WALL) {
      const below = at(tx, ty + 1);
      if (below !== DT.WALL) { // front face: bricks, dark foot line, lit cap
        f(wf.base, 0, 0, 16, 16);
        for (let r = 0; r < 4; r++) { f(wf.dark, 0, r * 4 + 3, 16, 1); const o = (r + ty) % 2 ? 0 : 4; f(wf.dark, o, r * 4, 1, 3); f(wf.dark, o + 8, r * 4, 1, 3); }
        f(mix(wf.base, wf.light, 0.6), 0, 0, 16, 1); f([16, 12, 20], 0, 15, 16, 1);
      } else { // wall top
        f(mix(top.dark, [16, 12, 20], 0.3), 0, 0, 16, 16);
        const h = hash(tx, ty, 3); if (h % 4 === 0) f(top.base, (h >>> 4) % 12, (h >>> 9) % 12, 3, 2);
        if (at(tx, ty - 1) !== DT.WALL) f(top.light, 0, 0, 16, 2);
        if (at(tx - 1, ty) !== DT.WALL) f(top.light, 0, 0, 2, 16);
        if (at(tx + 1, ty) !== DT.WALL) f(top.light, 14, 0, 2, 16);
      }
      return;
    }
    // flagstones (2×2 per tile), mortar lines, per-stone tone, moss now and then; then the special tile on top
    f(fl.base, 0, 0, 16, 16);
    for (let k = 0; k < 4; k++) { const h = hash(tx * 2 + (k & 1), ty * 2 + (k >> 1), 7); if (h % 3 === 0) { g.globalAlpha = 0.25; f(h % 2 ? fl.light : fl.dark, (k & 1) * 8, (k >> 1) * 8, 8, 8); g.globalAlpha = 1; } }
    // staggered 16×8 stones, soft mortar (no tile grid)
    g.globalAlpha = 0.35; f(fl.dark, 0, 7, 16, 1); f(fl.dark, ty % 2 ? 7 : 15, 0, 1, 7); f(fl.dark, ty % 2 ? 15 : 7, 8, 1, 8); g.globalAlpha = 1;
    const h = hash(tx, ty, 11);
    if (moss && h % 13 === 0) { g.globalAlpha = 0.6; f(moss.base, (h >>> 3) % 10, (h >>> 7) % 10, 5, 3); g.globalAlpha = 1; }
    if (at(tx, ty - 1) === DT.WALL) { g.globalAlpha = 0.3; f([0, 0, 0], 0, 0, 16, 4); g.globalAlpha = 1; }
    // [A5] special tiles in the user's art (w<n>-dungeon water/pit, w<n>-dungeon-objects chest/stairs); the code look otherwise
    const obj = 'w' + worldId + '-dungeon-objects';
    if (t === DT.WATER && drawOpaque(g, ...water, px, py, 16, 16, 0.3)) return; // the pond frame's inner texture (its rim would grid the water)
    if (t === DT.PIT && drawOpaque(g, sheet, 10, px, py, 16, 16, 0.12)) return;
    if (t === DT.STAIRS && imgReady(obj) && drawOpaque(g, obj, 5, px, py, 16, 16, 0.04)) return;
    if (t === DT.CHEST && imgReady(obj)) { const b = opaqueBox(obj, Object.keys(ATLAS[obj].meta.frames)[7]), h = Math.round((16 * b.h) / b.w); if (drawOpaque(g, obj, 7, px, py + 16 - h, 16, h)) return; }
    if (t !== DT.FLOOR) { const keep = g.fillStyle; fb2(g, t, px, py, tx, ty); g.fillStyle = keep; }
  };
}
