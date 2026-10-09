// Boss Rush + Sub-boss Rush (SPEC 2.9, S53): generated "dungeons" of back-to-back boss rooms in world order. Between bosses:
// +RUSH.HEAL_HEARTS hearts, AP refilled, RUSH.BREATHER s breather. Exactly RUSH.REVIVES revive for the whole run and NO
// math-revive. Boss Rush is timed from the first spawn to Astronova's defeat (best time → records, Star Chalice);
// the Sub-boss Rush is untimed (Silver Comet). Records survive New Game [D12].
import { CONFIG } from '../config.js';

const R = CONFIG.RUSH;
export const RUSH_KINDS = {
  boss: { id: 'boss-rush', name: 'Boss Rush', timed: true, trophy: 'star-chalice', trophyName: 'Star Chalice' },
  sub: { id: 'subboss-rush', name: 'Sub-boss Rush', timed: false, trophy: 'silver-comet', trophyName: 'Silver Comet' },
};

// [{ world, id }] in world order: the main boss of each world (boss rush) or every sub-boss (sub-boss rush).
export function rushList(worlds, kind) {
  const out = [];
  for (let w = 1; w <= 8; w++) {
    const W = worlds[w]; if (!W) continue;
    const bosses = Object.values(W.bosses || {});
    if (kind === 'boss') { const main = W.throne && W.throne.rooms.throne && W.bosses[W.throne.rooms.throne.boss]; if (main) out.push({ world: w, id: main.id }); }
    else for (const b of bosses) if (b.kind === 'sub') out.push({ world: w, id: b.id });
  }
  return out;
}

export function buildRushDungeon(worlds, kind) {
  const K = RUSH_KINDS[kind], list = rushList(worlds, kind), rooms = {};
  list.forEach((b, i) => { rooms['r' + (i + 1)] = { floor: '1F', gx: i % 10, gy: Math.floor(i / 10), type: 'sub', boss: b.id, bossWorld: b.world, doors: {} }; });
  return { id: K.id, name: K.name, world: 8, rush: kind, floors: ['1F'], start: 'r1', theme: { floor: '#2a2a5a', floor2: '#262656', wall: '#0e0e2a', wallTop: kind === 'boss' ? '#ffe070' : '#c0c0e0' }, rooms, count: list.length };
}

export function createRun(kind, count) { return { kind, count, i: 0, revives: R.REVIVES, time: 0, started: false, breather: 0, over: false, won: false, deaths: 0 }; }

// A boss fell: heal, refill AP, breather. Returns true when that was the last one.
export function rushKill(run, data, apCap) {
  data.hearts = Math.min(data.maxHearts, data.hearts + R.HEAL_HEARTS);
  data.ap = apCap;
  run.i++;
  if (run.i >= run.count) { run.won = true; run.over = true; return true; }
  run.breather = R.BREATHER;
  return false;
}
// The hero fell: 'revive' while the run's single revive lasts, else 'over' (no math-revive in a rush).
export function rushDeath(run) {
  run.deaths++;
  if (run.revives > 0) { run.revives--; return 'revive'; }
  run.over = true; return 'over';
}
// Write the result into the slot's records (best time + trophy on a win). Returns { best, newBest, trophy }.
export function finishRun(run, records) {
  const K = RUSH_KINDS[run.kind], out = { best: records.bestRushTime, newBest: false, trophy: null };
  if (!run.won) return out;
  if (!records.trophies.includes(K.trophy)) { records.trophies.push(K.trophy); out.trophy = K.trophyName; }
  if (K.timed && (records.bestRushTime == null || run.time < records.bestRushTime)) { records.bestRushTime = Math.round(run.time * 10) / 10; out.newBest = true; }
  out.best = records.bestRushTime;
  return out;
}
export function fmtTime(s) { if (s == null) return '—'; const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
