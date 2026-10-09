// Hero growth: XP (D02, G03, G04), stat points (D23), fixed heart schedule (D03), 20-heart cap from all sources.
import { CONFIG } from '../config.js';
import { gearStats } from './stats.js';

const X = CONFIG.XP, H = CONFIG.HEARTS;
export const STATS = ['str', 'def', 'luck'];

export function xpToNext(level) { return Math.round(X.BASE * Math.pow(level, X.EXP)); }

export function levelCap(d) {
  let hi = 0;
  d.worlds.forEach((w, i) => { if (w.unlocked) hi = i; });
  return X.LEVEL_CAPS[hi];
}

// Base hearts: 3 + main bosses W1–W6 + one every 8 levels; plus gear; hard cap 20.
export function maxHeartsOf(d) {
  const bosses = d.worlds.slice(0, H.BOSS_WORLDS).filter((w) => w.bossBeaten).length * H.PER_BOSS;
  const lv = Math.floor(Math.min(d.level, 56) / H.EVERY_LEVELS);
  const pieces = Math.floor((d.heartPieces || 0) / H.PIECES_PER_HEART); // [D52]
  return Math.min(H.CAP, H.START + bosses + lv + pieces + gearStats(d).hearts);
}

export function refreshHearts(d, heal = 0) {
  const before = d.maxHearts;
  d.maxHearts = maxHeartsOf(d);
  d.hearts = Math.min(d.maxHearts, d.hearts + Math.max(0, d.maxHearts - before) + heal);
  return d.maxHearts - before;
}

// Applies pending level-ups (e.g. after the cap rises). Returns [{ level, heart }].
export function applyLevelUps(d, settings = {}) {
  const ev = [];
  const cap = levelCap(d);
  while (d.level < cap && d.xp >= xpToNext(d.level)) {
    d.xp -= xpToNext(d.level);
    d.level++;
    d.statPoints += CONFIG.STATS.POINTS_PER_LEVEL;
    const heart = refreshHearts(d) > 0;
    ev.push({ level: d.level, heart });
  }
  if (settings.autoStats) autoSpend(d);
  return ev;
}

export function gainXp(d, amount, settings = {}) {
  let a = amount * X.TIER_MULT[d.tier];
  if (d.level >= levelCap(d)) a *= X.AT_CAP_MULT;
  d.xp += a;
  return applyLevelUps(d, settings);
}

export function spendPoint(d, stat) {
  if (d.statPoints <= 0 || !STATS.includes(stat)) return false;
  d.statPoints--;
  d.stats[stat]++;
  return true;
}

// Auto: spend in rotation STR → DEF → LUCK (continues where it left off).
export function autoSpend(d) { // [R3-4] strength and defense first: str, def, str, def, luck, …
  const order = CONFIG.STATS.AUTO_ORDER;
  while (d.statPoints > 0) {
    const i = (d.autoIdx || 0) % order.length;
    spendPoint(d, order[i]);
    d.autoIdx = i + 1;
  }
}

// Rest-bunk re-pick (D23): every point comes back to spend again.
export function respec(d) {
  d.statPoints += d.stats.str + d.stats.def + d.stats.luck;
  d.stats = { str: 0, def: 0, luck: 0 };
}

export function beatBoss(d, world) {
  d.worlds[world - 1].bossBeaten = true;
  refreshHearts(d, 99);
}

export function addStarSeed(d) {
  if (d.starSeeds >= CONFIG.STATS.STAR_SEEDS_TOTAL) return false;
  d.starSeeds++;
  d.statPoints++;
  return true;
}
