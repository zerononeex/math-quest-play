// D25 combat formulas: STR damage vs world reference, capped DEF reduction, LUCK drops + crits; gear aggregates.
import { CONFIG } from '../config.js';
import { gearTier } from '../data/gear.js';

const G = CONFIG.GEAR, S = CONFIG.STATS;

// Gear totals for a hero: { str, def, hearts, ap, luck, fullSet }.
export function gearStats(data, hero = data.hero) {
  const e = data.gearEquipped;
  const wt = gearTier(e.weapon[hero]), ht = gearTier(e.helmet), ct = gearTier(e.chest), bt = gearTier(e.boots);
  const out = { str: 0, def: 0, hearts: 0, ap: 0, luck: 0, fullSet: false };
  if (data.dawnbreaker && wt >= 9) { out.str += G.DAWNBREAKER.str; out.hearts += G.DAWNBREAKER.hearts; } else if (wt) out.str += G.WEAPON_STR[wt - 1];
  if (ht) out.def += G.HELMET_DEF[ht - 1];
  if (ct >= 9) { out.str += G.GOLDEN_STAR_TUNIC.str; out.hearts += G.GOLDEN_STAR_TUNIC.hearts; } else if (ct) { out.hearts += G.CHEST_HEARTS[ct - 1]; out.def += G.CHEST_DEF[ct - 1]; }
  if (bt) { out.ap += G.BOOTS_AP[bt - 1]; out.luck += G.BOOTS_LUCK[bt - 1]; }
  if (wt && wt <= 8 && wt === ht && wt === ct && wt === bt) { out.fullSet = true; out.str += G.SET_BONUS.str; out.luck += G.SET_BONUS.luck; }
  return out;
}

export const totalStr = (d) => d.stats.str + gearStats(d).str;
export const totalDef = (d) => d.stats.def + gearStats(d).def;
export const totalLuck = (d) => d.stats.luck + gearStats(d).luck;

// Damage dealt per hit = 1 + STR points + weapon STR (+2 set).
export function damageDealt(d) { return 1 + totalStr(d); }

// Reference build per world (points split evenly, current-tier weapon): expected damage at world entry.
export function entryLevel(w) { return w <= 1 ? 1 : CONFIG.XP.LEVEL_CAPS[w - 2]; }
export function seedsExpected(w) { return Math.min(CONFIG.STATS.STAR_SEEDS_TOTAL, 2 * (w - 1)); }
export function atkRef(w) {
  const points = entryLevel(w) - 1 + seedsExpected(w);
  return 1 + Math.floor(points / 3) + G.WEAPON_STR[Math.min(8, w) - 1];
}
export function defRef(w) { const points = entryLevel(w) - 1 + seedsExpected(w); return Math.floor(points / 3) + G.HELMET_DEF[Math.min(8, w) - 1]; }

export function enemyHp(w, archetype, elite = false) {
  return CONFIG.ENEMY.HITS[archetype] * atkRef(w) * (elite ? CONFIG.ENEMY.ELITE_MULT : 1);
}

export function bossHits(kind, tier = 'adventurer') {
  const B = CONFIG.BOSS;
  const base = kind === 'sub' ? B.SUB_HITS : kind === 'final' ? B.FINAL_HITS : B.MAIN_HITS;
  const T = CONFIG.TIER_MODS[tier];
  const m = kind === 'final' && T.finalHits != null ? T.finalHits : kind === 'sub' && T.subHits != null ? T.subHits : T.bossHits;
  return Math.round(base * m); // [S62] finals and sub-bosses may scale on their own (Master: long main fights, brisk dungeon sub-bosses)
}
export function bossHp(kind, w, tier) { return bossHits(kind, tier) * atkRef(w); }

// Damage a hit does to a boss: clamped so the real hit count stays within 0.6–1.6× target.
export function bossHitDamage(dmg, hp, targetHits) {
  const [lo, hi] = S.BOSS_HIT_CLAMP;
  return Math.min(hp / (lo * targetHits), Math.max(hp / (hi * targetHits), dmg));
}

// Raw enemy damage for world w (bosses +1), tier multiplier rounded up; Little Hero boss/enemy hits deal 1.
export function rawDamage(w, tier = 'adventurer', boss = false) {
  const t = CONFIG.TIER_MODS[tier];
  if (t.hitsDealOne) return 1;
  return Math.ceil((CONFIG.ENEMY.WORLD_DMG[w - 1] + (boss ? CONFIG.ENEMY.BOSS_DMG_BONUS : 0)) * t.enemyDmg);
}

// Damage taken = max(1, raw − min(floor(DEF/2), floor(0.6·raw))).
export function damageTaken(raw, def) { return Math.max(1, raw - Math.min(Math.floor(def / 2), Math.floor(S.DEF_MAX_CUT * raw))); }

export function dropMult(luck) { return 1 + Math.min(S.LUCK_DROP_MAX, S.LUCK_DROP_PER_PT * luck); }
export function critChance(luck) { return Math.min(S.LUCK_CRIT_MAX, S.LUCK_CRIT_PER_PT * luck); }
export function rollDamage(d, rng = Math.random) {
  const base = damageDealt(d);
  return rng() < critChance(totalLuck(d)) ? base * S.CRIT_MULT : base;
}
