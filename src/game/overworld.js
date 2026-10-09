// Overworld builder (D22): a HAND-DESIGNED macro sketch (24×18 cells) → 8×8 tiles per cell by a deterministic detailer.
// Elevation from cliff/ledge bands, both world liquids with 16-piece shore masks, stairs, ledges, gated entrances/secrets.
import { CONFIG } from '../config.js';
import { TileMap } from '../engine/tilemap.js';
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';
import { overworldPasses, owPaintReady } from './owpaint.js';
import { buildCastle } from './castle.js';

export const CELL = 8;
export const TILE = {
  GROUND: 0, GROUND2: 1, FLOWER: 2, PATH: 3, TREE: 4, CLIFF: 5, CLIFF_EDGE: 6, STAIRS: 7, LEDGE: 8, LIQ_A: 9, LIQ_B: 10,
  TOWN: 11, PAD: 12, ENTRANCE: 13, LANDMARK: 14, ROCK: 15, WALL: 16, BRIDGE: 17, BUSH: 18, BIGTREE: 19, FENCE: 20,
};
export const SOLID = new Set([TILE.TREE, TILE.CLIFF, TILE.CLIFF_EDGE, TILE.LEDGE, TILE.LANDMARK, TILE.ROCK, TILE.WALL, TILE.BUSH, TILE.BIGTREE, TILE.FENCE]);
const PATHLIKE = new Set([':', 'T', 'S', 'H', '1', '2', '3', '4', 'B', 'R']);

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

// Elevation per cell: scanning each column from the south edge, every cliff (^) or ledge (v) band crossed northward adds a level (max 3).
export function cellLevels(sketch) {
  const H = sketch.length, W = sketch[0].length;
  const lv = Array.from({ length: H }, () => new Array(W).fill(0));
  for (let x = 0; x < W; x++) {
    let l = 0, inBand = false;
    for (let y = H - 1; y >= 0; y--) {
      const c = sketch[y][x];
      const band = c === '^' || c === 'v' || c === 'H';
      if (!band && inBand) l = Math.min(3, l + 1);
      inBand = band;
      lv[y][x] = l;
    }
  }
  return lv;
}

// [A4] Water cells a road crosses: a straight run of ≤ 3 liquid cells with road-like cells at both ends → Map 'cx,cy' → 'h'|'v'.
export function bridgeCells(sketch) {
  const H = sketch.length, W = sketch[0].length, out = new Map();
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : sketch[y][x]);
  const wet = (c) => c === '~' || c === '=';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!PATHLIKE.has(at(x, y))) continue;
    for (const [dx, dy, dir] of [[1, 0, 'h'], [0, 1, 'v']]) {
      let n = 1;
      while (n <= 3 && wet(at(x + dx * n, y + dy * n))) n++;
      // [W3 Phase 1] the road must head across (it arrives from behind or carries on past the far bank): two parallel
      // roads either side of a strait are not bridged column by column (W3 Coral Flats, W7)
      const heads = PATHLIKE.has(at(x - dx, y - dy)) || PATHLIKE.has(at(x + dx * (n + 1), y + dy * (n + 1)));
      if (n > 1 && n <= 4 && heads && PATHLIKE.has(at(x + dx * n, y + dy * n))) for (let k = 1; k < n; k++) out.set((x + dx * k) + ',' + (y + dy * k), dir);
    }
  }
  return out;
}

