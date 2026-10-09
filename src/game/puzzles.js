// Puzzle kit (G20): primitives composed per dungeon on top of the mechanics library. Every puzzle has a reset so it
// can never become unsolvable. Solved state latches into the dungeon save (st.puzzles[roomId]).
import { CONFIG } from '../config.js';
import { TYPES } from './interactables.js';
import { toolGatesSolved } from './relics.js';

// Ordered switches: hit them in `order`; a wrong hit resets the sequence (switches flash).
TYPES.orderSwitch = { solid: () => true, react: { hit: (o, sys) => sys.orderHit(o) } };
// Reset lever: puts every puzzle block back where it started.
TYPES.resetSwitch = { solid: () => true, react: { hit: (o, sys) => { sys.resetPuzzle(); return true; } } };
TYPES.lily = { solid: () => false, react: {} };
// W2 Soda Depot: valves (hit to turn) — order = rising fizz pitch; same rules as ordered switches.
TYPES.valve = { solid: () => true, react: { hit: (o, sys) => sys.orderHit(o) } };
// W2 Giggle Caverns: springy mushroom pad (walk on → bounce to `to`), goal switch on the far side.
TYPES.bouncePad = { solid: () => false, react: {} };
TYPES.goalSwitch = { solid: () => true, react: { hit: (o) => (o.on ? false : (o.on = true)) } };
// W3 Reefside Studio: floor paint tiles — hit to cycle colour 0→1→2; every row must match its colour bar (paintRows).
TYPES.paintTile = { solid: () => false, react: { hit: (o) => { o.c = ((o.c || 0) + 1) % 3; return true; } } };
TYPES.colorBar = { solid: () => true, react: {} };
// W3 Kelpscreen: sluice gates — hit to flip the current; the right open/shut pattern floats the raft to the centre (sluiceSet).
TYPES.sluice = { solid: () => true, react: { hit: (o) => { o.on = !o.on; return true; } } };
// W4 Caramel Caves: levers in pairs — pull one, then its partner before the caramel hardens (o.t s); a pair latches (leverPairs).
TYPES.lever = { solid: () => true, react: { hit: (o, sys) => { if (o.latched) return false; o.on = true; o.t = o.time || 5; sys.leverCheck && sys.leverCheck(); return true; } } };
// W4 Frosting Falls: ice sliders — hit one and it slides away from you until something stops it (slideBlock).
TYPES.slider = { solid: () => true, react: { hit: (o, sys) => (sys.slide ? sys.slide(o) : false) } };
TYPES.post = { solid: () => true, react: {} };
// W4 Gummy Depths: dream torches — light them (FIRE shots or a lit torch) in the order the lanterns flicker (torchOrder).
TYPES.dreamTorch = { solid: () => true, react: { burn: (o, sys) => sys.torchHit(o), light: (o, sys) => sys.torchHit(o) } };
TYPES.lantern = { solid: () => true, react: {} };
// W5 Canopy Ruins: vine switches — hit them (any swing or any shot) in the order the lanterns flicker (vineOrder).
TYPES.vineSwitch = { solid: () => true, react: { hit: (o, sys) => sys.orderHit(o) } };
// W5 Rumble Falls: drum valves raise (dir 1) or lower (dir -1) the pool one step; the crates float up to the ledge when the
// pool reaches the gauge's star (waterLevel).
TYPES.drumValve = { solid: () => true, react: { hit: (o, sys) => (sys.poolStep ? sys.poolStep(o.dir || 1) : false) } };
TYPES.poolGauge = { solid: () => true, react: {} };
TYPES.floatCrate = { solid: () => true, react: {} };
// W5 Brambleworks: gear switches spin for a short window (longer on Little Hero); all spinning at once latches the gear
// bridge (gearTiming). Conveyors in the room reverse every `flip` s.
TYPES.gearSwitch = { solid: () => true, react: { hit: (o, sys) => { if (o.latched) return false; o.on = true; o.t = (o.time || CONFIG.PUZZLE.GEAR_TIME) * (sys.tier === 'little' ? CONFIG.PUZZLE.TIMING_LITTLE_MULT : 1); sys.gearCheck && sys.gearCheck(); return true; } } };
// W6: seeds a Sproutling buddy can fetch (G27: plant on soil → vine bridge/ladder, S47)
TYPES.seed = { solid: () => false, react: {} };
// W6 Petal Burrow: scent marks (decor) lead to plates — hold them all down at once (the hero on one, a Sproutling on the other).
TYPES.scent = { solid: () => false, react: {} };
// W6 Compost Heap: soil spots — carry a seed there (walk over it, or send a Sproutling to fetch it) to grow a vine (seedPlant).
TYPES.soil = { solid: () => false, react: {} };
// W7 Emberfall Foundry: heat vents — solid blasts of heat until an ICE shot crusts them over (ventFreeze).
TYPES.vent = { solid: (o) => !o.frozen, react: { freeze: (o) => (o.frozen ? false : (o.frozen = true)) } };
const ORDERED = ['switchOrder', 'valveOrder', 'vineOrder'];
const BOUNCE_T = 0.5;

