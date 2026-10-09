// UI kit: Button, Panel (focus + hit-testing), DialogueBox (below HUD), Toast, layout capture.
import { CONFIG } from '../config.js';
import { fitTextSize, wrapLines, drawOutlined, font } from './text.js';
import { ATLAS, imgReady, opaqueBox, drawSprite } from './atlas.js';

// Layout capture for the layout lint: every drawn interactive rect is recorded here per frame.
export const layout = { rects: [], enabled: false, k: 1 }; // k: the scale the HUD group is drawn at (rects recorded in screen units)
export function layoutBegin() { layout.rects.length = 0; }
export function record(kind, id, x, y, w, h) { const k = layout.k; if (layout.enabled) layout.rects.push({ kind, id, x: x * k, y: y * k, w: w * k, h: h * k }); }

export function rectsOverlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

// [A8c] v2 UI skins from the user's sheets (ui-kit wooden buttons, ui-panels parchment / frames), stretched 9-slice so the
// corners keep their pixel size. Returns false while the sheet is not loaded (callers keep their code look).
const SKINS = { wood: ['ui-kit', 6, 0.3], woodDown: ['ui-kit', 7, 0.3], parch: ['ui-panels', 7, 0.18], gold: ['ui-panels', 10, 0.3], silver: ['ui-panels', 11, 0.3], scroll: ['ui-panels', 4, 0.2], sign: ['ui-panels', 8, 0.3], slotA: ['ui-difficulty', 4, 0.25], slotB: ['ui-difficulty', 5, 0.25] };
export function drawSkin(ctx, kind, x, y, w, h, corner = 14) {
  const [sheet, i, frac] = SKINS[kind]; if (!imgReady(sheet)) return false;
  const A = ATLAS[sheet], n = Object.keys(A.meta.frames)[i], b = opaqueBox(sheet, n);
  const cs = Math.round(Math.min(b.w, b.h) * frac), cd = Math.min(corner, w / 2, h / 2); // source / destination corner size
  const sx = [b.x, b.x + cs, b.x + b.w - cs], sw = [cs, b.w - 2 * cs, cs], sy = [b.y, b.y + cs, b.y + b.h - cs], sh = [cs, b.h - 2 * cs, cs];
  const dx = [x, x + cd, x + w - cd], dw = [cd, w - 2 * cd, cd], dy = [y, y + cd, y + h - cd], dh = [cd, h - 2 * cd, cd];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (dw[c] > 0 && dh[r] > 0) ctx.drawImage(A.img, sx[c], sy[r], sw[c], sh[r], Math.round(dx[c]), Math.round(dy[r]), Math.ceil(dw[c]), Math.ceil(dh[r]));
  return true;
}

// [R1-7/17] ONE clean UI style everywhere (user review): solid blue rounded cell, lighter blue outline, white bold sans.
export const uiFont = (size) => 'bold ' + Math.round(size) + 'px ' + CONFIG.FONTS.UI;
export function drawCell(ctx, x, y, w, h, { fill, edge, sel = false, focus = false } = {}) {
  const C = CONFIG.CELL, r = Math.min(C.R, h / 3, w / 3);
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  ctx.fillStyle = fill || (sel ? C.SEL_FILL : C.FILL); ctx.fill();
  ctx.lineWidth = sel || focus ? 3 : 2; ctx.strokeStyle = sel ? C.SEL_EDGE : focus ? '#ffffff' : edge || C.EDGE; ctx.stroke();
}
export function cellText(ctx, text, x, y, size, color = '#ffffff', align = 'center') {
  ctx.font = uiFont(size); ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillText(text, x + 1, y + 2); ctx.fillStyle = color; ctx.fillText(text, x, y);
}

