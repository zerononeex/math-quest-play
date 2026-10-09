// [V4] Overworld painter (A Link to the Past-style readability) built from the user's w<n> sheets.
// The sheets were cut with Gemini's dark tile borders, so nothing is stamped whole onto the ground grid: base colours
// and texture patches come from each tile's inner ~70 %, roads/shores are soft code shapes in the sheet's own colours,
// and trees/rocks/bushes are the user's transparent w<n>-nature sprites. Gameplay tiles never change — paint only.
import { fenceFrame } from './maze.js';
import { treeAnchors } from './trees2x.js';
import { ATLAS, imgReady, drawSprite, drawOpaque } from '../engine/atlas.js';

const T = { GROUND: 0, GROUND2: 1, FLOWER: 2, PATH: 3, TREE: 4, CLIFF: 5, CLIFF_EDGE: 6, STAIRS: 7, LEDGE: 8, LIQ_A: 9, LIQ_B: 10, TOWN: 11, PAD: 12, ENTRANCE: 13, LANDMARK: 14, ROCK: 15, WALL: 16, BRIDGE: 17, BUSH: 18, BIGTREE: 19, FENCE: 20 };
export const hash = (x, y, s = 0) => { let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(s + 1, 83492791)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return h; };
const rnd = (x, y, s) => hash(x, y, s) / 4294967296;
function vnoise(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = rnd(x0, y0, s), b = rnd(x0 + 1, y0, s), c = rnd(x0, y0 + 1, s), d = rnd(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lum = (c) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;

// Inner-crop pixels of one frame → { base, dark, light, cols (sorted by luminance), patch canvas }. filter(c) keeps some pixels.
const palCache = new Map();
// [W7 Phase 1] W7's frame 3 is the 'deeper' tile (dark red lava, sky-blue cloud gap): its lava and cloud sea read right from the open frames
const LIQ_FRAME = { 7: [0, 0], 8: [0, 0] }; // [W8 Phase 1] W8's frame 3 is a dark navy 'deeper' pool: starlight + nebula read right from the open frames
export function framePal(sheet, idx, filter = null, key = '') {
  const k = sheet + '|' + idx + '|' + key;
  if (palCache.has(k)) return palCache.get(k);
  const a = ATLAS[sheet]; if (!a || !a.ready) return null;
  const names = Object.keys(a.meta.frames); const f0 = a.meta.frames[names[Math.min(idx, names.length - 1)]], f = f0 && (f0.src || f0);
  if (!f) return null;
  const m = Math.round(f.w * 0.16), w = f.w - 2 * m, h = f.h - 2 * m;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(a.img, f.x + m, f.y + m, w, h, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, cols = [];
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 200) continue; const col = [d[i], d[i + 1], d[i + 2]]; if (lum(col) < 30) continue; if (!filter || filter(col)) cols.push(col); }
  if (!cols.length) { palCache.set(k, null); return null; }
  cols.sort((p, q) => lum(p) - lum(q));
  const at = (t) => cols[Math.min(cols.length - 1, Math.floor(t * cols.length))];
  const r = { base: at(0.5), dark: at(0.12), light: at(0.88), cols, patch: c };
  palCache.set(k, r);
  return r;
}
const brownish = (c) => c[0] > c[1] + 8 && c[1] >= c[2] - 4;
const greenish = (c) => c[1] > c[0] + 6 && c[1] > c[2];
const bluish = (c) => c[2] > c[0] + 10;
const bright = (c) => !greenish(c) && lum(c) > 150;

// Frame names of a sheet by prompt order.
const fname = (sheet, i) => { const a = ATLAS[sheet]; if (!a || !a.ready) return null; const k = Object.keys(a.meta.frames); return k[Math.min(i, k.length - 1)]; };
const sprite = (g, sheet, i, x, y, scale = 1) => { const n = fname(sheet, i); if (n) drawSprite(g, sheet, n, x, y, scale === 1 ? {} : { scale }); };

export function overworldPasses(ow, S, P) {
  const map = ow.map, W = map.w;
  // [P-C] W1 pilot: the v2 tiles (32x32 art) replace grass / cliff faces / stairs; chunks prerender at 2x (ow.paintScale)
  const V2 = ow.world.id === 1 && imgReady('w1-tiles-v2') && imgReady('w1-cliff-v2');
  ow.paintScale = V2 || (ATLAS[S.ground] && ATLAS[S.ground].meta.ds) ? 2 : 1; // [A3] v2 art keeps its pixels; chunks stream, so 2x paint is affordable
  const v2 = (g, sheet, n, px, py) => drawSprite(g, sheet, n, px, py, { scale: 0.5 });
  const tAt = (x, y) => (map.inside(x, y) ? map.ground[y * W + x] : -1);
  const lvAt = (x, y) => (map.inside(x, y) ? ow.level[y * W + x] : 0);
  const fall = (c) => c.match(/\w\w/g).map((v) => parseInt(v, 16));
  // palettes from the user's sheets (code palette only if a frame is missing)
  const grass = (V2 && framePal('w1-tiles-v2', 1, greenish, 'g')) || framePal(S.ground, 0, greenish, 'g') || { base: fall(P.ground), dark: fall(P.ground2), light: fall(P.upper), patch: null };
  const dirt0 = (V2 && framePal('w1-tiles-v2', 9, brownish, 'b')) || framePal(S.ground, 5, brownish, 'b') || framePal(S.ground, 14, brownish, 'b') || { base: fall(P.path), dark: mix(fall(P.path), [40, 25, 10], 0.35), light: mix(fall(P.path), [255, 240, 200], 0.3) };
  const dirt = { ...dirt0 }; // copy: the blend below must not mutate the cached palette (repaints would drift)
  if (!V2) { // keep the road clearly readable: sheet dirt blended with the world's designed path colour
    const pc = fall(P.path);
    dirt.base = mix(dirt.base, pc, 0.55); dirt.dark = mix(dirt.dark, mix(pc, [30, 20, 10], 0.4), 0.5); dirt.light = mix(dirt.light, mix(pc, [255, 245, 220], 0.35), 0.5);
  }
  const flowerCols = (framePal(S.ground, 3, bright, 'f') || { cols: [fall(P.flower)] }).cols;
  const rock = framePal(S.cliffs, 1, (c) => !greenish(c), 'r') || { base: fall(P.cliff), dark: mix(fall(P.cliff), [0, 0, 0], 0.4), light: fall(P.cliffTop) };
  const LF = LIQ_FRAME[ow.world.id] || [3, 3]; // [W7 Phase 1] which liquid frame the flat water is coloured from
  const liqA = framePal(S.liqA, LF[0], null, 'w') || { base: fall(P.liqA), dark: mix(fall(P.liqA), [0, 0, 0], 0.3), light: mix(fall(P.liqA), [255, 255, 255], 0.4) };
  const liqB = framePal(S.liqB, LF[1], null, 'w') || { base: fall(P.liqB), dark: mix(fall(P.liqB), [0, 0, 0], 0.3), light: mix(fall(P.liqB), [255, 255, 255], 0.4) };
  const shoreC = fall(P.shore);
  ow.paint = { liqA: hex(mix(liqA.light, [255, 255, 255], 0.4)), liqB: hex(mix(liqB.light, [255, 255, 255], 0.4)) };
  // calm base grass: low-contrast tones (base ↔ a touch darker/lighter), upper plateaus a little brighter
  const gBase = grass.base, gDark = mix(grass.base, grass.dark, 0.45), gLight = mix(grass.base, grass.light, 0.35);
  const upBase = mix(gBase, gLight, 0.45);
  const forestFloor = mix(grass.dark, [10, 30, 16], 0.35);

  const BAND = new Set([T.CLIFF, T.CLIFF_EDGE]);
  const isBandOrStair = (t) => BAND.has(t) || t === T.STAIRS;
  // cliff face rows: the 2 band rows right above the lower ground
  const faceRow = (tx, ty) => (!isBandOrStair(tAt(tx, ty + 1)) ? 2 : !isBandOrStair(tAt(tx, ty + 2)) ? 1 : 0);
  // [V5] town lanes: gently winding paths (Dijkstra over town tiles with a noise cost) from every door and every road
  // that enters the town to the town square (heal spot); props are placed off the lanes. Paint only.
  const lanes = new Set(), props = new Map();
  const TI = ow.townInfo;
  const yardAt = new Map(((TI && TI.yard) || []).map((p) => [p.ty * W + p.tx, p]));
  if (TI) {
    const inTown = (x, y) => tAt(x, y) === T.TOWN && !map.solid[y * W + x];
    const town = []; for (let y = 0; y < map.h; y++) for (let x = 0; x < W; x++) if (tAt(x, y) === T.TOWN) town.push([x, y]);
    const sq = TI.heal ? [TI.heal.tx, TI.heal.ty + 1] : town[Math.floor(town.length / 2)];
    const route = (from) => {
      const key = (x, y) => y * W + x, dist = new Map([[key(...from), 0]]), prev = new Map(), open = [[0, ...from]];
      while (open.length) {
        const [d, x, y] = hpop(open);
        if (x === sq[0] && y === sq[1]) break;
        if (d > (dist.get(key(x, y)) ?? 1e9)) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!inTown(nx, ny)) continue;
          const pk = prev.get(key(x, y)), turn = ow.world.lush && pk !== undefined && key(x, y) - pk !== key(nx, ny) - key(x, y); // [R1-10] lush: few turns = straight paving edges, no staircases
          const nd = d + 1 + (ow.world.lush ? (turn ? 2.5 : 0) : vnoise(nx / 3, ny / 3, 55) * 2.2) - (lanes.has(key(nx, ny)) ? 0.8 : 0); // lush towns: straight lanes
          if (nd < (dist.get(key(nx, ny)) ?? 1e9)) { dist.set(key(nx, ny), nd); prev.set(key(nx, ny), key(x, y)); hpush(open, [nd, nx, ny]); }
        }
      }
      let k = key(...sq); if (!prev.has(k)) return;
      while (k !== undefined) { lanes.add(k); k = prev.get(k); }
    };
    for (const d of TI.doors) route([d.tx, d.ty + 1]);
    const doorLanes = new Set(lanes);
    for (const [x, y] of town) if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tAt(x + dx, y + dy) === T.PATH)) if (!lanes.has(y * W + x)) route([x, y]);
    if (ow.world.lush) { // [A4f] path widths (user): door paths 2 tiles, avenues from the roads ~5 tiles (4–5 hero widths)
      const grow = [];
      for (const k of lanes) { const x = k % W, y = Math.floor(k / W), r = doorLanes.has(k) ? 0 : 2; for (let j = -r; j <= r + (r ? 0 : 1); j++) for (let i = -r; i <= r + (r ? 0 : 1); i++) if (inTown(x + i, y + j)) grow.push((y + j) * W + x + i); }
      for (const k of grow) lanes.add(k);
      // [R1-10] straight paving edges: fill notches up to 2 tiles deep between paving on both sides (no staircases)
      for (let it = 0; it < 3; it++) {
        const L = (x, y) => lanes.has(y * W + x), add = [];
        for (const [x, y] of town) {
          if (L(x, y) || !inTown(x, y) || yardAt.has(y * W + x)) continue;
          if (((L(x - 1, y) || L(x - 2, y)) && (L(x + 1, y) || L(x + 2, y))) || ((L(x, y - 1) || L(x, y - 2)) && (L(x, y + 1) || L(x, y + 2)))) add.push(y * W + x);
        }
        for (const k of add) lanes.add(k);
      }
    }
    // props (user w<n>-town-props, by prompt order): 4 fence, 6 signpost, 7 lamp, 8 well, 9 market stall, 10 bench, 11 barrel, 12 crate, 13 planter
    const nearLane = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (lanes.has((y + j) * W + x + i)) return true; return false; };
    const nearYard = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const p = yardAt.get((y + dy) * W + x + dx); if (p && p.hedge) return true; } return false; }; // 2x props never sit on a hedge
    const free = (x, y) => inTown(x, y) && !lanes.has(y * W + x) && !yardAt.has(y * W + x) && !nearYard(x, y) && !TI.doors.some((d) => Math.abs(d.tx - x) <= 1 && d.ty + 1 >= y - 1 && d.ty + 1 <= y + 1) && !(TI.heal && Math.abs(TI.heal.tx - x) <= 1 && Math.abs(TI.heal.ty - y) <= 1);
    const put = (x, y, i) => { if (free(x, y) && ![...props.keys()].some((k) => Math.abs((k % W) - x) + Math.abs(Math.floor(k / W) - y) < 2)) props.set(y * W + x, i); };
    for (const d of TI.doors) { put(d.tx - 2, d.ty + 1, 13); put(d.tx + 2, d.ty + 1, [11, 12][d.tx % 2]); }
    if (TI.heal) { put(TI.heal.tx - 3, TI.heal.ty, 13); put(TI.heal.tx + 3, TI.heal.ty + 1, 9); put(TI.heal.tx + 2, TI.heal.ty - 2, 10); }
    for (const [x, y] of town) { const h = hash(x, y, 81); if (!lanes.has(y * W + x) && nearLane(x, y, 1) && h % 23 === 0) put(x, y, 7); }
    for (const [x, y] of town) { const h = hash(x, y, 83); if (tAt(x, y) === T.TOWN && [[0, -1], [0, 1]].some(([dx, dy]) => tAt(x + dx, y + dy) !== T.TOWN && tAt(x + dx, y + dy) !== T.PATH) && !nearLane(x, y, 1) && h % 3 === 0) put(x, y, 4); }
    for (const [x, y] of town) if (lanes.has(y * W + x) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tAt(x + dx, y + dy) === T.PATH)) { put(x + 2, y - 1, 6); break; }
    for (const [x, y] of town) { const h = hash(x, y, 85); if (!nearLane(x, y, ow.world.lush ? 3 : 2) && h % 29 === 0 && (!ow.world.lush || ![...props.entries()].some(([k, v]) => v >= 100 && Math.abs((k % W) - x) + Math.abs(Math.floor(k / W) - y) < 6))) put(x, y, 100 + (h % 3)); } // a few town trees (2x ones keep apart)
    if (ow.world.lush) for (const [k, v] of props) { // [A5] 2x props and trees are solid where they stand (a tree's trunk spans 3 tiles)
      const x = k % W, y = Math.floor(k / W);
      for (const dx of v >= 100 ? [-1, 0, 1] : [0]) if (inTown(x + dx, y) && !lanes.has(y * W + x + dx)) ow.map.solid[y * W + x + dx] = 1;
    }
  }
  // [V4] world roads (paint only): Dijkstra over walkable tiles from the town (or pad) to the pad, every dungeon mouth,
  // the boss gate and the relic cave; existing paths/roads are cheap to reuse, open grass costs more, so roads merge.
  {
    const f = ow.feat, hub = TI && TI.heal ? [TI.heal.tx, TI.heal.ty + 1] : f.pad ? [f.pad.tx, f.pad.ty] : null;
    const walk = (x, y) => map.inside(x, y) && !map.solid[y * W + x];
    // [R1-19] every cave/dungeon mouth: a straight 2-wide road runs up the middle to the threshold (ALttP approach); the
    // winding road joins it APPROACH tiles south of the door
    const mouths = [...Object.values(f.dungeons), f.boss && !f.boss.castle && f.boss, f.relic].filter(Boolean), AP = 4;
    const own = new Set(); // a mouth's own approach never counts as "reached the road network"
    for (const e of mouths) for (let k = 1; k <= AP; k++) for (const dx of [0, 1]) { const x = e.tx + dx, y = e.ty + k, t = tAt(x, y); if (walk(x, y) && t !== T.LIQ_A && t !== T.LIQ_B) { lanes.add(y * W + x); own.add(y * W + x); } }
    const ends = [f.pad && [f.pad.tx + 1, f.pad.ty + 4], ...mouths].filter(Boolean).map((e) => (Array.isArray(e) ? e : walk(e.tx, e.ty + AP) ? [e.tx, e.ty + AP] : [e.tx, e.ty + 2]));
    const cost = (x, y) => { const t = tAt(x, y); return lanes.has(y * W + x) || t === T.PATH ? 1 : t === T.STAIRS ? 1.2 : t === T.TOWN ? 2 : 3 + vnoise(x / 4, y / 4, 57) * 2; };
    if (hub) for (const end of ends) {
      if (!walk(...end)) continue;
      const key = (x, y) => y * W + x, dist = new Map([[key(...end), 0]]), prev = new Map(), heap = [[0, ...end]];
      let found = false, n = 0;
      while (heap.length && n++ < 60000) {
        const [d, x, y] = hpop(heap);
        if (d > (dist.get(key(x, y)) ?? 1e9)) continue;
        if ((x === hub[0] && y === hub[1]) || (tAt(x, y) === T.PATH && lanes.size && lanes.has(key(x, y)) && !own.has(key(x, y)))) { found = key(x, y); break; }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!walk(nx, ny)) continue;
          const t = tAt(nx, ny); if (t === T.LIQ_A || t === T.LIQ_B) continue;
          const nd = d + cost(nx, ny);
          if (nd < (dist.get(key(nx, ny)) ?? 1e9)) { dist.set(key(nx, ny), nd); prev.set(key(nx, ny), key(x, y)); hpush(heap, [nd, nx, ny]); }
        }
      }
      for (let k = found; k !== false && k !== undefined; k = prev.get(k)) { const t = map.ground[k]; if (t !== T.STAIRS && t !== T.ENTRANCE) lanes.add(k); }
    }
  }
  ow.paint.lanes = lanes;
  const isLane = (tx, ty) => lanes.has(ty * W + tx);
  // road tiles: paths, stairs above the face, and a short approach below every stairway (so the road leads onto the stairs)
  const approach = (tx, ty) => { const t = tAt(tx, ty); if (t !== T.GROUND && t !== T.GROUND2 && t !== T.FLOWER) return false; for (let k = 1; k <= 4; k++) if (tAt(tx, ty - k) === T.STAIRS) return true; return false; };
  const mouthAt = (tx, ty) => tAt(tx, ty) === T.ENTRANCE && !ow.feat.secrets.some((q) => q.tx === tx && q.ty === ty); // [R1-19] dirt under the door art, no black gap
  const isRoad = (tx, ty) => { const t = tAt(tx, ty); return t === T.PATH || mouthAt(tx, ty) || isLane(tx, ty) || (t === T.STAIRS && faceRow(tx, ty) === 0) || approach(tx, ty); };
  const nearRoad = (tx, ty) => { for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (isRoad(tx + x, ty + y)) return true; return false; };

  const fill = (g, c, x, y, w, h) => { g.fillStyle = typeof c === 'string' ? c : hex(c); g.fillRect(x, y, w, h); };
  const disc = (g, c, x, y, r) => { g.fillStyle = typeof c === 'string' ? c : hex(c); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  // grass texture: patches of the user's grass (inner crop) stamped off-grid at low alpha + a slow tone field
  function grassTile(g, px, py, tx, ty, base) {
    if (V2) { // v2 grass tile + a few sparse blades in its own darker shade (calm, off-grid texture)
      v2(g, 'w1-tiles-v2', 'c1r0', px, py);
      const h = hash(tx, ty, 7);
      if (h % 4 === 0) { g.fillStyle = hex(gDark); g.fillRect(px + (h >>> 4) % 14 + 0.5, py + (h >>> 9) % 13, 0.5, 1.5); g.fillRect(px + (h >>> 14) % 14, py + (h >>> 19) % 13 + 0.5, 0.5, 1); }
      return;
    }
    fill(g, base, px, py, 16, 16);
    for (let sy = 0; sy < 16; sy += 4) for (let sx = 0; sx < 16; sx += 4) { // slow tone field, 4-px cells (no tile-sized blocks)
      const n = vnoise((tx * 16 + sx) / 110, (ty * 16 + sy) / 110, 3);
      if (n > 0.6) { g.globalAlpha = Math.min(0.3, (n - 0.6) * 0.8); fill(g, gDark, px + sx, py + sy, 4, 4); } else if (n < 0.32) { g.globalAlpha = Math.min(0.3, (0.32 - n) * 0.8); fill(g, gLight, px + sx, py + sy, 4, 4); }
    }
    g.globalAlpha = 1;
    if (grass.patch) {
      const pw = grass.patch.width, ph = grass.patch.height;
      g.globalAlpha = 0.22;
      for (let i = 0; i < 2; i++) {
        const h = hash(tx, ty, 10 + i), sx = h % (pw - 5), sy = (h >>> 8) % (ph - 5), dx = (h >>> 16) % 12, dy = (h >>> 22) % 12;
        g.drawImage(grass.patch, sx, sy, 5, 5, px + dx, py + dy, 5, 5);
      }
      g.globalAlpha = 1;
    }
    // a few dark blades
    const h = hash(tx, ty, 7);
    if (h % 3 === 0) { fill(g, gDark, px + (h >>> 4) % 14, py + (h >>> 9) % 13, 1, 2); fill(g, gDark, px + (h >>> 14) % 14, py + (h >>> 19) % 13, 1, 2); }
  }
  function rockFace(g, px, py, tx, ty, row) {
    if (V2) { v2(g, 'w1-cliff-v2', row === 1 ? 'c1r1' : 'c1r2', px, py); return; }
    // row 1 = upper face (lit), row 2 = lower face (shaded)
    fill(g, row === 1 ? mix(rock.base, rock.light, 0.25) : mix(rock.base, rock.dark, 0.3), px, py, 16, 16);
    if (rock.patch) { g.globalAlpha = 0.35; const h = hash(tx, ty, 21); g.drawImage(rock.patch, h % Math.max(1, rock.patch.width - 16), 0, 16, Math.min(16, rock.patch.height), px, py, 16, 16); g.globalAlpha = 1; }
    // vertical strata + cracks
    for (let i = 0; i < 3; i++) { const h = hash(tx, ty, 30 + i); fill(g, rock.dark, px + (h % 15), py + (row === 1 ? 3 : 0) + ((h >>> 8) % 4), 1, 5 + ((h >>> 12) % 6)); }
    if (row === 1) { fill(g, rock.light, px, py, 16, 2); fill(g, mix(rock.light, [255, 255, 240], 0.3), px, py, 16, 1); }
    else { g.globalAlpha = 0.45; fill(g, [16, 12, 20], px, py + 11, 16, 5); g.globalAlpha = 1; fill(g, [16, 16, 26], px, py + 15, 16, 1); }
  }
  function stairs(g, px, py, tx, ty) {
    // one continuous staircase (v2: in the pilot stair tile's own colours; tiling that tile 4-wide read as 4 ladders)
    const sp = V2 && framePal('w1-cliff-v2', 14, (c) => c[0] > c[2] + 10, 'st');
    const st = sp ? sp.light : mix(rock.light, [240, 230, 200], 0.25), sd = sp ? sp.dark : mix(rock.base, rock.dark, 0.5);
    for (let i = 0; i < 4; i++) { fill(g, st, px, py + i * 4, 16, 3); fill(g, sd, px, py + i * 4 + 3, 16, 1); }
    // side rails where the stair meets the rock face (dark wall + lit cap + shadow on the steps)
    if (tAt(tx - 1, ty) !== T.STAIRS) { fill(g, rock.dark, px, py, 3, 16); fill(g, rock.light, px + 1, py, 1, 16); g.globalAlpha = 0.3; fill(g, [0, 0, 0], px + 3, py, 2, 16); g.globalAlpha = 1; }
    if (tAt(tx + 1, ty) !== T.STAIRS) { fill(g, rock.dark, px + 13, py, 3, 16); fill(g, rock.light, px + 14, py, 1, 16); g.globalAlpha = 0.3; fill(g, [0, 0, 0], px + 11, py, 2, 16); g.globalAlpha = 1; }
  }
  function water(g, px, py, tx, ty, t) {
    const L = t === T.LIQ_A ? liqA : liqB;
    fill(g, L.base, px, py, 16, 16);
    const n = vnoise(tx / 5, ty / 5, 9); if (n > 0.6) { g.globalAlpha = (n - 0.6); fill(g, L.dark, px, py, 16, 16); g.globalAlpha = 1; }
    const h = hash(tx, ty, 40);
    if (h % 3 === 0) { g.globalAlpha = 0.6; fill(g, L.light, px + (h >>> 3) % 11, py + (h >>> 9) % 14, 4, 1); g.globalAlpha = 1; }
  }

  // [A4] bridges: water underneath (the liquid beside the deck), planks + rails in the colours of the user's bridge tile
  const bridgeWater = (tx, ty) => { for (let k = 1; k < 4; k++) for (const [dx, dy] of [[0, -k], [0, k], [-k, 0], [k, 0]]) { const t = tAt(tx + dx, ty + dy); if (t === T.LIQ_A || t === T.LIQ_B) return t; } return T.LIQ_A; };
  const wood = framePal('w' + ow.world.id + '-water-extras', 8, brownish, 'br') || { base: [150, 100, 56], dark: [92, 58, 30], light: [196, 150, 96] };
  // [R1-4] one plank direction per bridge: the whole connected deck runs the way its bounding box is longest
  const deckDir = new Map();
  const bridgeHoriz = (tx, ty) => {
    const k0 = tx + ',' + ty; if (deckDir.has(k0)) return deckDir.get(k0);
    const seen = [k0], q = [[tx, ty]], set = new Set(seen); let x0 = tx, x1 = tx, y0 = ty, y1 = ty;
    while (q.length) { const [x, y] = q.pop(); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (x + dx) + ',' + (y + dy); if (!set.has(k) && tAt(x + dx, y + dy) === T.BRIDGE) { set.add(k); seen.push(k); q.push([x + dx, y + dy]); } } }
    const h = x1 - x0 >= y1 - y0; for (const k of seen) deckDir.set(k, h); return h;
  };
  function bridgeDeck(g, px, py, tx, ty) {
    const horiz = bridgeHoriz(tx, ty);
    const first = horiz ? tAt(tx, ty - 1) !== T.BRIDGE : tAt(tx - 1, ty) !== T.BRIDGE, last = horiz ? tAt(tx, ty + 1) !== T.BRIDGE : tAt(tx + 1, ty) !== T.BRIDGE;
    fill(g, wood.base, px, py, 16, 16);
    for (let i = 0; i < 16; i += 4) { // boards across the way you walk, staggered grain
      if (horiz) { fill(g, wood.dark, px + i, py, 1, 16); fill(g, wood.light, px + i + 1, py, 1, 16); if (hash(tx, ty, i) % 3 === 0) fill(g, wood.dark, px + i + 2, py + (hash(tx, ty, i + 7) % 12), 1, 3); }
      else { fill(g, wood.dark, px, py + i, 16, 1); fill(g, wood.light, px, py + i + 1, 16, 1); if (hash(tx, ty, i) % 3 === 0) fill(g, wood.dark, px + (hash(tx, ty, i + 7) % 12), py + i + 2, 3, 1); }
    }
    const rail = (x, y, w, h) => { fill(g, wood.dark, x, y, w, h); fill(g, wood.light, x, y, horiz ? w : 1, horiz ? 1 : h); };
    if (first) { if (horiz) rail(px, py, 16, 3); else rail(px, py, 3, 16); }
    if (last) { if (horiz) { rail(px, py + 13, 16, 3); g.globalAlpha = 0.35; fill(g, [10, 20, 40], px, py + 16, 16, 3); g.globalAlpha = 1; } else rail(px + 13, py, 3, 16); }
    const post = horiz ? (tAt(tx - 1, ty) !== T.BRIDGE || tAt(tx + 1, ty) !== T.BRIDGE) : (tAt(tx, ty - 1) !== T.BRIDGE || tAt(tx, ty + 1) !== T.BRIDGE);
    if (post && (first || last)) { fill(g, wood.dark, px + (horiz ? (tAt(tx - 1, ty) !== T.BRIDGE ? 0 : 12) : (first ? 0 : 11)), py + (horiz ? (first ? -2 : 11) : (tAt(tx, ty - 1) !== T.BRIDGE ? 0 : 12)), 5, 5); }
  }

  // [R1-10] hedges as ONE autotiled shape (ALttP): each hedge tile draws its share of a raised block — leafy top face
  // lifted HEDGE_LIFT px, a darker front face where the run ends southward, rounded outer corners, one continuous dark
  // outline and a soft shadow — so straight runs, corners, T's and ends all join. Colours from the user's hedge frame.
  let hedgePal = null;
  const isHedge = (x, y) => { const p = yardAt.get(y * W + x); return !!(p && p.hedge); };
  function hedgeTile(g, px, py, tx, ty) {
    if (!hedgePal) hedgePal = framePal('w' + ow.world.id + '-yard-garden', 0, greenish, 'hedge') || { base: [64, 140, 52], dark: [30, 82, 34], light: [132, 196, 84] };
    const E = 8, R = 6, n = isHedge(tx, ty - 1), s = isHedge(tx, ty + 1), w = isHedge(tx - 1, ty), e = isHedge(tx + 1, ty);
    const top = py - E, bot = s ? py + 16 - E : py + 16, rad = [!n && !w ? R : 0, !n && !e ? R : 0, !s && !e ? R : 0, !s && !w ? R : 0];
    const shape = (x0, y0, x1, y1, r) => { g.beginPath(); g.moveTo(x0 + r[0], y0); g.arcTo(x1, y0, x1, y1, r[1]); g.arcTo(x1, y1, x0, y1, r[2]); g.arcTo(x0, y1, x0, y0, r[3]); g.arcTo(x0, y0, x1, y0, r[0]); g.closePath(); };
    const ox0 = w ? px : px - 1, ox1 = e ? px + 16 : px + 17, oy0 = n ? top : top - 1, oy1 = s ? bot : bot + 1;
    if (!s) { g.fillStyle = 'rgba(16,32,8,0.28)'; shape(ox0 + 2, bot - 4, ox1 + 2, bot + 4, [0, 0, rad[2], rad[3]]); g.fill(); } // shadow on the grass
    g.fillStyle = hex(mix(hedgePal.dark, [0, 0, 0], 0.55)); shape(ox0, oy0, ox1, oy1, rad); g.fill(); // the outline
    g.save(); shape(px, top, px + 16, bot, rad); g.clip();
    g.fillStyle = hex(hedgePal.base); g.fillRect(px, top, 16, bot - top);
    for (let i = 0; i < 14; i++) { const h = hash(tx, ty, 200 + i); g.fillStyle = hex(i % 3 ? hedgePal.light : hedgePal.dark); g.fillRect(px + (h % 15), top + ((h >>> 5) % 15), 2 + (i % 2), 2); } // leaf clumps
    if (!n) { g.fillStyle = hex(mix(hedgePal.light, [255, 255, 220], 0.25)); g.fillRect(px, top + 1, 16, 1); }
    if (!s) { // front face: the leaves in shade
      g.fillStyle = hex(mix(hedgePal.dark, hedgePal.base, 0.35)); g.fillRect(px, py + 16 - E, 16, E);
      g.fillStyle = hex(hedgePal.dark); for (let x = 0; x < 16; x += 3) g.fillRect(px + x + (hash(tx, ty, 230 + x) % 2), py + 16 - E + 2 + (x % 2), 1, E - 3);
      g.fillStyle = hex(mix(hedgePal.dark, [0, 0, 0], 0.3)); g.fillRect(px, py + 16 - E, 16, 1);
    }
    g.restore();
  }

  // ---- pass 1: ground ----
  const ground = (g, t, px, py, tx, ty) => {
    const up = lvAt(tx, ty) > 0 ? upBase : gBase;
    switch (t) {
      case T.LIQ_A: case T.LIQ_B: water(g, px, py, tx, ty, t); return;
      case T.BRIDGE: water(g, px, py, tx, ty, bridgeWater(tx, ty)); return; // the deck is drawn in the deco pass
      case T.TREE:
        if (V2) v2(g, 'w1-tiles-v2', 'c0r0', px, py);
        else if (ow.world.lush && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => tAt(tx + dx, ty + dy) !== T.TREE)) grassTile(g, px, py, tx, ty, lvAt(tx, ty) > 0 ? upBase : gBase); // [A4] edge: grass under the canopy, no dark squares
        else fill(g, forestFloor, px, py, 16, 16);
        return;
      case T.CLIFF: case T.CLIFF_EDGE: {
        const r = faceRow(tx, ty);
        if (r) rockFace(g, px, py, tx, ty, r); else grassTile(g, px, py, tx, ty, upBase);
        return;
      }
      case T.STAIRS: if (faceRow(tx, ty)) stairs(g, px, py, tx, ty); else grassTile(g, px, py, tx, ty, upBase); return;
      case T.ENTRANCE: { // [A4g] secret scenes: pedestal (clearing), stair hole (cellar), cave arch (outcrop); the hollow tree's door is its sprite
        const sc = (ow.feat.secrets.find((q) => q.tx === tx && q.ty === ty) || {}).scene;
        if (!sc) { grassTile(g, px, py, tx, ty, up); return; } // [R1-19] the road discs paint the threshold; the door is the entrance art
        grassTile(g, px, py, tx, ty, up);
        if (sc === 'clearing') { fill(g, rock.dark, px + 2, py + 9, 12, 6); fill(g, rock.base, px + 3, py + 5, 10, 5); fill(g, rock.light, px + 4, py + 5, 8, 1); fill(g, '#ffe070', px + 7, py + 3, 2, 2); }
        else if (sc === 'cellar') { fill(g, rock.dark, px + 1, py + 2, 14, 13); fill(g, '#10101a', px + 3, py + 4, 10, 10); for (let i = 0; i < 3; i++) fill(g, rock.base, px + 4, py + 5 + i * 3, 8, 1); }
        else if (sc === 'cave') { fill(g, '#10101a', px + 2, py + 4, 12, 12); fill(g, '#10101a', px + 4, py + 2, 8, 2); }
        return;
      }
      case T.TOWN: grassTile(g, px, py, tx, ty, up); return; // [V5] a village on grass; lanes come from the road passes
      default: grassTile(g, px, py, tx, ty, up);
    }
    // soft shadow cast by a cliff face / ledge onto the ground below it
  };
  const shade = (g, t, px, py, tx, ty) => {
    const above = tAt(tx, ty - 1);
    if ((BAND.has(above) || above === T.LEDGE) && !isBandOrStair(t) && t !== T.TREE) { g.globalAlpha = 0.28; fill(g, [10, 10, 20], px, py, 16, 3); g.globalAlpha = 0.14; fill(g, [10, 10, 20], px, py + 3, 16, 3); g.globalAlpha = 1; }
    // bright lip on the plateau row right above a face
    if (!V2 && (BAND.has(t) || t === T.STAIRS) && !faceRow(tx, ty) && faceRow(tx, ty + 1) === 1) {
      if (t === T.STAIRS) return;
      fill(g, mix(upBase, [255, 255, 220], 0.35), px, py + 12, 16, 2); fill(g, rock.light, px, py + 14, 16, 1); fill(g, [16, 16, 26], px, py + 15, 16, 1);
    }
  };
  // ---- roads: union of soft discs over every road tile (edge colour first, then fill, then pebbles) ----
  // discs at tile centres + at the midpoints to road neighbours (E, S, SE) so verges curve instead of scalloping
  const paved = (tx, ty) => ow.world.lush && isLane(tx, ty) && tAt(tx, ty) === T.TOWN; // [A4f] town lanes are stone paving
  const roadDiscs = (g, c, r, px, py, tx, ty) => {
    if (!isRoad(tx, ty) || paved(tx, ty)) return;
    disc(g, c, px + 8, py + 8, r);
    const e = isRoad(tx + 1, ty), s = isRoad(tx, ty + 1);
    if (e) disc(g, c, px + 16, py + 8, r);
    if (s) disc(g, c, px + 8, py + 16, r);
    if (e && s && isRoad(tx + 1, ty + 1)) disc(g, c, px + 16, py + 16, r);
  };
  const roadEdge = (g, t, px, py, tx, ty) => roadDiscs(g, mix(dirt.base, dirt.dark, 0.6), 10.5, px, py, tx, ty);
  const roadFill = (g, t, px, py, tx, ty) => roadDiscs(g, dirt.base, 9, px, py, tx, ty);
  // [A4f] stone paving (user w<n>-town-paving): a 16-px window of the paving tile's true pixels, two variants, with a
  // dark kerb line where the paving meets grass
  const PAVE = 'w' + ow.world.id + '-town-paving';
  const pave = (g, t, px, py, tx, ty) => {
    if (!paved(tx, ty)) return;
    const a = ATLAS[PAVE], n = a && a.ready && fname(PAVE, hash(tx, ty, 90) % 3 ? 0 : 1), f = n && a.meta.frames[n];
    if (f) { const r = f.src, s = Math.round(16 / (f.w / r.w)), m = 4, ox = r.x + m + ((tx * 7) % Math.max(1, r.w - s - 2 * m)), oy = r.y + m + ((ty * 5) % Math.max(1, r.h - s - 2 * m)); g.drawImage(a.img, ox, oy, s, s, px, py, 16, 16); } // inner window: no tile border
    else fill(g, mix(dirt.base, [150, 150, 150], 0.6), px, py, 16, 16);
    const edge = (x, y) => !paved(x, y) && !isRoad(x, y);
    g.fillStyle = hex(mix(gDark, [20, 20, 20], 0.5));
    if (edge(tx, ty - 1)) g.fillRect(px, py, 16, 1); if (edge(tx, ty + 1)) g.fillRect(px, py + 15, 16, 1);
    if (edge(tx - 1, ty)) g.fillRect(px, py, 1, 16); if (edge(tx + 1, ty)) g.fillRect(px + 15, py, 1, 16);
  };
  const roadDetail = (g, t, px, py, tx, ty) => {
    if (!isRoad(tx, ty) || paved(tx, ty)) return;
    const h = hash(tx, ty, 50);
    if (h % 2) fill(g, dirt.dark, px + (h >>> 3) % 14, py + (h >>> 8) % 14, 2, 1);
    if (h % 5 === 0) fill(g, dirt.light, px + (h >>> 13) % 14, py + (h >>> 18) % 14, 1, 1);
    // where the road meets the stairs: step onto them (shadow under the first step)
  };
  // ---- shores [R1 carry-over]: straight ALttP banks — a sand/stone rim along each land-facing side with a dark wet
  // line, squared-off outer corners, small inner-corner fills, and a broken foam line just off the bank (no bubble discs) ----
  const wetAt = (x, y) => { const u = tAt(x, y); return u === T.LIQ_A || u === T.LIQ_B || u === T.BRIDGE || u === -1; };
  const shoreFoam = (g, t, px, py, tx, ty) => {
    if (t !== T.LIQ_A && t !== T.LIQ_B) return;
    const m = ow.shore[ty * W + tx]; if (!m) return;
    const L = t === T.LIQ_A ? liqA : liqB, c = mix(L.light, [255, 255, 255], 0.55);
    g.globalAlpha = 0.6;
    for (let i = 0; i < 16; i += 4) { const h = hash(tx, ty, 300 + i); if (h % 3 === 0) continue; const l = 2 + (h >>> 4) % 2;
      if (m & 1) fill(g, c, px + i, py + 5, l, 1); if (m & 4) fill(g, c, px + i, py + 10, l, 1); if (m & 8) fill(g, c, px + 5, py + i, 1, l); if (m & 2) fill(g, c, px + 10, py + i, 1, l); }
    g.globalAlpha = 1;
  };
  const shoreLand = (g, t, px, py, tx, ty) => {
    if (t !== T.LIQ_A && t !== T.LIQ_B) return;
    const m = ow.shore[ty * W + tx] || 0, L = t === T.LIQ_A ? liqA : liqB;
    const rim = mix(shoreC, gBase, 0.35), edge = mix(rim, L.dark, 0.55), R = 3;
    if (m & 1) { fill(g, rim, px, py, 16, R); fill(g, edge, px, py + R, 16, 1); }
    if (m & 4) { fill(g, edge, px, py + 15 - R, 16, 1); fill(g, rim, px, py + 16 - R, 16, R); }
    if (m & 8) { fill(g, rim, px, py, R, 16); fill(g, edge, px + R, py, 1, 16); }
    if (m & 2) { fill(g, edge, px + 15 - R, py, 1, 16); fill(g, rim, px + 16 - R, py, R, 16); }
    for (const [bx, by, dx, dy] of [[1, 8, -1, -1], [1, 2, 1, -1], [4, 8, -1, 1], [4, 2, 1, 1]]) { // corners
      const x = dx < 0 ? px : px + 16 - R - 2, y = dy < 0 ? py : py + 16 - R - 2;
      if ((m & bx) && (m & by)) { fill(g, rim, x, y, R + 2, R + 2); fill(g, edge, dx < 0 ? x + R + 1 : x, dy < 0 ? y + R + 1 : y, 1, 1); } // outer: a squared, chunkier corner
      else if (!(m & bx) && !(m & by) && !wetAt(tx + dx, ty + dy)) { const cx = dx < 0 ? px : px + 16 - R, cy = dy < 0 ? py : py + 16 - R; fill(g, rim, cx, cy, R, R); } // inner corner
    }
  };
  // ---- decorations (user sprites), row-major so lower rows overlap upper ones ----
  const clusterAt = (tx, ty) => vnoise(tx / 5, ty / 5, 77);
  const deco = (g, t, px, py, tx, ty) => {
    const h = hash(tx, ty, 60), jx = (h % 7) - 3, jy = ((h >>> 4) % 5) - 2;
    switch (t) {
      case T.TREE: { // forest: a user tree on every tile, overlapping into a canopy
        if (ow.world.lush) { // [A4] trees on a checkerboard lattice (row by row, lower rows in front): an even canopy mass
          if (treeAnchors(ow, T.TREE, T).cover.has(ty * ow.map.w + tx)) return; // [TREES 2x] under a big live-drawn canopy
          if ((tx + ty) % 2 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tAt(tx + dx, ty + dy) === T.TREE)) return; // [A4g] a lone tile (thin rings) still gets its tree
          const n = fname(S.nature, h % 3 ? 0 : 1), f = n && ATLAS[S.nature].meta.frames[n];
          if (f) drawSprite(g, S.nature, n, px + 8 - f.w / 2, py + 18 - f.h);
          return;
        }
        const pick = [0, 2, 0, 2, 1][h % 5];
        sprite(g, S.nature, pick, px - 8 + jx, py - 14 + jy);
        return;
      }
      case T.BRIDGE: bridgeDeck(g, px, py, tx, ty); return;
      case T.ROCK: sprite(g, S.nature, ow.world.lush ? [5, 6][h % 2] : [5, 6, 7][h % 3], px - 8 + jx / 2, py - 12); return; // [A5] lush: the cracked rock (7) only marks a bombable gate
      case T.CLIFF: case T.CLIFF_EDGE:
        if (ow.world.lush && treeAnchors(ow, T.TREE, T).cover.has(ty * ow.map.w + tx)) return; // [R2-18] under a big plateau-wood canopy
        if (!faceRow(tx, ty) && faceRow(tx, ty + 1) !== 1) sprite(g, S.nature, [0, 2, 3, 0, 4, 2, 5, 0][h % 8], px - 8 + jx, py - 14 + jy); // plateau woods (mostly trees)
        return;
      case T.LEDGE: {
        // [LEDGES] ALttP-style lip from the user's w1-cliffs art: a cliff-front slice squeezed to one low step, with the
        // cliff-left / cliff-right pieces as rounded end caps where the ledge stops (never a bar ending mid-air)
        if (imgReady(S.cliffs)) {
          const l = tAt(tx - 1, ty) === T.LEDGE, r = tAt(tx + 1, ty) === T.LEDGE, fr = !l && r ? 3 : l && !r ? 4 : !l && !r ? 2 : 1;
          drawOpaque(g, S.cliffs, fr, px, py + 2, 16, 13, 0.04);
          fill(g, [16, 16, 26], px + (l ? 0 : 2), py + 15, 16 - (l ? 0 : 2) - (r ? 0 : 2), 1);
          return;
        }
        fill(g, mix(gBase, [255, 255, 220], 0.3), px, py + 5, 16, 2); fill(g, rock.base, px, py + 7, 16, 6); fill(g, rock.dark, px, py + 12, 16, 2); fill(g, [16, 16, 26], px, py + 14, 16, 1);
        return;
      }
      case T.PAD: // one rounded stone landing pad per block
        if (tAt(tx - 1, ty) !== T.PAD && tAt(tx, ty - 1) !== T.PAD) {
          if (ow.world.lush) { // [A5] a calm round flagstone pad in the world's rock colours with a thin gold inlay (was a big crosshair square)
            g.fillStyle = hex(mix(rock.dark, [16, 16, 26], 0.3)); g.beginPath(); g.ellipse(px + 32, py + 33, 27, 25, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = hex(mix(rock.light, [215, 210, 195], 0.55)); g.beginPath(); g.ellipse(px + 32, py + 32, 25, 23, 0, 0, Math.PI * 2); g.fill();
            g.strokeStyle = hex(mix(rock.dark, [215, 210, 195], 0.5)); g.lineWidth = 1; for (const r of [9, 17]) { g.beginPath(); g.ellipse(px + 32, py + 32, r, r * 0.92, 0, 0, Math.PI * 2); g.stroke(); }
            g.strokeStyle = '#d8b850'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(px + 32, py + 32, 22, 20, 0, 0, Math.PI * 2); g.stroke();
          } else {
          g.fillStyle = hex(mix(rock.dark, [16, 16, 26], 0.4)); roundRect(g, px - 2, py - 1, 68, 68, 10); g.fill();
          g.fillStyle = hex(mix(rock.light, [210, 210, 220], 0.5)); roundRect(g, px, py, 64, 62, 9); g.fill();
          g.strokeStyle = '#ffe070'; g.lineWidth = 2; g.beginPath(); g.arc(px + 32, py + 31, 20, 0, Math.PI * 2); g.stroke();
          g.fillStyle = '#ffe070'; g.fillRect(px + 30, py + 12, 4, 6); g.fillRect(px + 30, py + 44, 4, 6); g.fillRect(px + 12, py + 29, 6, 4); g.fillRect(px + 46, py + 29, 6, 4);
          }
        }
        return;
      case T.FENCE: { // [D52] maze fence (user w<n>-maze-game post/segment), foot on the tile's bottom edge; code rails as fallback
        const horiz = tAt(tx - 1, ty) === T.FENCE || tAt(tx + 1, ty) === T.FENCE, sh = 'w' + ow.world.id + '-maze-game', n = fenceFrame(sh, horiz), f = n && ATLAS[sh].meta.frames[n];
        if (f) drawSprite(g, sh, n, px + 8 - f.w / 2, py + 16 - f.bb[3]);
        else { fill(g, '#5a3a1a', px + 6, py + 2, 4, 14); if (horiz) { fill(g, '#8a5a2a', px, py + 5, 16, 3); fill(g, '#8a5a2a', px, py + 11, 16, 3); } }
        return;
      }
      case T.BUSH: { // [A4] hedge bush on a road verge (user w<n>-nature bush frames), foot on the tile's bottom edge
        const n = fname(S.nature, h % 4 ? 3 : 4), f = n && ATLAS[S.nature].meta.frames[n];
        if (f) drawSprite(g, S.nature, n, px + 8 - f.w / 2, py + 16 - f.h);
        return;
      }
      case T.FLOWER: if (ow.world.lush) { // [A4] flower field: every tile a little cluster in the sheet's flower colours
        if (nearRoad(tx, ty)) return;
        for (let i = 0; i < 2; i++) { // two little 5-petal flowers (petals in one sheet colour, a bright centre, a leaf)
          const k = hash(tx, ty, 80 + i), col = flowerCols[k % flowerCols.length], x = px + 2 + ((k >>> 5) % 4) + i * 7, y = py + 2 + ((k >>> 10) % 9);
          fill(g, gDark, x + 1, y + 3, 1, 2); fill(g, mix(gBase, gLight, 0.5), x + 2, y + 4, 1, 1);
          fill(g, col, x, y + 1, 3, 1); fill(g, col, x + 1, y, 1, 3); fill(g, mix(col, [0, 0, 0], 0.3), x, y + 2, 1, 1);
          fill(g, [255, 236, 120], x + 1, y + 1, 1, 1);
        }
        return;
      } // falls through: older worlds keep the clustered meadow decoration
      case T.GROUND: case T.GROUND2: {
        if (nearRoad(tx, ty)) return;
        const c = clusterAt(tx, ty);
        if (c > 0.66 && h % 3 === 0 && !ow.world.lush) { // flower patch (lush worlds grow real flower fields instead): little flowers in the sheet's flower colours
          for (let i = 0; i < 3; i++) { const k = hash(tx, ty, 70 + i), col = flowerCols[k % flowerCols.length]; fill(g, col, px + 2 + (k >>> 5) % 12, py + 2 + (k >>> 10) % 12, 2, 2); }
        } else if (c < 0.22 && h % 5 === 0) sprite(g, S.nature, 12, px, py - 6, 0.5); // tall-grass tufts, clustered
        else if (h % 97 === 0 && !ow.world.lush) sprite(g, S.nature, [3, 4][h % 2], px - 8, py - 14); // a lone bush now and then (lush worlds: bushes only where they make sense)
        return;
      }
      case T.TOWN: {
        const yp = yardAt.get(ty * W + tx);
        if (yp) { // [A4f] yard piece: foot on the tile's bottom edge (art bounds), centred on the tile (trees: on their 2-tile trunk)
          if (!yp.sheet) return;
          if (yp.hedge && ow.world.lush) { hedgeTile(g, px, py, tx, ty); return; } // [R1-10] one autotiled hedge shape
          const sh = 'w' + ow.world.id + (yp.sheet === 'trees' ? '-big-trees' : '-yard-garden'), n = fname(sh, yp.frame), f = n && ATLAS[sh].meta.frames[n];
          const k = yp.hedge && ow.world.lush ? 2 : 1; // [V1.1] lush towns: hedges at the houses' 2x (chunky ALttP hedges; neighbours overlap into one run)
          if (f && yp.box) { // [R2-22] a yard bed fitted into its box (centred, never wider), foot on the tile's bottom edge
            const bb = f.bb || [0, 0, f.w, f.h], bw = bb[2] - bb[0], s = Math.min(1, ((yp.box[1] - yp.box[0]) * 16) / bw), cx = px + ((yp.box[0] + yp.box[1]) / 2 - tx) * 16;
            drawSprite(g, sh, n, Math.round(cx - (bb[0] + bw / 2) * s), Math.round(py + 16 - bb[3] * s), { scale: s });
            return;
          }
          if (f && yp.flip) { // corner piece (drawn ┌): mirrored into └ / ┘, foot on its tile
            const H = (f.bb ? f.bb[3] : f.h) * k; g.save(); g.translate(px + 8, py + 16 - H / 2); g.scale(yp.flip === 'hv' ? -1 : 1, -1); drawSprite(g, sh, n, -(f.w * k) / 2, -H / 2, { scale: k }); g.restore();
          } else if (f) drawSprite(g, sh, n, px + (yp.sheet === 'trees' ? 16 : 8) - (f.w * k) / 2, py + 16 - (f.bb ? f.bb[3] : f.h) * k, { scale: k });
          return;
        }
        const pr = props.get(ty * W + tx);
        if (pr === undefined) return;
        if (ow.world.lush) { // [A5] user 2026-10-06: town props and trees at the houses' 2x (one pixel size per town); foot on the tile's bottom edge
          const sh = pr >= 100 ? S.nature : S.props, n = fname(sh, pr >= 100 ? [0, 2, 4][pr - 100] : pr), f = n && ATLAS[sh].meta.frames[n];
          if (f) drawSprite(g, sh, n, px + 8 - f.w, py + 16 + (pr >= 100 ? 2 : 0) - (f.bb ? f.bb[3] : f.h) * 2, { scale: 2 });
          return;
        }
        if (pr >= 100) sprite(g, S.nature, [0, 2, 4][pr - 100], px - 8, py - 14);
        else sprite(g, S.props, pr, px - 8, py - 16);
        return;
      }
      default:
    }
  };
  return [
    { fn: ground, margin: 0 }, { fn: shade, margin: 0 },
    { fn: shoreFoam, margin: 1 }, { fn: shoreLand, margin: 1 },
    { fn: roadEdge, margin: 1 }, { fn: roadFill, margin: 1 }, { fn: pave, margin: 0 }, { fn: roadDetail, margin: 0 },
    { fn: deco, margin: 4 }, // [A5] 2x town props/trees reach up to ~4 tiles above their foot
  ];
}
// tiny binary min-heap on item[0]
function hpush(h, v) { h.push(v); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } }
function hpop(h) {
  const top = h[0], last = h.pop();
  if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } }
  return top;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function owPaintReady(S) { return imgReady(S.ground) && imgReady(S.nature); }

