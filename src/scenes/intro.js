// Intro cutscene [S57]: 2 painted panels (Wayfarer crew, scattered medallions) → Verdania landing. E / Enter / tap advances.
import { CONFIG } from '../config.js';
import { font, wrapLines, drawOutlined } from '../engine/text.js';
import { drawSkin, record, drawCell, cellText } from '../engine/ui.js';
import { pressed, input } from '../engine/input.js';
import { drawIntroPanel } from '../art/fallback/title.js';

const PANELS = [
  { title: 'The Wayfarer', text: 'Meet the crew! Our little star-ship flies to eight worlds.', color: '#1a2a5a' },
  { title: 'The Medallions', text: 'Oh no! The medallions fell to the worlds. Let\'s bring them home!', color: '#3a1a4a' },
];

// [R2-19d] skippable: a Skip button (top right) ends the story at once; a tap anywhere else turns the page.
const skipRect = (w) => ({ x: w - 104, y: 10, w: 92, h: 44 });
export function createIntro(view, onDone) {
  let i = 0, time = 0, done = false;
  const finish = () => { if (!done) { done = true; onDone(); } };
  return {
    name: 'intro',
    get panel() { return i; },
    update(dt = 1 / 60) {
      time += dt;
      const p = input.pointer, r = skipRect(view.w);
      if (p.tapped && p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) { finish(); return; }
      if (pressed('pause')) { finish(); return; }
      if (pressed('confirm') || pressed('interact') || pressed('attack') || p.tapped) {
        if (++i >= PANELS.length) finish();
      }
    },
    render(ctx) {
      const p = PANELS[Math.min(i, PANELS.length - 1)];
      drawIntroPanel(ctx, view.w, view.h, Math.min(i, PANELS.length - 1), time);
      const cx = view.w / 2; // [A8c] the story on the user's parchment panel, low on the painting so the art shows
      if (!drawSkin(ctx, 'parch', cx - 300, 318, 600, 112, 18)) { ctx.fillStyle = 'rgba(10,10,30,0.55)'; ctx.fillRect(cx - 300, 318, 600, 112); }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = font(24, CONFIG.FONTS.DISPLAY);
      drawOutlined(ctx, p.title, cx, 40, '#ffe070', '#3a1a00', 3);
      ctx.fillStyle = '#3a2410';
      ctx.font = font(18);
      wrapLines(ctx, p.text, 540).forEach((l, k) => ctx.fillText(l, cx, 350 + k * 26));
      ctx.font = font(14);
      drawOutlined(ctx, i >= PANELS.length - 1 ? 'Tap to land on Verdania ▶' : 'Tap to continue ▶', cx, 452, '#ffffff');
      const r = skipRect(view.w); drawCell(ctx, r.x, r.y, r.w, r.h, {}); cellText(ctx, 'Skip ▶▶', r.x + r.w / 2, r.y + r.h / 2 + 1, 16, '#ffffff'); record('button', 'skip', r.x, r.y, r.w, r.h);
    },
  };
}
