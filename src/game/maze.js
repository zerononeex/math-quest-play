// [D52] Maze mini-game (one per world; W1 first): talk to the keeper → the clock starts; walk through the fence maze into
// the prize pen before it runs out → a heart piece (once per world; later runs only chase a best time). Running out of
// time costs nothing: the keeper just offers another go. Art: the user's w<n>-maze-game (keeper, start sign, finish arch,
// prize pedestal, fence post/segment, hay) and ui-heart-pieces (piece, stopwatch); every piece has a code fallback.
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';
import { refreshHearts } from './progression.js';

const MF = { keeper: 0, keeperCheer: 1, start: 2, finish: 3, pedestal: 4, post: 5, fence: 6, hay: 7 };
const HP = { piece: 5, stopwatch: 7 };
const frame = (sheet, i) => (imgReady(sheet) ? Object.keys(ATLAS[sheet].meta.frames)[i] : null);
// [W8 Phase 4] a maze with no w<n>-maze-game sheet draws its pieces from the world's own sheets: [sheet, frame index or name]
const MAZE_ART = { 8: { pedestal: ['w8-puzzle', 18], star: ['w8-ambient', 'frog'], star2: ['w8-ambient', 'frog-b'], platform: ['w8-town-paving', 0], gateDark: ['w8-puzzle', 20], gateLit: ['w8-puzzle', 23] } };
const artFrame = (a) => (a && imgReady(a[0]) ? (typeof a[1] === 'number' ? frame(a[0], a[1]) : ATLAS[a[0]].meta.frames[a[1]] ? a[1] : null) : null);

export function createMaze(ow) {
  const f = ow.feat.maze; if (!f) return null;
  const mz = { f, map: ow.map, art: MAZE_ART[ow.world.id] || null, sheet: 'w' + ow.world.id + '-maze-game', id: 'maze-w' + ow.world.id, time: ow.world.maze.time || CONFIG.MAZE.TIME_S, run: null, cheer: 0, clock: 0, plat: (f.platforms || []).map(() => true) };
  setGate(mz, false);
  return mz;
}

// [W8 Phase 4] the star gate ('F' tiles) is solid until the run's star pieces are all found (mazes without stars: always open)
function setGate(mz, open) {
  mz.gateOpen = open || !(mz.f.stars || []).length;
  for (const [x, y] of mz.f.finish) mz.map.solid[mz.map.idx(x, y)] = mz.gateOpen ? 0 : 1;
}

// The keeper is an ordinary talking NPC (drawn from the maze sheet); arena's talkTo calls startMaze when he is done talking.
export function mazeKeeper(mz, world) {
  const k = world.maze.keeper;
  return { kind: 'npc', contact: false, x: mz.f.keeper.tx * 16 + 8, y: mz.f.keeper.ty * 16 + 12, w: 12, h: 12, home: null, ai: { state: 'idle', t: 99 },
    npc: { id: mz.id + '-keeper', name: k.name, lines: k.lines, sheet: mz.sheet, villager: 0, maze: true } };
}

// What the keeper says: the world's lines the first time; once the heart piece is won, an offer to beat the best time.
export function mazeLines(mz, data, world) {
  if (!(data.pieceIds || []).includes(mz.id)) return world.maze.keeper.lines;
  const best = (data.mazeBest || {})['w' + mz.id.slice(-1)];
  return ['Back for another run? The heart piece is yours already.', best ? 'Your best time is ' + best + 's. Beat it. Go!' : 'Beat your best time. Go!'];
}

export function startMaze(mz, data) {
  mz.run = { t: mz.time * (data.tier === 'little' ? CONFIG.MAZE.LITTLE_MULT : 1), used: 0, found: [] };
  setGate(mz, false);
}

// [W8 Phase 4] drifting star platforms: each comes and goes on its own phase; one never leaves while the hero stands on it
function updatePlatforms(mz, hero, dt) {
  const P = mz.f.platforms || []; if (!P.length) return;
  mz.clock += dt;
  const on = CONFIG.MAZE.PLATFORM_ON, per = on + CONFIG.MAZE.PLATFORM_OFF, htx = Math.floor(hero.x / 16), hty = Math.floor((hero.y - 2) / 16);
  P.forEach(([x, y], i) => {
    const want = ((mz.clock + Math.floor(i / 2) * 1.7) % per) < on, under = Math.abs(htx - x) <= 1 && Math.abs(hty - y) <= 1;
    if (!want && under && mz.plat[i]) return;
    mz.plat[i] = want; mz.map.solid[mz.map.idx(x, y)] = want ? 0 : 1;
  });
}

const inPen = (mz, tx, ty) => { const [px, py] = mz.f.pedestal; return Math.abs(tx - px) <= 1 && Math.abs(ty - py) <= 1; };