// Adds a room's objects + puzzle to a mechanics system. Returns { solved(): bool }.
export function setupRoomPuzzle(sys, room, st, roomId, hero = null) {
  const init = [];
  for (const o of room.objects || []) {
    const obj = sys.add(o.type, o.x, o.y, { ...o });
    if (o.type === 'block') init.push({ obj, x: o.x, y: o.y });
    if (o.type === 'slider') init.push({ obj, x: o.x, y: o.y });
    if (o.type === 'paintTile' || o.type === 'sluice') init.push({ obj, x: o.x, y: o.y, c: o.c || 0, on: !!o.on });
  }
  const p = room.puzzle;
  sys.progress = 0;
  // water level: the pool depth (0..max) shows on the gauge and lifts the crates
  const setPool = (v) => { sys.pool = v; for (const o of [...sys.byType('poolGauge'), ...sys.byType('floatCrate')]) { o.lvl = v; o.max = p.max; o.target = p.target; } };
  if (p && p.kind === 'waterLevel') setPool(st.puzzles[roomId] ? p.target : p.start || 0);
  sys.poolStep = (dir) => { if (!p || p.kind !== 'waterLevel' || st.puzzles[roomId]) return false; const v = Math.max(0, Math.min(p.max, sys.pool + dir)); if (v === sys.pool) return false; setPool(v); return true; };
  sys.orderHit = (o) => {
    if (!p || !ORDERED.includes(p.kind) || st.puzzles[roomId]) return false;
    if (o.n === p.order[sys.progress]) { o.on = true; sys.progress++; }
    else { sys.progress = 0; for (const s of [...sys.byType('orderSwitch'), ...sys.byType('valve'), ...sys.byType('vineSwitch')]) s.on = false; sys.failed = (sys.failed || 0) + 1; }
    return true;
  };
  sys.resetPuzzle = () => {
    for (const b of init) { if (b.obj.type === 'slider' && (b.obj.tx !== b.x || b.obj.ty !== b.y)) { sys.move(b.obj, b.x, b.y); continue; } if (b.obj.type === 'paintTile') { b.obj.c = b.c; continue; } if (b.obj.type === 'sluice') { b.obj.on = b.on; continue; } if (b.obj.tx !== b.x || b.obj.ty !== b.y) sys.move(b.obj, b.x, b.y); }
    sys.progress = 0;
    for (const s of [...sys.byType('orderSwitch'), ...sys.byType('valve'), ...sys.byType('vineSwitch'), ...sys.byType('goalSwitch'), ...sys.byType('dreamTorch')]) { s.on = false; s.lit = false; }
    for (const g of sys.byType('gearSwitch')) { g.on = false; g.latched = false; g.t = 0; }
    if (p && p.kind === 'waterLevel') setPool(p.start || 0);
    for (const l of sys.byType('lever')) { l.on = false; l.latched = false; l.t = 0; }
    sys.resets = (sys.resets || 0) + 1;
  };
  const solved = () => {
    if (!p) return true;
    if (st.puzzles[roomId]) return true;
    let ok = false;
    if (p.kind === 'pushBlock') ok = sys.byType('plate').every((pl) => sys.allAt(pl.tx, pl.ty).some((x) => x.type === 'block'));
    if (ORDERED.includes(p.kind)) ok = sys.progress >= p.order.length;
    if (p.kind === 'bounceGap') ok = sys.byType('goalSwitch').some((g) => g.on);
    if (p.kind === 'paintRows') ok = sys.byType('colorBar').every((bar) => sys.byType('paintTile').filter((t) => t.ty === bar.ty).every((t) => (t.c || 0) === bar.c));
    if (p.kind === 'sluiceSet') ok = sys.byType('sluice').every((g) => !!g.on === !!p.target[g.n - 1]);
    if (p.kind === 'leverPairs') ok = sys.byType('lever').every((l) => l.latched);
    if (p.kind === 'slideBlock') ok = sys.byType('plate').every((pl) => sys.allAt(pl.tx, pl.ty).some((x) => x.type === 'slider'));
    if (p.kind === 'torchOrder') ok = sys.progress >= p.order.length;
    if (p.kind === 'waterLevel') ok = sys.pool === p.target;
    if (p.kind === 'gearTiming') ok = sys.byType('gearSwitch').every((g) => g.latched);
    if (p.kind === 'plateHold') ok = sys.byType('plate').length > 0 && sys.byType('plate').every((pl) => pl.down);
    if (p.kind === 'seedPlant') ok = sys.byType('soil').every((o) => o.planted);
    if (p.kind === 'updraft') ok = sys.byType('fan').length > 0 && sys.byType('fan').every((f) => f.t > 0);
    if (p.kind === 'ventFreeze') ok = sys.byType('vent').every((o) => o.frozen);
    if (p.kind === 'mirrorBeam') ok = sys.byType('beamTarget').length > 0 && sys.byType('beamTarget').every((o) => o.lit);
    if (p.kind === 'toolGates') ok = toolGatesSolved(sys, p.types); // [S55] relic rooms: every tool gate open
    if (p.kind === 'crateSort') ok = sys.byType('plate').every((pl) => sys.allAt(pl.tx, pl.ty).some((x) => x.type === 'block' && x.c === pl.c));
    if (ok) st.puzzles[roomId] = true;
    return ok;
  };
  if (st.puzzles[roomId] && p && (p.kind === 'pushBlock' || p.kind === 'crateSort')) { // restore solved layout: blocks sit on their plates
    const plates = sys.byType('plate');
    const blocks = init.filter((b) => b.obj.type === 'block');
    blocks.forEach((b, i) => { const pl = p.kind === 'crateSort' ? plates.find((q) => q.c === b.obj.c) : plates[i]; if (pl) sys.move(b.obj, pl.tx, pl.ty); });
  }
  if (st.puzzles[roomId] && p && p.kind === 'paintRows') for (const t of sys.byType('paintTile')) { const bar = sys.byType('colorBar').find((q) => q.ty === t.ty); if (bar) t.c = bar.c; }
  if (st.puzzles[roomId] && p && p.kind === 'sluiceSet') for (const g of sys.byType('sluice')) g.on = !!p.target[g.n - 1];
  // Dream torches: lighting the right next one keeps it lit; a wrong one blows them all out (the lanterns show the order).
  sys.torchHit = (o) => {
    if (!p || p.kind !== 'torchOrder' || st.puzzles[roomId] || o.lit) return false;
    if (o.n === p.order[sys.progress]) { o.lit = true; sys.progress++; }
    else { sys.progress = 0; for (const t of sys.byType('dreamTorch')) t.lit = false; sys.failed = (sys.failed || 0) + 1; }
    return true;
  };
  // Levers latch in pairs while both are on; a lone lever springs back when its timer runs out.
  sys.leverCheck = () => { for (const l of sys.byType('lever')) { const q = sys.byType('lever').find((x) => x !== l && x.pair === l.pair); if (q && l.on && q.on) { l.latched = q.latched = true; } } };
  // Sliders glide away from the hero, tile by tile, until a wall, a post or another object stops them.
  sys.slide = (o) => {
    if (!hero) return false;
    const dx = Math.sign(o.tx * 16 + 8 - hero.x), dy = Math.sign(o.ty * 16 + 8 - (hero.y - 8));
    const [sx, sy] = Math.abs(o.tx * 16 + 8 - hero.x) > Math.abs(o.ty * 16 + 8 - (hero.y - 8)) ? [dx, 0] : [0, dy];
    let tx = o.tx, ty = o.ty;
    for (let k = 0; k < 40; k++) { const nx = tx + sx, ny = ty + sy; if (sys.map.isSolid(nx, ny) || sys.allAt(nx, ny).some((x) => TYPES[x.type] && TYPES[x.type].solid(x))) break; tx = nx; ty = ny; }
    if (tx === o.tx && ty === o.ty) return false;
    sys.move(o, tx, ty); return true;
  };
  if (sys.byType('lever').length) {
    const baseUpd = sys.update;
    sys.update = (dt) => { baseUpd(dt); for (const l of sys.byType('lever')) if (l.on && !l.latched && (l.t -= dt) <= 0) l.on = false; };
  }
  // Gear switches latch together when all spin at once; a lone gear winds down when its window runs out.
  sys.gearCheck = () => { const gs = sys.byType('gearSwitch'); if (gs.length && gs.every((g) => g.on)) for (const g of gs) g.latched = true; };
  if (sys.byType('gearSwitch').length || (p && p.flip)) {
    const baseUpd = sys.update; let flipT = 0;
    sys.update = (dt) => {
      baseUpd(dt);
      for (const g of sys.byType('gearSwitch')) if (g.on && !g.latched && (g.t -= dt) <= 0) g.on = false;
      if (p && p.flip && !st.puzzles[roomId] && (flipT += dt) >= p.flip) { flipT = 0; for (const c of sys.byType('conveyor')) c.dir = { up: 'down', down: 'up', left: 'right', right: 'left' }[c.dir]; }
    };
  }
  // Seeds: walking over one picks it up (hero.carry); standing on soil with a seed plants it — a vine sprouts.
  if (hero && sys.byType('soil').length) {
    const baseUpd2 = sys.update;
    sys.update = (dt) => {
      baseUpd2(dt);
      const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
      for (const sd of sys.byType('seed')) if (!sd.taken && sd.tx === tx && sd.ty === ty && !hero.carry) { sd.taken = true; hero.carry = 'seed'; }
      for (const so of sys.byType('soil')) if (!so.planted && hero.carry === 'seed' && Math.abs(so.tx - tx) <= 1 && Math.abs(so.ty - ty) <= 1) { so.planted = true; hero.carry = null; sys.planted = (sys.planted || 0) + 1; }
    };
  }
  if (st.puzzles[roomId] && p && p.kind === 'seedPlant') { for (const so of sys.byType('soil')) so.planted = true; for (const sd of sys.byType('seed')) sd.taken = true; }
  if (st.puzzles[roomId] && p && p.kind === 'ventFreeze') for (const o of sys.byType('vent')) o.frozen = true;
  if (st.puzzles[roomId] && p && p.kind === 'gearTiming') for (const g of sys.byType('gearSwitch')) { g.on = true; g.latched = true; }
  if (st.puzzles[roomId] && p && p.kind === 'leverPairs') for (const l of sys.byType('lever')) { l.on = true; l.latched = true; }
  if (st.puzzles[roomId] && p && p.kind === 'torchOrder') for (const t of sys.byType('dreamTorch')) t.lit = true;
  if (st.puzzles[roomId] && p && p.kind === 'slideBlock') { const plates = sys.byType('plate'); sys.byType('slider').forEach((s, i) => { if (plates[i]) sys.move(s, plates[i].tx, plates[i].ty); }); }
  // Bounce pads: stepping on one launches the hero in an arc to its `to` tile (over soda gaps); input-only, can't strand you
  // because every far side has a pad back.
  if (hero && sys.byType('bouncePad').length) {
    const baseUpdate = sys.update;
    sys.update = (dt) => {
      baseUpdate(dt);
      if (hero.bounce) {
        const b = hero.bounce; b.t += dt; const k = Math.min(1, b.t / BOUNCE_T);
        hero.x = b.x0 + (b.x1 - b.x0) * k; hero.y = b.y0 + (b.y1 - b.y0) * k; hero.z = Math.sin(k * Math.PI) * 24; hero.path = null;
        if (k >= 1) { hero.bounce = null; hero.z = 0; hero.padCool = 0.4; }
        return;
      }
      if (hero.padCool > 0) { hero.padCool -= dt; return; }
      const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
      const pad = sys.byType('bouncePad').find((o) => o.tx === tx && o.ty === ty);
      if (pad && pad.to) { hero.bounce = { t: 0, x0: hero.x, y0: hero.y, x1: pad.to[0] * 16 + 8, y1: pad.to[1] * 16 + 12 }; sys.bounces = (sys.bounces || 0) + 1; }
    };
  }
  return { solved };
}
