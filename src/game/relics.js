// Relic questline (SPEC 2.8, D09, D28): one 5-room mini-dungeon per world 1–6 behind a gate that needs a LATER world's tool.
// Rooms: tool-gated entry (the overworld gate) → 2 puzzle rooms built on the gate tool's verbs (+ one other earned tool) → a wave
// room → the relic pedestal (lights the exit portal). Gates check verbs, never the hero [D05].

// The object each tool opens, and when that object counts as open (the puzzle is solved when all are open).
export const TOOL_OBJECT = { bombBag: 'crackedWall', fireBloom: 'bramble', vineHook: 'hookPoint', iceBloom: 'water', shrinkCap: 'pinHole', powerGlove: 'heavyBoulder' };
export const IS_OPEN = { crackedWall: (o) => !!o.open, bramble: (o) => !!o.burnt, hookPoint: (o) => !!o.hooked, water: (o) => !!o.frozen, pinHole: (o) => !!o.open, heavyBoulder: (o) => !!o.lifted };

// spec = { id, name, relic, relicName, tools: [gateTool, otherTool] } (world data: W.relicDungeon)
export function buildRelicDungeon(W) {
  const s = W.relicDungeon, [t1, t2] = s.tools, o1 = TOOL_OBJECT[t1], o2 = TOOL_OBJECT[t2];
  const row = (type, xs, y) => xs.map((x) => ({ type, x, y }));
  const dg = {
    id: s.id, name: s.name, world: W.id, relic: s.relic, relicName: s.relicName, medallion: null, floors: ['1F'], start: 'rl-entry',
    theme: s.theme || { floor: '#4a3a5a', floor2: '#463656', wall: '#1e1428', wallTop: '#c080ff' },
    rooms: {
      'rl-entry': { floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'rl-gate1' } } },
      // the gate tool three times over
      'rl-gate1': { floor: '1F', gx: 1, gy: 0, type: 'puzzle', puzzle: { kind: 'toolGates', types: [o1] }, objects: row(o1, [12, 20, 28], 10), doors: { w: { to: 'rl-entry' }, e: { to: 'rl-gate2', lock: 'puzzle' } } },
      // the gate tool + the second tool
      'rl-gate2': { floor: '1F', gx: 2, gy: 0, type: 'puzzle', puzzle: { kind: 'toolGates', types: [o1, o2] }, objects: [...row(o1, [14], 10), ...row(o2, [20, 26], 10)], doors: { w: { to: 'rl-gate1', lock: 'puzzle' }, e: { to: 'rl-wave', lock: 'puzzle' } } },
      'rl-wave': { floor: '1F', gx: 3, gy: 0, type: 'wave', waves: [[['melee', 3]], [['ranged', 2], ['flyer', 1]]], doors: { w: { to: 'rl-gate2', lock: 'puzzle' }, e: { to: 'rl-relic' } } },
      'rl-relic': { floor: '1F', gx: 4, gy: 0, type: 'relic', doors: { w: { to: 'rl-wave' } } },
    },
  };
  for (const [id, f] of Object.entries(s.foes || {})) if (dg.rooms[id]) dg.rooms[id].foes = f; // [DUNGEON-LIFE] a world may place roaming foes
  return dg;
}
export const toolGatesSolved = (sys, types) => types.every((t) => sys.byType(t).every((o) => (IS_OPEN[t] ? IS_OPEN[t](o) : true)));

// Take the relic from its pedestal. Returns true the first time.
export function takeRelic(data, dg) {
  const wd = data.worlds[dg.world - 1];
  wd.relicFound = true;
  if (data.relics.includes(dg.relic)) return false;
  data.relics.push(dg.relic);
  return true;
}
