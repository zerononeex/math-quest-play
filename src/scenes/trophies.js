// Rush results card + the trophy wall (Starhaven trophy hall, the Wayfarer's Trophy Wall, the title plaque). S53.
import { input, pressed } from '../engine/input.js';
import { layoutBegin, record } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { RUSH_KINDS, fmtTime } from '../game/rush.js';

const NAMES = { 'star-chalice': 'Star Chalice — Boss Rush clear', 'silver-comet': 'Silver Comet — Sub-boss Rush clear' };

// Lines the trophy wall shows (also the title plaque's data).
export function trophyLines(records) {
  const r = records || {};
  const out = (r.trophies || []).map((t) => NAMES[t] || t);
  out.push('Best Boss Rush time: ' + fmtTime(r.bestRushTime));
  out.push('Best Survival waves: ' + (r.bestWaves || 0));
  return out;
}

// Survival result = { waves, best, newBest }
export function createSurvivalResults(view, result, onDone) {
  const s = { name: 'survival-results', modal: true, t: 0, result };
  s.update = (dt) => { s.t += dt; if (s.t > 1 && (pressed('confirm') || pressed('attack') || pressed('pause') || input.pointer.tapped)) onDone(); };
  s.render = (ctx) => {
    layoutBegin();
    ctx.fillStyle = 'rgba(8,8,30,0.92)'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.textAlign = 'center'; ctx.font = font(26); drawOutlined(ctx, 'Survival over', view.w / 2, 90, '#a0e0ff');
    ctx.font = font(16);
    [['Waves beaten: ' + result.waves + (result.newBest ? '  — NEW BEST!' : '')], ['Best: ' + result.best]].forEach(([l], i) => { drawOutlined(ctx, l, view.w / 2, 150 + i * 30, '#ffffff'); record('text', 'survival-row-' + i, view.w / 2 - 150, 136 + i * 30, 300, 20); });
    if (s.t > 1) { ctx.font = font(11); drawOutlined(ctx, 'Tap to continue', view.w / 2, view.h - 20, '#8080c0'); }
  };
  return s;
}

// result = { won, time, bosses, count, best, newBest, trophy }
export function createRushResults(view, kind, result, onDone) {
  const K = RUSH_KINDS[kind], s = { name: 'rush-results', modal: true, t: 0, result };
  s.update = (dt) => { s.t += dt; if (s.t > 1 && (pressed('confirm') || pressed('attack') || pressed('pause') || input.pointer.tapped)) onDone(); };
  s.render = (ctx) => {
    layoutBegin();
    ctx.fillStyle = 'rgba(8,8,30,0.92)'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.textAlign = 'center';
    ctx.font = font(26); drawOutlined(ctx, result.won ? K.name + ' cleared!' : 'Run over', view.w / 2, 90, result.won ? '#ffe070' : '#ffb0b0');
    ctx.font = font(16);
    const rows = ['Bosses beaten: ' + result.bosses + ' / ' + result.count];
    if (K.timed) rows.push('Time: ' + fmtTime(result.time) + (result.newBest ? '  — NEW BEST!' : ''), 'Best: ' + fmtTime(result.best));
    if (result.trophy) rows.push('Trophy: ' + result.trophy);
    rows.forEach((l, i) => { drawOutlined(ctx, l, view.w / 2, 150 + i * 30, '#ffffff'); record('text', 'rush-row-' + i, view.w / 2 - 150, 136 + i * 30, 300, 20); });
    if (s.t > 1) { ctx.font = font(11); drawOutlined(ctx, 'Tap to continue', view.w / 2, view.h - 20, '#8080c0'); }
  };
  return s;
}