export function buildOverworld(world) {
  const S = world.sketch, CH = S.length, CW = S[0].length;
  const map = new TileMap(CW * CELL, CH * CELL);
  const level = new Uint8Array(map.w * map.h);
  const lv = cellLevels(S);
  const feat = { pad: null, town: [], dungeons: {}, boss: null, relic: null, secrets: [], gates: [], landmarks: [] };
  const R = rng(world.id * 7919);
  const at = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CH ? '#' : S[y][x]);
  const put = (tx, ty, t) => { map.set(tx, ty, t, SOLID.has(t) ? 1 : 0); };
  // Gate tile: ground underneath, solid until its interactable opens it.
  const gate = (type, tx, ty, role) => { put(tx, ty, TILE.GROUND); map.solid[map.idx(tx, ty)] = 1; feat.gates.push({ type, tx, ty, role }); };
  const liquidSolid = (k) => (world.liquids[k] && world.liquids[k].behaviour === 'block' ? 1 : 0);
  const bridged = world.lush ? bridgeCells(S) : new Map(); // [A4] a road that meets water carries on over a bridge (W1 DESIGN RULES)

  for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
    const c = S[cy][cx];
    const x0 = cx * CELL, y0 = cy * CELL;
    for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) level[(y0 + y) * map.w + x0 + x] = lv[cy][cx];
    const fill = (t) => { for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) put(x0 + x, y0 + y, t); };
    const ground = () => { for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) { const r = R(); put(x0 + x, y0 + y, r < 0.05 ? TILE.FLOWER : r < 0.3 ? TILE.GROUND2 : TILE.GROUND); } };
    // Path band (3 tiles wide) from cell centre toward every path-like neighbour.
    const paths = () => {
      const mid = CELL / 2 - 1;
      // [A4] twin road columns ('::' side by side, running N/S): ONE 3-wide road on their shared boundary, not two
      const twinV = (ox) => world.lush && c === ':' && at(cx + ox, cy) === ':' && [1, -1].some((d) => PATHLIKE.has(at(cx, cy + d)) && PATHLIKE.has(at(cx + ox, cy + d)));
      const side = twinV(1) ? 1 : twinV(-1) ? -1 : 0;
      const hub = side === 1 ? [CELL - 1] : side === -1 ? [0, 1] : [mid - 1, mid, mid + 1]; // this cell's columns of the road
      for (let y = mid - 1; y <= mid + 1; y++) for (const x of hub) put(x0 + x, y0 + y, TILE.PATH);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!PATHLIKE.has(at(cx + dx, cy + dy)) && !bridged.has((cx + dx) + ',' + (cy + dy))) continue;
        if (side && dx === side) continue; // the partner cell: the boundary road already joins them
        if (dy) { for (let k = 0; k < CELL / 2 + 1; k++) for (const x of hub) { const y = mid + dy * k; if (y >= 0 && y < CELL) put(x0 + x, y0 + y, TILE.PATH); } continue; }
        const from = side ? hub[0] : mid; // horizontal arm from this cell's road column out to the cell edge
        for (let x = from; x >= 0 && x < CELL; x += dx) for (let w = -1; w <= 1; w++) put(x0 + x, y0 + mid + w, TILE.PATH);
      }
    };
    const centre = { tx: x0 + CELL / 2 - 1, ty: y0 + CELL / 2 - 1 };
    switch (c) {
      case '#': fill(TILE.TREE); break;
      case '^': fill(TILE.CLIFF); for (let x = 0; x < CELL; x++) put(x0 + x, y0, TILE.CLIFF_EDGE); break;
      case 'H': fill(TILE.CLIFF); for (let x = 0; x < CELL; x++) put(x0 + x, y0, TILE.CLIFF_EDGE); for (let y = 0; y < CELL; y++) for (let x = 2; x < 6; x++) put(x0 + x, y0 + y, TILE.STAIRS); break;
      case 'v': ground(); for (let x = 0; x < CELL; x++) put(x0 + x, y0 + 3, TILE.LEDGE); feat.gates.push(...Array.from({ length: CELL }, (_, x) => ({ type: 'ledge', tx: x0 + x, ty: y0 + 3, dir: 'down', passive: true }))); break;
      case '~': fill(TILE.LIQ_A); for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) map.solid[map.idx(x0 + x, y0 + y)] = liquidSolid('a'); break;
      case '=': fill(TILE.LIQ_B); for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) map.solid[map.idx(x0 + x, y0 + y)] = liquidSolid('b'); break;
      case ':': ground(); paths(); break;
      case 'T': fill(TILE.TOWN); feat.town.push({ cx, cy }); break;
      case 'S': ground(); paths(); if (!feat.pad) feat.pad = { tx: centre.tx + (at(cx + 1, cy) === 'S' ? CELL / 2 : 0), ty: centre.ty }; for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) put(x0 + x, y0 + y, TILE.PAD); break;
      case 'o': ground(); for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) put(x0 + x, y0 + y, TILE.LANDMARK); feat.landmarks.push({ cx, cy }); break;
      case '1': case '2': case '3': case '4': case 'B': case 'R': {
        if (c === 'B' && world.castle) { ground(); paths(); break; } // [A8a] the throne room is entered through the castle keep
        ground(); paths();
        // walled cave mouth: rock ring with the entrance tile in the middle, open on the south side
        for (let y = 1; y < 5; y++) for (let x = 2; x < 6; x++) put(x0 + x, y0 + y, TILE.ROCK);
        put(centre.tx, centre.ty, TILE.ENTRANCE); put(centre.tx + 1, centre.ty, TILE.ENTRANCE);
        const e = { tx: centre.tx, ty: centre.ty, cx, cy };
        if (c === 'B') feat.boss = e; else if (c === 'R') feat.relic = e; else feat.dungeons[c] = e;
        // south mouth: open, or a gate tile for the relic dungeon
        put(centre.tx, centre.ty + 1, TILE.PATH); put(centre.tx + 1, centre.ty + 1, c === 'R' ? TILE.ROCK : TILE.PATH);
        if (c === 'R') gate(world.gates.relic.gate, centre.tx, centre.ty + 1, 'relic');
        break;
      }
      case '*': {
        ground();
        const def = (world.gates.secrets || []).find((s) => s.cell[0] === cx && s.cell[1] === cy) || { gate: 'crackedWall', reward: 'gold' };
        const sy = world.lush ? def.dy || 0 : 0; // [R1-11] a nook may sit a few rows up its cell, clear of the forest edge
        const sec = { tx: x0 + 3, ty: y0 + sy + 3, cx, cy, reward: def.reward, gate: def.gate, seed: !!def.seed };
        feat.secrets.push(sec);
        if (world.lush) { secretScene(sec, x0, y0 + sy, put, map, gate); break; }
        // secret nook: rock ring around a reward tile; the gate sits in the ring's south wall
        for (let y = 2; y < 6; y++) for (let x = 2; x < 6; x++) put(x0 + x, y0 + y, TILE.ROCK);
        put(x0 + 3, y0 + 3, TILE.ENTRANCE); put(x0 + 3, y0 + 4, TILE.GROUND);
        gate(def.gate, x0 + 3, y0 + 5, 'secret');
        break;
      }
      default: ground();
    }
  }
  // [A4] organic shores: each tile's 7x7 water fraction from the sketch, nudged by low-frequency noise, decides land or
  // water (and spring vs marsh), so the sketch's 8x8 blocks become rounded ponds, bays and inlets. Only plain grass may
  // become water; roads keep a grass verge; the water under a bridge stays.
  if (world.lush) {
    const PLAIN = new Set([TILE.GROUND, TILE.GROUND2, TILE.FLOWER]);
    const wetT = (t) => t === TILE.LIQ_A || t === TILE.LIQ_B;
    const nearRoad = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = map.inside(x + dx, y + dy) ? map.ground[map.idx(x + dx, y + dy)] : -1; if (u === TILE.PATH || u === TILE.BRIDGE) return true; } return false; };
    const underBridge = (tx, ty) => { const d = bridged.get(Math.floor(tx / CELL) + ',' + Math.floor(ty / CELL)), mid = CELL / 2 - 1; return !!d && Math.abs((d === 'h' ? ty % CELL : tx % CELL) - mid) <= 2; };
    const lat = (x, y, k) => (((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(k, 83492791)) >>> 0) % 1000) / 500 - 1;
    const noise = (x, y, k, sc = 5) => { const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy, s = (q) => q * q * (3 - 2 * q);
      const l = (a, b, t) => a + (b - a) * s(t); return l(l(lat(ix, iy, k), lat(ix + 1, iy, k), u), l(lat(ix, iy + 1, k), lat(ix + 1, iy + 1, k), u), v); };
    const g0 = map.ground.slice(), t0 = (x, y) => (map.inside(x, y) ? g0[y * map.w + x] : -1);
    for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
      const t = t0(tx, ty);
      if ((!wetT(t) && !PLAIN.has(t)) || underBridge(tx, ty)) continue;
      let a = 0, b = 0;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const u = t0(tx + dx, ty + dy); if (u === TILE.LIQ_A) a++; else if (u === TILE.LIQ_B) b++; }
      if (!a && !b) continue;
      const wet = (a + b) / 49 + 0.4 * noise(tx, ty, 1) > 0.5;
      const kind = (a - b) / (a + b) + 0.6 * noise(tx, ty, 2, 4) > 0 ? TILE.LIQ_A : TILE.LIQ_B;
      if (wet && (wetT(t) || !nearRoad(tx, ty))) { if (t !== kind) { put(tx, ty, kind); map.solid[map.idx(tx, ty)] = liquidSolid(kind === TILE.LIQ_A ? 'a' : 'b'); } }
      else if (!wet && wetT(t)) put(tx, ty, (Math.imul(tx, 2654435761) >>> 28) % 5 === 0 ? TILE.FLOWER : TILE.GROUND);
    }
  }
  // [A4] signature castle on the biggest block of 'o' cells (the castle mountain, drawn at LANDMARK_SCALE): solid where its
  // rock and walls stand (an ellipse), its gate at the foot where the ravine road ends
  if (world.lush) {
    const L = feat.landmarks, key = (c) => c.cx + ',' + c.cy, all = new Map(L.map((c) => [key(c), c])), seen = new Set();
    let block = [];
    for (const c of L) { // flood-fill 4-connected 'o' groups, keep the biggest
      if (seen.has(key(c))) continue;
      const g = [], q = [c]; seen.add(key(c));
      while (q.length) { const d = q.pop(); g.push(d); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = all.get((d.cx + dx) + ',' + (d.cy + dy)); if (n && !seen.has(key(n))) { seen.add(key(n)); q.push(n); } } }
      if (g.length > block.length) block = g;
    }
    if (block.length >= 2) {
      for (const c of block) L.splice(L.indexOf(c), 1);
      const cx0 = Math.min(...block.map((c) => c.cx)), cx1 = Math.max(...block.map((c) => c.cx)), cy0 = Math.min(...block.map((c) => c.cy)), cy1 = Math.max(...block.map((c) => c.cy));
      for (let y = cy0 * CELL; y < (cy1 + 1) * CELL; y++) for (let x = cx0 * CELL; x < (cx1 + 1) * CELL; x++) if (map.ground[map.idx(x, y)] === TILE.LANDMARK) put(x, y, TILE.GROUND);
      const mx = (cx0 + cx1 + 1) * CELL / 2, by = (cy1 + 1) * CELL, k = CONFIG.OVERWORLD.LANDMARK_SCALE / 2; // footprint grows with the draw scale (2x = 6-tile radius)
      feat.castle = { cx: cx0, cy: cy0, tx: mx, ty: by };
      if (!world.castle) { // [A8a] a kit-built castle is stamped after the meadow detail instead (buildCastle)
      for (let y = by - Math.ceil(13 * k); y < by; y++) for (let x = mx - Math.ceil(7 * k); x < mx + Math.ceil(7 * k); x++) if (map.inside(x, y) && ((x + 0.5 - mx) / (6 * k)) ** 2 + ((y + 0.5 - (by - 6 * k)) / (6.2 * k)) ** 2 <= 1) put(x, y, TILE.LANDMARK);
      for (let y = by - 1; y < by + CELL / 2 + 2; y++) for (let x = mx - 2; x < mx + 2; x++) if (!SOLID.has(map.ground[map.idx(x, y)]) || y === by - 1) put(x, y, TILE.PATH); // gate road down to the plateau road
      }
    }
  }
  // bridges: the 3-wide road band over every bridged water cell (walkable, never slow)
  for (const [k, dir] of bridged) {
    const [cx, cy] = k.split(',').map(Number), mid = CELL / 2 - 1;
    for (let i = 0; i < CELL; i++) for (let w = -1; w <= 1; w++) {
      const tx = cx * CELL + (dir === 'h' ? i : mid + w), ty = cy * CELL + (dir === 'h' ? mid + w : i);
      map.set(tx, ty, TILE.BRIDGE, 0);
    }
  }
  if (world.maze) { // [D52] the world's maze mini-game: fences + lanes stamped over plain ground (game/maze.js runs it)
    const Z = world.maze, x0 = Z.cx * CELL, y0 = Z.cy * CELL, at = { start: [], finish: [], hay: [], stars: [], platforms: [] };
    Z.rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === ' ') return;
      const wall = c === '#' || c === 'm'; // [W8 Phase 4] wall: 'nebula' = the walls (and drifting platforms 'm') are blocking nebula, not fences
      if (wall && Z.wall === 'nebula') { put(x0 + x, y0 + y, TILE.LIQ_B); map.solid[map.idx(x0 + x, y0 + y)] = 1; } else put(x0 + x, y0 + y, wall ? TILE.FENCE : TILE.GROUND);
      if (c === 'S') at.start.push([x0 + x, y0 + y]); else if (c === 'F') at.finish.push([x0 + x, y0 + y]); else if (c === 'h') at.hay.push([x0 + x, y0 + y]);
      else if (c === 's') at.stars.push([x0 + x, y0 + y]); else if (c === 'm') at.platforms.push([x0 + x, y0 + y]);
    }));
    feat.maze = { x0, y0, w: Z.rows[0].length, h: Z.rows.length, ...at, pedestal: [x0 + Z.pedestal[0], y0 + Z.pedestal[1]], keeper: { tx: x0 + Z.keeper.x, ty: y0 + Z.keeper.y } };
  }
  if (world.lush && world.river) river(map, world.river, liquidSolid('a'));
  if (world.lush) { lushDetail(map, R); for (const sc of feat.secrets) for (const [x, y] of sc.flowers || []) map.set(x, y, TILE.FLOWER, 0); } // scene flowers survive the meadow's flower reset
  if (world.castle && feat.castle) { // [A8a] castle from the modular kits; its keep door is the throne-room entrance
    feat.castleKit = buildCastle(map, world, TILE);
    const d = feat.castleKit.door; feat.boss = { tx: d.tx, ty: d.ty, cx: Math.floor(d.tx / CELL), cy: Math.floor(d.ty / CELL), castle: true };
  }
  if (world.lush && SETPIECES[world.id]) feat.setpieces = placeSetpieces(map, feat, SETPIECES[world.id]); // [R2-19]
  // 16-piece shore masks for both liquids (bit 1 N, 2 E, 4 S, 8 W = land on that side).
  const shore = new Uint8Array(map.w * map.h);
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const t = map.ground[map.idx(tx, ty)];
    if (t !== TILE.LIQ_A && t !== TILE.LIQ_B) continue;
    const land = (x, y) => map.inside(x, y) && map.ground[map.idx(x, y)] !== t && map.ground[map.idx(x, y)] !== TILE.BRIDGE; // water runs on under a bridge
    shore[map.idx(tx, ty)] = (land(tx, ty - 1) ? 1 : 0) | (land(tx + 1, ty) ? 2 : 0) | (land(tx, ty + 1) ? 4 : 0) | (land(tx - 1, ty) ? 8 : 0);
  }
  return { world, map, level, shore, feat, regions: world.regions || [] };
}

