// Dungeon engine (D26): hand-authored room graphs, multi-floor, keys → big key → big chest, locked doors that BLOCK
// with a message + nudge (never freeze), wave rooms, math-sealed doors, treasure room, stairs/pits, per-dungeon save.
import { CONFIG } from '../config.js';
import { TREASURE_SOLIDS } from './treasure.js';
import { TileMap } from '../engine/tilemap.js';

export const RW = CONFIG.DUNGEON.ROOM_TILES_W;
export const RH = CONFIG.DUNGEON.ROOM_TILES_H;
const TOP = 4; // top wall is thick so the HUD never covers the floor
export const DT = { FLOOR: 0, WALL: 1, DOOR: 2, STAIRS: 3, PIT: 4, PORTAL: 5, CHEST: 6, WATER: 7, PORTAL_OFF: 8, MEDAL: 9 };
// Door gap (2 tiles) for each side, for a room of w×h tiles (the doorway is centred on its wall).
export function doorTiles(side, w = RW, h = RH) {
  const cx = w >> 1, cy = h >> 1;
  if (side === 'n') return [[cx - 1, 0], [cx, 0], [cx - 1, 1], [cx, 1], [cx - 1, 2], [cx, 2], [cx - 1, 3], [cx, 3]];
  if (side === 's') return [[cx - 1, h - 1], [cx, h - 1], [cx - 1, h - 2], [cx, h - 2]];
  if (side === 'w') return [[0, cy - 1], [0, cy], [1, cy - 1], [1, cy]];
  return [[w - 1, cy - 1], [w - 1, cy], [w - 2, cy - 1], [w - 2, cy]];
}
export const DOOR_TILES = { n: doorTiles('n'), s: doorTiles('s'), w: doorTiles('w'), e: doorTiles('e') };
export const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
const dims = (room) => [(room && room.w) || RW, (room && room.h) || RH];
// Where the hero stands after entering through a side.
export function entryPoint(side, room = null) {
  const T = 16, [w, h] = dims(room), cx = w >> 1, cy = h >> 1;
  if (side === 'n') return { x: cx * T, y: (TOP + 1) * T + 12 };
  if (side === 's') return { x: cx * T, y: (h - 3) * T + 12 };
  if (side === 'w') return { x: 2 * T + 10, y: cy * T + 12 };
  return { x: (w - 3) * T + 6, y: cy * T + 12 };
}

// [R1-5/22] Normal rooms are compact (≈ one screen): the authored 40×30 positions are remapped once per dungeon into a
// COMPACT_W×COMPACT_H room. Boss/sub-boss/treasure/relic rooms, and puzzles whose geometry matters, stay full size; so
// does any room whose remapped objects would land on top of each other.
// [W2 QA fix] not 'bounceGap': compacting moves W2's soda band (rows 9-11) onto the side doors' row, sealing gc-wind's
// west/east doors (Giggle Caverns could not be finished); the gap room keeps its authored 40×30 geometry
const SAFE_PUZZLES = new Set(['pushBlock', 'switchOrder', 'valveOrder', 'vineOrder', 'torchOrder', 'leverPairs', 'gearTiming', 'plateHold', 'ventFreeze', 'seedPlant', 'toolGates', 'crateSort']);
function remapper(w, h) {
  const X = (x) => 2 + Math.round(((x - 2) * (w - 4)) / (RW - 4)), Y = (y) => TOP + Math.round(((y - TOP) * (h - TOP - 2)) / (RH - TOP - 2));
  return { X, Y };
}
function compactRoom(room) {
  const big = room.boss || room.arena || ['sub', 'boss', 'treasure', 'relic', 'vault'].includes(room.type) || (room.puzzle && !SAFE_PUZZLES.has(room.puzzle.kind));
  if (big) return { ...room, w: RW, h: RH, X: (x) => x, Y: (y) => y };
  const w = CONFIG.DUNGEON.COMPACT_W, h = CONFIG.DUNGEON.COMPACT_H, { X, Y } = remapper(w, h), r = { ...room, w, h, X, Y, compact: true };
  if (room.foes) r.foes = room.foes.map(([id, x, y]) => [id, X(x), Y(y)]); // [DUNGEON-LIFE]
  if (room.objects) r.objects = room.objects.map((o) => ({ ...o, x: X(o.x), y: Y(o.y), ...(Array.isArray(o.to) ? { to: [X(o.to[0]), Y(o.to[1])] } : {}) }));
  if (room.stairs) r.stairs = { ...room.stairs, x: Math.min(w - 4, X(room.stairs.x)), y: Y(room.stairs.y) };
  if (room.pit) r.pit = { ...room.pit, x: Math.min(w - 5, X(room.pit.x)), y: Math.min(h - 5, Y(room.pit.y)) };
  if (room.water) r.water = room.water.map(([x, y, ww, hh]) => [X(x), Y(y), X(x + ww - 1) - X(x) + 1, Y(y + hh - 1) - Y(y) + 1]);
  const spots = (r.objects || []).filter((o) => o.type !== 'lily').map((o) => o.x + ',' + o.y);
  if (r.stairs) spots.push(r.stairs.x + ',' + r.stairs.y, (r.stairs.x + 1) + ',' + r.stairs.y);
  if (new Set(spots).size !== spots.length) return { ...room, w: RW, h: RH, X: (x) => x, Y: (y) => y }; // would overlap: keep it big
  return r;
}
const COMPACT = new WeakMap();
export function compactDungeon(dg) {
  if (!dg || !dg.rooms || dg.rush || dg.survival) return dg; // rush / survival arenas keep their full rooms
  if (!COMPACT.has(dg)) COMPACT.set(dg, { ...dg, rooms: Object.fromEntries(Object.entries(dg.rooms).map(([id, r]) => [id, compactRoom(r)])) });
  return COMPACT.get(dg);
}
// The chest / medallion pedestal and the exit portal sit on the room's centre line.
export function roomSpots(room) {
  const [w] = dims(room), Y = (room && room.Y) || ((y) => y);
  return { chest: [w >> 1, Y(12)], portal: [w >> 1, Y(16)] };
}

