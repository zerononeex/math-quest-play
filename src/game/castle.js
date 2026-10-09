// [A8a] The signature castle, BUILT ALttP-style from the user's modular kits (w<n>-castle-kit-a walls/towers/gatehouse,
// -kit-b keep/courtyard) on the plateau: a moat with a drawbridge at the foot of the cliffs, the gatehouse in the front
// wall between two round towers, a courtyard (paved runner, fountains, topiaries, flower beds, flags) and the keep at the
// back whose door is the throne-room entrance. Tiles: walls/keep/decor are solid LANDMARK, the door is the ENTRANCE pair,
// the runner is paved by drawCastleFloor; the pieces are drawn live and y-sorted against the hero (back pass before him, front pass after).
// Geometry is hand-placed in tile units around the castle's centre column (data: world.castle).
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';

const A = { wall: 0, slit: 1, banner: 2, ivy: 11, tower: 5, square: 6, gate: 8, walk: 9 }, B = { keep: 0, hall: 1, bannerWall: 4, chapel: 3, fountain: 5, topiA: 6, topiB: 7, flag: 8, pave: 10, bed: 11 };

// Stamp the castle into the map (after the meadow detail, so nothing grows inside). Returns the castle feature.
export function buildCastle(map, world, TILE) { // TILE passed in (overworld.js imports this module)
  const C = world.castle, mx = C.mx, x0 = mx - 18, x1 = mx + 17, fy = C.frontY, by = 9, ky = 17; // 36 wide; foot rows: front wall fy, back wall by, palace ky
  const set = (x, y, t) => { if (map.inside(x, y)) map.set(x, y, t, t === TILE.LANDMARK || t === TILE.TREE ? 1 : 0); };
  if (map.bigTrees) map.bigTrees = map.bigTrees.filter((t) => t.x < x0 * 16 || t.x > (x1 + 1) * 16 || t.y > (fy + 2) * 16);
  for (let y = 0; y < fy; y++) for (let x = x0; x <= x1; x++) set(x, y, y < by - 4 ? TILE.TREE : TILE.GROUND); // woods behind the back wall
  const block = (ax, ay, bx, cy) => { for (let y = ay; y <= cy; y++) for (let x = ax; x <= bx; x++) set(x, y, TILE.LANDMARK); };
  block(x0, by - 4, x1, by - 1); // back wall
  block(x0, by - 4, x0 + 3, fy - 1); block(x1 - 3, by - 4, x1, fy - 1); // side walls (wall-top walkways)
  block(x0, fy - 4, x1, fy - 1); // front wall (its face hides these rows, so nobody walks behind it)
  for (let y = fy - 4; y < fy; y++) { set(mx - 1, y, TILE.GROUND); set(mx, y, TILE.GROUND); } // the gate passage
  block(mx - 12, ky - 4, mx + 11, ky - 1); set(mx - 1, ky - 1, TILE.ENTRANCE); set(mx, ky - 1, TILE.ENTRANCE); // the palace + the keep door
  // moat across the front with the drawbridge on the road
  for (const y of [fy, fy + 1]) for (let x = x0; x <= x1; x++) { const br = Math.abs(x + 0.5 - mx) <= 2; map.set(x, y, br ? TILE.BRIDGE : TILE.LIQ_A, br ? 0 : 1); }
  // pieces (all at the kit's scale 2 = one sheet pixel per world pixel, so they match the hero): [sheet, frame, centre x, foot row, solid footprint]
  const ka = 'w' + world.id + '-castle-kit-a', kb = 'w' + world.id + '-castle-kit-b', P = [];
  const add = (sheet, f, cx, foot, fp, sc = 2) => {
    P.push({ sheet, f, x: cx * 16, y: foot * 16, s: sc });
    if (fp) block(Math.floor(cx + fp[0]), foot - fp[2], Math.floor(cx + fp[1]), foot - 1);
  };
  // [R1-8] wall runs overlap so no grass shows between pieces (measured spans in tiles: wall 5.2, slit/banner 4.9, ivy 4.2,
  // square tower 2.9, round tower 3.3, gatehouse 7.6); each run is laid from the middle out, towers drawn over the joins
  for (const [dx, f] of [[0, A.wall], [-13, A.ivy], [13, A.ivy], [-10.6, A.slit], [10.6, A.slit], [-6.3, A.wall], [6.3, A.wall]]) add(ka, f, mx + dx, by); // back wall
  add(ka, A.square, mx - 2.5, by); add(ka, A.square, mx + 2.5, by);
  add(ka, A.tower, x0 + 1.75, by); add(ka, A.tower, x1 - 0.75, by);
  for (let foot = by + 4; foot <= fy - 3; foot += 4) { add(ka, A.walk, x0 + 2, foot); add(ka, A.walk, x1 - 1, foot); } // side walls
  add(kb, B.bannerWall, mx - 11, ky); add(kb, B.bannerWall, mx + 11, ky); /* [CASTLE-ROOF] a whole wall piece, not the hall roof alone on the grass */ add(kb, B.chapel, mx - 6, ky); add(kb, B.chapel, mx + 6, ky); add(kb, B.keep, mx, ky); // the palace
  add(kb, B.bed, mx - 9, 21, [-2.2, 2.1, 1]); add(kb, B.bed, mx + 9, 21, [-2.2, 2.1, 1]);
  for (const foot of [21, 25]) { add(kb, B.topiA, mx - 3.5, foot, [-0.5, 0.4, 1]); add(kb, B.topiB, mx + 3.5, foot, [-0.5, 0.4, 1]); }
  add(kb, B.fountain, mx - 9, 26, [-2, 1.9, 2]); add(kb, B.fountain, mx + 9, 26, [-2, 1.9, 2]);
  add(kb, B.flag, mx - 13, 27, [-0.5, 0.4, 1]); add(kb, B.flag, mx + 13, 27, [-0.5, 0.4, 1]);
  for (const [dx, f] of [[-15.2, A.banner], [15.2, A.banner], [-10.9, A.wall], [10.9, A.wall], [-6.05, A.slit], [6.05, A.slit]]) add(ka, f, mx + dx, fy); // [R1-8] front wall, butting the gatehouse
  add(ka, A.tower, x0 + 1.75, fy); add(ka, A.tower, x1 - 0.75, fy);
  add(ka, A.gate, mx, fy);
  // [R1-9] the approach is paved over its full 4-tile width (mx-2..mx+1): grass under the slabs (no dirt bleeding past them),
  // and the dirt road widens to the same 4 tiles for its last rows so it meets the kerb square-on
  for (let y = fy + 2; y < fy + 8; y++) for (let x = mx - 3; x <= mx + 2; x++) if (map.inside(x, y)) map.set(x, y, TILE.GROUND, 0);
  for (let y = fy + 8; y < fy + 10; y++) for (let x = mx - 2; x <= mx + 1; x++) if (map.inside(x, y)) map.set(x, y, TILE.PATH, 0);
  for (let y = fy + 10; y < fy + 40 && map.inside(mx, y) && map.ground[map.idx(mx, y)] === TILE.PATH; y++) { // ...and stays that wide down its straight run
    const g = map.ground[map.idx(mx - 2, y)];
    if (g === TILE.BUSH) map.set(mx - 3, y, TILE.BUSH, 1); // a verge bush steps aside
    if (g === TILE.BUSH || (!map.solid[map.idx(mx - 2, y)] && (g === TILE.GROUND || g === TILE.GROUND2 || g === TILE.FLOWER))) map.set(mx - 2, y, TILE.PATH, 0);
  }
  const kc = 'w' + world.id + '-castle-courtyard'; // knight statues guarding the paved approach over the drawbridge
  for (const foot of [fy + 4, fy + 7]) { add(kc, 4, mx - 3.5, foot, [-0.5, 0.4, 1], 1); add(kc, 4, mx + 3.5, foot, [-0.5, 0.4, 1], 1); }
  P.sort((a, b) => a.y - b.y);
  return { x0, x1, fy, ky, mx, pieces: P, pave: kb, door: { tx: mx - 1, ty: ky - 1 } };
}

