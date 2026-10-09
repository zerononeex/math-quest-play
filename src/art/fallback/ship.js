import { ATLAS, imgReady, opaqueBox, drawOpaque, drawSprite, drawFoot, codeArt } from '../../engine/atlas.js';
// Code-drawn Wayfarer art: the rocket on each landing pad (atlas key `ship-ext`) and the interior stations.
import { drawOutlined, font } from '../../engine/text.js';
import { CONFIG } from '../../config.js';
import { drawCell, uiFont } from '../../engine/ui.js';

// Rocket standing on the pad; (x, y) = bottom centre in screen px.
export function drawRocket(ctx, x, y) {
  if (imgReady('ship-ext')) { // [A5] the user's Wayfarer (ship-ext): about 3 tiles wide, standing on its legs at (x, y)
    const b = opaqueBox('ship-ext', Object.keys(ATLAS['ship-ext'].meta.frames)[0]), w = 48, h = Math.round((w * b.h) / b.w);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y - 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    drawOpaque(ctx, 'ship-ext', 0, x - w / 2, y - h, w, h); return;
  }
  ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x - 22, y - 6, 12, 6); ctx.fillRect(x + 10, y - 6, 12, 6); // landing legs
  ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x - 12, y - 58, 24, 52); // hull
  ctx.fillStyle = '#c03a3a'; ctx.beginPath(); ctx.moveTo(x - 12, y - 58); ctx.lineTo(x, y - 78); ctx.lineTo(x + 12, y - 58); ctx.fill(); // nose
  ctx.fillRect(x - 20, y - 22, 8, 16); ctx.fillRect(x + 12, y - 22, 8, 16); // fins
  ctx.fillStyle = '#60c0f0'; ctx.beginPath(); ctx.arc(x, y - 42, 6, 0, Math.PI * 2); ctx.fill(); // porthole
  ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#3a3a4a'; ctx.fillRect(x - 6, y - 22, 12, 16); // door
  ctx.fillStyle = '#f0d040'; ctx.fillRect(x - 1, y - 16, 2, 2);
}

// [R1-24] Interior tiles from the user's ship-room-2x kit (true pixels, one frame = one 16-px tile, cropped square);
// ground values: SG. Code-drawn deck plates when the sheet is missing.
export const SG = { FLOOR: 0, TOP: 1, FACE: 2, STAR: 3, SIDE: 4, BOTTOM: 5, DOOR: 6, STRIP: 7 };
const RK = 'ship-room-2x', RF = { floor: 0, floor2: 1, star: 3, wall: 4, pipes: 6, top: 7, sideL: 8, sideR: 9, corner: 10, bottom: 12, hatch: 13, steps: 14, strip: 15 };
function tile(g, i, px, py) {
  const a = ATLAS[RK], n = Object.keys(a.meta.frames)[i], f = n && a.meta.frames[n]; if (!f) return false;
  const r = f.src, s = Math.min(r.w, r.h);
  g.drawImage(a.img, r.x + ((r.w - s) >> 1), r.y + ((r.h - s) >> 1), s, s, px, py, 16, 16); return true;
}
export function shipPainter(g, v, px, py, tx, ty) {
  if (imgReady(RK)) {
    const W = CONFIG.SHIP.W, edge = tx === 0 || tx === W - 1, h = (Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663)) >>> 0;
    if (v === SG.FLOOR) { tile(g, h % 4 ? RF.floor : RF.floor2, px, py); if (ty === 3) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px, py, 16, 4); } return; }
    if (v === SG.STAR) return void tile(g, RF.star, px, py);
    if (v === SG.STRIP) return void tile(g, RF.strip, px, py);
    if (v === SG.DOOR) return void tile(g, RF.steps, px, py);
    if (edge && ty < 3) return void tile(g, RF.corner, px, py);
    if (v === SG.TOP) return void tile(g, RF.top, px, py);
    if (v === SG.FACE) return void tile(g, tx % 7 === 3 ? RF.pipes : RF.wall, px, py);
    if (v === SG.SIDE) return void tile(g, tx === 0 ? RF.sideL : RF.sideR, px, py);
    if (v === SG.BOTTOM) return void tile(g, RF.bottom, px, py);
  }
  if (v === SG.TOP || v === SG.FACE || v === SG.SIDE || v === SG.BOTTOM) { g.fillStyle = '#2a2e44'; g.fillRect(px, py, 16, 16); g.fillStyle = '#3a4060'; g.fillRect(px, py + 12, 16, 4); return; }
  g.fillStyle = v === SG.STAR || v === SG.STRIP ? '#2a3a7a' : (tx + ty) % 2 ? '#8a90a8' : '#9298b0'; g.fillRect(px, py, 16, 16);
  g.fillStyle = '#7a8098'; g.fillRect(px, py, 16, 1); g.fillRect(px, py, 1, 16);
}