// [A4] A river along a polyline (tile coords): ~2.5 tiles of spring water with a gently wobbling bank over plain grass;
// where it crosses a road the road becomes a bridge that reaches a tile past either bank.
function river(map, pts, solid) {
  const segDist = (x, y) => { let best = 1e9; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], vx = bx - ax, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy))); best = Math.min(best, Math.hypot(x - ax - vx * t, y - ay - vy * t)); } return best; };
  const PLAIN = new Set([TILE.GROUND, TILE.GROUND2, TILE.FLOWER]);
  const wet = (x, y) => segDist(x + 0.5, y + 0.5) <= 1.25 + 0.35 * Math.sin(x * 0.7 + y * 0.45);
  const deck = [];
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const t = map.ground[map.idx(x, y)];
    if (wet(x, y) && PLAIN.has(t) && !map.solid[map.idx(x, y)]) map.set(x, y, TILE.LIQ_A, solid);
    // a road tile the river crosses: river on both sides of it along a row or a column (not a road running beside it)
    else if (t === TILE.PATH && segDist(x + 0.5, y + 0.5) <= 3) {
      const side = (dx, dy) => { for (let k = 1; k <= 5; k++) if (wet(x + dx * k, y + dy * k)) return true; return false; };
      if (side(1, 0) && side(-1, 0)) deck.push([x, y, 'h']); else if (side(0, 1) && side(0, -1)) deck.push([x, y, 'v']);
    }
  }
  // [R1-4] one straight rectangular deck per crossing: the road's width over every wet row (no staggered planks, no road tiles left standing in the water)
  const left = new Set(deck.map(([x, y]) => x + ',' + y));
  for (const [sx, sy, dir] of deck) {
    if (!left.has(sx + ',' + sy)) continue;
    const grp = [], q = [[sx, sy]]; left.delete(sx + ',' + sy);
    while (q.length) { const [x, y] = q.pop(); grp.push([x, y]); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = (x + dx) + ',' + (y + dy); if (left.has(k)) { left.delete(k); q.push([x + dx, y + dy]); } } }
    const gx0 = Math.min(...grp.map((p) => p[0])), gx1 = Math.max(...grp.map((p) => p[0])), gy0 = Math.min(...grp.map((p) => p[1])), gy1 = Math.max(...grp.map((p) => p[1]));
    const roadAt = (x, y) => map.inside(x, y) && map.ground[map.idx(x, y)] === TILE.PATH;
    let vs = 0, hs = 0; for (let k = 1; k <= 4; k++) { for (let x = gx0; x <= gx1; x++) vs += roadAt(x, gy0 - k) + roadAt(x, gy1 + k); for (let y = gy0; y <= gy1; y++) hs += roadAt(gx0 - k, y) + roadAt(gx1 + k, y); }
    const v = vs === hs ? dir === 'v' : vs > hs, a0 = Math.min(...grp.map((p) => (v ? p[0] : p[1]))), a1 = Math.max(...grp.map((p) => (v ? p[0] : p[1]))); // the road's width (columns if the deck runs N-S)
    const c = Math.round(grp.reduce((n, p) => n + (v ? p[1] : p[0]), 0) / grp.length);
    let b0 = c, b1 = c;
    for (let k = c - 6; k <= c + 6; k++) for (let a = a0; a <= a1; a++) if (v ? wet(a, k) : wet(k, a)) { b0 = Math.min(b0, k); b1 = Math.max(b1, k); }
    for (let k = b0; k <= b1; k++) {
      for (let a = a0; a <= a1; a++) { const [x, y] = v ? [a, k] : [k, a]; if (map.inside(x, y)) map.set(x, y, TILE.BRIDGE, 0); }
      for (const a of [a0 - 1, a0 - 2, a1 + 1, a1 + 2]) { // a road wiggle beside the deck is river, and water flanks the deck on both sides
        const [x, y] = v ? [a, k] : [k, a], t = map.inside(x, y) ? map.ground[map.idx(x, y)] : -1;
        if (t === TILE.PATH || ((a === a0 - 1 || a === a1 + 1) && PLAIN.has(t) && !map.solid[map.idx(x, y)])) map.set(x, y, TILE.LIQ_A, solid);
      }
    }
  }
}

