// Hero movement: 100 px/s, normalised diagonals, per-axis AABB vs tiles with corner sliding, tap-to-move (A*).
import { CONFIG } from '../config.js';
import { held } from '../engine/input.js';
import { findPath } from '../engine/path.js';
import { heroSprites } from '../art/fallback/heroes.js';
import { ATLAS, imgReady, drawSprite, drawSpriteFoot, opaqueBox, drawOpaque } from '../engine/atlas.js';

const BOX_W = 12, BOX_H = 8, SLIDE_MAX = 7, FRAME_T = 0.15;
const CYCLE = [0, 1, 2, 1];
const FACE_SWITCH = 0.12; // [V2] facing hysteresis (s) unless the new axis clearly wins
// [V2] The user's hero sheets mix directions inside the side rows (e.g. Rowan 'right0' faces left).
// Side walk cycles use only frames that really face that way (judged from the sheets), indexed by h.frame.
const SIDE = {
  rowan: { left: ['left0', 'left1', 'right0'], right: ['left2', 'right1', 'right2'] },
  milo: { left: ['left0', 'left2', 'left0'], right: ['right0', 'right2', 'right0'] },
  wren: { left: ['left0', 'left2', 'left0'], right: ['right1', 'right2', 'right1'] },
};
// [V2] attack poses per direction (4 swing steps). The user's sheets are cut down/up/right/left but some rows face
// the wrong way or were cut into pieces (Milo up/right): those use good frames, mirrored ({ f, flip }) or null → walk pose.
const L = (a) => a.map((f) => ({ f, flip: true }));
const ATTACK = {
  rowan: { down: ['down0', 'down1', 'down2', 'down3'], up: null, right: ['right0', 'right1', 'right2', 'right1'], left: ['left0', 'left1', 'left2', 'left1'] },
  milo: { down: ['down0', 'down1', 'down0', 'down1'], up: null, left: ['left0', 'left1', 'left0', 'left1'], right: L(['left0', 'left1', 'left0', 'left1']) },
  wren: { down: ['down0', 'down1', 'down2', 'down3'], up: ['up3', 'up3', 'up3', 'up3'], left: ['right1', 'right2', 'right1', 'right2'], right: ['left1', 'left2', 'left1', 'left2'] },
};
const ARC_TINT = [null, null, '#ffffff', '#80e0ff', '#80e0ff', '#ffe070', '#ffe070', '#ff80c0', '#ff80c0', '#fff6a0'];
const ARC_ROT = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
const ARC_OFF = { right: [14, -10], left: [-14, -10], down: [0, 2], up: [0, -28] };
function drawArc(ctx, h, x, y) {
  if (!imgReady('fx-hero-b')) return;
  const k = 1 - h.swing.t / 0.15, [ox, oy] = ARC_OFF[h.facing];
  ctx.save(); ctx.globalAlpha = k < 0.7 ? 1 : Math.max(0.3, (1 - k) / 0.3);
  ctx.translate(x + ox, y + oy); ctx.rotate(ARC_ROT[h.facing] + (k - 0.5) * 0.9);
  // bright swept stroke (tier colour) under the user's arc sprite, so a swing reads at a glance
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(16,16,26,0.55)'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-8, 0, 16, -1.2, 1.2); ctx.stroke();
  ctx.strokeStyle = ARC_TINT[h.swing.tier || 0] || '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-8, 0, 16, -1.2, 1.2); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-8, 0, 16, -1.0, 1.0); ctx.stroke();
  ctx.globalAlpha *= 0.8; drawSprite(ctx, 'fx-hero-b', 'sword-swing-arc', -12, -16);
  ctx.restore();
}

// [P-C] v2 pilot art for Rowan (cut at 2x: 32x48 walk, 64x64 sword with its own arc), drawn at 0.5 inside the 2x
// world = one screen pixel per art pixel. Scenes switch it on for World 1 only (heroArt.v2).
export const heroArt = { v2: false, worlds: [1, 2, 3, 4, 5, 6, 7] }; // worlds cut true-pixel (build_all V2_FOLDERS) get the v2 hero art
const V2_WALK = { down: ['c0r1', 'c1r1', 'c1r3'], up: ['c2r1', 'c2r3', 'c2r1'], left: ['c0r2', 'c0r3', 'c0r0'], right: ['c2r2', 'c2r0', 'c2r2'] };
const V2_SWORD = { down: ['c0r0', 'c1r0', 'c2r0', 'c1r0'], up: ['c2r1', 'c1r1', 'c2r1', 'c1r1'], left: ['c0r2', 'c1r2', 'c0r2', 'c1r2'], right: ['c0r3', 'c1r3', 'c2r3', 'c1r3'] };
function drawV2(ctx, h, x, y, flash) {
  if (h.swing && imgReady('rowan-sword-v2')) {
    const k = Math.max(0, Math.min(3, Math.floor((1 - h.swing.t / 0.15) * 4)));
    drawSprite(ctx, 'rowan-sword-v2', V2_SWORD[h.facing][k], x - 16, y - 26, { flash, scale: 0.5 });
    h.drawnAttack = true;
    return;
  }
  h.drawnAttack = false;
  drawSprite(ctx, 'rowan-v2', V2_WALK[h.facing][h.frame], x - 8, y - 23, { flash, scale: 0.5 });
}

