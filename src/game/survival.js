// Survival (SPEC 2.9 + G18, S54): endless waves drawn uniformly from all 8 worlds' rosters. Wave n: BASE + n enemies (max
// MAX_ALIVE alive), HP × (1 + HP_PER_WAVE)^(n−1), speed +SPEED_PER_WAVE per wave (cap SPEED_CAP), +1 damage every DMG_EVERY
// waves, from ELITE_FROM a ELITE_CHANCE of elites (×2 HP, +1 dmg, ×2 XP/gold, gold outline). One revive, no math-revive; the
// record is waves beaten (records.bestWaves survives New Game).
import { CONFIG } from '../config.js';
import { enemyDef } from './enemies.js';
import { rawDamage } from './stats.js';

const S = CONFIG.SURVIVAL;

// every enemy keeps its home world's HP (a W1 Sproutling stays a W1 Sproutling); hits are capped at W3 strength and the wave scaling does the ramping
export function survivalRoster(worlds) { const out = []; for (let w = 1; w <= 8; w++) if (worlds[w]) for (const ed of worlds[w].enemies || []) out.push({ ed, w }); return out; }
export function waveSize(n) { return Math.min(S.MAX_ALIVE, S.BASE + n); }
export function waveScale(n) { return { hp: Math.pow(1 + S.HP_PER_WAVE, n - 1), speed: Math.min(S.SPEED_CAP, S.SPEED_PER_WAVE * (n - 1)), dmg: Math.floor(n / S.DMG_EVERY) }; }

export function buildSurvivalDungeon() {
  return { id: 'survival', name: 'Survival', world: 8, survival: true, floors: ['1F'], start: 'arena', theme: { floor: '#24244a', floor2: '#202046', wall: '#0a0a20', wallTop: '#a0e0ff' },
    rooms: { arena: { floor: '1F', gx: 0, gy: 0, type: 'survival', doors: {} } } };
}

export function createSurvival() { return { wave: 0, gap: 1.0, revives: CONFIG.RUSH.REVIVES, over: false, deaths: 0, kills: 0 }; }

// Enemy defs for wave n (rng injectable for tests).
export function waveDefs(roster, n, tier, rng = Math.random) {
  const sc = waveScale(n), out = [];
  for (let i = 0; i < waveSize(n); i++) {
    const pick = roster[Math.floor(rng() * roster.length)], elite = n >= S.ELITE_FROM && rng() < S.ELITE_CHANCE;
    const e = enemyDef(pick.ed, pick.w, tier, elite);
    // [S61] HP keeps the home world's strength; the hit starts at most at W3 strength and grows +1 every DMG_EVERY waves (SPEC 2.9)
    e.hp = e.maxHp = Math.round(e.maxHp * sc.hp); e.dmg = rawDamage(Math.min(pick.w, S.DMG_WORLD_CAP), tier) + (elite ? 1 : 0) + sc.dmg; e.speedMul = 1 + sc.speed; e.wave = n;
    out.push(e);
  }
  return out;
}
// Hero down: one revive, then the run is over (no math-revive). Returns 'revive' | 'over'.
export function survivalDeath(sv) { sv.deaths++; if (sv.revives > 0) { sv.revives--; return 'revive'; } sv.over = true; return 'over'; }
export function wavesBeaten(sv) { return Math.max(0, sv.wave - (sv.over ? 1 : 0)); }
export function recordWaves(sv, records) { const n = wavesBeaten(sv), newBest = n > (records.bestWaves || 0); if (newBest) records.bestWaves = n; return { waves: n, best: records.bestWaves, newBest }; }