// [A4] W1 DESIGN RULES detail on open meadow (only plain grass changes; roads, water, features and their surroundings
// stay as they are): compact tree groves far from roads, flower fields, and bushes hedging straight road verges every
// 6 tiles. Groves keep a 3-tile gap from everything else, so the meadow stays one connected walkable area.
function lushDetail(map, R) {
  const W = map.w, H = map.h, N = W * H, PLAIN = new Set([TILE.GROUND, TILE.GROUND2, TILE.FLOWER]);
  const g = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? map.ground[y * W + x] : -1);
  const dist = (seed) => { // BFS distance (tiles, 4-neighbour) from every tile matching seed, capped at 8
    const d = new Uint8Array(N).fill(255), q = [];
    for (let i = 0; i < N; i++) if (seed(map.ground[i], i)) { d[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i / W) | 0; if (d[i] >= 8) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); } } }
    return d;
  };
  const road = dist((t) => t === TILE.PATH || t === TILE.BRIDGE);
  const other = dist((t, i) => (!PLAIN.has(t) && t !== TILE.PATH && t !== TILE.BRIDGE) || (PLAIN.has(t) && map.solid[i])); // water, cliffs, features, forest, gate tiles
  const lat = (x, y, k) => (((Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(k, 83492791)) >>> 0) % 1000) / 1000;
  // groves: blobs around scattered centres, solid TREE, never within 3 of a road or anything else
  const placed = [];
  for (let i = 0; i < 400 && placed.length < 14; i++) {
    const cx = 4 + Math.floor(R() * (W - 8)), cy = 4 + Math.floor(R() * (H - 8)), r = 2 + Math.floor(R() * 3);
    if (road[cy * W + cx] < r + 4 || other[cy * W + cx] < r + 4 || placed.some((p) => Math.hypot(p[0] - cx, p[1] - cy) < p[2] + r + 6)) continue;
    placed.push([cx, cy, r]);
    for (let y = cy - r - 1; y <= cy + r + 1; y++) for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      const k = y * W + x;
      if (PLAIN.has(g(x, y)) && Math.hypot(x - cx, (y - cy) * 1.15) <= r + 0.4 + lat(x, y, 3) * 0.8 && road[k] >= 3 && other[k] >= 3) map.set(x, y, TILE.TREE, 1);
    }
  }
  // flower fields: low-frequency patches of flowers on open grass, off the road verge (the sketch detailer's random
  // single flowers go: flowers grow in fields, not as speckle everywhere)
  for (let i = 0; i < N; i++) if (map.ground[i] === TILE.FLOWER && !map.solid[i]) map.ground[i] = TILE.GROUND;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = g(x, y), k = y * W + x;
    if (!PLAIN.has(t) || map.solid[k] || road[k] < 2) continue;
    const n = (lat(x >> 3, y >> 3, 5) + lat((x + 4) >> 3, (y + 4) >> 3, 6)) / 2;
    if (n > 0.66 && lat(x, y, 7) < 0.7) map.set(x, y, TILE.FLOWER, 0);
  }
  // bushes hedging straight roads: on the verge (1 tile off the road), every 6 tiles, only where the road runs straight
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const k = y * W + x;
    if (road[k] !== 1 || !PLAIN.has(g(x, y)) || other[k] < 3) continue;
    const roadE = road[k + 1] === 0 || road[k - 1] === 0, roadNS = road[k + W] === 0 || road[k - W] === 0;
    if (roadE === roadNS) continue; // a corner or a junction: keep it open
    const along = roadNS ? x : y, straight = roadNS ? road[k - 2] === 1 && road[k + 2] === 1 : road[k - 2 * W] === 1 && road[k + 2 * W] === 1;
    if (straight && along % 6 === 3) map.set(x, y, TILE.BUSH, 1);
  }
  densityFill(map, road, other, lat);
}