// A ship prop (ship-in-2x / ship-room-2x frame), centred on x with its art's foot on y (opaque bounds); a soft floor
// shadow under standing ones. scale: whole-number multiples only.
export function drawShipProp(ctx, sheet, i, x, y, shadow = true, scale = CONFIG.SHIP.PROP_SCALE) {
  if (!imgReady(sheet)) return false;
  const n = Object.keys(ATLAS[sheet].meta.frames)[i], f = n && ATLAS[sheet].meta.frames[n]; if (!f) return false;
  const b = opaqueBox(sheet, n), kk = f.w / f.src.w, foot = (b.y - f.src.y + b.h) * kk, cx = (b.x - f.src.x + b.w / 2) * kk, w = b.w * kk;
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y - 2, (w * scale) / 2 - 2, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  drawSprite(ctx, sheet, n, Math.round(x - cx * scale), Math.round(y - foot * scale), { scale });
  return true;
}

// [R1-25] An always-visible plaque in the clean UI style (blue cell, white bold sans) centred at (x, y); `big` = you
// stand at it (the selected style, larger text).
export function drawPlaque(ctx, text, x, y, big = false) {
  const px = CONFIG.SHIP.LABEL_PX * (big ? 1.25 : 1); ctx.font = uiFont(px);
  const w = Math.ceil(ctx.measureText(text).width) + 8, h = Math.round(px + 6);
  drawCell(ctx, Math.round(x - w / 2), Math.round(y), w, h, { sel: big });
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.fillText(text, Math.round(x), Math.round(y + h / 2) + 0.5); // no drop shadow at this size (it reads as doubled text)
}

const LOOK = {
  map: ['#2a6a9a', '#6ac06a'], trophies: ['#8a6a2a', '#f0d040'], gallery: ['#5a3a7a', '#e0b0ff'],
  locker: ['#4a5a6a', '#c0c8d0'], forge: ['#6a2a1a', '#ff9a40'], bunks: ['#3a4a7a', '#f0f0ff'],
};
export function drawStation(ctx, st, x, y, near) {
  const w = st.w * 16, h = st.h * 16;
  if (st.art && drawShipProp(ctx, st.art[0], st.art[1], x + w / 2, y + h, true)) return; // [R1-24] the user's prop (labels: drawStationLabel)
  const [a, b] = LOOK[st.kind] || ['#444', '#aaa'];
  ctx.fillStyle = a; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = b; ctx.fillRect(x + 3, y + 3, w - 6, 4); ctx.fillRect(x + 3, y + h - 7, w - 6, 4);
  ctx.strokeStyle = near ? '#ffffff' : '#10101a'; ctx.lineWidth = near ? 3 : 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
export function drawStationLabel(ctx, st, x, y, near) { drawPlaque(ctx, st.label || st.name, x + (st.w * 16) / 2, y + st.h * 16 + 3, near); }
// [R3e] the station's name as plain white text under it (no plaque): a thin dark edge keeps it readable on the floor
export function drawStationText(ctx, st, x, y, near) {
  const px = CONFIG.SHIP.LABEL_PX * (near ? 1.25 : 1), tx = Math.round(x + (st.w * 16) / 2), ty = Math.round(y + st.h * 16 + 3 + px / 2);
  ctx.font = uiFont(px); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,8,20,0.85)'; ctx.lineWidth = CONFIG.SHIP.LABEL_EDGE; ctx.strokeText(st.label || st.name, tx, ty);
  ctx.fillStyle = '#ffffff'; ctx.fillText(st.label || st.name, tx, ty);
}

