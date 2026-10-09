// [V5] Building interiors from the user's w<n>-interior (colours), w<n>-furniture, w<n>-shop and w<n>-lights sheets.
// Walls/floor are code-drawn in the sheet's own colours (the cut tiles carry Gemini borders); furniture is the user's
// transparent 32×32 sprites, laid out per building kind (shop: counter the shopkeeper stands behind; inn; home). Paint only.
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';
import { framePal, hash, hex, mix } from './owpaint.js';

const WALL = 16, PAD = 12; // TILE.WALL / TILE.PAD (kept numeric: towns.js imports this file's user)
const fname = (sheet, i) => { const a = ATLAS[sheet]; if (!a || !a.ready) return null; const k = Object.keys(a.meta.frames); return i < k.length ? k[i] : null; };
const spr = (g, sheet, i, x, y) => { const n = fname(sheet, i); if (n) drawSprite(g, sheet, n, x, y); };

// Furniture per kind: [sheet key, frame, tile x, tile y (sprite bottom row)]. Room floor is x 1..12, y 2..8; rug at 6–7,8.
const LAYOUT = {
  shop: [['shop', 2, 1, 3], ['shop', 4, 3, 3], ['shop', 4, 9, 3], ['shop', 3, 11, 3], ['shop', 0, 5, 4], ['shop', 0, 7, 4], ['shop', 1, 9, 4], ['shop', 5, 2, 7], ['shop', 8, 11, 8], ['furniture', 9, 1, 8], ['furniture', 8, 11, 6]],
  inn: [['shop', 9, 6, 4], ['shop', 10, 1, 5], ['shop', 10, 11, 5], ['furniture', 3, 1, 3], ['furniture', 9, 11, 3], ['furniture', 0, 3, 7], ['furniture', 1, 2, 7], ['shop', 11, 10, 8], ['furniture', 8, 1, 8]],
  home: [['furniture', 3, 1, 3], ['furniture', 4, 11, 3], ['furniture', 11, 4, 3], ['furniture', 2, 11, 6], ['furniture', 0, 6, 5], ['furniture', 1, 4, 5], ['furniture', 1, 8, 5], ['furniture', 5, 2, 6], ['furniture', 9, 1, 8], ['furniture', 14, 10, 8], ['furniture', 6, 9, 3]],
};
// [SOLID FURNITURE] every piece blocks its base footprint (bottom row, sprite width); the shopkeeper's counter included
export function interiorSolids(b, town, worldId, map) {
  const kind = interiorKind(b, town), w = 'w' + worldId;
  for (const [sh, i, x, y] of LAYOUT[kind]) {
    const sheet = w + '-' + sh, n = fname(sheet, i); if (!n) continue;
    const f = ATLAS[sheet].meta.frames[n], cx = x * 16 + 16, x0 = Math.floor((cx - f.w / 2 + 3) / 16), x1 = Math.floor((cx + f.w / 2 - 3) / 16);
    for (let tx = x0; tx <= x1; tx++) if (map.inside(tx, y) && map.ground[y * map.w + tx] !== PAD) map.solid[y * map.w + tx] = 1;
  }
}
// Pieces whose base is below the hero's feet are drawn again over him, so he walks BEHIND tall shelves (y-sorted).
export function drawInteriorFront(ctx, b, town, worldId, cam, heroY) {
  const kind = interiorKind(b, town), w = 'w' + worldId;
  for (const [sh, i, x, y] of LAYOUT[kind]) {
    if ((y + 1) * 16 <= heroY) continue;
    const sheet = w + '-' + sh, n = fname(sheet, i); if (!n) continue;
    const f = ATLAS[sheet].meta.frames[n];
    drawSprite(ctx, sheet, n, Math.round(x * 16 + 16 - f.w / 2 - cam.x), Math.round((y + 1) * 16 - f.h - cam.y));
  }
}
export function interiorKind(b, town) {
  const t = (b.id + ' ' + b.name).toLowerCase();
  if (town && town.npcs.some((n) => n.inside === b.id && n.shop)) return 'shop';
  if (/shop|store|bakery|market/.test(t)) return 'shop';
  if (/inn|lodge|mooring|harbor|ferry|post/.test(t)) return 'inn';
  return 'home';
}
export function interiorArtReady(worldId) { return imgReady('w' + worldId + '-interior') && imgReady('w' + worldId + '-furniture'); }