// [A4g] "always something on screen" (W1 DESIGN RULES): sample the iPad view (18 x 13 tiles) every half screen; where a view
// is > 85 % plain ground, lay one tidy set piece near its centre (a flower bed with bush corners, a round grove with a
// flower apron, or a rock garden) until it passes. Pieces keep 3 tiles from roads/water/features and 2 from each other,
// so every solid part is a compact island and the meadow stays one connected walkable area.
function densityFill(map, road, other, lat) {
  const W = map.w, H = map.h, VW = 18, VH = 13, MAXP = 0.85, PLAINT = new Set([TILE.GROUND, TILE.GROUND2, TILE.PATH]);
  const g = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? map.ground[y * W + x] : -1);
  const used = new Uint8Array(W * H); // footprints of placed pieces + their 2-tile margin
  const free = (x, y, loose) => g(x, y) === TILE.GROUND || g(x, y) === TILE.GROUND2 ? !map.solid[y * W + x] && road[y * W + x] >= (loose ? 2 : 3) && other[y * W + x] >= (loose ? 1 : 3) && (loose ? used[y * W + x] !== 2 : !used[y * W + x]) : false;
  const plainIn = (x0, y0) => { let n = 0; for (let y = y0; y < y0 + VH; y++) for (let x = x0; x < x0 + VW; x++) if (PLAINT.has(g(x, y))) n++; return n / (VW * VH); };
  const pieces = [ // [w, h, (dx, dy) → tile or null]
    [8, 5, (dx, dy) => ((dx === 0 || dx === 7) && (dy === 0 || dy === 4) ? TILE.BUSH : dx > 0 && dx < 7 && dy > 0 && dy < 4 ? TILE.FLOWER : null)], // flower bed, bush corners
    [7, 8, (dx, dy) => (Math.hypot(dx - 3, (dy - 2.5) * 1.15) <= 2.6 ? TILE.TREE : dy === 7 && dx > 0 && dx < 6 ? TILE.FLOWER : dy === 6 && dx > 1 && dx < 5 ? TILE.FLOWER : null)], // round grove + flower apron
    [7, 5, (dx, dy) => ((dx === 1 || dx === 5) && dy === 1) || (dx === 3 && dy === 0) ? TILE.ROCK : dy >= 2 && dy <= 4 && dx >= 0 && dx <= 6 && (dx + dy) % 2 === 0 ? TILE.FLOWER : dy === 3 ? TILE.FLOWER : null], // rock garden
    [6, 6, (dx, dy) => (dy >= 3 && dy <= 4 && dx >= 1 && dx <= 4 ? TILE.BIGTREE : dy === 5 && (dx < 2 || dx > 3) ? TILE.FLOWER : null), false, [3, 5]], // big round tree with roots (w<n>-big-trees), flowers at its feet
    [5, 3, (dx, dy) => ((dx === 0 || dx === 4) && dy === 1 ? TILE.BUSH : dx > 0 && dx < 4 ? TILE.FLOWER : null)], // small bed for tight spots
    [6, 3, (dx, dy) => (dy === 1 || (dx > 0 && dx < 5) ? TILE.FLOWER : null), true], // flowers only (walkable): last resort near roads
  ];
  const fits = (x0, y0, w, h, loose) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (!free(x, y, loose)) return false; return true; };
  const place = (x0, y0, [w, h, f, , anchor]) => {
    if (anchor) (map.bigTrees || (map.bigTrees = [])).push({ x: (x0 + anchor[0]) * 16, y: (y0 + anchor[1]) * 16, frame: (x0 + y0) % 2 }); // foot point; frames 0-1 = the big round trees ([HOLLOW TREES] frame 2, the hollow one, only at a pinHole secret)
    for (let y = y0 - 2; y < y0 + h + 2; y++) for (let x = x0 - 2; x < x0 + w + 2; x++) if (x >= 0 && y >= 0 && x < W && y < H) used[y * W + x] = Math.max(used[y * W + x], 1);
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const t = f(dx, dy); used[(y0 + dy) * W + x0 + dx] = 2; if (t !== null) map.set(x0 + dx, y0 + dy, t, t === TILE.FLOWER ? 0 : 1); }
  };
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (let y0 = 0; y0 + VH <= H; y0 += VH >> 1) for (let x0 = 0; x0 + VW <= W; x0 += VW >> 1) {
      for (let tries = 0; tries < 3 && plainIn(x0, y0) > MAXP; tries++) {
        const first = Math.floor(lat(x0 + tries, y0, 11) * 4);
        let best = null; // the hashed big piece, else any piece, at the spot closest to the view centre where it fits
        for (const pc of [pieces[first], ...pieces.filter((_, i) => i !== first)]) {
          const [w, h, , loose] = pc;
          for (let y = y0; y + h <= y0 + VH; y++) for (let x = x0; x + w <= x0 + VW; x++) {
            if (!fits(x, y, w, h, loose)) continue;
            const d = Math.hypot(x + w / 2 - (x0 + VW / 2), y + h / 2 - (y0 + VH / 2));
            if (!best || d < best[2]) best = [x, y, d, pc];
          }
          if (best) break;
        }
        if (!best) break;
        place(best[0], best[1], best[3]); changed = true;
      }
    }
    if (!changed) break;
  }
}

export function regionAt(ow, tx, ty) {
  const cx = Math.floor(tx / CELL), cy = Math.floor(ty / CELL);
  const r = ow.regions.find((g) => cx >= g.x0 && cx <= g.x1 && cy >= g.y0 && cy <= g.y1);
  return r ? r.name : ow.world.name;
}

// Liquid behaviour under the hero: { slow, damage, push } from the world's liquid table.
export function liquidAt(ow, tx, ty) {
  const t = ow.map.ground[ow.map.idx(tx, ty)];
  const k = t === TILE.LIQ_A ? 'a' : t === TILE.LIQ_B ? 'b' : null;
  return k ? ow.world.liquids[k] : null;
}

// [S59] Atlas art (w<n>-ground/-nature/-cliffs/-liquid-a/-b) when those sheets are loaded; frames are picked by their
// prompt order (same order in every world). Gameplay tiles never change — this only paints them.
const ART = { ground: 0, groundVar: 1, groundVar2: 2, flowers: 3, path: 5, alt: 8, scatter: [9, 10, 11], trees: [0, 1, 2], rockSmall: 5, rockLarge: 6, bush: 3,
  cliffTop: 0, cliffFace: [1, 2], stairs: 10, ledge: 11, liqOpen: 0, liqDeep: 3 };
