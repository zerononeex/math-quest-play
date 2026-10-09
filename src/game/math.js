// Math engine: band generators (SPEC 2.3), 4 choices with G15 distractors, adaptive bands (D06, D19), AP + streak.
import { CONFIG } from '../config.js';

const M = CONFIG.MATH;

const ri = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Answer values: { k: 'int', v } | { k: 'frac', n, d } | { k: 'rem', q, r }
const int = (v) => ({ k: 'int', v });
export function fmt(a) {
  if (a.k === 'frac') return a.n + '/' + a.d;
  if (a.k === 'rem') return a.q + ' R ' + a.r;
  return String(a.v);
}

// Each generator returns { text, ans, classic? } (classic = the "classic mistake" value).
const GEN = [
  // 0 — + and − within 100
  (rng) => {
    if (rng() < 0.5) { const a = ri(rng, 1, 90); const b = ri(rng, 1, 100 - a); return { text: `${a} + ${b}`, ans: int(a + b), classic: int(Math.abs(a - b)) }; }
    const a = ri(rng, 5, 100); const b = ri(rng, 1, a); return { text: `${a} − ${b}`, ans: int(a - b), classic: a + b <= 100 ? int(a + b) : null };
  },
  // 1 — +/− within 200; ×2, ×5, ×10
  (rng) => {
    const r = rng();
    if (r < 0.35) { const a = ri(rng, 10, 180); const b = ri(rng, 5, 200 - a); return { text: `${a} + ${b}`, ans: int(a + b), classic: int(a + b + 10) }; }
    if (r < 0.7) { const a = ri(rng, 20, 200); const b = ri(rng, 5, a); return { text: `${a} − ${b}`, ans: int(a - b), classic: int(a - b + 10) }; }
    const k = pick(rng, [2, 5, 10]); const a = ri(rng, 1, 12); return { text: `${a} × ${k}`, ans: int(a * k), classic: int(a + k) };
  },
  // 2 — × to 10×10; simple ÷
  (rng) => {
    const a = ri(rng, 1, 10); const b = ri(rng, 1, 10);
    if (rng() < 0.6) return { text: `${a} × ${b}`, ans: int(a * b), classic: int(a + b) };
    return { text: `${a * b} ÷ ${b}`, ans: int(a), classic: int(a * b - b) };
  },
  // 3 — × to 12×12; ÷; 3-digit +/−
  (rng) => {
    const r = rng();
    if (r < 0.35) { const a = ri(rng, 2, 12); const b = ri(rng, 2, 12); return { text: `${a} × ${b}`, ans: int(a * b), classic: int(a * b + a) }; }
    if (r < 0.6) { const a = ri(rng, 2, 12); const b = ri(rng, 2, 12); return { text: `${a * b} ÷ ${b}`, ans: int(a), classic: int(a + 1) }; }
    if (r < 0.8) { const a = ri(rng, 100, 800); const b = ri(rng, 100, 999 - a); return { text: `${a} + ${b}`, ans: int(a + b), classic: int(a + b - 100) }; }
    const a = ri(rng, 200, 999); const b = ri(rng, 100, a); return { text: `${a} − ${b}`, ans: int(a - b), classic: int(a - b + 100) };
  },
  // 4 — multi-digit ×; ÷ with remainder; fraction intro
  (rng) => {
    const r = rng();
    if (r < 0.4) { const a = ri(rng, 12, 99); const b = ri(rng, 2, 9); return { text: `${a} × ${b}`, ans: int(a * b), classic: int(a * b + 10) }; }
    if (r < 0.75) {
      const b = ri(rng, 2, 9); const q = ri(rng, 2, 12); const rr = ri(rng, 1, b - 1 || 1) % b;
      return { text: `${q * b + rr} ÷ ${b}`, ans: { k: 'rem', q, r: rr }, classic: { k: 'rem', q, r: 0 } };
    }
    const d = pick(rng, [2, 3, 4, 5, 10]); const k = ri(rng, 1, 10); return { text: `1/${d} of ${d * k}`, ans: int(k), classic: int(d * k - d) };
  },
  // 5 — fractions; multi-step +/−/×
  (rng) => {
    if (rng() < 0.5) {
      const d = ri(rng, 3, 12); const a = ri(rng, 1, d - 2); const b = ri(rng, 1, d - 1 - a);
      return { text: `${a}/${d} + ${b}/${d}`, ans: { k: 'frac', n: a + b, d }, classic: { k: 'frac', n: a + b, d: d * 2 } };
    }
    const a = ri(rng, 10, 60); const b = ri(rng, 5, 40); const c = ri(rng, 1, a + b - 1);
    if (rng() < 0.5) return { text: `${a} + ${b} − ${c}`, ans: int(a + b - c), classic: int(a - b + c > 0 ? a - b + c : a + b + c) };
    const x = ri(rng, 2, 9); const y = ri(rng, 2, 9); const z = ri(rng, 1, x * y);
    return { text: `${x} × ${y} − ${z}`, ans: int(x * y - z), classic: int(x * (y - z) > 0 ? x * (y - z) : x * y + z) };
  },
  // 6 — a × b + c; mixed multi-step
  (rng) => {
    const a = ri(rng, 3, 12); const b = ri(rng, 3, 12); const c = ri(rng, 2, 50);
    const r = rng();
    if (r < 0.5) return { text: `${a} × ${b} + ${c}`, ans: int(a * b + c), classic: int(a * (b + c)) };
    if (r < 0.75) { const k = pick(rng, [2, 3, 4, 5]); return { text: `(${a} + ${b}) × ${k}`, ans: int((a + b) * k), classic: int(a + b * k) }; }
    const cc = ri(rng, 1, a * b - 1); return { text: `${a} × ${b} − ${cc}`, ans: int(a * b - cc), classic: int(a * b + cc) };
  },
];

