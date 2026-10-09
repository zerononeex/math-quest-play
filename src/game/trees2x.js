// [TREES 2x] W1 forest trees at twice their size (the user's w<n>-nature trees at a whole-number scale: 2x of a ds 0.5
// frame = the art's own pixels, sharp). They are drawn live and y-sorted: the hero walks behind a canopy, ALttP-style.
// A big tree only stands where its whole canopy covers forest (never over a path, door, sign or secret); forest
// edges keep the 1x trees painted into the ground chunks. Forest tiles stay solid (the trunks are a wall).
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite, codeArt } from '../engine/atlas.js';

const C = CONFIG.TREES;
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };

// Anchors (foot points) + the tiles their canopies cover. Cached on the map. treeTile = the TILE.TREE id, TL = the TILE table
// (with it, forest edges and thin belts get big trees too).
export function treeAnchors(ow, treeTile, TL = null) {
  const map = ow.map; if (map.trees2x) return map.trees2x;
  const list = [], cover = new Set();
  if (!ow.world.lush) return (map.trees2x = { list, cover });
  const isTree = (x, y) => !map.inside(x, y) || map.ground[map.idx(x, y)] === treeTile;
  for (let ty = 0; ty < map.h; ty += C.STEP_Y) {
    const off = (ty / C.STEP_Y) % 2 ? C.STEP_X >> 1 : 0;
    for (let tx = off; tx < map.w; tx += C.STEP_X) {
      let ok = true;
      for (let dy = -C.CANOPY_UP; dy <= 0 && ok; dy++) for (let dx = -C.CANOPY_DX; dx <= C.CANOPY_DX && ok; dx++) if (!isTree(tx + dx, ty + dy)) ok = false;
      if (!ok) continue;
      list.push({ x: tx * 16 + 8, y: ty * 16 + 18, f: hash(tx, ty) % 5 === 0 ? 1 : hash(tx, ty) % 2 ? 0 : 2 });
      for (let dy = -C.CANOPY_UP; dy <= 0; dy++) for (let dx = -C.CANOPY_DX + 1; dx <= C.CANOPY_DX - 1; dx++) if (map.inside(tx + dx, ty + dy)) cover.add(map.idx(tx + dx, ty + dy));
    }
  }
  if (TL) edgeTrees(ow, TL, list, cover);
  for (const p of (ow.feat && ow.feat.setpieces) || []) list.push({ x: p.tx * 16, y: (p.ty + 1) * 16, sh: 'w' + ow.world.id + '-setpieces', i: p.frame, s: 1 }); // [R2-19] y-sorted with the trees
  list.sort((a, b) => a.y - b.y);
  return (map.trees2x = { list, cover });
}

// [R2-18] The wooded upper rows of a cliff band (the plateau woods: a band tile with at least 3 band tiles below it, the
// rows owpaint fills with 1x trees) count as forest for the big trees.
export function plateauWood(map, TL, x, y) {
  const band = (yy) => map.inside(x, yy) && (map.ground[map.idx(x, yy)] === TL.CLIFF || map.ground[map.idx(x, yy)] === TL.CLIFF_EDGE);
  return band(y) && band(y + 1) && band(y + 2) && band(y + 3);
}

