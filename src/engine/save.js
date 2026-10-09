// Saves: 3 slots mq8.slot.N (version v, additive fields, clamped on load), per-slot records mq8.records.N [D12], settings.
import { CONFIG } from '../config.js';

const S = CONFIG.SAVE;
export const SAVE_VERSION = 1;
const HEROES = ['rowan', 'milo', 'wren'];
const TIERS = ['little', 'adventurer', 'master']; // [D54] Legend removed: old 'legend' saves load as 'master'
const NWORLDS = 8;
const BIG = 1e9;

function worldDefaults(i) {
  return { unlocked: i === 0, dungeonsCleared: [], medallions: [], subBossesBeaten: [], bossBeaten: false, relicFound: false, rooms: {} };
}

export function defaults() {
  return {
    v: SAVE_VERSION, hero: 'rowan', tier: 'adventurer', level: 1, xp: 0,
    hearts: CONFIG.HEARTS.START, maxHearts: CONFIG.HEARTS.START,
    stats: { str: 0, def: 0, luck: 0 }, statPoints: 0, starSeeds: 0, gold: 0, ap: CONFIG.AP.START,
    gearOwned: [], gearEquipped: { weapon: { rowan: null, milo: null, wren: null }, helmet: null, chest: null, boots: null },
    tools: [], relics: [], dawnbreaker: false, items: { potions: 0, bombs: 0 },
    worlds: Array.from({ length: NWORLDS }, (_, i) => worldDefaults(i)),
    math: { drops: 0, wrongRun: 0, rightRun: 0, streak: 0 },
    quests: {}, secrets: [], location: { world: 1, area: 'overworld', x: 0, y: 0, dungeon: '' }, playTime: 0, revives: 0, victory: false,
    tutorialDone: false, // [A8e] the W1 pad tutorial was finished or skipped
    heartPieces: 0, pieceIds: [], mazeBest: {}, // [D52] heart pieces (4 = +1 heart) + the sources already claimed; best maze times per world
  };
}

export function defaultRecords() {
  return { bestRushTime: null, bestWaves: 0, trophies: [], bestStreak: 0, totalQuestions: 0 };
}

export function defaultSettings() { return { mute: false, lastSlot: 1, autoStats: true }; } // [R3-4] stat points spend themselves unless the player picks

// ---- clamp helpers ----
const num = (x, lo, hi, d) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d);
const intc = (x, lo, hi, d) => Math.round(num(x, lo, hi, d));
const bool = (x, d) => (typeof x === 'boolean' ? x : d);
const oneOf = (x, list, d) => (list.includes(x) ? x : d);
const strArr = (x, max = 500) => (Array.isArray(x) ? [...new Set(x.filter((s) => typeof s === 'string' && s.length < 200))].slice(0, max) : []);
const strOrNull = (x) => (typeof x === 'string' && x.length < 200 ? x : null);
const plainObj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

function clampWorld(raw, i) {
  const w = plainObj(raw);
  const d = worldDefaults(i);
  return {
    ...w,
    unlocked: bool(w.unlocked, d.unlocked) || i === 0,
    dungeonsCleared: strArr(w.dungeonsCleared), medallions: strArr(w.medallions), subBossesBeaten: strArr(w.subBossesBeaten),
    bossBeaten: bool(w.bossBeaten, false), relicFound: bool(w.relicFound, false),
    rooms: Object.fromEntries(Object.entries(plainObj(w.rooms)).filter(([, v]) => v && typeof v === 'object').slice(0, 2000)),
  };
}

export function clampSlot(raw) {
  const r = plainObj(raw);
  const d = defaults();
  const H = CONFIG.HEARTS;
  const cap = CONFIG.XP.LEVEL_CAPS[NWORLDS - 1];
  const maxHearts = intc(r.maxHearts, 1, H.CAP, d.maxHearts);
  const st = plainObj(r.stats);
  const ge = plainObj(r.gearEquipped);
  const gw = plainObj(ge.weapon);
  const it = plainObj(r.items);
  const ma = plainObj(r.math);
  const lo = plainObj(r.location);
  const worlds = Array.isArray(r.worlds) ? r.worlds : [];
  return {
    ...r,
    v: SAVE_VERSION,
    hero: oneOf(r.hero, HEROES, d.hero), tier: oneOf(r.tier === 'legend' ? 'master' : r.tier, TIERS, d.tier),
    level: intc(r.level, 1, cap, 1), xp: intc(r.xp, 0, BIG, 0),
    maxHearts, hearts: intc(r.hearts, 0, maxHearts, maxHearts),
    stats: { str: intc(st.str, 0, 999, 0), def: intc(st.def, 0, 999, 0), luck: intc(st.luck, 0, 999, 0) },
    statPoints: intc(r.statPoints, 0, 999, 0), starSeeds: intc(r.starSeeds, 0, CONFIG.STATS.STAR_SEEDS_TOTAL, 0),
    gold: intc(r.gold, 0, 9999999, 0), ap: Math.round(num(r.ap, 0, CONFIG.AP.CAP_BASE + CONFIG.AP.PER_BOOTS_TIER * 8, d.ap) * 2) / 2,
    gearOwned: strArr(r.gearOwned),
    gearEquipped: { weapon: { rowan: strOrNull(gw.rowan), milo: strOrNull(gw.milo), wren: strOrNull(gw.wren) }, helmet: strOrNull(ge.helmet), chest: strOrNull(ge.chest), boots: strOrNull(ge.boots) },
    tools: strArr(r.tools), relics: strArr(r.relics, 6), dawnbreaker: bool(r.dawnbreaker, false),
    items: { potions: intc(it.potions, 0, CONFIG.ITEMS.POTION.carry, 0), bombs: intc(it.bombs, 0, CONFIG.ITEMS.BOMBS.carry, 0) },
    worlds: Array.from({ length: NWORLDS }, (_, i) => clampWorld(worlds[i], i)),
    math: { drops: intc(ma.drops, 0, 7, 0), wrongRun: intc(ma.wrongRun, 0, 99, 0), rightRun: intc(ma.rightRun, 0, 99, 0), streak: intc(ma.streak, 0, 99999, 0) },
    quests: plainObj(r.quests), secrets: strArr(r.secrets, 2000),
    location: { world: intc(lo.world, 1, NWORLDS, 1), area: typeof lo.area === 'string' && lo.area.length < 100 ? lo.area : 'overworld', x: num(lo.x, -1e6, 1e6, 0), y: num(lo.y, -1e6, 1e6, 0), dungeon: typeof lo.dungeon === 'string' && lo.dungeon.length < 64 ? lo.dungeon : '' },
    playTime: num(r.playTime, 0, 1e9, 0), revives: intc(r.revives, 0, 1e7, 0), victory: r.victory === true,
    tutorialDone: r.tutorialDone === true,
    heartPieces: intc(r.heartPieces, 0, 64, 0), pieceIds: strArr(r.pieceIds, 64), mazeBest: Object.fromEntries(Object.entries(plainObj(r.mazeBest)).filter(([k, t]) => /^w[1-8]$/.test(k) && typeof t === 'number' && t > 0 && t < 1e4)),
  };
}

