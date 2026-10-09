// Atlas runtime: sheets from window.ASSETS ('atlas/<id>.png' + '.json'); missing sheet/frame → code-drawn fallback.
import { embeddedAssets } from './assets.js';

export const ATLAS = {};
export const atlasStats = { atlasDraws: 0, fallbackDraws: 0, fallbackBy: {}, missBy: {}, codeBy: {} }; // fallbackBy: per-sheet code-fallback draws (A5 art audit)
// [R2-19a] art audit (read by tools/fallback_audit.js through ?test=1): missBy = an art sheet asked for but not loaded,
// codeBy = a screen/sprite that only has code-drawn art (codeArt(key) at each such draw site).
const fallbacks = {};
const variants = new Map();

// Idempotent: call again once the page's asset tags are parsed (sheets already loaded are kept).
export function initAtlas(assets = embeddedAssets()) {
  for (const k of Object.keys(assets)) {
    const m = /^atlas\/(.+)\.json$/.exec(k);
    if (!m || ATLAS[m[1]] || !assets['atlas/' + m[1] + '.png']) continue;
    try {
      const meta = JSON.parse(atob(assets[k].split(',')[1]));
      // [A1/A2] v2 sheets carry ds (display scale): frames keep their source rect in f.src while f.w/f.h and fw/fh are
      // world units, so every caller that centres or anchors by frame size keeps working unchanged.
      for (const f of Object.values(meta.frames)) f.src = { x: f.x, y: f.y, w: f.w, h: f.h };
      if (meta.ds) { for (const f of Object.values(meta.frames)) { f.w *= meta.ds; f.h *= meta.ds; if (f.bb) f.bb = f.bb.map((v) => v * meta.ds); } meta.fw *= meta.ds; meta.fh *= meta.ds; }
      const img = new Image();
      const sheet = { id: m[1], meta, img, ready: false };
      img.onload = () => { sheet.ready = true; };
      img.src = assets['atlas/' + m[1] + '.png'];
      ATLAS[m[1]] = sheet;
    } catch (e) { /* bad sheet: fallback art stays */ }
  }
  return ATLAS;
}

