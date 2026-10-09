// Text helpers: fit-to-width sizing, word wrap, outlined text.
import { CONFIG } from '../config.js';

export function font(size, family = CONFIG.FONTS.BODY) { return size + 'px ' + family; }

// Largest size <= base (and >= MIN_FONT_PX) whose width fits maxW.
export function fitTextSize(ctx, text, maxW, base, family = CONFIG.FONTS.BODY) {
  let size = base;
  ctx.font = font(size, family);
  let w = ctx.measureText(text).width;
  if (w <= maxW) return size;
  size = Math.max(CONFIG.UI.MIN_FONT_PX, Math.floor((size * maxW) / w));
  ctx.font = font(size, family);
  while (size > CONFIG.UI.MIN_FONT_PX && ctx.measureText(text).width > maxW) ctx.font = font(--size, family);
  return size;
}

export function wrapLines(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const test = line ? line + ' ' + word : word;
      if (line && ctx.measureText(test).width > maxW) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  return out;
}

export function drawOutlined(ctx, text, x, y, fill = '#ffffff', outline = '#10101a', w = 2) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = w * 2;
  ctx.strokeStyle = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
