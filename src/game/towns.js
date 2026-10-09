// Towns: buildings with door tiles (door column stored per building), interiors with an exit rug, wandering NPCs with
// paged dialogue (below the HUD), heal spot, hint-NPC hook (map mark + relic row), area-transition autosave.
import { CONFIG } from '../config.js';
import { TileMap } from '../engine/tilemap.js';
import { TILE } from './overworld.js';
import { wallSpan, buildingFrame } from '../art/fallback/buildings.js';
import { spawn } from './entities.js';
import { DialogueBox } from '../engine/ui.js';
import { pressed, input } from '../engine/input.js';

const T = CONFIG.VIEW.TILE;

// Stamp the town into the overworld: building walls + door tiles; returns { origin, doors, heal }.
export function placeTown(ow, town) {
  const cells = ow.feat.town;
  const ox = Math.min(...cells.map((c) => c.cx)) * 8, oy = Math.min(...cells.map((c) => c.cy)) * 8;
  const m = ow.map;
  const doors = [];
  for (const b of town.buildings) {
    const [x0, x1, rows] = wallSpan(b, buildingFrame(ow.world && ow.world.id, town, b, true)); // [A4] walls = where the building art stands
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const wall = x >= x0 && x < x1 && y >= b.h - rows; m.set(ox + b.x + x, oy + b.y + y, wall ? TILE.WALL : TILE.TOWN, wall ? 1 : 0); }
    const d = { id: b.id, name: b.name, tx: ox + b.x + b.door, ty: oy + b.y + b.h - 1, b };
    m.set(d.tx, d.ty, TILE.TOWN, 0);
    doors.push(d);
  }
  const heal = town.heal ? { tx: ox + town.heal.x, ty: oy + town.heal.y, name: town.heal.name } : null;
  const yard = yardPieces(town).map((p) => ({ ...p, tx: ox + p.x, ty: oy + p.y, box: p.box && [ox + p.box[0], ox + p.box[1]] })).filter((p) => m.inside(p.tx, p.ty) && m.ground[m.idx(p.tx, p.ty)] === TILE.TOWN);
  for (const p of yard) if (p.solid) m.solid[m.idx(p.tx, p.ty)] = 1; // hedges, troughs, statues and trunks block, like their art
  return { origin: { tx: ox, ty: oy }, doors, heal, yard };
}

// [A4f] Yards (W1 SCALE & DENSITY, ALttP hedged yards): per building (data: yard 'hedge' | 'garden', guardians) a hedge
// row two tiles in front of the house with a 4-wide gate on the door path, short hedge sides, flower patches, a trough
// or vegetable rows inside, stone guardians flanking an important door; big trees at the town's corners. Tile coords
// relative to the town; frames index the user's w<n>-yard-garden / w<n>-big-trees sheets (prompt order).
export function yardPieces(town) {
  const out = [], add = (x, y, sheet, frame, solid, flip) => out.push({ x, y, sheet, frame, solid, flip, hedge: sheet === 'yard' && frame <= 3 });
  for (const b of town.buildings) {
    if (!b.yard) continue;
    const yb = b.y + b.h - 1, fy = yb + 3, dc = b.x + b.door, gate = (x) => x >= dc - 1 && x <= dc + 2;
    for (let x = b.x - 1; x <= b.x + b.w; x++) { // [V1.1 hedge gaps] one continuous border: └ and ┘ corner pieces join the sides, end caps only at the gate
      if (gate(x)) continue;
      if (x === b.x - 1) add(x, fy, 'yard', 2, true, 'v'); else if (x === b.x + b.w) add(x, fy, 'yard', 2, true, 'hv');
      else add(x, fy, 'yard', x === dc - 2 || x === dc + 3 ? 3 : 0, true);
    }
    for (let y = yb - 1; y < fy; y++) { add(b.x - 1, y, 'yard', 1, true); add(b.x + b.w, y, 'yard', 1, true); }
    // [R2-22] beds stand in the row under the house, one tile clear of the side hedges and off the front hedge: each is
    // fitted into a box (tile units) between the hedge and the door path — left a flower patch, right vegetables (garden)
    // or the trough (hedge). Guardian yards have no room left beside the statues, so they keep only the statues.
    const C = b.x + b.w / 2, bed = (x0, x1, frame, solid) => out.push({ x: Math.floor((x0 + x1) / 2), y: yb + 1, sheet: 'yard', frame, solid, hedge: false, box: [x0, x1] });
    if (b.guardians) { add(dc - 2, yb + 1, 'yard', 11, true); add(dc + 3, yb + 1, 'yard', 11, true); }
    else { const g = b.w > 6 ? 0.5 : 0; bed(b.x + 1, C - g, 10, false); bed(C + g, b.x + b.w - 1, b.yard === 'garden' ? 8 : 15, b.yard !== 'garden'); }
  }
  for (const [x, y] of town.bigTrees || []) { add(x, y + 1, 'trees', (x + y) % 2, true); /* [HOLLOW TREES] never the hollow frame 2 */ out.push({ x: x + 1, y: y + 1, sheet: null, frame: 0, solid: true }); } // trunk 2 tiles wide
  return out;
}