export function imgReady(sheet) {
  if (ATLAS[sheet] && ATLAS[sheet].ready) return true;
  atlasStats.missBy[sheet] = (atlasStats.missBy[sheet] || 0) + 1;
  return false;
}
// [R2-19] frame i of a sheet (by index) fitted into w×h with its foot at (cx, footY), opaque bounds only; false while missing
export function drawFoot(ctx, sheet, i, cx, footY, w, h) {
  if (!imgReady(sheet)) return false;
  const A = ATLAS[sheet], n = Object.keys(A.meta.frames)[i]; if (!n) return false;
  const b = opaqueBox(sheet, n), k = Math.min(w / b.w, h / b.h), dw = b.w * k, dh = b.h * k;
  ctx.drawImage(A.img, b.x, b.y, b.w, b.h, Math.round(cx - dw / 2), Math.round(footY - dh), Math.round(dw), Math.round(dh));
  return true;
}
// [R2-19] frame i (by index, opaque bounds) stretched into the rect x, y, w, h (a slab that must fit dynamic content); false while missing
export function drawRect(ctx, sheet, i, x, y, w, h) {
  if (!imgReady(sheet)) return false;
  const A = ATLAS[sheet], n = Object.keys(A.meta.frames)[i]; if (!n) return false;
  const b = opaqueBox(sheet, n); ctx.drawImage(A.img, b.x, b.y, b.w, b.h, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  return true;
}
export function codeArt(key) { atlasStats.codeBy[key] = (atlasStats.codeBy[key] || 0) + 1; }

// fn(ctx, frame, x, y, opts) draws the code fallback with its top-left at x,y.
export function registerFallback(sheet, fn, size = [16, 16]) { fallbacks[sheet] = { fn, size }; }

function variant(sheet, f, kind, tint) {
  const key = sheet.id + '|' + f.x + ',' + f.y + '|' + kind + '|' + (tint || '');
  let c = variants.get(key);
  if (c) return c;
  const r = f.src; c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
  const g = c.getContext('2d');
  g.drawImage(sheet.img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = kind === 'flash' ? '#ffffff' : kind === 'locked' ? 'rgba(20,20,30,0.85)' : tint;
  if (kind === 'tint') g.globalAlpha = 0.5;
  g.fillRect(0, 0, r.w, r.h);
  variants.set(key, c);
  return c;
}

// [V2] frame (+ optional flash/tint) with a 1-px dark outline, cached; canvas is (w+2)x(h+2).
function outlined(sheet, f, kind, tint) {
  const key = sheet.id + '|' + f.x + ',' + f.y + '|o|' + (kind || '') + '|' + (tint || '');
  let c = variants.get(key);
  if (c) return c;
  const src = kind ? variant(sheet, f, kind, tint) : null, r = f.src;
  c = document.createElement('canvas'); c.width = r.w + 2; c.height = r.h + 2;
  const g = c.getContext('2d');
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) {
    if (src) g.drawImage(src, dx, dy); else g.drawImage(sheet.img, r.x, r.y, r.w, r.h, dx, dy, r.w, r.h);
  }
  g.globalCompositeOperation = 'source-in'; g.fillStyle = '#10101a'; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  if (src) g.drawImage(src, 1, 1); else g.drawImage(sheet.img, r.x, r.y, r.w, r.h, 1, 1, r.w, r.h);
  variants.set(key, c);
  return c;
}

// Draw frame with its top-left at (x, y). opts: { flash, tint, locked, scale, outline }
export function drawSprite(ctx, sheetId, frame, x, y, opts = {}) {
  const sheet = ATLAS[sheetId];
  const f = sheet && sheet.ready && sheet.meta.frames[frame];
  const s = opts.scale || 1;
  if (f) {
    const kind = opts.flash ? 'flash' : opts.locked ? 'locked' : opts.tint ? 'tint' : null;
    const r = f.src, k = (f.w / r.w) * s; // world units per source pixel
    if (opts.outline) ctx.drawImage(outlined(sheet, f, kind, opts.tint), Math.round(x - k), Math.round(y - k), (r.w + 2) * k, (r.h + 2) * k);
    else if (kind) ctx.drawImage(variant(sheet, f, kind, opts.tint), Math.round(x), Math.round(y), f.w * s, f.h * s);
    else if (opts.pass) drawPassing(ctx, sheetId, sheet, f, frame, Math.round(x), Math.round(y), s, opts.pass);
    else ctx.drawImage(sheet.img, r.x, r.y, r.w, r.h, Math.round(x), Math.round(y), f.w * s, f.h * s);
    atlasStats.atlasDraws++;
    return true;
  }
  const fb = fallbacks[sheetId];
  if (fb) fb.fn(ctx, frame, x, y, opts);
  else { ctx.fillStyle = opts.flash ? '#ffffff' : '#8a8a9a'; ctx.fillRect(Math.round(x), Math.round(y), 16 * s, 16 * s); }
  atlasStats.fallbackDraws++; atlasStats.fallbackBy[sheetId] = (atlasStats.fallbackBy[sheetId] || 0) + 1;
  return false;
}

export function frameSize(sheetId) {
  const sheet = ATLAS[sheetId];
  if (sheet) return [sheet.meta.fw, sheet.meta.fh];
  return fallbacks[sheetId] ? fallbacks[sheetId].size : [16, 16];
}

// Draw with (x, y) = feet (bottom-centre).
export function drawSpriteFoot(ctx, sheetId, frame, x, y, opts = {}) {
  const [w, h] = frameSize(sheetId);
  const s = opts.scale || 1;
  return drawSprite(ctx, sheetId, frame, x - (w * s) / 2, y - h * s, opts);
}

// [R3c] A synthetic "passing" walk pose from a side stride frame (sheets whose side rows are all strides, e.g. Milo):
// the leg band (bottom legFrac of the figure) is drawn narrowed around the legs' own centre (feet together), and the body
// above it rides up `lift` px (the leg band stretches to meet it), so the stride → passing → stride cycle shows the legs move.
const LEGS = new Map();
function drawPassing(ctx, sheetId, sheet, f, frame, x, y, s, p) {
  const r = f.src, kx = (f.w * s) / r.w, ky = (f.h * s) / r.h, b = opaqueBox(sheetId, frame);
  const top = Math.round(b.y + b.h * (1 - p.legFrac)), bot = b.y + b.h, key = sheetId + '|' + frame;
  if (!LEGS.has(key)) { // the leg band's own opaque columns
    const c = document.createElement('canvas'); c.width = b.w; c.height = bot - top; const g = c.getContext('2d');
    g.drawImage(sheet.img, b.x, top, b.w, bot - top, 0, 0, b.w, bot - top); const d = g.getImageData(0, 0, b.w, bot - top).data; let x0 = b.w, x1 = -1;
    for (let yy = 0; yy < bot - top; yy++) for (let xx = 0; xx < b.w; xx++) if (d[(yy * b.w + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; }
    LEGS.set(key, x1 < 0 ? [b.x, b.w] : [b.x + x0, x1 - x0 + 1]);
  }
  const [lx, lw] = LEGS.get(key), lift = p.lift || 0, cx = x + (lx - r.x + lw / 2) * kx, dw = lw * kx * p.squeeze;
  ctx.drawImage(sheet.img, lx, top, lw, bot - top, Math.round(cx - dw / 2), Math.round(y + (top - r.y) * ky - lift), Math.max(1, Math.round(dw)), Math.round((bot - top) * ky + lift));
  ctx.drawImage(sheet.img, r.x, r.y, r.w, top - r.y, x, y - lift, r.w * kx, (top - r.y) * ky);
}

// [A5] Opaque bounds of a frame in source pixels (alpha scan, measured once, cached): lets cut frames that carry a border or
// empty padding be drawn tight to a tile or a doorway. Returns { x, y, w, h } in sheet-image pixels.
const OPAQUE = new Map();
export function opaqueBox(sheetId, frame) {
  const key = sheetId + '|' + frame; if (OPAQUE.has(key)) return OPAQUE.get(key);
  const A = ATLAS[sheetId], r = A.meta.frames[frame].src, c = document.createElement('canvas'); c.width = r.w; c.height = r.h;
  const g = c.getContext('2d'); g.drawImage(A.img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  const d = g.getImageData(0, 0, r.w, r.h).data; let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1;
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (d[(y * r.w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const b = x1 < 0 ? { x: r.x, y: r.y, w: r.w, h: r.h } : { x: r.x + x0, y: r.y + y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  OPAQUE.set(key, b); return b;
}
// Draw a frame's opaque area into a destination rect (inset trims a border fraction, e.g. 0.1 for Gemini tile frames).
export function drawOpaque(ctx, sheetId, index, dx, dy, dw, dh, inset = 0) {
  const A = ATLAS[sheetId]; if (!A || !A.ready) return false;
  const names = Object.keys(A.meta.frames), b = opaqueBox(sheetId, names[Math.min(index, names.length - 1)]), ix = b.w * inset, iy = b.h * inset;
  ctx.drawImage(A.img, b.x + ix, b.y + iy, b.w - 2 * ix, b.h - 2 * iy, Math.round(dx), Math.round(dy), dw, dh);
  return true;
}