// Persistent per-dungeon state lives in data.worlds[w].rooms[dungeonId].
export function dungeonState(data, dg) {
  const w = data.worlds[dg.world - 1];
  if (!w.rooms[dg.id]) w.rooms[dg.id] = { keys: 0, bigKey: false, visited: [], opened: [], cleared: [], chests: [], puzzles: {}, subBoss: false, medallion: false, done: false };
  return w.rooms[dg.id];
}

export const doorId = (roomId, side) => roomId + ':' + side;

// A door is open when it has no lock, or its lock was opened (either side's id).
export function doorOpen(dg, st, roomId, side) {
  const d = dg.rooms[roomId].doors[side];
  if (!d) return false;
  if (!d.lock) return true;
  if (d.lock === 'puzzle') return !!(st.puzzles[roomId] || st.puzzles[d.to]);
  if (d.lock === 'boss') return !!st.subBoss;
  return st.opened.includes(doorId(roomId, side)) || st.opened.includes(doorId(d.to, OPP[side]));
}

// Try to pass a closed door: consumes a small key / needs the big key; math locks are opened by a question.
export function tryUnlock(dg, st, roomId, side) {
  const d = dg.rooms[roomId].doors[side];
  if (d.lock === 'small' && st.keys > 0) { st.keys--; st.opened.push(doorId(roomId, side)); return 'opened'; }
  if (d.lock === 'big' && st.bigKey) { st.opened.push(doorId(roomId, side)); return 'opened'; }
  if (d.lock === 'math') return 'math';
  if (d.lock === 'puzzle') return 'puzzle';
  if (d.lock === 'boss') return 'boss';
  return d.lock === 'big' ? 'needBig' : 'locked';
}

export function openDoor(st, roomId, side) { const id = doorId(roomId, side); if (!st.opened.includes(id)) st.opened.push(id); }

