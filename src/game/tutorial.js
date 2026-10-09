// [A8e] First-visit tutorial on the W1 landing pad (V1_1_FIXES "TUTORIAL"): show, don't tell — six tiny steps, one short
// line each, the user's pointing hand (ui-kit) on the thing to touch, a Skip button, replayable from the pause menu.
//   1 walk · 2 swing at the straw dummy (it never hits back) · 3 "attacks use AP" on the AP gems · 4 tap Q → a math
//   question → +AP · 5 open the map · 6 save. Nothing is ever lost or punished; finishing (or skipping) sets data.tutorialDone.
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite, codeArt, drawFoot } from '../engine/atlas.js';
import { drawCell, cellText, record } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { hudButtons } from './hud.js';

const STEPS = [
  { id: 'move', line: 'Drag, or use the arrow keys, to walk!' },
  { id: 'swing', line: 'Tap the dummy, or press Space, to swing!' },
  { id: 'ap', line: 'Attacks use AP — these blue gems.' },
  { id: 'q', line: 'Tap the ? and answer a question for more AP!' },
  { id: 'map', line: 'The map shows where to go next.' },
  { id: 'save', line: 'Tap the book to save your game.' },
];
export const TUT_STEPS = STEPS.map((s) => s.id);
const T = CONFIG.TUTORIAL;

export function createTutorial(start) {
  return { i: 0, t: 0, done: false, start: { ...start }, dummy: { x: start.x + T.DUMMY_DX, y: start.y + T.DUMMY_DY, wob: 0 }, cheer: 0 };
}
export function tutStep(tut) { return tut && !tut.done ? STEPS[tut.i].id : null; }
const next = (tut, data) => { tut.i++; tut.t = 0; tut.cheer = T.CHEER_S; if (tut.i >= STEPS.length) finish(tut, data); };
export function finish(tut, data) { tut.done = true; data.tutorialDone = true; }

// An event from the scene ('q' popup closed, 'map' opened, 'save' tapped): advances the matching step.
export function tutEvent(tut, data, kind) { if (tutStep(tut) === kind) next(tut, data); }

// Per frame: the walk / swing / AP steps finish themselves.
export function updateTutorial(tut, data, hero, dt) {
  if (!tut || tut.done) return;
  tut.t += dt; if (tut.cheer > 0) tut.cheer -= dt; if (tut.dummy.wob > 0) tut.dummy.wob -= dt;
  const s = tutStep(tut), d = tut.dummy;
  if (s === 'move' && Math.hypot(hero.x - tut.start.x, hero.y - tut.start.y) > T.MOVE_PX) next(tut, data);
  else if (s === 'swing' && (hero.swing || tut.tapDummy) && Math.hypot(hero.x - d.x, hero.y - d.y) < T.SWING_PX) { d.wob = 0.6; next(tut, data); }
  else if (s === 'ap' && tut.t > T.AP_S) next(tut, data);
  if (s !== 'swing' && hero.swing && Math.hypot(hero.x - d.x, hero.y - d.y) < T.SWING_PX) d.wob = 0.6; // it always wobbles when hit
}

// World layer: the straw training dummy (code-drawn: no sheet has one), until the tutorial is over.
export function drawDummy(ctx, tut, cam) {
  if (!tut || tut.done) return;
  const d = tut.dummy, x = Math.round(d.x - cam.x), y = Math.round(d.y - cam.y), lean = d.wob > 0 ? Math.sin(d.wob * 30) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (drawFoot(ctx, 'w1-puzzle-b', d.wob > 0 ? 1 : 0, x, y + 1, 26, 30)) return; // [R2-19] #328 straw dummy (leans when hit)
  codeArt('training-dummy'); // [R2-19a] audit: code-drawn
  ctx.fillStyle = '#6a4424'; ctx.fillRect(x - 1, y - 20, 3, 20); // post
  ctx.save(); ctx.translate(x, y - 12); ctx.rotate(lean * 0.05);
  ctx.fillStyle = '#10101a'; ctx.fillRect(-8, -14, 16, 14); ctx.fillStyle = '#e0c060'; ctx.fillRect(-7, -13, 14, 12); // straw body
  ctx.fillStyle = '#c03030'; ctx.fillRect(-3, -9, 6, 4); ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -8, 2, 2); // target
  ctx.fillStyle = '#10101a'; ctx.fillRect(-5, -22, 10, 9); ctx.fillStyle = '#e8d090'; ctx.fillRect(-4, -21, 8, 7); // head
  ctx.fillStyle = '#10101a'; ctx.fillRect(-12, -12, 24, 3); ctx.fillStyle = '#a07a40'; ctx.fillRect(-11, -11, 22, 1); // arms
  ctx.restore();
}