// [R2-18] Forest edges and thin belts: big trees placed greedily until every forest tile left over stands under a canopy.
// The trunk always stands on forest; the canopy may hang over open grass, flowers, cliff tops or water (the hero walks
// behind it), never over a path, a town, a door, a rock, a bush, stairs, a ledge, a gate or a secret.
function edgeTrees(ow, TL, list, cover) {
  const map = ow.map, W = map.w, f = ow.feat || {}, T = TL.TREE;
  const OPEN = new Set([TL.GROUND, TL.GROUND2, TL.FLOWER, TL.TREE, TL.CLIFF, TL.CLIFF_EDGE, TL.LIQ_A, TL.LIQ_B]);
  const keep = new Set(); // tiles a canopy must leave visible (a ring round gates, secret rewards and entrances)
  const ring = (tx, ty, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (map.inside(tx + dx, ty + dy)) keep.add((ty + dy) * W + tx + dx); };
  for (const g of f.gates || []) if (!g.passive) ring(g.tx, g.ty, 2);
  for (const e of f.secrets || []) if (e && e.tx != null) ring(e.tx, e.ty, 3);
  for (const e of [...Object.values(f.dungeons || {}), f.boss, f.relic]) if (e) ring(e.tx, e.ty, 3);
  const t = (x, y) => (map.inside(x, y) ? map.ground[map.idx(x, y)] : T);
  const wood = (x, y) => t(x, y) === T || plateauWood(map, TL, x, y);
  const canopyOk = (x, y) => { // foot tile (x, y): trunk on forest, canopy over open tiles only
    if (!map.inside(x, y) || !wood(x, y) || (t(x, y) === T && !wood(x, y - 1))) return false; // a forest trunk needs forest behind it
    for (let dy = -C.CANOPY_UP - 1; dy <= 0; dy++) for (let dx = -C.CANOPY_DX - 1; dx <= C.CANOPY_DX + 1; dx++) {
      if (!map.inside(x + dx, y + dy)) continue;
      if (!OPEN.has(t(x + dx, y + dy)) || keep.has((y + dy) * W + x + dx)) return false;
    }
    return true;
  };
  const feet = new Set(list.map((a) => ((a.y - 18) / 16) * W + (a.x - 8) / 16));
  const near = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (feet.has((y + dy) * W + x + dx)) return true; return false; };
  for (let y = map.h - 1; y >= 0; y--) for (let x = 0; x < W; x++) { // bottom-up: lower trees first, upper ones fill in behind
    if (!wood(x, y) || cover.has(y * W + x)) continue;
    let best = null;
    for (const [dx, dy] of [[0, 1], [0, 0], [-1, 1], [1, 1], [0, 2], [-1, 0], [1, 0]]) if (canopyOk(x + dx, y + dy) && !near(x + dx, y + dy)) { best = [x + dx, y + dy]; break; }
    if (!best) continue; // stays a 1x tree painted into the ground
    const [bx, by] = best, h = hash(bx, by);
    list.push({ x: bx * 16 + 8, y: by * 16 + 18, f: h % 5 === 0 ? 1 : h % 2 ? 0 : 2, edge: true }); feet.add(by * W + bx);
    for (let dy = -C.EDGE_COVER_UP; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) if (map.inside(bx + dx, by + dy) && wood(bx + dx, by + dy)) cover.add((by + dy) * W + bx + dx);
  }
}

// pass 'back': every big tree whose foot is at/above the hero's feet (drawn before him); 'front': the rest (after him).
export function drawTrees2x(ctx, ow, cam, heroY, pass) {
  const T = ow.map.trees2x; if (!T || !T.list.length) return;
  const sh = 'w' + ow.world.id + '-nature', nat = imgReady(sh);
  const names = nat ? Object.keys(ATLAS[sh].meta.frames) : [], vw = cam.w || 9999, vh = cam.h || 9999;
  for (const t of T.list) {
    if ((pass === 'back') !== (t.y <= heroY)) continue;
    const S = t.sh || sh;
    if (t.sh && !imgReady(S)) { // [R2-19] set piece without its art: a grassy hill where the solid base is (never an invisible wall)
      codeArt('setpiece'); ctx.fillStyle = '#4a8a3a'; ctx.beginPath(); ctx.ellipse(t.x - 8 - cam.x, t.y - 22 - cam.y, 34, 24, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (!t.sh && !nat) continue;
    const n = t.sh ? Object.keys(ATLAS[S].meta.frames)[t.i] : names[t.f], f = n && ATLAS[S].meta.frames[n]; if (!f) continue;
    const k = t.s || C.SCALE, w = f.w * k, h = f.h * k, x = t.x - cam.x, y = t.y - cam.y;
    if (x < -w || x > vw + w || y < -10 || y > vh + h) continue;
    drawSprite(ctx, S, n, Math.round(x - w / 2), Math.round(y - h), { scale: k });
  }
}
