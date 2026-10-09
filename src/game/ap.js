// AP + math session bound to the live save: answering, AP cap, spending, auto-question when AP runs out (G11).
import { CONFIG } from '../config.js';
import { createMathState, answer, effectiveBand, apCap } from './math.js';
import { save } from '../engine/save.js';

export const session = { data: null, math: null, emptyTimer: 0, last: null };

export function bindSession(data) {
  session.data = data;
  session.math = Object.assign(createMathState(data.tier), data.math);
  session.emptyTimer = 0;
  session.last = null;
  return session;
}

export function bootsTier(data) {
  const id = data.gearEquipped && data.gearEquipped.boots;
  const m = id && /(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

export function apCapOf(data = session.data) { return apCap(bootsTier(data)); }

export function worldBand(data = session.data) {
  const w = data.location.world;
  if (w >= 8) return CONFIG.MATH.WORLD_BAND[7];
  return CONFIG.MATH.WORLD_BAND[w - 1];
}

// Highest band reachable in review (W8 mixes up to the player's highest unlocked band).
export function reviewMax(data = session.data) {
  let hi = 0;
  data.worlds.forEach((x, i) => { if (x.unlocked && i < 7) hi = Math.max(hi, CONFIG.MATH.WORLD_BAND[i]); });
  return hi;
}

export function currentBand() { return effectiveBand(session.math, worldBand()); }

export function answerQuestion(correct) {
  const d = session.data;
  const r = answer(session.math, correct, worldBand(), d.ap, apCapOf(d));
  d.ap = halfStep(r.ap);
  const { drops, wrongRun, rightRun, streak } = session.math;
  d.math = { drops, wrongRun, rightRun, streak };
  if (save.store && save.slot) {
    const rec = save.store.loadRecords(save.slot);
    rec.totalQuestions++;
    rec.bestStreak = Math.max(rec.bestStreak, session.math.streak);
    save.store.writeRecords(save.slot, rec);
  }
  session.last = { ...r, correct, streak: session.math.streak };
  return session.last;
}

// AP moves in 0.5 steps [D34]; every write snaps to the nearest half so it can never drift.
export const halfStep = (x) => Math.round(x * 2) / 2;

export function spendAp(n) {
  const d = session.data;
  if (d.ap < n) return false;
  d.ap = halfStep(d.ap - n);
  return true;
}

// Call every update while in combat; opens a question 1 s after AP hits 0.
export function tickApEmpty(dt, inCombat, open) {
  if (!inCombat || session.data.ap > 0) { session.emptyTimer = 0; return; }
  session.emptyTimer += dt;
  if (session.emptyTimer >= CONFIG.AP.EMPTY_Q_DELAY) { session.emptyTimer = 0; open(); }
}
