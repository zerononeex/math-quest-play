// Play scene stub + HUD. The overworld replaces the placeholder field in S20+.
import { CONFIG } from '../config.js';
import { font } from '../engine/text.js';
import { layoutBegin } from '../engine/ui.js';
import { pressed, input } from '../engine/input.js';
import { scenes } from '../engine/scenes.js';
import { save } from '../engine/save.js';
import { bindSession, session, currentBand, apCapOf } from '../game/ap.js';
import { createMathPopup } from '../game/math-popup.js';
import { createHud, updateHud, drawHud, hudHit } from '../game/hud.js';
import { createPause } from './pause.js';
import { createEquipment } from './equipment.js';
import { createStatPicker } from './statpicker.js';
import { gainXp } from '../game/progression.js';
import { confetti, floatText, updateFx, drawFx } from '../game/fx.js';

export function createPlay(view, data, opts = {}) {
  bindSession(data);
  const play = { name: 'play', data, hud: createHud() };
  const openQuestion = () => { if (scenes.top() === play) scenes.push(createMathPopup(view, { onClose: () => scenes.pop() })); };
  const openPause = () => {
    if (scenes.top() !== play) return;
    scenes.push(createPause(view, {
      onResume: () => scenes.pop(),
      onQuit: () => (opts.onQuit ? opts.onQuit() : scenes.pop()),
      onMute: () => (opts.onMute ? opts.onMute() : false),
      onEquip: () => scenes.push(createEquipment(view, data, () => scenes.pop())),
    }));
  };
  play.openQuestion = openQuestion;
  // Non-blocking: level-ups celebrate at the hero and never pause (bug registry).
  play.gainXp = (n) => {
    const ev = gainXp(data, n, save.store ? save.store.loadSettings() : {});
    for (const e of ev) {
      confetti(view.w / 2, view.h / 2 - 20);
      floatText(view.w / 2, view.h / 2 - 40, 'Level ' + e.level + '! +1 point' + (e.heart ? ' +1 Heart' : ''));
    }
    if (ev.length) save.auto('levelup');
    return ev;
  };
  const openPicker = () => { if (scenes.top() === play && data.statPoints > 0) scenes.push(createStatPicker(view, data, () => scenes.pop())); };
  play.update = (dt) => {
    updateHud(play.hud, data, dt);
    updateFx(dt);
    if (pressed('question')) { openQuestion(); return; }
    if (pressed('pause')) { openPause(); return; }
    if (input.pointer.tapped) {
      const b = hudHit(view.w, input.pointer.x, input.pointer.y);
      if (b === 'q') openQuestion();
      else if (b === 'pause') openPause();
      else if (b === 'save') save.auto('manual');
      else if (b === 'pill') openPicker();
    }
  };
  play.render = (ctx) => {
    layoutBegin();
    ctx.fillStyle = '#2a6a2a';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#ffffff';
    ctx.font = font(16, CONFIG.FONTS.DISPLAY);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Verdania — ' + data.hero + ' (' + data.tier + ')', view.w / 2, view.h / 2);
    drawFx(ctx);
    drawHud(ctx, play.hud, session.data, view, { ap: session.data.ap, apCap: apCapOf(), band: currentBand(), attack: true });
  };
  return play;
}