// [W4 Phase 1] W4's sheets follow WORLDS.md's 'Liquids:' order (liquid-a = caramel, liquid-b = frosting ice) while its data
// keeps liquid A = frosting (blocks) and B = the walkable caramel river: draw each liquid with its own art
const LIQ_SWAP = new Set([4]);
export function worldSheets(ow) { const w = 'w' + ow.world.id, sw = LIQ_SWAP.has(ow.world.id); return { ground: w + '-ground', nature: w + '-nature', cliffs: w + '-cliffs', liqA: w + (sw ? '-liquid-b' : '-liquid-a'), liqB: w + (sw ? '-liquid-a' : '-liquid-b'), props: w + '-town-props' }; }
export function worldArtReady(ow) { return imgReady(worldSheets(ow).ground); }
export function artPaintReady(ow) { const S = worldSheets(ow); return owPaintReady(S) && imgReady(S.cliffs) && imgReady(S.liqA); }
const frameName = (sheet, i) => { const a = ATLAS[sheet]; if (!a || !a.ready) return null; const k = Object.keys(a.meta.frames); return k.length ? k[Math.min(i, k.length - 1)] : null; };
const tileHash = (tx, ty) => (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 0;

// [S59] D44 organic edges (paint only): the land-facing sides of a liquid tile (bits 1 N, 2 E, 4 S, 8 W) get a wobbly strip
// whose depth follows a per-tile hash, so coastlines and path verges stop looking like grid lines. Solid flags never change.
function organicEdge(g, px, py, m, color, h, max = 4) {
  if (!m) return;
  g.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const d = 1 + ((h >>> (i * 3)) % max), o = i * 4, bit = [1, 2, 4, 8];
    if (m & bit[0]) g.fillRect(px + o, py, 4, d);
    if (m & bit[1]) g.fillRect(px + 16 - d, py + o, d, 4);
    if (m & bit[2]) g.fillRect(px + o, py + 16 - d, 4, d);
    if (m & bit[3]) g.fillRect(px, py + o, d, 4);
  }
}
// sides of a path tile that face open ground (so the verge wobbles; path-to-path joins stay clean)
function pathEdges(ow, tx, ty) {
  const t = (x, y) => (ow.map.inside(x, y) ? ow.map.ground[ow.map.idx(x, y)] : -1), G = [TILE.GROUND, TILE.GROUND2, TILE.FLOWER];
  return (G.includes(t(tx, ty - 1)) ? 1 : 0) | (G.includes(t(tx + 1, ty)) ? 2 : 0) | (G.includes(t(tx, ty + 1)) ? 4 : 0) | (G.includes(t(tx - 1, ty)) ? 8 : 0);
}

// [R2-19] Secondary set pieces from the user's w<n>-setpieces sheet (frame, where): W1's windmill in the meadow nearest the
// town. Each needs a 6×8-tile patch of open grass with no path, town, door, rock, bush, tree or secret within 3 tiles, and no
// woods in the 7 rows below it (big canopies grow 5 tiles up); its hill (4×3 tiles at the foot) is solid. Drawn with the big trees (y-sorted).
const SETPIECES = { 1: [[0, 'town']], 2: [[0, 'town'], [2, 'far']], 3: [[2, 'town'], [1, 'far']], 4: [[2, 'town'], [1, 'far']], 5: [[0, 'town'], [2, 'far']], 6: [[0, 'town'], [1, 'far']], 7: [[1, 'town'], [0, 'far']], 8: [[1, 'town'], [2, 'far']] }; // W2: bouncy mushroom by the village, hot-air balloon far out (frame 1, a pillar hill, would repeat the signature landmark); W3: ferris wheel by Neon Pier, sunken ship far out (frame 0, a lighthouse, is already a w3-landmarks piece); W4: gumdrop lift by Pudding Port, chocolate waterfall far out (frame 0, a lollipop grove, would repeat the lollipop trees); W5: stone ape head by Drumroot Village, jungle waterfall far out (frame 1, a stepped temple, would repeat the signature temple); W6: giant mushroom ring by Dewdrop Hollow, dandelion clock far out (frame 2, a dewdrop pond, would repeat the giant-flower landmark's pond); W7: ancient airship dock by Skydock Aeris, floating crystal shards far out (frame 2, a crystal arch, would repeat the broken sky-temple arch of w7-landmarks) W8: giant telescope observatory by the Star Plaza, comet crater far out (frame 0, a star-path bridge, would repeat the comet-tail bridge landmark).
// [WORLD_LANDMARKS] signature landmark sheet per world (w<n>-landmark-<slug>) on the world's biggest 'o' block
const SIGNATURE = { 1: 'castle', 2: 'pillars', 3: 'shell', 4: 'cake', 5: 'temple', 6: 'flowers', 7: 'spire', 8: 'star' };
// W1: frame 1 (giant oak) has a door in its trunk: [HOLLOW TREES] keeps doors to real secrets; frame 2 (stone bridge): W1 bridges are built from the ground art
function placeSetpieces(map, feat, list) {
  const OPEN = new Set([TILE.GROUND, TILE.GROUND2, TILE.FLOWER]), g = (x, y) => (map.inside(x, y) ? map.ground[map.idx(x, y)] : -1);
  const keep = [...(feat.secrets || []), ...(feat.gates || []).filter((q) => !q.passive), ...Object.values(feat.dungeons || {}), feat.boss, feat.relic, feat.pad].filter(Boolean);
  const town = (feat.town || [])[0], tc = town ? [town.cx * CELL + CELL / 2, town.cy * CELL + CELL / 2] : [map.w / 2, map.h / 2];
  const ok = (x, y) => {
    for (let dy = -10; dy <= 7; dy++) for (let dx = -6; dx <= 5; dx++) {
      const t = g(x + dx, y + dy), inner = dx >= -3 && dx <= 2 && dy >= -7 && dy <= 0, south = dy > 0;
      if (inner ? !OPEN.has(t) || map.solid[map.idx(x + dx, y + dy)] : t !== -1 && !OPEN.has(t) && t !== TILE.LIQ_A && t !== TILE.LIQ_B && (south || (t !== TILE.CLIFF && t !== TILE.CLIFF_EDGE))) return false;
    }
    return !keep.some((k) => Math.abs(k.tx - x) < 9 && k.ty - y < 6 && y - k.ty < 12);
  };
  const spots = [];
  for (let y = 10; y < map.h - 4; y++) for (let x = 7; x < map.w - 6; x++) if (ok(x, y)) spots.push([x, y]);
  const out = [];
  for (const [frame, where] of list) {
    const free = spots.filter(([x, y]) => out.every((p) => Math.hypot(p.tx - x, p.ty - y) > 40));
    if (!free.length) continue;
    const d = ([x, y]) => Math.hypot(x - tc[0], y - tc[1]), best = free.reduce((a, b) => ((where === 'town' ? d(b) < d(a) : d(b) > d(a)) ? b : a));
    out.push({ tx: best[0], ty: best[1], frame });
    for (let dy = -2; dy <= 0; dy++) for (let dx = -2; dx <= 1; dx++) map.solid[map.idx(best[0] + dx, best[1] + dy)] = 1; // its hill
  }
  return out;
}