export class Button {
  constructor({ id, x, y, w, h, label, onClick, color = '#2a4a8a', fontSize = 16, selected = false, icon = null }) {
    const min = CONFIG.VIEW.TAP_MIN_LOGICAL_PX;
    Object.assign(this, { id: id || label, x, y, w: Math.max(min, w), h: Math.max(min, h), label, onClick, color, fontSize, selected, focused: false, disabled: false, icon });
  }
  hit(px, py) { return !this.disabled && px >= this.x && px < this.x + this.w && py >= this.y && py < this.y + this.h; }
  draw(ctx) {
    if (this.disabled) ctx.globalAlpha = 0.5;
    drawCell(ctx, this.x, this.y, this.w, this.h, { fill: this.color !== '#2a4a8a' && !this.selected ? this.color : null, sel: this.selected, focus: this.focused }); // keeps a caller's go/danger colour
    ctx.globalAlpha = 1;
    const ic = this.icon, f = ic && imgReady(ic[0]) && ATLAS[ic[0]].meta.frames[ic[1]], tall = this.h >= 80; // [R2-19] optional icon: left of the label, or above it on a tall button
    if (f && tall) {
      const is = this.h - 34, k = is / Math.max(f.w, f.h); drawSprite(ctx, ic[0], ic[1], Math.round(this.x + (this.w - f.w * k) / 2), Math.round(this.y + 4 + (is - f.h * k) / 2), { scale: k });
      const size = fitTextSize(ctx, this.label, this.w - 12, Math.min(this.fontSize, 16), CONFIG.FONTS.UI);
      cellText(ctx, this.label, this.x + this.w / 2, this.y + this.h - 15, size, this.selected ? '#fff4b0' : '#ffffff');
      record('button', this.id, this.x, this.y, this.w, this.h); return;
    }
    const is = this.h - 8;
    if (f) { const k = is / Math.max(f.w, f.h); drawSprite(ctx, ic[0], ic[1], Math.round(this.x + 6 + (is - f.w * k) / 2), Math.round(this.y + 4 + (is - f.h * k) / 2), { scale: k }); }
    const pad = f ? is + 6 : 0, size = fitTextSize(ctx, this.label, this.w - 12 - pad, Math.min(this.fontSize, this.h - 10), CONFIG.FONTS.UI);
    cellText(ctx, this.label, this.x + (this.w + pad) / 2, this.y + this.h / 2 + 1, size, this.selected ? '#fff4b0' : '#ffffff');
    record('button', this.id, this.x, this.y, this.w, this.h);
  }
}

export class Panel {
  constructor(buttons = []) { this.buttons = buttons; this.focus = 0; }
  // input: { pressed(a), pointer }
  update(inp) {
    const b = this.buttons;
    if (!b.length) return null;
    if (inp.pressed('down') || inp.pressed('right')) this.focus = (this.focus + 1) % b.length;
    if (inp.pressed('up') || inp.pressed('left')) this.focus = (this.focus + b.length - 1) % b.length;
    b.forEach((x, i) => { x.focused = i === this.focus; });
    let hitBtn = null;
    if (inp.pointer.tapped) hitBtn = b.find((x) => x.hit(inp.pointer.x, inp.pointer.y)) || null;
    else if (inp.pressed('confirm')) hitBtn = b[this.focus].disabled ? null : b[this.focus];
    if (hitBtn && hitBtn.onClick) hitBtn.onClick(hitBtn);
    return hitBtn;
  }
  draw(ctx) { for (const x of this.buttons) x.draw(ctx); }
}

// Opaque box laid out BELOW the reserved HUD rows; 2 wrapped lines per page; E / confirm / tap continues.
export class DialogueBox {
  constructor(viewW, speaker, text) {
    const pad = CONFIG.UI.DIALOGUE_PAD;
    this.x = 16; this.w = viewW - 32; this.h = 64;
    this.y = CONFIG.VIEW.H - this.h - 16;
    if (this.y < CONFIG.UI.HUD_RESERVED_H) this.y = CONFIG.UI.HUD_RESERVED_H;
    this.speaker = speaker; this.text = text; this.pad = pad; this.pages = null; this.page = 0; this.done = false;
  }
  update(inp) {
    if (inp.pressed('interact') || inp.pressed('confirm') || inp.pointer.tapped) {
      this.page++;
      if (this.pages && this.page >= this.pages.length) this.done = true;
    }
    return this.done;
  }
  draw(ctx) {
    ctx.font = font(14);
    if (!this.pages) {
      const lines = wrapLines(ctx, this.text, this.w - this.pad * 2);
      this.pages = [];
      for (let i = 0; i < lines.length; i += CONFIG.UI.DIALOGUE_LINES) this.pages.push(lines.slice(i, i + CONFIG.UI.DIALOGUE_LINES));
    }
    ctx.fillStyle = '#141428';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = '#ffe070';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (this.speaker) { ctx.fillStyle = '#ffe070'; ctx.fillText(this.speaker, this.x + this.pad, this.y + 4); }
    ctx.fillStyle = '#ffffff';
    (this.pages[Math.min(this.page, this.pages.length - 1)] || []).forEach((l, i) => ctx.fillText(l, this.x + this.pad, this.y + 22 + i * 18));
    record('dialogue', 'dialogue', this.x, this.y, this.w, this.h);
  }
}

export class Toast {
  constructor() { this.text = ''; this.t = 0; }
  show(text) { this.text = text; this.t = CONFIG.UI.TOAST_S; }
  update(dt) { if (this.t > 0) this.t -= dt; }
  draw(ctx, viewW) {
    if (this.t <= 0) return;
    ctx.globalAlpha = Math.min(1, this.t * 2);
    ctx.font = font(14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawOutlined(ctx, this.text, viewW / 2, CONFIG.UI.HUD_RESERVED_H + 20, '#ffe070');
    ctx.globalAlpha = 1;
  }
}