export function interiorPasses(b, town, worldId, map) {
  const w = 'w' + worldId, S = { interior: w + '-interior', furniture: w + '-furniture', shop: w + '-shop', lights: w + '-lights' };
  const fb = (c) => ({ base: c, dark: mix(c, [0, 0, 0], 0.35), light: mix(c, [255, 255, 255], 0.3) });
  const floor = framePal(S.interior, 1, null, 'fl') || fb([168, 128, 88]);
  const wall = framePal(S.interior, 5, null, 'wa') || fb([122, 90, 58]);
  const rug0 = framePal(S.interior, 2, (c) => c[0] > c[2] + 30, 'rg') || fb([176, 64, 64]);
  const rug = { base: mix(rug0.base, [176, 64, 64], 0.5), dark: mix(rug0.dark, [110, 36, 40], 0.5), light: mix(rug0.light, [230, 190, 110], 0.5) }; // warm rug even if the sheet's is pale
  const fill = (g, c, x, y, ww, hh) => { g.fillStyle = typeof c === 'string' ? c : hex(c); g.fillRect(x, y, ww, hh); };
  const at = (x, y) => (map.inside(x, y) ? map.ground[y * map.w + x] : WALL);
  const base = (g, t, px, py, tx, ty) => {
    if (t === WALL) {
      if (ty === 1 && tx > 0 && tx < map.w - 1) { // back wall face: boards, lit top, baseboard
        fill(g, wall.base, px, py, 16, 16);
        for (let i = 0; i < 16; i += 4) fill(g, mix(wall.base, wall.dark, 0.5), px + i, py + 2, 1, 12);
        fill(g, wall.light, px, py, 16, 2); fill(g, wall.dark, px, py + 13, 16, 3);
      } else { fill(g, mix(wall.dark, [16, 12, 20], 0.5), px, py, 16, 16); fill(g, wall.dark, px, py + 14, 16, 2); }
      return;
    }
    // wood planks: 4-px boards with staggered joints (floor colours), soft shadow under the back wall
    fill(g, floor.base, px, py, 16, 16);
    for (let r = 0; r < 4; r++) {
      const h = hash(tx, ty * 4 + r, 5);
      fill(g, floor.dark, px, py + r * 4 + 3, 16, 1);
      fill(g, floor.dark, px + ((h % 12) + 2), py + r * 4, 1, 3);
      if (h % 3 === 0) fill(g, mix(floor.base, floor.light, 0.5), px + ((h >>> 5) % 12), py + r * 4 + 1, 3, 1);
    }
    if (at(tx, ty - 1) === WALL && ty === 2) { g.globalAlpha = 0.3; fill(g, [0, 0, 0], px, py, 16, 4); g.globalAlpha = 1; }
    if (at(tx - 1, ty) === WALL) { g.globalAlpha = 0.2; fill(g, [0, 0, 0], px, py, 3, 16); g.globalAlpha = 1; }
    if (t === PAD) { // [SOLID FURNITURE] the exit: daylight spilling in through the open doorway below (no mat boxes)
      g.globalAlpha = 0.35; fill(g, [255, 240, 190], px, py + 6, 16, 10); g.globalAlpha = 0.2; fill(g, [255, 240, 190], px, py, 16, 6); g.globalAlpha = 1;
    }
  };
  const deco = (g, t, px, py, tx, ty) => {
    if (tx !== 0 || ty !== 0) return; // one call per room (the room is a single chunk)
    // big rug in the middle of homes/inns
    const kind = interiorKind(b, town);
    if (kind !== 'shop') { fill(g, rug.dark, 4 * 16 + 4, 5 * 16 + 4, 6 * 16 - 8, 2 * 16 - 4); fill(g, rug.base, 4 * 16 + 6, 5 * 16 + 6, 6 * 16 - 12, 2 * 16 - 8); }
    // wall pieces: windows + lamps from the lights sheet, a painting / shelf from the interior sheet
    for (const wx of [2, 10]) { // windows on the back wall (wall colours + sky glass)
      const x = wx * 16 + 4, y = 3; fill(g, wall.dark, x - 2, y - 2, 28, 22); fill(g, '#9ad0f0', x, y, 24, 18); fill(g, '#d8f0ff', x + 2, y + 2, 8, 5);
      fill(g, wall.dark, x + 11, y, 2, 18); fill(g, wall.dark, x, y + 8, 24, 2); fill(g, wall.light, x - 2, y + 18, 28, 2);
    }
    spr(g, S.lights, 3, 5 * 16 - 8, 2); spr(g, S.lights, 3, 8 * 16 + 8, 2);
    for (const [sh, i, x, y] of LAYOUT[kind]) {
      const n = fname(S[sh], i); if (!n) continue;
      const f = ATLAS[S[sh]].meta.frames[n];
      g.globalAlpha = 0.25; g.fillStyle = '#000'; g.beginPath(); g.ellipse(x * 16 + 16, (y + 1) * 16 - 2, 13, 3, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      drawSprite(g, S[sh], n, x * 16 + 16 - f.w / 2, (y + 1) * 16 - f.h);
    }
    // bottom wall door gap under the exit mat
    const r = map.ground.indexOf(PAD); if (r >= 0) { // an open doorway: wooden frame, sunny path + grass outside, a carved EXIT arrow on the floor
      const rx = (r % map.w) * 16, ry = (map.h - 1) * 16;
      fill(g, '#5a3a1a', rx - 3, ry, 38, 16); fill(g, '#cfe8a0', rx, ry, 32, 16); fill(g, '#6ab04a', rx, ry + 9, 32, 7); fill(g, '#d8b878', rx + 9, ry + 4, 14, 12);
      fill(g, '#8a5a2a', rx - 3, ry, 3, 16); fill(g, '#8a5a2a', rx + 32, ry, 3, 16); fill(g, '#3a2410', rx - 3, ry, 38, 2);
      const ay = (map.h - 2) * 16 + 3, ax = rx + 16; g.fillStyle = 'rgba(255,224,64,0.9)'; g.beginPath(); g.moveTo(ax - 6, ay); g.lineTo(ax + 6, ay); g.lineTo(ax, ay + 7); g.fill();
      g.beginPath(); g.moveTo(ax - 6, ay + 5); g.lineTo(ax + 6, ay + 5); g.lineTo(ax, ay + 12); g.fill();
    }
  };
  return [{ fn: base, margin: 0 }, { fn: deco, margin: 0 }];
}