// [S59] Landmark set pieces ('o' cells): the world's w<n>-landmarks frame, bottom-aligned on its 4×4 block.
export function drawLandmarks(ctx, ow, cam) {
  const cs = 'w' + ow.world.id + '-landmark-' + SIGNATURE[ow.world.id], c = ow.feat.castle;
  if (c && !ow.feat.castleKit && imgReady(cs)) { // bottom-centred on the castle's foot row
    const n = frameName(cs, 0), f = ATLAS[cs].meta.frames[n];
    const k = CONFIG.OVERWORLD.LANDMARK_SCALE; // whole-number scale: a far-off mountain castle, still crisp
    drawSprite(ctx, cs, n, Math.round(c.tx * 16 - (f.w * k) / 2 - cam.x), Math.round(c.ty * 16 + 8 - f.h * k - cam.y), { scale: k });
  }
  const sheet = 'w' + ow.world.id + '-landmarks';
  if (!imgReady(sheet)) return;
  ow.feat.landmarks.forEach((l, i) => {
    const n = frameName(sheet, i), f = n && ATLAS[sheet].meta.frames[n];
    if (!f) return;
    const bx = (l.cx * CELL + 2) * 16, by = (l.cy * CELL + 2) * 16;
    drawSprite(ctx, sheet, n, Math.round(bx + 32 - f.w / 2 - cam.x), Math.round(by + 64 - f.h - cam.y));
  });
}

// [S59] Entrance art: w<n>-entrance (dungeons + throne) and relic-entrances (the world's relic cave, by world order),
// 64×64, centred on the 2-tile mouth and bottom-aligned with it so the painted door sits on the real door tiles.
export function drawEntrances(ctx, ow, cam) {
  const f = ow.feat, one = (sheet, frame, e) => {
    if (!e || !frame || !imgReady(sheet)) return;
    const fr = ATLAS[sheet].meta.frames[frame]; if (!fr) return;
    drawSprite(ctx, sheet, frame, Math.round((e.tx + 1) * 16 - fr.w / 2 - cam.x), Math.round((e.ty + 1) * 16 - fr.h - cam.y));
  };
  const es = 'w' + ow.world.id + '-entrance', en = frameName(es, 0);
  for (const e of Object.values(f.dungeons)) one(es, en, e);
  if (f.boss && !f.boss.castle) one(es, en, f.boss); // [A8a] a castle keep door is part of the keep art
  if (f.relic && ow.world.id <= 6) one('relic-entrances', frameName('relic-entrances', ow.world.id - 1), f.relic);
}

// Tile painter: atlas art when the world's sheets are ready, else the code fallback (theme palette); liquids get a shore strip.
export function tilePainter(ow) {
  const P = ow.world.palette, S = worldSheets(ow);
  if (owPaintReady(S)) return overworldPasses(ow, S, P); // [V4] multi-pass painter from the user's sheets
  const art = (sheet, i, px, py, g, half = false) => { const n = frameName(sheet, i); return !!n && drawSprite(g, sheet, n, px, py, half ? { scale: 0.5 } : {}); };
  return (g, t, px, py, tx, ty) => {
    if (worldArtReady(ow)) {
      const h = tileHash(tx, ty), A = ART;
      const ground = () => art(S.ground, h % 7 === 0 ? A.groundVar : h % 11 === 0 ? A.groundVar2 : A.ground, px, py, g);
      let done = true;
      switch (t) {
        case TILE.GROUND: ground(); if (h % 23 === 0) art(S.ground, A.scatter[h % 3], px, py, g); else if (h % 31 === 0) art(S.nature, A.bush, px, py, g, true); break;
        case TILE.GROUND2: art(S.ground, A.alt, px, py, g); break;
        case TILE.FLOWER: art(S.ground, A.flowers, px, py, g); break;
        case TILE.PATH: art(S.ground, A.path, px, py, g); organicEdge(g, px, py, pathEdges(ow, tx, ty), P.ground, h, 3); break;
        case TILE.TREE: ground(); art(S.nature, A.trees[h % 3], px, py, g, true); break;
        case TILE.LANDMARK: ground(); break; // the w<n>-landmarks set piece is drawn over the block (drawLandmarks)
        case TILE.ROCK: ground(); art(S.nature, h % 2 ? A.rockLarge : A.rockSmall, px, py, g, true); break;
        case TILE.CLIFF: done = art(S.cliffs, A.cliffFace[ty % 2], px, py, g); break;
        case TILE.CLIFF_EDGE: done = art(S.cliffs, A.cliffTop, px, py, g); break;
        case TILE.STAIRS: done = art(S.cliffs, A.stairs, px, py, g); break;
        case TILE.LEDGE: ground(); done = art(S.cliffs, A.ledge, px, py, g); break;
        case TILE.LIQ_A: case TILE.LIQ_B: {
          const sh = t === TILE.LIQ_A ? S.liqA : S.liqB, m = ow.shore[ow.map.idx(tx, ty)];
          done = art(sh, m ? A.liqOpen : A.liqDeep, px, py, g);
          if (done) organicEdge(g, px, py, m, P.shore, h);
          break;
        }
        default: done = false;
      }
      if (done) return;
    }
    const up = ow.level[ow.map.idx(tx, ty)] > 0;
    const base = up ? P.upper : P.ground;
    const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(px + x, py + y, w, h); };
    switch (t) {
      case TILE.GROUND: f(base, 0, 0, 16, 16); break;
      case TILE.GROUND2: f(base, 0, 0, 16, 16); f(P.ground2, 3, 9, 2, 3); f(P.ground2, 10, 4, 2, 3); break;
      case TILE.FLOWER: f(base, 0, 0, 16, 16); f(P.flower, 6, 6, 3, 3); f('#ffffff', 7, 7, 1, 1); break;
      case TILE.PATH: f(P.path, 0, 0, 16, 16); f('rgba(0,0,0,0.08)', (tx * 5) % 12, (ty * 7) % 12, 3, 2); break;
      case TILE.TREE: f(P.tree, 0, 0, 16, 16); f(P.treeTop, 2, 1, 12, 9); f('#10101a', 7, 11, 2, 5); break;
      case TILE.CLIFF: f(P.cliff, 0, 0, 16, 16); f('rgba(0,0,0,0.2)', 0, 5, 16, 1); f('rgba(0,0,0,0.2)', 0, 11, 16, 1); break;
      case TILE.CLIFF_EDGE: f(P.cliffTop, 0, 0, 16, 16); f('#10101a', 0, 14, 16, 2); break;
      case TILE.STAIRS: f(P.cliffTop, 0, 0, 16, 16); for (let i = 0; i < 4; i++) f('rgba(0,0,0,0.25)', 0, i * 4 + 3, 16, 1); break;
      case TILE.LEDGE: f(base, 0, 0, 16, 16); f(P.cliff, 0, 8, 16, 6); f('#10101a', 0, 14, 16, 2); break;
      case TILE.LIQ_A: case TILE.LIQ_B: {
        f(t === TILE.LIQ_A ? P.liqA : P.liqB, 0, 0, 16, 16);
        const m = ow.shore[ow.map.idx(tx, ty)];
        if (m & 1) f(P.shore, 0, 0, 16, 2); if (m & 2) f(P.shore, 14, 0, 2, 16); if (m & 4) f(P.shore, 0, 14, 16, 2); if (m & 8) f(P.shore, 0, 0, 2, 16);
        break;
      }
      case TILE.TOWN: f(P.town, 0, 0, 16, 16); f('rgba(0,0,0,0.1)', 0, 15, 16, 1); f('rgba(0,0,0,0.1)', 15, 0, 1, 16); break;
      case TILE.PAD: f(P.pad, 0, 0, 16, 16); f('#ffe070', 7, 7, 2, 2); break;
      case TILE.ENTRANCE: f('#10101a', 0, 0, 16, 16); break;
      case TILE.LANDMARK: f(P.tree, 0, 0, 16, 16); f('#a07a40', 4, 4, 8, 12); break;
      case TILE.ROCK: f(P.cliff, 0, 0, 16, 16); f(P.cliffTop, 2, 2, 12, 6); f('#10101a', 0, 15, 16, 1); break;
      default: f('#808080', 0, 0, 16, 16);
    }
  };
}