// → { kind: 'win' | 'best' | 'lose' | 'idle-pen', piece?, secs? } on the frame something happens, else null
export function updateMaze(mz, data, hero, dt) {
  if (mz.cheer > 0) mz.cheer -= dt;
  updatePlatforms(mz, hero, dt);
  const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
  if (mz.run && (mz.f.stars || []).length) { // [W8 Phase 4] star pieces: walk onto each; the last one lights the gate
    const i = mz.f.stars.findIndex(([sx, sy], k) => !mz.run.found.includes(k) && Math.hypot(sx * 16 + 8 - hero.x, sy * 16 + 8 - hero.y) < CONFIG.MAZE.STAR_R);
    if (i >= 0) { mz.run.found.push(i); const n = mz.run.found.length, all = n >= mz.f.stars.length; if (all) setGate(mz, true); return { kind: all ? 'lit' : 'star', n, of: mz.f.stars.length }; }
  }
  if (!mz.run) { if (inPen(mz, tx, ty) && !mz.penNote) { mz.penNote = true; return { kind: 'idle-pen' }; } if (!inPen(mz, tx, ty)) mz.penNote = false; return null; }
  mz.run.t -= dt; mz.run.used += dt;
  if (inPen(mz, tx, ty)) {
    const secs = Math.round(mz.run.used * 10) / 10, key = 'w' + mz.id.slice(-1);
    mz.run = null; mz.cheer = 2.5; mz.penNote = true;
    data.mazeBest = data.mazeBest || {};
    const best = !data.mazeBest[key] || secs < data.mazeBest[key];
    if (best) data.mazeBest[key] = secs;
    if (!(data.pieceIds || []).includes(mz.id)) return { kind: 'win', piece: givePiece(data, mz.id), secs };
    return { kind: best ? 'best' : 'done', secs };
  }
  if (mz.run.t <= 0) { mz.run = null; return { kind: 'lose' }; }
  return null;
}

// +1 heart piece from a source (each source pays once); every 4th piece raises max hearts (cap 20 kept by maxHeartsOf).
export function givePiece(data, id) {
  data.pieceIds = [...(data.pieceIds || []), id];
  data.heartPieces = (data.heartPieces || 0) + 1;
  const whole = data.heartPieces % CONFIG.HEARTS.PIECES_PER_HEART === 0;
  if (whole) refreshHearts(data, 1);
  return { count: data.heartPieces % CONFIG.HEARTS.PIECES_PER_HEART, whole };
}

// Live-drawn set pieces (world space): start sign, finish arch over the exit gap, pedestal (+ floating piece until won), hay.
export function drawMazeDecor(ctx, mz, data, cam) {
  if (mz.art) return drawArtMaze(ctx, mz, data, cam);
  const S = mz.sheet, f = mz.f, ok = imgReady(S);
  const put = (i, tx, ty, dx = 0) => { // foot on the tile's bottom edge, centred (dx in tiles)
    const n = ok && frame(S, i); if (!n) return false;
    const fr = ATLAS[S].meta.frames[n];
    drawSprite(ctx, S, n, Math.round((tx + 0.5 + dx) * 16 - fr.w / 2 - cam.x), Math.round((ty + 1) * 16 - (fr.bb ? fr.bb[3] : fr.h) - cam.y));
    return true;
  };
  const [s0] = f.start, [f0] = f.finish, [px, py] = f.pedestal;
  if (s0 && !put(MF.start, s0[0] - 1, s0[1] - 1)) { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(s0[0] * 16 - 14 - cam.x, s0[1] * 16 - 20 - cam.y, 12, 10); }
  for (const [hx, hy] of f.hay) if (!put(MF.hay, hx, hy, 0.5)) { ctx.fillStyle = '#e0c060'; ctx.fillRect(hx * 16 + 2 - cam.x, hy * 16 + 4 - cam.y, 12, 10); }
  if (f0 && !put(MF.finish, f0[0], f0[1] + 1)) { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(f0[0] * 16 - cam.x, f0[1] * 16 - 8 - cam.y, 16, 4); }
  // [R1-13] the pedestal art carries the heart piece on top: once it is won, only the stand below the prize is drawn
  const won = (data.pieceIds || []).includes(mz.id), pn = ok && frame(S, MF.pedestal), pf = pn && ATLAS[S].meta.frames[pn];
  if (won && pf) {
    const top = (py + 1) * 16 - (pf.bb ? pf.bb[3] : pf.h), cut = top + (pf.bb ? pf.bb[1] + (pf.bb[3] - pf.bb[1]) * CONFIG.MAZE.PRIZE_FRAC : pf.h * 0.4);
    ctx.save(); ctx.beginPath(); ctx.rect(px * 16 - 40 - cam.x, cut - cam.y, 96, 80); ctx.clip(); put(MF.pedestal, px, py); ctx.restore();
  } else if (!put(MF.pedestal, px, py)) {
    ctx.fillStyle = '#9090a0'; ctx.fillRect(px * 16 + 3 - cam.x, py * 16 + 6 - cam.y, 10, 10);
    if (!won) { ctx.fillStyle = '#e03040'; ctx.fillRect(px * 16 + 4 - cam.x, py * 16 - 4 - cam.y, 8, 8); }
  }
}