const CHEST_FRAME = { rowan: 4, milo: 5, wren: 4 }; // the *-extra frame holding a treasure chest overhead (2x6 sheet, cut as blobs)
// a pose frame scaled so its figure is `tall` × the standing walk height, feet on (x, y)
function drawPose(ctx, h, x, y, sh, i, tall) {
  const w0 = 'hero-' + h.id, wf = imgReady(w0) && ATLAS[w0].meta.frames[walkFrame(h.id, 'down', 1)];
  const H = wf ? (opaqueBox(w0, walkFrame(h.id, 'down', 1)).h * wf.w) / wf.src.w : 25, A = ATLAS[sh], n = Object.keys(A.meta.frames)[i], b = opaqueBox(sh, n), k = A.meta.frames[n].w / A.meta.frames[n].src.w;
  const s = (H * tall) / (b.h * k), w = b.w * k * s, hh = b.h * k * s;
  drawOpaque(ctx, sh, i, x - w / 2, y + 1 - hh, w, hh); h.holdTop = y + 1 - hh;
}

// [#331] a hero's own 4-step side walk sheet (row 1 left, row 2 right: contact, passing, contact, passing), drawn at the
// standing walk height; used while walking sideways. Standing still keeps the walk sheet's side pose.
const SIDE_WALK = { milo: 'milo-walk-side' };
function sideWalk(ctx, h, x, y, flash) {
  const sh = SIDE_WALK[h.id]; if (!sh || !h.moving || (h.facing !== 'left' && h.facing !== 'right') || !imgReady(sh)) return false;
  const A = ATLAS[sh], n = Object.keys(A.meta.frames)[(h.facing === 'left' ? 0 : 4) + (Math.floor(h.animT / FRAME_T) % 4)], f = A.meta.frames[n];
  const w0 = 'hero-' + h.id, wn = walkFrame(h.id, 'down', 1), wf = ATLAS[w0].meta.frames[wn], H = (opaqueBox(w0, wn).h * wf.w) / wf.src.w;
  const s = H / ((opaqueBox(sh, n).h * f.w) / f.src.w);
  drawSpriteFoot(ctx, sh, n, x, y, { flash, scale: s }); return true;
}
// [R3c] heroes whose side walk rows have no legs-together frame get a synthetic one on the in-between steps (only while their own side sheet is missing)
function passPose(h) { if (SIDE_WALK[h.id] && imgReady(SIDE_WALK[h.id])) return null; const P = CONFIG.HERO.PASS_SYNTH[h.id]; return P && h.moving && h.frame === 1 && (h.facing === 'left' || h.facing === 'right') ? P : null; }

export function walkFrame(id, facing, frame) {
  if (ATLAS['hero-' + id] && ATLAS['hero-' + id].meta.ds) return facing + frame; // [A1] v2 sheets: rows are down/up/left/right as named
  const s = SIDE[id] && SIDE[id][facing];
  return s ? s[frame] : facing + frame;
}

export function createHero(id, x, y) {
  return { id, x, y, w: BOX_W, h: BOX_H, facing: 'down', moving: false, animT: 0, frame: 1, path: null, flash: 0, speed: CONFIG.HERO.SPEED, iframes: 0, kbx: 0, kby: 0, kbt: 0, cd: 0, swing: null, attackId: null };
}

function free(map, x, y) { return map.boxFree(x - BOX_W / 2, y - BOX_H, x + BOX_W / 2, y); }

