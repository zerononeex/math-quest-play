// Canvas fit: logical height 480, width adapts 640–720 [D08]; portrait letterbox + rotate hint [D07].
import { CONFIG } from '../config.js';

export const view = { w: CONFIG.VIEW.W_MIN, h: CONFIG.VIEW.H, cssW: 0, cssH: 0, left: 0, top: 0, portrait: false, scale: CONFIG.VIEW.RENDER_SCALE, canvas: null, ctx: null };

let hint = null;

function makeHint() {
  hint = document.createElement('div');
  hint.id = 'rotate-hint';
  hint.textContent = 'Turn your iPad sideways ↻';
  hint.style.cssText = 'position:absolute;left:0;right:0;bottom:12px;text-align:center;color:#ffe070;font:16px monospace;pointer-events:none;display:none';
  document.body.appendChild(hint);
}

export function fit() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const V = CONFIG.VIEW;
  const portrait = vh > vw;
  const w = portrait ? V.W_MIN : Math.min(V.W_MAX, Math.max(V.W_MIN, Math.round(V.H * (vw / vh))));
  let cssScale = Math.min(vw / w, vh / V.H);
  const cssW = w * cssScale;
  const cssH = V.H * cssScale;
  // [A2] backing store = the canvas's real device pixels (crisp UI text, no browser rescale of a 2x buffer)
  const dpr = window.devicePixelRatio || 1;
  view.scale = cssScale * dpr;
  const c = view.canvas, bw = Math.round(w * view.scale), bh = Math.round(V.H * view.scale);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  c.style.width = cssW + 'px';
  c.style.height = cssH + 'px';
  Object.assign(view, { w, h: V.H, cssW, cssH, portrait, left: (vw - cssW) / 2, top: (vh - cssH) / 2 });
  view.ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
  view.ctx.imageSmoothingEnabled = false;
  if (hint) hint.style.display = portrait ? 'block' : 'none';
}

// [A2] World zoom in logical units per world pixel. One art pixel (half a world pixel) is a WHOLE number of device
// pixels, chosen so the hero (VIEW.HERO_ART_H art px) is about 1/HERO_SCREEN_DIV of the screen height — the generated
// sheets' pixel-to-detail ratio (iPad 10 landscape: 4 device px per art px, ~12.7 tiles high). Fights use about half
// that so most of a 640×480 arena is on screen.
export function worldZoom(fight = false) {
  const V = CONFIG.VIEW, devH = V.H * view.scale;
  const art = Math.max(1, Math.round(devH / (V.HERO_SCREEN_DIV * V.HERO_ART_H)));
  const zdev = fight ? Math.max(2, 2 * Math.round(devH / 480 / 2)) : 2 * art;
  return zdev / view.scale;
}

export function initRender(canvas) {
  view.canvas = canvas;
  view.ctx = canvas.getContext('2d');
  makeHint();
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', () => setTimeout(fit, 50));
  return view;
}

// Cheap desaturate (no ctx.filter): paint grey with the 'saturation' blend over the frame. amount 0..1.
export function desaturate(ctx, w, h, amount = 1) {
  if (amount <= 0) return;
  // [S62] a plain grey wash: the 'saturation' blend over the whole canvas cost up to 60 ms frames on a throttled CPU
  ctx.save(); ctx.globalAlpha = 0.55 * Math.min(1, amount); ctx.fillStyle = '#8a8a90'; ctx.fillRect(0, 0, w, h); ctx.restore();
}
