// Math popup modal [D01]: big question, 4 answer buttons (2×2), keys 1–4 or tap; no timer, no penalty. [R3-9] A wrong answer
// greys out and the same question stays until the right one is picked.
import { CONFIG } from '../config.js';
import { Button, layoutBegin, drawCell, uiFont } from '../engine/ui.js';
import { font, drawOutlined, fitTextSize } from '../engine/text.js';
import { pressed, input } from '../engine/input.js';
import { makeQuestion } from './math.js';
import { session, currentBand, answerQuestion, reviewMax, apCapOf } from './ap.js';
import { scenes } from '../engine/scenes.js';
import { floatText } from './fx.js';

const GOOD_TRY = ['Good try!', 'Almost!', 'Nice effort!', 'Keep going!'];

// [R3d] a first-try right answer: "+N AP" floats up over the hero in the scene under the popup ("AP full!" when none fit)
function apFloat(r) {
  const s = [...scenes.stack].reverse().find((q) => q.hero && q.name !== 'math'); if (!s || !r) return;
  floatText(s.hero.x, s.hero.y - CONFIG.MATH.AP_FLOAT_DY, r.gained > 0 ? '+' + r.gained + ' AP' : 'AP full!', CONFIG.MATH.AP_FLOAT_COLOR);
}

// once: a single bonus question (D47) — right → onCorrect, wrong → onWrong; never a penalty.
export function createMathPopup(view, { onClose, onCorrect, onWrong, title, once = false } = {}) {
  const p = { name: 'math', modal: true, closing: 0, picked: -1, wrong: new Set(), tried: false, revive: !!onCorrect && !once, once, question: null, buttons: [], msg: '', msgT: 0, floaty: null, closeBtn: null };
  function deal() {
    p.question = makeQuestion(currentBand(), Math.random, reviewMax()); p.wrong = new Set(); p.tried = false;
    const ox = (view.w - 560) / 2;
    p.buttons = p.question.choices.map((c, i) => new Button({ id: 'ans' + (i + 1), x: ox + (i % 2) * 290, y: 200 + ((i / 2) | 0) * 100, w: 270, h: 86, label: c, color: '#2a4a8a', fontSize: 44, onClick: () => pick(i) }));
    p.closeBtn = new Button({ id: 'math-close', x: view.w - 64, y: 60, w: 40, h: 40, label: 'X', color: '#6a2a2a', onClick: close });
  }
  function close() {
    // [V3] the 0-AP auto-open waits AUTO_REOPEN_GAP after any popup closes
    session.emptyTimer = Math.min(0, CONFIG.AP.EMPTY_Q_DELAY - CONFIG.MATH.AUTO_REOPEN_GAP);
    if (onClose) onClose();
  }
  function pick(i) {
    if (p.wrong.has(i) || p.closing > 0) return; // a greyed-out answer can't be picked again
    const correct = i === p.question.correctIndex;
    if (!correct && !once) { // [R3-9] same question: grey out the wrong answer and try again (counted wrong once, for the band)
      if (!p.tried) answerQuestion(false);
      p.tried = true; p.wrong.add(i); p.buttons[i].disabled = true; p.buttons[i].color = '#3a3a4a';
      p.msg = GOOD_TRY[Math.floor(Math.random() * GOOD_TRY.length)] + ' Try again!'; p.msgT = 1.4;
      return;
    }
    if (correct && p.tried) { if (onCorrect) onCorrect(); else close(); return; } // right after a miss: on with the game (AP only for a first try)
    const r = answerQuestion(correct);
    if (correct) apFloat(r);
    if (correct && onCorrect) { onCorrect(); return; }
    if (once) { if (onWrong) onWrong(); else close(); return; }
    // [V3] one question per opening: show the result, then close back to exactly where the player was
    if (correct && CONFIG.MATH.POPUP_RIGHT_S <= 0) { p.gained = r.gained; close(); return; } // [R3-1] straight back to play (the HUD gems fill up)
    if (correct) {
      p.floaty = { text: '+' + r.gained + ' AP!', t: 1 };
      p.msg = r.lost > 0 ? 'AP full!' : r.streak >= 5 ? 'Streak ' + r.streak + '!' : 'Correct!';
      p.closing = CONFIG.MATH.POPUP_RIGHT_S;
    } else {
      p.msg = GOOD_TRY[Math.floor(Math.random() * GOOD_TRY.length)] + ' It was ' + p.question.choices[p.question.correctIndex] + '.';
      p.closing = CONFIG.MATH.POPUP_WRONG_S;
    }
    p.msgT = p.closing;
    p.picked = i;
  }
  deal();
  p.update = (dt) => {
    if (p.msgT > 0) p.msgT -= dt;
    if (p.floaty) { p.floaty.t -= dt; if (p.floaty.t <= 0) p.floaty = null; }
    if (p.closing > 0) { p.closing -= dt; if (p.closing <= 0 || pressed('pause') || pressed('question')) { p.closing = 0; close(); } return; }
    if (!p.revive && (pressed('pause') || pressed('question'))) { close(); return; }
    for (let k = 1; k <= 4; k++) if (pressed('k' + k)) { pick(k - 1); return; }
    if (input.pointer.tapped) {
      const b = [...p.buttons, ...(p.revive ? [] : [p.closeBtn])].find((x) => x.hit(input.pointer.x, input.pointer.y));
      if (b) b.onClick(b);
    }
  };
  p.render = (ctx) => {
    layoutBegin();
    ctx.fillStyle = 'rgba(8,8,24,0.82)';
    ctx.fillRect(0, 0, view.w, view.h);
    drawCell(ctx, view.w / 2 - 300, 50, 600, 400, { fill: CONFIG.CELL.DARK });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const qs = fitTextSize(ctx, p.question.text, 520, 48, CONFIG.FONTS.UI); // [R1-6] plain bold sans: 8 never reads as S
    ctx.font = uiFont(qs); ctx.fillStyle = '#ffffff'; ctx.fillText(p.question.text, view.w / 2, 130);
    p.buttons.forEach((b, i) => {
      if (p.closing > 0) b.color = i === p.question.correctIndex ? '#2a8a3a' : i === p.picked ? '#6a3a3a' : '#2a3a5a';
      b.draw(ctx);
    });
    p.buttons.forEach((b, i) => { ctx.font = uiFont(14); ctx.fillStyle = '#c8dcff'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), b.x + 10, b.y + 14); ctx.textAlign = 'center'; });
    if (!p.revive) p.closeBtn.draw(ctx);
    if (title) { ctx.font = font(18); drawOutlined(ctx, title, view.w / 2, 78, '#ffb0b0'); }
    ctx.font = uiFont(17);
    const d = session.data;
    drawOutlined(ctx, 'AP ' + d.ap + '/' + apCapOf(d) + '   Streak ' + session.math.streak, view.w / 2, 425, '#a0e0ff');
    if (p.msgT > 0) { ctx.font = uiFont(24); drawOutlined(ctx, p.msg, view.w / 2, 175, '#ffe070'); }
    if (p.floaty) { ctx.font = uiFont(24); drawOutlined(ctx, p.floaty.text, view.w / 2 + 200, 90 + p.floaty.t * 20, '#60ff90'); }
  };
  return p;
}