export function clampRecords(raw) {
  const r = plainObj(raw);
  return {
    ...r,
    bestRushTime: typeof r.bestRushTime === 'number' && Number.isFinite(r.bestRushTime) && r.bestRushTime > 0 ? Math.min(r.bestRushTime, 1e7) : null,
    bestWaves: intc(r.bestWaves, 0, 99999, 0), trophies: strArr(r.trophies), bestStreak: intc(r.bestStreak, 0, 1e7, 0), totalQuestions: intc(r.totalQuestions, 0, 1e9, 0),
  };
}

export function clampSettings(raw) {
  const r = plainObj(raw);
  return { ...r, mute: bool(r.mute, false), lastSlot: intc(r.lastSlot, 1, S.SLOTS, 1), autoStats: r.autoStatsSet ? bool(r.autoStats, true) : true, autoStatsSet: !!r.autoStatsSet }; // [R3-4] auto by default; only a player's own choice (autoStatsSet) turns it off
}

// Additive migrations: MIGRATIONS[v] upgrades a v-save to v+1 (never deletes data a player earned).
export const MIGRATIONS = {
  0: (d) => {
    const worlds = Array.isArray(d.worlds) ? d.worlds.map((w) => {
      const o = plainObj(w);
      return { ...o, subBossesBeaten: o.subBossesBeaten || o.subBosses || [] };
    }) : d.worlds;
    const stats = d.stats || { str: typeof d.attack === 'number' ? d.attack : 0, def: 0, luck: 0 };
    return { ...d, worlds, stats, v: 1 };
  },
};

export function migrate(raw) {
  let d = plainObj(raw);
  let v = intc(d.v, 0, SAVE_VERSION, 0);
  while (v < SAVE_VERSION) { d = MIGRATIONS[v](d); v++; }
  return clampSlot(d);
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

function defaultStorage() {
  try { const ls = globalThis.localStorage; ls.setItem('mq8.probe', '1'); ls.removeItem('mq8.probe'); return ls; } catch (e) { return memoryStorage(); }
}

export function createSaveStore(storage = defaultStorage()) {
  const get = (k) => { try { const s = storage.getItem(k); return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
  const put = (k, v) => { try { storage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const slotKey = (n) => S.SLOT_KEY + n;
  const recKey = (n) => S.RECORDS_KEY + n;
  const store = {
    storage,
    exists: (n) => get(slotKey(n)) != null,
    load: (n) => { const raw = get(slotKey(n)); return raw == null ? null : migrate(raw); },
    write: (n, data) => put(slotKey(n), clampSlot(data)),
    erase: (n) => { try { storage.removeItem(slotKey(n)); } catch (e) { /* ignore */ } },
    // New Game: fresh slot data; records for that slot survive [D12].
    newGame: (n, opts = {}) => { const d = { ...defaults(), ...opts }; put(slotKey(n), clampSlot(d)); return clampSlot(d); },
    loadRecords: (n) => clampRecords(get(recKey(n))),
    writeRecords: (n, r) => put(recKey(n), clampRecords(r)),
    loadSettings: () => clampSettings(get(S.SETTINGS_KEY)),
    writeSettings: (s) => put(S.SETTINGS_KEY, clampSettings(s)),
  };
  return store;
}

// Live save handle used by the game: save.slot / save.data; save.auto(reason) writes it.
export const save = {
  store: null, slot: null, data: null, lastReason: null, lastOk: true,
  init(storage) { this.store = createSaveStore(storage); return this; },
  auto(reason) {
    if (!this.store || !this.slot || !this.data) return false;
    this.lastReason = reason;
    this.lastOk = this.store.write(this.slot, this.data);
    return this.lastOk;
  },
};
