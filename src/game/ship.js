// The Wayfarer (SPEC 2.5): hub room stations, EARTH MAP travel rules, locker, bunks, medallion gallery. Pure data logic.
import { CONFIG } from '../config.js';
import { WORLDS } from '../data/worlds.js';
import { maxHeartsOf } from './progression.js';
import { medalIndex } from './treasure.js';

// [R1-15/16/24] A cosy room (CONFIG.SHIP: 22×16 tiles) built from the user's ship-room-2x kit: back wall rows 0–2,
// floor rows 3..H-2, bottom wall with the round exit hatch. Stations are the user's ship-in-2x props (true pixels, the town
// props' 2x), centred on their footprint (tx, ty, w, h = the solid tiles you use them from), feet on its bottom edge.
// `label` is the kid-word plaque always shown under it [R1-25]; `kind` drives interact.
export const STATIONS = [
  { id: 'trophies', kind: 'trophies', name: 'Trophy Wall', label: 'Trophies', tx: 2, ty: 3, w: 4, h: 2, art: ['ship-in-2x', 3] },
  // [MEDAL BOARD] the big wall board: one socket per medallion, a column per world (board art #377 ship-medal-board; drawn by
  // art/fallback/ship.js drawMedalBoard). Solid rows 3-6 (its top clears the HUD band); row 7 stays the walkway above the globe;
  // nearBelow keeps its use zone ending where the old cabinet's did, so the World Map below keeps its own target.
  { id: 'gallery', kind: 'gallery', name: 'Medallion Board', label: 'Medallions', tx: 8, ty: 3, w: 7, h: 4, board: true, nearBelow: 16 },
  { id: 'forge', kind: 'forge', name: 'Starforge', label: 'Starforge', tx: 16, ty: 3, w: 5, h: 3, art: ['ship-in-2x', 1] },
  { id: 'map', kind: 'map', name: 'Earth Map', label: 'World Map', tx: 10, ty: 8, w: 3, h: 2, art: ['ship-in-2x', 0] },
  { id: 'locker', kind: 'locker', name: 'Locker Room', label: 'Change Hero', tx: 2, ty: 8, w: 4, h: 2, art: ['ship-in-2x', 5] },
  { id: 'bunks', kind: 'bunks', name: 'Rest Bunks', label: 'Rest & Heal', tx: 2, ty: 12, w: 4, h: 2, art: ['ship-in-2x', 4] },
];
// Decor (no interaction): [sheet, frame, centre x (tiles), foot row, solid footprint [x0, x1, rows] or null (flat / on the wall)]
export const SHIP_DECOR = [
  ['ship-in-2x', 6, 5.5, 3, null], ['ship-in-2x', 6, 17.5, 3, null], // portholes on the back wall ([MEDAL BOARD] moved out to make room for the wide board)
  ['ship-in-2x', 7, 18.5, 10, [17, 20, 2]], ['ship-in-2x', 10, 18.5, 14, [17, 20, 2]], // pilot's console, crates + barrel
  ['ship-in-2x', 9, 14.5, 14.5, null], ['ship-in-2x', 11, 14.5, 14, [13, 15, 1]], ['ship-in-2x', 8, 7.5, 14, [7, 7, 1]], // rug + table, plant
];
export const SHIP_DOOR = { tx: CONFIG.SHIP.DOOR_TX, ty: CONFIG.SHIP.H - 1 };
export const SHIP_START = { x: (CONFIG.SHIP.DOOR_TX + 1) * 16, y: (CONFIG.SHIP.H - 4) * 16 + 12 };