export function spawnNpcs(ents, town, origin, inside = null) {
  return town.npcs.filter((n) => (n.inside || null) === inside).map((n) => spawn(ents, {
    kind: 'npc', contact: false, x: (inside ? 0 : origin.tx) * T + n.x * T + 8, y: (inside ? 0 : origin.ty) * T + n.y * T + 12, w: 12, h: 12,
    home: null, npc: n, ai: { state: 'idle', t: 1 + (n.x % 3) },
  }));
}

// [V5] Background villagers (w<n>-villagers art): a few chatty townsfolk on the town lanes (or by the doors).
const VILLAGER_LINES = [['What a lovely day!'], ['Have you tried the fruit tarts?'], ['Watch out for mischief outside town!'], ['I love counting the stars at night.']];
// [R2-19] W1 extra townsfolk from the user's w1-npcs-b sheet (frame names) after the four villagers
const VILLAGERS_B = { 1: [['a-young-traveler-in', 'Traveler', 'I walked here from far away. What a pretty town!'], ['a-farm-girl-carrying', 'Farm Girl', 'Fresh carrots from my garden!'], ['a-hooded-old-man', 'Old Wanderer', 'Bushes hide coins and hearts. Give them a swing!']] };
export function spawnVillagers(ents, ow, n = 4) {
  const TI = ow.townInfo; if (!TI) return [];
  const W = ow.map.w, spots = [];
  if (ow.paint && ow.paint.lanes) for (const k of ow.paint.lanes) { const x = k % W, y = Math.floor(k / W); if (ow.map.ground[k] === TILE.TOWN && !ow.map.solid[k]) spots.push([x, y]); }
  if (!spots.length) for (const d of TI.doors) spots.push([d.tx + 1, d.ty + 2]);
  const out = [];
  for (let i = 0; i < n && spots.length; i++) {
    const [x, y] = spots[Math.floor(((i * 7919 + ow.world.id * 131) % 997) / 997 * spots.length)];
    if (out.some((e) => Math.abs(e.x - (x * T + 8)) < 40 && Math.abs(e.y - (y * T + 12)) < 40)) continue;
    out.push(spawn(ents, { kind: 'npc', contact: false, x: x * T + 8, y: y * T + 12, w: 12, h: 12, home: null,
      npc: { id: 'villager-' + i, name: 'Villager', villager: i, sheet: 'w' + ow.world.id + '-villagers', lines: VILLAGER_LINES[i % VILLAGER_LINES.length] }, ai: { state: 'idle', t: 1 + i } }));
  }
  (VILLAGERS_B[ow.world.id] || []).forEach(([frame, name, line], j) => {
    const [x, y] = spots[Math.floor((((n + j) * 7919 + ow.world.id * 131 + 57) % 997) / 997 * spots.length)];
    if (out.some((e) => Math.abs(e.x - (x * T + 8)) < 40 && Math.abs(e.y - (y * T + 12)) < 40)) return;
    out.push(spawn(ents, { kind: 'npc', contact: false, x: x * T + 8, y: y * T + 12, w: 12, h: 12, home: null,
      npc: { id: 'villager-b' + j, name, sheet: 'w' + ow.world.id + '-npcs-b', frame, lines: [line] }, ai: { state: 'idle', t: 2 + j } }));
  });
  return out;
}

// [R2-19] W1 castle folk in the courtyard (the user's w1-royals sheet + the princess from w1-npcs-b): two guards stand at
// the keep door, the king and queen by the topiaries, the advisor, the maid and the princess about. Offsets from the
// castle's centre column mx (tiles) and the palace foot row ky.
const CASTLE_FOLK = { 1: [
  ['w1-royals', 'a-castle-guard-with', 'Castle Guard', -3, 0, true, ['Thorns grew over the throne room!', 'Bring every medallion, then go in.']],
  ['w1-royals', 'a-second-castle-guard', 'Castle Guard', 2, 0, true, ['Halt! ...Oh, it is you, hero.', 'The king is waiting in the garden.']],
  ['w1-royals', 'a-kind-old-king', 'King Alder', -6, 2, false, ['Malachar took my throne!', 'Find the medallions and save Verdania.']],
  ['w1-royals', 'a-gentle-queen-in', 'Queen Fern', 5, 2, false, ['Be brave, little hero.', 'Every right answer makes you stronger!']],
  ['w1-royals', 'a-royal-advisor-with', 'Advisor Quill', -13, 5, false, ['Keys open locked doors.', 'Big keys open the boss door!']],
  ['w1-royals', 'a-castle-maid-with', 'Maid Posy', 12, 5, false, ['I keep the fountains sparkling clean!']],
  ['w1-npcs-b', 'a-princess-in-a', 'Princess Lily', 2, 5, false, ['I love the flowers in the castle garden.', 'Have you seen a frog by the moat?']],
] };
export function spawnCastleFolk(ents, ow) {
  const k = ow.feat && ow.feat.castleKit, list = CASTLE_FOLK[ow.world.id]; if (!k || !list) return [];
  return list.filter(([, , , dx, dy]) => !ow.map.solid[ow.map.idx(k.mx + dx, k.ky + dy)]).map(([sheet, frame, name, dx, dy, still, lines], i) => spawn(ents, {
    kind: 'npc', contact: false, x: (k.mx + dx) * T + 8, y: (k.ky + dy) * T + 12, w: 12, h: 12, home: null,
    npc: { id: 'castle-' + i, name, sheet, frame, lines }, ai: { state: 'idle', t: still ? 1e9 : 1 + i } }));
}

