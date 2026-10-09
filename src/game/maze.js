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

export function createMaze(ow) {
  const f = ow.feat.maze; if (!f) return null;
  return { f, sheet: 'w' + ow.world.id + '-maze-game', id: 'maze-w' + ow.world.id, time: ow.world.maze.time || CONFIG.MAZE.TIME_S, run: null, cheer: 0 };
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
  mz.run = { t: mz.time * (data.tier === 'little' ? CONFIG.MAZE.LITTLE_MULT : 1), used: 0 };
}

const inPen = (mz, tx, ty) => { const [px, py] = mz.f.pedestal; return Math.abs(tx - px) <= 1 && Math.abs(ty - py) <= 1; };

// → { kind: 'win' | 'best' | 'lose' | 'idle-pen', piece?, secs? } on the frame something happens, else null
export function updateMaze(mz, data, hero, dt) {
  if (mz.cheer > 0) mz.cheer -= dt;
  const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
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
}