// [V4] 3-frame water shimmer drawn over the prerendered map each frame (visible liquid tiles only).
export function drawWaterGlints(ctx, ow, cam, time) {
  if (!ow.paint) return;
  const map = ow.map, f = Math.floor(time * 3) % 3;
  const x0 = Math.max(0, Math.floor(cam.x / 16)), y0 = Math.max(0, Math.floor(cam.y / 16));
  const x1 = Math.min(map.w - 1, Math.ceil((cam.x + cam.w) / 16)), y1 = Math.min(map.h - 1, Math.ceil((cam.y + cam.h) / 16));
  ctx.globalAlpha = 0.55;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = map.ground[ty * map.w + tx];
    if (t !== T.LIQ_A && t !== T.LIQ_B) continue;
    const h = hash(tx, ty, 90);
    if (h % 4) continue;
    ctx.fillStyle = t === T.LIQ_A ? ow.paint.liqA : ow.paint.liqB;
    const x = Math.round(tx * 16 - cam.x + ((h >>> 4) % 9) + f * 2), y = Math.round(ty * 16 - cam.y + ((h >>> 9) % 13));
    ctx.fillRect(x, y, 4 - (f === 1 ? 1 : 0), 1); if (f === 2) ctx.fillRect(x + 1, y - 1, 2, 1);
  }
  ctx.globalAlpha = 1;
}