const same = (x, y) => fmt(x) === fmt(y);
const valid = (x) => (x.k === 'int' ? x.v >= 0 && Number.isInteger(x.v)
  : x.k === 'frac' ? x.n >= 0 && x.d > 0 : x.q >= 0 && x.r >= 0);

function offsetOf(a, off) {
  if (a.k === 'frac') return { k: 'frac', n: a.n + off, d: a.d };
  if (a.k === 'rem') return Math.abs(off) <= 3 ? { k: 'rem', q: a.q + off, r: a.r } : { k: 'rem', q: a.q, r: a.r + Math.sign(off) };
  return int(a.v + off);
}

// G15: 3 distractors from ±{3,6,10,15} (answers < 20: ±{1,2,3}), scaled to size, plus one classic mistake.
export function distractors(ans, classic, rng) {
  const size = ans.k === 'int' ? ans.v : ans.k === 'frac' ? ans.n : ans.q;
  const small = size < M.SMALL_ANSWER || ans.k !== 'int';
  const scale = ans.k === 'int' && size >= 1000 ? 10 : 1;
  const base = small ? M.DISTRACTOR_OFFSETS_SMALL : M.DISTRACTOR_OFFSETS;
  const out = [];
  const add = (x) => { if (x && valid(x) && !same(x, ans) && !out.some((o) => same(o, x)) && out.length < 3) out.push(x); };
  if (classic) add(classic);
  const offs = [];
  for (const o of base) offs.push(o * scale, -o * scale);
  for (let i = offs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [offs[i], offs[j]] = [offs[j], offs[i]]; }
  for (const o of offs) add(offsetOf(ans, o));
  for (let o = 1; out.length < 3; o++) { add(offsetOf(ans, o)); add(offsetOf(ans, -o)); if (ans.k === 'rem') add({ k: 'rem', q: ans.q + o, r: ans.r }); }
  return out;
}

export function makeQuestion(band, rng = Math.random, reviewMax = 6) {
  let b = band;
  if (b >= 7) b = ri(rng, 0, Math.min(6, reviewMax));
  const q = GEN[b](rng);
  const wrong = distractors(q.ans, q.classic, rng);
  const choices = [q.ans, ...wrong].map(fmt);
  for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
  const answer = fmt(q.ans);
  return { band, genBand: b, text: q.text + ' = ?', answer, value: q.ans, choices, correctIndex: choices.indexOf(answer) };
}

// ---- adaptive state (D06, D19) + AP (SPEC 2.3) ----
export function createMathState(tier = 'adventurer') {
  return { tier, drops: 0, wrongRun: 0, rightRun: 0, streak: 0, bestStreak: 0, answered: 0, correct: 0 };
}

export function tierFloor(tier) { return M.TIER_FLOOR[tier] ?? 0; }

export function effectiveBand(state, worldBand) {
  const f = tierFloor(state.tier);
  return Math.max(Math.max(worldBand, f) - state.drops, f);
}

export function apCap(bootsTier = 0) { return CONFIG.AP.CAP_BASE + CONFIG.AP.PER_BOOTS_TIER * bootsTier; }

export function streakBonus(streak) { return Math.min(M.STREAK_MAX_BONUS, Math.floor(streak / M.STREAK_STEP)); }

// Records an answer. Wrong answers never cost AP or hearts. Returns { gained, ap, lost }.
export function answer(state, correct, worldBand, ap = 0, cap = apCap(0)) {
  state.answered++;
  const f = tierFloor(state.tier);
  if (correct) {
    state.correct++;
    state.streak++;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.wrongRun = 0;
    if (state.drops > 0 && ++state.rightRun >= M.ADAPT_CLIMB_RIGHT) { state.drops--; state.rightRun = 0; }
    const mult = M.AP_PER_Q_WORLD_MULT[Math.max(0, Math.min(7, worldBand | 0))] ?? 1; // [D36]
    const gained = Math.round(M.AP_PER_Q[state.tier] * mult * 2) / 2 + streakBonus(state.streak);
    const total = ap + gained;
    return { gained, ap: Math.min(cap, total), lost: Math.max(0, total - cap) };
  }
  state.streak = 0;
  state.rightRun = 0;
  if (++state.wrongRun >= M.ADAPT_DROP_WRONG) {
    state.wrongRun = 0;
    if (effectiveBand(state, worldBand) > f) state.drops++;
  }
  return { gained: 0, ap, lost: 0 };
}