// [W8 Phase 4] a maze dressed in the world's own art: drifting platforms (paving tiles over the nebula), star pieces still to find,
// the star gate (a dark crystal over the gap, lit once every star is found) and the prize pedestal with the heart piece above it.
function drawArtMaze(ctx, mz, data, cam) {
  const A = mz.art, f = mz.f, t = performance.now() / 1000, at = (a, x, y, o = {}) => { const n = artFrame(a); if (!n) return false; const fr = ATLAS[a[0]].meta.frames[n], s = o.scale || 1; ctx.globalAlpha = o.alpha || 1; drawSprite(ctx, a[0], n, Math.round(x - (fr.w * s) / 2 - cam.x), Math.round(y - (fr.bb ? fr.bb[3] : fr.h) * s - cam.y), { scale: s }); ctx.globalAlpha = 1; return true; };
  const pn = artFrame(A.platform);
  (f.platforms || []).forEach(([x, y], i) => {
    if (!mz.plat[i] || !pn) return;
    const fr = ATLAS[A.platform[0]].meta.frames[pn], k = 16 / fr.w;
    drawSprite(ctx, A.platform[0], pn, x * 16 - cam.x, y * 16 - cam.y, { scale: k });
  });
  const left = (f.stars || []).filter((s, i) => !(mz.run && mz.run.found.includes(i)));
  for (const [x, y] of left) at(Math.floor(t * 3 + x) % 2 ? A.star2 : A.star, x * 16 + 16, y * 16 + 26 + Math.sin(t * 2.5 + x) * 2, { alpha: mz.run ? 1 : 0.55, scale: 2 }); // ambient-sized art: 2x so a kid can spot it
  if (f.finish.length) { // the star gate: a crystal over the gap
    const [gx] = f.finish[0], gy = Math.min(...f.finish.map((p) => p[1]));
    at(mz.gateOpen ? A.gateLit : A.gateDark, gx * 16 + 8, gy * 16 + 2);
    if (!mz.gateOpen) { ctx.fillStyle = 'rgba(160,200,255,' + (0.25 + 0.1 * Math.sin(t * 4)) + ')'; ctx.fillRect(gx * 16 + 5 - cam.x, gy * 16 - cam.y, 6, f.finish.length * 16); }
  }
  const [px, py] = f.pedestal, won = (data.pieceIds || []).includes(mz.id);
  at(A.pedestal, px * 16 + 8, py * 16 + 16);
  if (!won) { const n = frame('ui-heart-pieces', HP.piece); if (n) drawSprite(ctx, 'ui-heart-pieces', n, Math.round(px * 16 - cam.x - 4), Math.round(py * 16 - 26 + Math.sin(t * 2) * 2 - cam.y)); }
}

// Fence tile art for the overworld painter: a segment where the fence runs on left/right, else a post.
export function fenceFrame(sheet, horizontal) { return frame(sheet, horizontal ? MF.fence : MF.post); }

// Screen-space clock while a run is on: stopwatch + seconds (turns red in the last WARN_S seconds).
export function drawMazeHud(ctx, mz, view, font, drawOutlined) {
  if (!mz || !mz.run) return;
  const s = Math.max(0, Math.ceil(mz.run.t)), x = view.w / 2, y = 64, n = frame('ui-heart-pieces', HP.stopwatch);
  ctx.fillStyle = 'rgba(8,8,24,0.7)'; ctx.fillRect(x - 44, y - 14, 88, 28);
  if (n) drawSprite(ctx, 'ui-heart-pieces', n, x - 40, y - 12, { scale: 1.5 });
  ctx.font = font(18); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  drawOutlined(ctx, s + 's', x - 10, y + 1, s <= CONFIG.MAZE.WARN_S ? '#ff8080' : '#ffffff', '#10101a', 2);
  const N = (mz.f.stars || []).length; // [W8 Phase 4] star pieces found
  if (N) { ctx.fillStyle = 'rgba(8,8,24,0.7)'; ctx.fillRect(x - 44, y + 16, 88, 22); drawOutlined(ctx, '★ ' + mz.run.found.length + '/' + N, x, y + 27, mz.run.found.length >= N ? '#ffe070' : '#ffffff', '#10101a', 2); }
}
