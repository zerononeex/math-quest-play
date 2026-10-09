// Stat-point picker (D23): Strength / Defense / Luck + Auto toggle. Opens only when the HUD pill is tapped.
// [#329] ui-stat-icons on the three stat buttons once the sheet is uploaded (text-only buttons until then).
import { Button, Panel, layoutBegin } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { pressed, input } from '../engine/input.js';
import { spendPoint, autoSpend } from '../game/progression.js';
import { save } from '../engine/save.js';

export function createStatPicker(view, data, onClose) {
  const p = { name: 'stats', modal: true };
  const settings = () => save.store.loadSettings();
  const build = () => {
    const x0 = view.w / 2 - 225;
    const st = settings();
    return new Panel([
      new Button({ id: 'stat-str', x: x0, y: 170, w: 140, h: 90, label: 'Strength', icon: ['ui-stat-icons', 'strength'], color: '#8a2a2a', onClick: () => spend('str') }),
      new Button({ id: 'stat-def', x: x0 + 155, y: 170, w: 140, h: 90, label: 'Defense', icon: ['ui-stat-icons', 'defense'], color: '#2a4a8a', onClick: () => spend('def') }),
      new Button({ id: 'stat-luck', x: x0 + 310, y: 170, w: 140, h: 90, label: 'Luck', icon: ['ui-stat-icons', 'luck'], color: '#2a7a3a', onClick: () => spend('luck') }),
      new Button({ id: 'stat-auto', x: x0, y: 300, w: 215, h: 44, label: 'Auto: ' + (st.autoStats ? 'ON' : 'OFF'), color: '#5a4a1a', onClick: toggleAuto }),
      new Button({ id: 'stat-close', x: x0 + 235, y: 300, w: 215, h: 44, label: 'Done', color: '#3a3a5a', onClick: onClose }),
    ]);
  };
  function spend(stat) { spendPoint(data, stat); save.auto('stat'); if (data.statPoints <= 0) onClose(); }
  function toggleAuto() {
    const st = settings(); st.autoStats = !st.autoStats; st.autoStatsSet = true; save.store.writeSettings(st);
    if (st.autoStats) { autoSpend(data); save.auto('stat'); }
    panel = build();
  }
  let panel = build();
  p.update = () => {
    if (pressed('pause')) { onClose(); return; }
    panel.update({ pressed, pointer: input.pointer });
  };
  p.render = (ctx) => {
    layoutBegin();
    ctx.fillStyle = 'rgba(8,8,24,0.8)'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(20);
    drawOutlined(ctx, 'Points to spend: ' + data.statPoints, view.w / 2, 120, '#ffe070');
    ctx.font = font(14);
    drawOutlined(ctx, `STR ${data.stats.str}   DEF ${data.stats.def}   LUCK ${data.stats.luck}`, view.w / 2, 146, '#c0d0ff');
    panel.draw(ctx);
    ctx.font = font(13); ctx.textAlign = 'center'; // [#329] what each stat does, under its button
    ['Hit harder', 'Take less hurt', 'More loot'].forEach((t, i) => drawOutlined(ctx, t, view.w / 2 - 225 + 70 + i * 155, 274, '#dfe8ff'));
  };
  return p;
}