// Move along one axis; when blocked, nudge sideways (corner sliding) if a free lane is within SLIDE_MAX px.
// `other` = input on the other axis: never slide against it (diagonal into a corner would jitter back and forth).
function moveAxis(h, map, dx, dy, other = 0) {
  const nx = h.x + dx, ny = h.y + dy;
  if (free(map, nx, ny)) { h.x = nx; h.y = ny; return true; }
  const amt = Math.abs(dx + dy);
  for (let k = 1; k <= SLIDE_MAX; k++) {
    for (const s of [-1, 1]) {
      if (other && s !== Math.sign(other)) continue;
      const ox = dy ? s * k : 0, oy = dx ? s * k : 0;
      if (free(map, nx + ox, ny + oy) && free(map, h.x + Math.sign(ox) * Math.min(amt, k), h.y + Math.sign(oy) * Math.min(amt, k))) {
        h.x += Math.sign(ox) * Math.min(amt, k);
        h.y += Math.sign(oy) * Math.min(amt, k);
        return false;
      }
    }
  }
  return false;
}

export function setTapTarget(h, map, wx, wy) {
  const t = map.tile;
  const p = findPath(map, Math.floor(h.x / t), Math.floor((h.y - 1) / t), Math.floor(wx / t), Math.floor(wy / t));
  h.path = p ? p.map((n) => ({ x: n.tx * t + t / 2, y: n.ty * t + t / 2 + BOX_H / 2 })) : null;
  if (h.path && h.path.length) { h.path[h.path.length - 1] = { x: wx, y: wy + BOX_H / 2 }; }
  return !!h.path;
}

export function updateHero(h, map, dt) {
  let ix = (held('right') ? 1 : 0) - (held('left') ? 1 : 0);
  let iy = (held('down') ? 1 : 0) - (held('up') ? 1 : 0);
  if (ix || iy) h.path = null;
  else if (h.path && h.path.length) {
    const wp = h.path[0];
    const dx = wp.x - h.x, dy = wp.y - h.y, d = Math.hypot(dx, dy);
    if (d < 2) { h.path.shift(); if (!h.path.length) h.path = null; }
    else { ix = dx / d; iy = dy / d; }
  }
  const len = Math.hypot(ix, iy);
  h.moving = len > 0;
  h.dirY = len > 0 ? iy / len : 0; // actual walk direction (facing can be held by an attack)
  if (h.moving) {
    const s = (h.speed * (1 - (h.slow || 0)) * dt) / len;
    moveAxis(h, map, ix * s, 0, iy);
    moveAxis(h, map, 0, iy * s, ix);
    // [V2] facing from the direction smoothed over the last ~6 px (touch paths zig-zag between tiles)
    const a = Math.min(1, (h.speed * dt) / 6);
    h.sdx = (h.sdx || 0) * (1 - a) + (ix / len) * a; h.sdy = (h.sdy || 0) * (1 - a) + (iy / len) * a;
    const sx = h.sdx, sy = h.sdy, sl = Math.hypot(sx, sy) || 1;
    const fx = sx > 0.3 * sl ? 'right' : sx < -0.3 * sl ? 'left' : null, fy = sy > 0.3 * sl ? 'down' : sy < -0.3 * sl ? 'up' : null;
    // keep the current direction while it is still one of the moving ones (no flicker on diagonals);
    // otherwise switch at once on a clear axis win, else after FACE_SWITCH. An attack's aim holds it briefly.
    if (h.faceHold > 0 || h.facing === fx || h.facing === fy) h.faceT = 0;
    else {
      const want = Math.abs(sx) > Math.abs(sy) ? fx : fy;
      h.faceT = (h.faceT || 0) + dt;
      if (want && (Math.max(Math.abs(sx), Math.abs(sy)) > 0.85 * sl || h.faceT >= FACE_SWITCH)) { h.facing = want; h.faceT = 0; }
    }
    h.animT += dt;
    h.frame = CYCLE[Math.floor(h.animT / FRAME_T) % CYCLE.length];
  } else { h.animT = 0; h.frame = 1; }
  if (h.flash > 0) h.flash -= dt;
  if (h.faceHold > 0) h.faceHold -= dt;
}

// [R2-24] The user's attack sheets are drawn bigger than the walk sheets (Milo/Wren ~1.5x): scale the attack pose so the
// hero keeps the walk height mid-swing (measured once: standing 'down0' attack figure vs the 'down' walk figure).
const ATK_SCALE = {};
function attackScale(id, atk) {
  if (ATK_SCALE[id] !== undefined) return ATK_SCALE[id];
  const w0 = 'hero-' + id, A = ATLAS[atk], W = ATLAS[w0];
  if (!imgReady(w0) || !A.meta.frames.down0) return 1;
  const wn = walkFrame(id, 'down', 1), wf = W.meta.frames[wn], af = A.meta.frames.down0;
  const walkH = (opaqueBox(w0, wn).h * wf.w) / wf.src.w, atkH = (opaqueBox(atk, 'down0').h * af.w) / af.src.w;
  return (ATK_SCALE[id] = atkH > walkH * 1.1 ? walkH / atkH : 1);
}

