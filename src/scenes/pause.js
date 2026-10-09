// Pause menu (modal): Resume, Equipment, Map, Quests, Save, Mute, Quit to Title. [D42] no Return to Wayfarer — the ship is
// boarded only by walking into the rocket on the landing pad.
import { Button, Panel, Toast, layoutBegin } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { pressed, input } from '../engine/input.js';
import { save } from '../engine/save.js';
import { questLog } from '../game/quests.js';
import { autoSpend } from '../game/progression.js';
import { drawPainting } from '../art/fallback/title.js';
import { codeArt } from '../engine/atlas.js';

// [D38] limited = boss fights / rush / survival: Resume, Mute, Quit only (no Save).
const statLabel = () => (save.store.loadSettings().autoStats ? 'Stats: Auto' : 'Stats: I pick');

export function createPause(view, { onResume, onQuit, onMute, onEquip, onMap, onTutorial = null, onLeave = null, limited = false }) {
  const toast = new Toast();
  const p = { name: 'pause', modal: true, toast };
  const all = [
    ['resume', 'Resume', () => onResume()],
    ['equipment', 'Equipment', () => (onEquip ? onEquip() : toast.show('Equipment: coming soon'))],
    ...(onMap ? [['map', 'Map', () => onMap()]] : []),
    ['quests', 'Quests', () => { p.showQuests = !p.showQuests; }],
    ['save', 'Save', () => toast.show(save.auto('manual') ? 'Saved!' : 'Could not save')],
    ['mute', 'Mute', () => { const m = onMute(); toast.show(m ? 'Sound off' : 'Sound on'); }],
    ['stats', statLabel(), (b) => { // [R3-4] level-up points: spent for you (strength + defense first) or picked on the HUD pill
      const st = save.store.loadSettings(); st.autoStats = !st.autoStats; st.autoStatsSet = true; save.store.writeSettings(st);
      if (st.autoStats && save.data && save.data.statPoints > 0) { autoSpend(save.data); save.auto('stat'); }
      b.label = statLabel(); toast.show(st.autoStats ? 'Stat points: spent for you' : 'Stat points: you pick (tap the +1 on the HUD)');
    }],
    ...(onTutorial ? [['tutorial', 'How to Play', () => onTutorial()]] : []), // [A8e] replay the pad tutorial
    ...(onLeave ? [['leave', 'Leave Run', () => onLeave()]] : []), // [S61] Rush / Survival: end the run now (results + records)
    ['quit', 'Quit to Title', () => { if (!limited) save.auto('quit'); onQuit(); }],
  ];
  const items = all.filter(([id]) => (limited ? ['resume', 'mute', 'leave', 'quit'].includes(id) : true));
  p.items = items.map(([id]) => id);
  const build = () => new Panel(items.map(([id, label, fn], i) => new Button({ id: 'pause-' + id, x: view.w / 2 - 120, y: 76 + i * 44, w: 240, h: 38, label, onClick: fn })));
  let panel = build();
  let w = view.w;
  p.update = (dt) => {
    toast.update(dt);
    if (w !== view.w) { panel = build(); w = view.w; }
    if (pressed('pause')) { onResume(); return; }
    panel.update({ pressed, pointer: input.pointer });
  };
  p.render = (ctx) => {
    layoutBegin();
    // [R2-19] the user's screen-pause painting (campfire under the stars), dimmed so the menu reads; code fallback: a dark veil
    if (drawPainting(ctx, 'screen-pause', view.w, view.h)) { ctx.fillStyle = 'rgba(8,8,24,0.35)'; ctx.fillRect(0, 0, view.w, view.h); }
    else { codeArt('pause-backdrop'); ctx.fillStyle = 'rgba(8,8,24,0.8)'; ctx.fillRect(0, 0, view.w, view.h); }
    ctx.font = font(22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    drawOutlined(ctx, 'Paused', view.w / 2, 66, '#ffe070');
    panel.draw(ctx);
    if (p.showQuests && save.data) {
      const lines = questLog(save.data, save.data.location.world);
      ctx.fillStyle = '#141428'; ctx.fillRect(view.w / 2 + 130, 90, Math.min(260, view.w / 2 - 140), 260);
      ctx.textAlign = 'left'; ctx.font = font(13);
      if (!lines.length) drawOutlined(ctx, 'No quests yet — talk to people!', view.w / 2 + 138, 110, '#c0d0ff');
      lines.forEach((q, i) => { drawOutlined(ctx, (q.done ? '✔ ' : '• ') + q.name, view.w / 2 + 138, 110 + i * 40, q.done ? '#80ff90' : '#ffe070'); drawOutlined(ctx, q.text, view.w / 2 + 150, 128 + i * 40, '#ffffff'); });
      ctx.textAlign = 'center';
    }
    toast.draw(ctx, view.w);
  };
  return p;
}