// [A4g] big round trees (user w<n>-big-trees, frames 0-2), drawn live like buildings (a sprite of ~5x5 tiles would be
// clipped by the 2-tile paint margin of the chunk prerender); code fallback: a round canopy on a trunk.
export function drawBigTrees(ctx, ow, cam) {
  const list = ow.map.bigTrees; if (!list) return;
  const sh = 'w' + ow.world.id + '-big-trees', ready = imgReady(sh), names = ready && Object.keys(ATLAS[sh].meta.frames);
  // [W2 Phase 1] one whole-number scale per sheet so the hollow tree (frame 2) is about W1's width: chunkier art (W2: 8-px
  // art blocks → a 69-px frame) draws at 2x, W1 stays 1x; crisp and the same for every tree of the sheet
  const k = ready ? Math.max(1, Math.round(CONFIG.OVERWORLD.BIG_TREE_W / ATLAS[sh].meta.frames[names[2]].w)) : 1;
  for (const t of list) {
    const x = t.x - cam.x, y = t.y - cam.y;
    if (cam.w && (x < -80 * k || y < -10 || x > cam.w + 80 * k || y > cam.h + 100 * k)) continue;
    if (ready) { const n = names[t.frame], f = ATLAS[sh].meta.frames[n]; drawSprite(ctx, sh, n, Math.round(x - (f.w * k) / 2), Math.round(y - (f.bb ? f.bb[3] : f.h) * k), { scale: k }); continue; }
    ctx.fillStyle = '#6a4424'; ctx.fillRect(x - 8, y - 30, 16, 30);
    ctx.fillStyle = '#2f7a2a'; ctx.beginPath(); ctx.arc(x, y - 52, 38, 0, Math.PI * 2); ctx.fill();
  }
}

// [A4g] W1 DESIGN RULES "secrets are special places": each lush-world secret is a small hand-made scene chosen by its gate
// (the reward tile stays the cell's (3,3), so claims and saves are unchanged):
//   bramble      → a hidden clearing ringed by trees, flowers inside, a stone pedestal; the bramble closes the ring's gap
//   heavyBoulder → a hedged garden with a stair hole; the boulder blocks the hedge gap
//   pinHole      → a giant hollow tree (w<n>-big-trees frame 2, the one with a door); the mouse hole is at its door
//   cracked*     → a rock outcrop with a cave mouth; the cracked rock seals the mouth
function secretScene(sec, x0, y0, put, map, gate) { // the gate always sits 2 tiles south of the reward (cell (3,5)), as for every world's nook
  const solid = (x, y, t) => { put(x0 + x, y0 + y, t); map.solid[map.idx(x0 + x, y0 + y)] = 1; };
  const open = (x, y, t = TILE.GROUND) => { put(x0 + x, y0 + y, t); map.solid[map.idx(x0 + x, y0 + y)] = 0; };
  const flowers = (pts) => { sec.flowers = pts.map(([x, y]) => [x0 + x, y0 + y]); };
  if (sec.gate === 'bramble') { // a ring of trees round a clearing (centre a little north of the reward so the ring's south gap is the gate)
    sec.scene = 'clearing';
    for (let y = 0; y <= 6; y++) for (let x = 0; x <= 6; x++) { const d = Math.hypot(x - 3, (y - 2.6) * 1.1); if ((d >= 2.1 && d < 3.3) || (d >= 3.3 && d < 4.1 && !(x === 3 && y >= 5))) solid(x, y, TILE.TREE); } // [R3-11] a thicker ring (the gate's approach stays open)
    flowers([[2, 2], [4, 2], [2, 3], [4, 3], [2, 4], [4, 4], [3, 2]]);
  } else if (sec.gate === 'heavyBoulder') { // a hedged garden with a stair hole
    sec.scene = 'cellar';
    for (let i = 1; i <= 5; i++) { solid(i, 1, TILE.BUSH); solid(1, i, TILE.BUSH); solid(5, i, TILE.BUSH); solid(i, 5, TILE.BUSH); }
    map.uncut = map.uncut || new Set(); for (let y = 1; y <= 5; y++) for (let x = 1; x <= 5; x++) map.uncut.add(map.idx(x0 + x, y0 + y)); // [BUSHES] the garden's hedge ring is a gate wall: never cuttable
    flowers([[2, 2], [4, 2], [2, 3], [4, 3], [2, 4], [4, 4]]);
  } else if (sec.gate === 'pinHole') { // a giant hollow tree: the reward inside, a short hall, the mouse hole is its door
    sec.scene = 'tree';
    for (let y = 2; y <= 5; y++) for (let x = 1; x <= 5; x++) solid(x, y, TILE.BIGTREE);
    (map.bigTrees || (map.bigTrees = [])).push({ x: (x0 + 3.5) * 16, y: (y0 + 6) * 16, frame: 2, door: true });
    flowers([[1, 6], [2, 6], [4, 6], [5, 6]]);
  } else { // a rock outcrop with a cave mouth
    sec.scene = 'cave';
    for (let y = 1; y <= 5; y++) for (let x = 1; x <= 5; x++) if (!(y === 1 && (x === 1 || x === 5))) solid(x, y, TILE.ROCK);
  }
  open(3, 3, TILE.ENTRANCE); open(3, 4);
  gate(sec.gate, x0 + 3, y0 + 5, 'secret');
}