// EARTH MAP buttons: continents 1–6, the 7th (locked until World 6 is beaten), then STAR (Starhaven, after Seraphel).
export function mapButtons(data) {
  const out = [];
  for (let w = 1; w <= 8; w++) {
    const wd = data.worlds[w - 1];
    const built = !!WORLDS[w];
    out.push({ w, label: w === 8 ? 'STAR' : String(w), name: built ? WORLDS[w].name : 'World ' + w, enabled: !!(wd && wd.unlocked) && built, unlocked: !!(wd && wd.unlocked), here: data.location.world === w });
  }
  return out;
}
// [EARTH MAP] the ship's World Maps painting (ship-map, 00-core): each world's island as an ellipse in fractions of the
// painting (cx, cy, rx, ry); the label sits at ly. 1-6 + 7 (the gray floating island) match the islands' themes (docs/WORLDS.md).
// 8 Starhaven has no island in the painting: its own island (#375 w8-map-island) is laid over the open sea at the centre.
export const MAP_REGIONS = {
  1: { cx: 0.179, cy: 0.223, rx: 0.153, ry: 0.160, ly: 0.30 }, // green forest + snowy peaks (Verdania)
  2: { cx: 0.529, cy: 0.181, rx: 0.135, ry: 0.149, ly: 0.27 }, // yellow-green castle hills (Tumbletop)
  3: { cx: 0.819, cy: 0.191, rx: 0.141, ry: 0.159, ly: 0.30 }, // blue reef + pink coral (Chroma Bay)
  4: { cx: 0.861, cy: 0.531, rx: 0.123, ry: 0.149, ly: 0.62 }, // pink frosted peaks (Pufftop)
  5: { cx: 0.604, cy: 0.744, rx: 0.158, ry: 0.170, ly: 0.83 }, // jungle temples + waterfalls (Wildvine)
  6: { cx: 0.221, cy: 0.750, rx: 0.132, ry: 0.158, ly: 0.84 }, // giant flowers (Sproutlands)
  7: { cx: 0.335, cy: 0.490, rx: 0.128, ry: 0.165, ly: 0.57, patch: 'w7-map-island', box: [0.19, 0.29, 0.29, 0.40] }, // gray floating island (Aetheria): its colour version #376 covers it once unlocked
  8: { cx: 0.528, cy: 0.452, rx: 0.084, ry: 0.112, ly: 0.575, patch: 'w8-map-island', own: true, box: [0.443, 0.335, 0.17, 0.235] }, // Starhaven #375: its own island over the open sea at the centre (the painting has none)
};
export function canTravel(data, w) { const b = mapButtons(data)[w - 1]; return !!(b && b.enabled); }

// Fly to world w: lands on its pad. Sequential unlocks, revisits allowed. Returns false when locked.
export function travelTo(data, w) {
  if (!canTravel(data, w)) return false;
  data.location = { ...data.location, world: w, area: 'pad', x: 0, y: 0 };
  return true;
}

// Rest bunks: full heal, free, no cooldown.
export function restAtBunks(data) { const before = data.hearts; data.hearts = maxHeartsOf(data); return data.hearts - before; }

// Locker: switch hero (level, XP, hearts, gold are shared).
export const HERO_IDS = ['rowan', 'milo', 'wren'];
export function switchHero(data, id) { if (!HERO_IDS.includes(id)) return false; data.hero = id; return true; }

// Medallion gallery: earned medallions grouped by world.
export function gallery(data) {
  return data.worlds.map((wd, i) => ({ w: i + 1, name: WORLDS[i + 1] ? WORLDS[i + 1].name : 'World ' + (i + 1), medallions: [...(wd.medallions || [])] })).filter((g) => g.medallions.length);
}
// [MEDAL BOARD] The whole collection, derived from the data (never a hard-coded count): every world's dungeons that award a
// `medallion`, in dungeon order (= the medals sheet frame, treasure.js medalIndex), each slot `got` when the current save's
// worlds[w].medallions holds its id (the same id the treasure room awards). Worlds 1-8 in order; a world with no medallion
// dungeons (Starhaven) keeps its heading with no slots. Read live from `data`, so it follows earning, revisits and save switches.
export const medalName = (id) => id.charAt(0).toUpperCase() + id.slice(1) + ' Medallion';
export function medallionCollection(data) {
  const worlds = [];
  for (let w = 1; w <= 8; w++) {
    const W = WORLDS[w] || {}, have = ((data.worlds && data.worlds[w - 1]) || {}).medallions || [];
    const slots = Object.values(W.dungeons || {}).map((dg, order) => (dg.medallion ? { id: dg.medallion, name: medalName(dg.medallion), dungeon: dg.name, world: w, frame: medalIndex(w, order), got: have.includes(dg.medallion) } : null)).filter(Boolean);
    worlds.push({ w, name: W.name || 'World ' + w, slots, got: slots.filter((x) => x.got).length });
  }
  const all = worlds.flatMap((x) => x.slots);
  return { worlds, slots: all, got: all.filter((x) => x.got).length, total: all.length };
}

export const SHIP_MUSIC = 'ship';
export const SHIP_NPCS = [{ id: 'nova', name: 'Smith Nova', tx: 15, ty: 7, look: ['#e8e8f0', '#c06a2a'], lines: ['Bring me all six relics,', 'and I will forge a blade of starlight!'] },
  { id: 'pilot', name: 'Pilot Juno', tx: 15, ty: 10, look: ['#3a2a1a', '#e0e0f0'], lines: ['Pick a world on the Earth Map,', 'and I will fly us there!'] }];
export const BOARD = { DOOR_DY: -2 }; // rocket door sits 2 tiles above the landing spot
export const SHIP_ROOM = { W: CONFIG.SHIP.W, H: CONFIG.SHIP.H };