// Build a room map: thick walls, doorways (open ones passable), stairs/pits/portal/chest tiles from room data.
// [MONSTERS FIRST] (user, 2026-10-08, every world) a room's treasure chest appears only once that room's monsters are beaten:
// hand-placed foes (room.foes) or its waves. Once beaten (st.cleared) it stays; the foes still come back on later visits.
export function chestWaits(room, st, roomId) { return !!((room.foes && room.foes.length) || room.waves) && !st.cleared.includes(roomId) && !st.chests.includes(roomId); }
export function buildRoom(dg, st, roomId, sealed = false) {
  const room = dg.rooms[roomId];
  const [W, H] = dims(room), S = roomSpots(room);
  const m = new TileMap(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wall = y < TOP || y >= H - 2 || x < 2 || x >= W - 2;
    m.set(x, y, wall ? DT.WALL : DT.FLOOR, wall ? 1 : 0);
  }
  for (const side of ['n', 's', 'w', 'e']) {
    if (!room.doors[side]) continue;
    const open = !sealed && doorOpen(dg, st, roomId, side);
    for (const [x, y] of doorTiles(side, W, H)) m.set(x, y, DT.DOOR, open ? 0 : 1);
  }
  // the entrance room's south gap leads back outside (you can always leave a dungeon)
  if (roomId === dg.start && !room.doors.s) for (const [x, y] of doorTiles('s', W, H)) m.set(x, y, DT.DOOR, sealed ? 1 : 0);
  if (room.stairs && (!room.stairs.needs || st.puzzles[roomId])) for (const [dx, dy] of [[0, 0], [1, 0]]) m.set(room.stairs.x + dx, room.stairs.y + dy, DT.STAIRS, 0);
  for (const w of room.water || []) for (let y = w[1]; y < w[1] + w[3]; y++) for (let x = w[0]; x < w[0] + w[2]; x++) m.set(x, y, DT.WATER, 1);
  if (room.pit) for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) m.set(room.pit.x + x, room.pit.y + y, DT.PIT, 0);
  // [D43] exit portal: dark until the medallion (treasure room) / the boss treasure (main-boss arena) is taken, then it stays lit
  const pedestal = room.type === 'treasure' || room.type === 'relic'; // a relic sits on the same pedestal as a medallion
  const lit = pedestal ? !!st.done : !!(dg.throne && st.chests.includes(roomId));
  if (pedestal || (dg.throne && (!dg.vault || roomId === dg.vault))) m.set(S.portal[0], S.portal[1], lit ? DT.PORTAL : DT.PORTAL_OFF, 0); // [R3-15] a keep with a vault: the portal is in the vault
  if (pedestal && !st.done) m.set(S.chest[0], S.chest[1], DT.MEDAL, 1);
  // [A5] boss arenas as part of the fight: four 2x2 stone pillars in mirrored pairs to dodge behind (clear of doors and the boss's spot)
  if (room.arena === 'pillars') for (const [px, py] of [[8, 7], [30, 7], [8, 21], [30, 21]]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) m.set(px + dx, py + dy, DT.WALL, 1);
  if (room.type === 'treasure' || room.type === 'vault') for (const [x, y] of TREASURE_SOLIDS) m.set(x, y, DT.FLOOR, 1);
  if (room.type === 'vault') for (const dx of [-1, 1]) m.set(S.chest[0] + dx, S.chest[1], DT.FLOOR, 1); // the royal chest is 3 tiles wide // [D53] statues + torch stands are solid
  if ((room.chest || (dg.throne && !dg.vault && st.subBoss)) && !st.chests.includes(roomId) && !chestWaits(room, st, roomId)) m.set(S.chest[0], S.chest[1], DT.CHEST, 1);
  return m;
}

// Which door side (if any) the hero is standing in, at the outer edge (leaving the room).
export function leavingSide(tx, ty, room = null) {
  const [w, h] = dims(room), cx = w >> 1, cy = h >> 1;
  if (ty <= 2 && (tx === cx - 1 || tx === cx)) return 'n';
  if (ty >= h - 1 && (tx === cx - 1 || tx === cx)) return 's';
  if (tx <= 0 && (ty === cy - 1 || ty === cy)) return 'w';
  if (tx >= w - 1 && (ty === cy - 1 || ty === cy)) return 'e';
  return null;
}

// Closed door the hero is pushing against: the side whose doorway tile is directly ahead.
export function doorAhead(room, tx, ty, facing) {
  const ahead = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing];
  const nx = tx + ahead[0], ny = ty + ahead[1];
  const [w, h] = dims(room);
  for (const side of ['n', 's', 'w', 'e']) if (room.doors[side] && doorTiles(side, w, h).some(([x, y]) => x === nx && y === ny)) return side;
  return null;
}

// Test dungeon: two floors, key → locked door → wave room → math door → big key → big-locked treasure; stairs + pit.
export const TEST_DUNGEON = {
  id: 'test-dungeon', name: 'Test Hollow', world: 1, floors: ['B1', '1F'], start: 'entry',
  rooms: {
    entry: { floor: '1F', gx: 1, gy: 2, type: 'entrance', doors: { n: { to: 'keyroom' }, e: { to: 'wave', lock: 'small' } } },
    keyroom: { floor: '1F', gx: 1, gy: 1, type: 'key', chest: { item: 'key' }, doors: { s: { to: 'entry' } } },
    wave: { floor: '1F', gx: 2, gy: 2, type: 'wave', waves: [[['melee', 3]], [['hopper', 2]]], doors: { w: { to: 'entry', lock: 'small' }, n: { to: 'mathroom', lock: 'math' } } },
    mathroom: { floor: '1F', gx: 2, gy: 1, type: 'puzzle', stairs: { x: 30, y: 10, to: 'bigkey' }, doors: { s: { to: 'wave', lock: 'math' }, e: { to: 'boss', lock: 'big' } } },
    bigkey: { floor: 'B1', gx: 2, gy: 1, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 10, to: 'mathroom' }, doors: {} },
    boss: { floor: '1F', gx: 3, gy: 1, type: 'treasure', pit: { x: 6, y: 20, to: 'bigkey' }, doors: { w: { to: 'mathroom', lock: 'big' } } },
  },
};