// [R3-12] once the world's boss is beaten, Pilot Juno waits outside the Wayfarer to say what comes next
export const PILOT_LINES = ['You beat the boss! Great job!', 'Now we fly to the next world.', 'Go inside the ship and tap the Earth Map!'];
export function spawnPilot(ents, ow, data) {
  if (!ow.rocket || !data.worlds[ow.world.id - 1] || !data.worlds[ow.world.id - 1].bossBeaten) return [];
  const m = ow.map; let at = null;
  for (const [dx, dy] of [[3, 1], [-3, 1], [3, 2], [-3, 2], [2, 3], [-2, 3], [4, 1], [-4, 1]]) { const x = ow.rocket.tx + dx, y = ow.rocket.ty + dy; if (m.inside(x, y) && !m.solid[m.idx(x, y)]) { at = [x, y]; break; } }
  if (!at) return [];
  return [spawn(ents, { kind: 'npc', contact: false, x: at[0] * T + 8, y: at[1] * T + 12, w: 12, h: 12, home: null,
    npc: { id: 'pilot', name: 'Pilot Juno', hint: true, pilot: true, look: ['#3a2a1a', '#e0e0f0'], lines: PILOT_LINES }, ai: { state: 'idle', t: 1e9 } })];
}

// Slow wander within 2 tiles of home.
export function updateNpc(e, map, dt) {
  if (!e.home) e.home = { x: e.x, y: e.y };
  const ai = e.ai;
  if ((ai.t -= dt) <= 0) {
    if (ai.state === 'idle') { ai.state = 'walk'; ai.t = 0.8; ai.dir = Math.floor(Math.random() * 4); } else { ai.state = 'idle'; ai.t = 1.5 + Math.random() * 2; }
  }
  if (ai.state === 'walk') {
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][ai.dir];
    const nx = e.x + dx * 20 * dt, ny = e.y + dy * 20 * dt;
    if (Math.hypot(nx - e.home.x, ny - e.home.y) < 2 * T && map.boxFree(nx - 6, ny - 8, nx + 6, ny)) { e.x = nx; e.y = ny; e.face = ['right', 'left', 'down', 'up'][ai.dir]; }
  }
}

// Dialogue scene: one DialogueBox per line, E / Enter / tap pages. onDone runs after the last line.
export function createDialogue(view, speaker, lines, onDone) {
  let i = 0;
  let box = new DialogueBox(view.w, speaker, lines[0]);
  const s = { name: 'dialogue', modal: true, get box() { return box; }, get line() { return i; } };
  s.update = () => {
    if (box.update({ pressed, pointer: input.pointer })) {
      if (++i >= lines.length) { onDone(); return; }
      box = new DialogueBox(view.w, speaker, lines[i]);
    }
  };
  s.render = (ctx) => box.draw(ctx);
  return s;
}

// Interior: a small room with walls, a floor and an exit rug at the bottom centre.
export function buildInterior(b) {
  const w = 14, h = 10;
  const map = new TileMap(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wall = x === 0 || x === w - 1 || y === 0 || y === 1 || y === h - 1;
    map.set(x, y, wall ? TILE.WALL : TILE.TOWN, wall ? 1 : 0);
  }
  const rug = { tx: w / 2 - 1, ty: h - 2 };
  map.set(rug.tx, rug.ty, TILE.PAD, 0);
  return { map, rug, start: { x: rug.tx * T + 8, y: (rug.ty - 1) * T + 12 } };
}

export function interiorPainter(b) {
  return (g, t, px, py) => {
    const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(px + x, py + y, w, h); };
    if (t === TILE.WALL) { f('#7a5a3a', 0, 0, 16, 16); f('#5a3a2a', 0, 12, 16, 4); }
    else if (t === TILE.PAD) { f('#b04040', 0, 0, 16, 16); f('#e0c060', 2, 2, 12, 12); f('#b04040', 4, 4, 8, 8); }
    else { f('#c8a878', 0, 0, 16, 16); f('rgba(0,0,0,0.08)', 0, 15, 16, 1); }
  };
}