// Screen layer (after the HUD): the line on parchment, step dots, the pointing hand, the Skip button.
export function drawTutorial(ctx, tut, view, cam) {
  if (!tut || tut.done) return;
  const s = STEPS[tut.i], cx = 8 + 230, by = view.h - 74; // [HUD-ATTACK] left-aligned: the attack buttons own the bottom-right corner
  drawCell(ctx, cx - 230, by, 460, 56, { fill: CONFIG.CELL.DARK }); // [R1-17] the clean UI style
  cellText(ctx, s.line, cx, by + 21, 18);
  for (let k = 0; k < STEPS.length; k++) { ctx.fillStyle = k < tut.i ? '#60d070' : k === tut.i ? '#ffd040' : '#6a8ac8'; ctx.fillRect(cx - 42 + k * 14, by + 40, 9, 9); }
  record('hud', 'tut-line', cx - 230, by, 460, 56);
  const sk = skipRect(view);
  drawCell(ctx, sk.x, sk.y, sk.w, sk.h);
  cellText(ctx, 'Skip', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1, 17);
  record('button', 'tut-skip', sk.x, sk.y, sk.w, sk.h);
  // the pointing hand (ui-kit frame 12 points right): under a HUD target pointing up, else beside the world target
  const b = hudButtons(view.w), bob = Math.sin(tut.t * 6) * 4;
  let tgt = null, up = true;
  if (s.id === 'ap') tgt = { x: 40, y: 38 };
  else if (s.id === 'q') tgt = { x: b.q.x + b.q.w / 2, y: b.q.y + b.q.h };
  else if (s.id === 'map') tgt = { x: b.map.x + b.map.w / 2, y: b.map.y + b.map.h };
  else if (s.id === 'save') tgt = { x: b.save.x + b.save.w / 2, y: b.save.y + b.save.h };
  else { const w = s.id === 'swing' ? tut.dummy : { x: tut.start.x + Math.sin(tut.t * 2) * 24, y: tut.start.y }, p = cam.toScreen(w.x, w.y - 18); tgt = { x: p.x - 18, y: p.y }; up = false; }
  drawHand(ctx, tgt.x, tgt.y, up, bob);
  if (tut.cheer > 0) { ctx.font = font(22, CONFIG.FONTS.DISPLAY); drawOutlined(ctx, 'Great!', cx, by - 22, '#ffe070', '#3a1a00', 3); }
}
export function skipRect(view) { return { x: 8 + 384, y: view.h - 124, w: 76, h: 42 }; } // above the line box, clear of the attack buttons

function drawHand(ctx, x, y, up, bob) {
  const S = 'ui-kit', sz = 34;
  ctx.save();
  if (up) { ctx.translate(x, y + 4 + Math.abs(bob)); ctx.rotate(-Math.PI / 2); ctx.translate(-sz, -sz / 2); } // fingertip at the target, hand below it
  else { ctx.translate(x - sz + bob, y - sz / 2); } // fingertip at the target, hand to its left
  if (imgReady(S)) { const n = Object.keys(ATLAS[S].meta.frames)[12], f = ATLAS[S].meta.frames[n], k = sz / Math.max(f.w, f.h); drawSprite(ctx, S, n, 0, Math.round((sz - f.h * k) / 2), { scale: k }); }
  else { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, sz / 2 - 5, sz, 10); }
  ctx.restore();
}