// Atlas art when delivered (hero-<id> walk, <id>-attack during a swing), code-drawn fallback otherwise.
export function drawHero(ctx, h, cam) {
  if (h.iframes > 0 && Math.floor(h.iframes * 12) % 2) { h.drawnAttack = true; return; } // [R2-19] the blink hides the weapon too
  const flash = h.flash > 0 && Math.floor(h.flash * 20) % 2 === 1;
  const x = Math.round(h.x - cam.x), y = Math.round(h.y - cam.y);
  if (h.itemGet) h.drawnAttack = true; // [R2-19] the prize poses below hide any swing (no code weapon bar over them)
  if (h.itemGet && h.itemGet.chest && imgReady(h.id + '-extra')) { // [A8] chest opened: the user's *-extra "treasure chest overhead" pose, the hero's walk height
    drawPose(ctx, h, x, y, h.id + '-extra', CHEST_FRAME[h.id] || 4, 1.3); return;
  }
  if (h.itemGet && imgReady(h.id + '-hold')) { // [A8] item-get: the user's <hero>-hold pose (both hands up, prize drawn above), the hero's walk height
    const sh = h.id + '-hold', w0 = 'hero-' + h.id, wf = imgReady(w0) && ATLAS[w0].meta.frames[walkFrame(h.id, 'down', 1)];
    const H = wf ? (opaqueBox(w0, walkFrame(h.id, 'down', 1)).h * wf.w) / wf.src.w : 25, A = ATLAS[sh], n = Object.keys(A.meta.frames)[h.itemGet.t > 0.8 ? 0 : 1], b = opaqueBox(sh, n), k = A.meta.frames[n].w / A.meta.frames[n].src.w;
    const s = (H * 1.18) / (b.h * k), w = b.w * k * s, hh = b.h * k * s; // arms raised: ~18% taller than the standing figure
    drawOpaque(ctx, sh, Object.keys(A.meta.frames).indexOf(n), x - w / 2, y + 1 - hh, w, hh); h.holdTop = y + 1 - hh; return;
  }
  if (heroArt.v2 && h.id === 'rowan' && imgReady('rowan-v2')) { drawV2(ctx, h, x, y, flash); return; }
  const atk = h.id + '-attack';
  const v2atk = imgReady(atk) && ATLAS[atk].meta.ds;
  const pose = h.swing && imgReady(atk) && (v2atk ? [0, 1, 2, 3].map((k) => h.facing + k) : ATTACK[h.id] && ATTACK[h.id][h.facing]);
  if (pose) {
    h.drawnAttack = true;
    const p = pose[Math.max(0, Math.min(3, Math.floor((1 - h.swing.t / 0.15) * 4)))];
    const f = typeof p === 'string' ? p : p.f;
    if (p.flip) { ctx.save(); ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
    drawSpriteFoot(ctx, atk, f, x, y + 2, { flash, scale: attackScale(h.id, atk) });
    if (p.flip) ctx.restore();
    if (!v2atk) drawArc(ctx, h, x, y); // v2 attack frames carry their own swing arc
    return;
  }
  h.drawnAttack = !!h.swing && imgReady('fx-hero-b') && imgReady('hero-' + h.id);
  if (imgReady('hero-' + h.id) && sideWalk(ctx, h, x, y + 1, flash)) { if (h.swing) drawArc(ctx, h, x, y); return; }
  if (imgReady('hero-' + h.id)) { drawSpriteFoot(ctx, 'hero-' + h.id, walkFrame(h.id, h.facing, h.frame), x, y + 1, { flash, pass: passPose(h) }); if (h.swing) drawArc(ctx, h, x, y); return; }
  const spr = heroSprites(h.id);
  const set = h.flash > 0 && Math.floor(h.flash * 20) % 2 ? spr.flash : spr.frames;
  if (h.iframes > 0 && Math.floor(h.iframes * 12) % 2) return;
  ctx.drawImage(set[h.facing][h.frame], Math.round(h.x - 8 - cam.x), Math.round(h.y - 24 - cam.y));
}