// Paving over the runner + plaza (the kit's courtyard tile, one per 2x2 tiles). Call after the tile layer, before entities.
export function drawCastleFloor(ctx, c, cam) {
  if (!c || !imgReady(c.pave)) return;
  const S = ATLAS[c.pave], f = S.meta.frames[Object.keys(S.meta.frames)[B.pave]], r = f.src, k = f.w / r.w, b = f.bb || [0, 0, f.w, f.h];
  const sx = r.x + b[0] / k, sy = r.y + b[1] / k, sw = (b[2] - b[0]) / k, sh = (b[3] - b[1]) / k;
  const tile = (tx, ty, rows = 2) => ctx.drawImage(S.img, sx, sy, sw, sh * rows / 2, Math.round(tx * 16 - cam.x), Math.round(ty * 16 - cam.y), 32, rows * 16);
  for (let ty = c.ky; ty < c.fy; ty += 2) for (let tx = c.mx - 2; tx <= c.mx + 1; tx += 2) tile(tx, ty, Math.min(2, c.fy - ty)); // runner, gate to keep door
  for (let tx = c.mx - 6; tx <= c.mx + 5; tx += 2) if (tx < c.mx - 2 || tx > c.mx + 1) tile(tx, c.ky); // plaza before the palace
  for (let ty = c.fy + 2; ty < c.fy + 8; ty += 2) for (let tx = c.mx - 2; tx <= c.mx + 1; tx += 2) tile(tx, ty); // the approach south of the drawbridge
  const kx = Math.round((c.mx - 2) * 16 - cam.x), ky = Math.round((c.fy + 8) * 16 - cam.y); // [R1-9] stone kerb where the road meets the slabs
  ctx.fillStyle = '#6c6458'; ctx.fillRect(kx - 2, ky - 3, 68, 5); ctx.fillStyle = '#c8bca4'; ctx.fillRect(kx - 2, ky - 3, 68, 1);
  ctx.fillStyle = 'rgba(40,24,8,0.25)'; ctx.fillRect(kx, ky + 2, 64, 2);
}

// The standing pieces, y-sorted: pass 'back' = feet at or above the hero's feet (drawn before him), 'front' = the rest.
export function drawCastle(ctx, c, cam, heroY, pass) {
  if (!c) return;
  for (const p of c.pieces) {
    if ((p.y <= heroY) !== (pass === 'back')) continue;
    if (!imgReady(p.sheet)) continue;
    const n = Object.keys(ATLAS[p.sheet].meta.frames)[p.f], f = ATLAS[p.sheet].meta.frames[n], w = f.w * p.s, h = (f.bb ? f.bb[3] : f.h) * p.s;
    const x = p.x - w / 2 - cam.x, y = p.y - h - cam.y;
    if (cam.w && (x > cam.w || y > cam.h || x + w < 0 || y + f.h * p.s < 0)) continue;
    drawSprite(ctx, p.sheet, n, Math.round(x), Math.round(y), { scale: p.s });
  }
}