// [MEDAL BOARD] The Wayfarer's big medallion board on the back wall, feet on the station's bottom edge: one column per world
// that has medallions (W1..W7 in order; W8 has none), one socket per medallion (ui-kit empty-medallion-slot), the earned ones
// filled with their medals-sheet art, the rest a grey ghost. coll = game/ship.js medallionCollection(data).
// Board art: #377 ship-medal-board (delivered 2026-10-09 at 384x256 art px, cut true-pixel 380x247), drawn 126x82 — its
// own 3:2 shape — with smoothing on for the reduction (like the World Maps painting) so the thin quilting does not break up;
// the sockets sit on its measured velvet face (FACE, fractions of the board). Without the sheet: an interim frame of the
// ship's teal hull plates (ship-room-2x frame 2) in a code-drawn wood + brass trim, marked codeArt('medal-board').
export const MEDAL_BOARD = { W: 126, H: 82, FACE: [0.0395, 0.158, 0.921, 0.777], HEAD: 8, SOCK: 13, ROW: 13 };
export function medalBoardRect(st, x, y) { const B = MEDAL_BOARD; return { x: Math.round(x + (st.w * 16 - B.W) / 2), y: Math.round(y + st.h * 16 - B.H), w: B.W, h: B.H }; }
export function drawMedalBoard(ctx, st, x, y, coll, near) {
  const B = MEDAL_BOARD, r = medalBoardRect(st, x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(r.x + 3, r.y + r.h - 1, r.w - 6, 3); // its shadow on the floor
  let face;
  if (imgReady('ship-medal-board')) {
    const A = ATLAS['ship-medal-board'], f = Object.values(A.meta.frames)[0].src, sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(A.img, f.x, f.y, f.w, f.h, r.x, r.y, r.w, r.h);
    ctx.imageSmoothingEnabled = sm;
    face = { x: r.x + r.w * B.FACE[0], y: r.y + r.h * B.FACE[1], w: r.w * B.FACE[2], h: r.h * B.FACE[3] };
  } else {
    codeArt('medal-board'); // [R2-19a] audit: the interim board frame is code-drawn
    ctx.fillStyle = '#10101a'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#7a4a26'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2); // wood frame
    ctx.fillStyle = '#a8703a'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 2);
    ctx.fillStyle = '#e0b048'; ctx.fillRect(r.x + 4, r.y + 4, r.w - 8, 1); ctx.fillRect(r.x + 4, r.y + r.h - 5, r.w - 8, 1); // brass rails
    face = { x: r.x + 5, y: r.y + 5, w: r.w - 10, h: r.h - 10 };
    ctx.save(); ctx.beginPath(); ctx.rect(face.x, face.y, face.w, face.h); ctx.clip();
    if (imgReady('ship-room-2x')) { const n = Object.keys(ATLAS['ship-room-2x'].meta.frames)[2], f = ATLAS['ship-room-2x'].meta.frames[n]; for (let yy = face.y; yy < face.y + face.h; yy += f.h) for (let xx = face.x; xx < face.x + face.w; xx += f.w) drawSprite(ctx, 'ship-room-2x', n, xx, yy); }
    else { ctx.fillStyle = '#1e5a62'; ctx.fillRect(face.x, face.y, face.w, face.h); }
    ctx.fillStyle = 'rgba(8,30,40,0.35)'; ctx.fillRect(face.x, face.y, face.w, face.h); // a touch darker so the sockets read
    ctx.restore();
    for (const [cx2, cy2] of [[r.x + 2, r.y + 2], [r.x + r.w - 5, r.y + 2], [r.x + 2, r.y + r.h - 5], [r.x + r.w - 5, r.y + r.h - 5]]) { ctx.fillStyle = '#f0c858'; ctx.fillRect(cx2, cy2, 3, 3); } // brass corner rivets
  }
  const cols = coll.worlds.filter((g) => g.slots.length), pitch = face.w / cols.length, top = face.y + 2;
  ctx.font = uiFont(7); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  cols.forEach((g, i) => {
    const cx = Math.round(face.x + pitch * (i + 0.5));
    drawOutlined(ctx, String(g.w), cx, Math.round(top + B.HEAD / 2), g.got === g.slots.length ? '#ffe070' : '#ffffff', '#10101a', 2);
    g.slots.forEach((sl, k) => {
      const foot = Math.round(top + B.HEAD + B.SOCK + k * B.ROW);
      if (!drawFoot(ctx, 'ui-kit', 10, cx, foot, B.SOCK, B.SOCK)) { codeArt('medal-socket'); ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.arc(cx, foot - B.SOCK / 2, B.SOCK / 2, 0, Math.PI * 2); ctx.fill(); }
      drawBoardMedal(ctx, sl, cx, foot - 2, B.SOCK - 4);
    });
  });
  ctx.textBaseline = 'alphabetic';
}
// One medallion fitted into a size×size box with its foot at (cx, footY): full colour when earned, a dark silhouette when not.
export function drawBoardMedal(ctx, sl, cx, footY, size) {
  if (!imgReady('medals')) { codeArt('medal'); if (sl.got) { ctx.fillStyle = '#f0c040'; ctx.beginPath(); ctx.arc(cx, footY - size / 2, size / 2 - 1, 0, Math.PI * 2); ctx.fill(); } return; }
  const A = ATLAS.medals, n = Object.keys(A.meta.frames)[sl.frame], f = A.meta.frames[n], k = size / Math.max(f.w, f.h);
  if (sl.got) drawSprite(ctx, 'medals', n, Math.round(cx - (f.w * k) / 2), Math.round(footY - f.h * k), { scale: k });
  else { ctx.globalAlpha = 0.45; drawSprite(ctx, 'medals', n, Math.round(cx - (f.w * k) / 2), Math.round(footY - f.h * k), { scale: k, tint: '#5a5a70' }); ctx.globalAlpha = 1; } // a faded grey ghost: not collected yet
}
