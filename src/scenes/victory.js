// Victory (S52): after Astronova's farewell — a starry card with the run's stats (time, gold, questions, revives, level), the
// Golden Star Tunic (chest tier 9, D14) granted once, then scrolling credits. Tap / Enter / Space closes (back to Starhaven).
import { CONFIG } from '../config.js';
import { input, pressed } from '../engine/input.js';
import { layoutBegin, record } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { save } from '../engine/save.js';
import { grantGear } from '../game/gear.js';

const CREDITS = ['MATH QUEST: 8 WORLDS', '', 'Heroes: Rowan · Milo · Wren', 'Starring every kid who kept counting', '', 'Worlds', 'Verdania · Tumbletop · Chroma Bay · Pufftop', 'Wildvine · Sproutlands · Aetheria · Starhaven', '', 'Thank you for playing!', 'The light is yours.'];

export function victoryStats(data, records = {}) {
  const t = Math.round(data.playTime || 0), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return { time: (h ? h + 'h ' : '') + m + 'm ' + String(s).padStart(2, '0') + 's', gold: data.gold, questions: records.totalQuestions || 0, revives: data.revives || 0, level: data.level };
}

export function createVictory(view, data, { onDone } = {}) {
  const records = (save.store && save.slot) ? save.store.loadRecords(save.slot) : {};
  const tunic = grantGear(data, 'chest-9'); // once; the title and the trophy hall remember the win
  data.victory = true;
  if (save.slot) save.auto('victory');
  const v = { name: 'victory', modal: false, t: 0, stats: victoryStats(data, records), tunic };
  v.update = (dt) => {
    v.t += dt;
    if (v.t > 1.5 && (pressed('confirm') || pressed('attack') || input.pointer.tapped)) { if (onDone) onDone(); }
  };
  v.render = (ctx) => {
    layoutBegin();
    const W = view.w, H = view.h;
    ctx.fillStyle = '#0a0a24'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const x = (i * 97) % W, y = (i * 53 + v.t * 10 * (1 + (i % 3))) % H; ctx.fillStyle = i % 5 ? '#8080c0' : '#ffe070'; ctx.fillRect(x, y, 2, 2); }
    ctx.textAlign = 'center';
    ctx.font = font(32); drawOutlined(ctx, 'VICTORY!', W / 2, 70, '#ffe070');
    const st = v.stats, rows = [['Time', st.time], ['Gold', String(st.gold)], ['Questions answered', String(st.questions)], ['Revives', String(st.revives)], ['Level', String(st.level)]];
    ctx.font = font(16);
    rows.forEach(([k, val], i) => { drawOutlined(ctx, k + ':  ' + val, W / 2, 120 + i * 26, '#ffffff'); record('text', 'victory-' + k.toLowerCase().split(' ')[0], W / 2 - 120, 106 + i * 26, 240, 20); });
    ctx.font = font(14); drawOutlined(ctx, v.tunic ? 'You got the Golden Star Tunic!' : 'The Golden Star Tunic shines on you.', W / 2, 262, '#ffd040');
    const y0 = H + 20 - (v.t * 30) % (CREDITS.length * 24 + H);
    ctx.font = font(12); CREDITS.forEach((l, i) => { const y = y0 + i * 24; if (y > 280 && y < H - 10) drawOutlined(ctx, l, W / 2, y, '#c0c0ff'); });
    if (v.t > 1.5) { ctx.font = font(11); drawOutlined(ctx, 'Tap to continue', W / 2, H - 16, '#8080c0'); }
  };
  return v;
}
