// World 5 — The Wildvine Jungle (maze-canopy). Map = the hand-designed sketch from docs/WORLDS.md (D22) + placements.
// S43: overworld, Drumroot Village, enemies. S44: dungeons + sub-bosses. Baron Rukus (S45) lands next.
export const W5 = {
  id: 5, name: 'Wildvine Jungle', band: 4,
  lush: true, // [W5 Phase 1] the W1-standard lush pass: organic shores, paving, yards, big trees, secret scenes, temple landmark, set pieces
  sketch: [
    '########################',
    '#.#.#..#...##..#..#..3.#',
    '#.#.*.##.#oo#.##.##.##.#',
    '#...#....#..#....#.....#',
    '###.#.####.##.####.###.#',
    '#1..#......HH......#.*.#',
    '#.###.####.##.###.*#.#.#',
    '#.....#..~~~~~~..#.....#',
    '#.###.#.~~~====~.#.###.#',
    '#.#.*.#.~~~~~~~~.#...#.#',
    '#.#.#.#..vvvvvv..#.#...#',
    '#...#.###.:TT:.###.#.#.#',
    '####..#...:TT:...#.#.#.#',
    '#R....#.o.:::....#..2#.#',
    '#.###.#.===..===.#.###.#',
    '#.*.#...===SS===...*...#',
    '#...#####..B...#####...#',
    '########################',
  ],
  // Liquid A = the Laughing River (blocks walking, ICE freezes), liquid B = quicksand mud (walkable, slows ×0.6).
  liquids: { a: { name: 'river', behaviour: 'block' }, b: { name: 'quicksand', behaviour: 'slow', slow: 0.4 } },
  palette: { ground: '#4a8a3a', ground2: '#447f35', flower: '#f0d020', path: '#a07a4a', tree: '#1a4a1a', treeTop: '#2a6a2a', cliff: '#6a5a3a', cliffTop: '#8a7a50', upper: '#5a9a4a', liqA: '#3a7ab0', liqB: '#8a6a3a', shore: '#c0a870', town: '#9a7a4a', pad: '#a0a0b0' },
  // Relic (The Frozen Falls): the waterfall is the door — freeze it with ICE (Ice Bloom, W3) [D09]. Secrets use D27 mechanics.
  // Relic mini-dungeon (SPEC 2.8, D09): 5 rooms around its gate tool + one other (src/game/relics.js builds the rooms).
  relicDungeon: { id: 'frozen-falls', name: 'The Frozen Falls', relic: 'vine-heart', relicName: 'Vine Heart', tools: ['iceBloom', 'vineHook'],
    foes: { 'rl-entry': [['vineviper', 14, 14], ['canopybat', 28, 12]], 'rl-gate1': [['coconutlobber', 10, 20], ['thornmole', 32, 22]], 'rl-gate2': [['armordillo', 20, 20]] } },
  gates: {
    relic: { gate: 'water', tool: 'iceBloom' },
    secrets: [
      { cell: [4, 9], gate: 'heavyBoulder', reward: 'ape-idol-potion-cache', seed: true },
      { cell: [2, 15], gate: 'crackedRock', reward: 'temple-gold-vault', seed: true },
      { cell: [19, 15], gate: 'bramble', reward: 'banana-hole-cave', seed: true },
      { cell: [18, 6], gate: 'crackedRock', reward: 'gold-nook-1' }, // [S55] D39 top-up
      { cell: [4, 2], gate: 'bramble', reward: 'potion-nook-2' }, // [S55] D39 top-up
      { cell: [21, 5], gate: 'heavyBoulder', reward: 'gold-nook-3' }, // [S55] D39 top-up
    ],
  },
  // Drumroot Village inside the 2×2 T cells (16×16 tiles): stilt huts on two terraces around the drum circle.
  town: {
    name: 'Drumroot Village',
    buildings: [
      { id: 'shop', name: 'Bwana\'s Trading Hut', x: 1, y: 1, w: 5, h: 4, door: 2, roof: '#c08a3a' },
      { id: 'drum-hall', name: 'Elder Drum\'s Hall', x: 9, y: 1, w: 6, h: 4, door: 3, roof: '#8a4a2a' },
      { id: 'kiki-hut', name: 'Scout Hut', x: 1, y: 9, w: 5, h: 4, door: 2, roof: '#6a9a3a' },
      { id: 'tumba-hut', name: 'Tumba\'s Stilt Hut', x: 10, y: 9, w: 5, h: 4, door: 2, roof: '#d0a040' },
    ],
    heal: { x: 7, y: 7, name: 'Moonwell Spring' },
    npcs: [
      { id: 'scout-kiki', name: 'Scout Kiki', x: 4, y: 7, look: ['#3a2a1a', '#6a9a3a'], hint: true, lines: ['Frozen Falls? The waterfall\'s the door, but water won\'t hold still.', 'Freeze it solid — Chroma Bay\'s got the frost for that.'] },
      { id: 'elder-drum', name: 'Elder Drum', x: 11, y: 7, look: ['#e0e0e0', '#8a4a2a'], quest: 'w5-drum-messages', lines: ['The river laughed once. Make it laugh again.'] },
      { id: 'bwana', name: 'Bwana', inside: 'shop', shop: true, x: 7, y: 3, look: ['#2a1a0a', '#f0c040'], lines: ['Jungle rule: never trust a quiet banana.'] },
      { id: 'tumba', name: 'Tumba', x: 8, y: 14, look: ['#1a0a0a', '#f06030'], quest: 'w5-banana-delivery', lines: ['I can carry a banana across the quicksand. Probably.'] },
    ],
  },
  // Enemies (SPEC 2.7 W5): one attack pattern each. xp per kill (tuned by the audit, G09).
  enemies: [
    { id: 'vineviper', name: 'Vineviper', archetype: 'melee', pattern: [{ type: 'lunge' }], look: { shape: 'fish', body: '#3a8a2a', accent: '#f0e040' }, xp: 3 },
    { id: 'coconutlobber', name: 'Coconutlobber', archetype: 'ranged', pattern: [{ type: 'bounceShot' }, { type: 'bounceShot' }], look: { shape: 'bush', body: '#6a9a3a', accent: '#8a5a2a' }, xp: 4 },
    { id: 'armordillo', name: 'Armordillo', archetype: 'shielded', pattern: [{ type: 'shellHide', t: 0.7 }, { type: 'spin' }], look: { shape: 'knight', body: '#9a7a5a', accent: '#c04030' }, xp: 5 },
    { id: 'canopybat', name: 'Canopybat', archetype: 'flyer', pattern: [{ type: 'snare' }, { type: 'dive' }], look: { shape: 'bird', body: '#4a3a5a', accent: '#6ac04a' }, xp: 4 },
    { id: 'thornmole', name: 'Thornmole', archetype: 'burrower', pattern: [{ type: 'burrow' }, { type: 'fanShot', n: 6, spread: 6.0 }], look: { shape: 'mole', body: '#6a4a2a', accent: '#c0e040' }, xp: 4 },
  ],
  bosses: {
    // Main boss (SPEC 2.7 W5, D13: 4 patterns — phase 2 counts as one). Phase 2 drums on the music's beat clock.
    rukus: { id: 'rukus', name: 'Baron Rukus, the Drum Tyrant', kind: 'main', sting: 'rukus', size: [44, 40], look: { body: '#6a4a2a', accent: '#f0c020', crown: true },
      patterns: [
        { name: 'ground-pound rings', prims: [{ type: 'slamRing', r: 80 }, { type: 'slamRing', r: 130 }] },
        { name: 'barrel barrage', prims: [{ type: 'lob', r: 16 }, { type: 'rollBounce', t: 1.6, speed: 120 }, { type: 'lob', r: 22 }] },
        { name: 'vine-swing slam', prims: [{ type: 'dive' }, { type: 'slamRing', r: 70 }] },
      ],
      phase2: [{ name: 'drum frenzy', prims: [{ type: 'beatWait' }, { type: 'slamRing', r: 90 }, { type: 'beatWait' }, { type: 'slamRing', r: 90 }, { type: 'slamRing', r: 140 }] }] },
    // Sub-bosses (SPEC 2.7 W5): 3 patterns each.
    'queen-zingzar': { id: 'queen-zingzar', name: 'Queen Zingzar', kind: 'sub', sting: 'rukus', size: [30, 26], look: { body: '#f0c020', accent: '#2a1a0a' }, summons: 'canopybat',
      patterns: [
        { name: 'sting dive', prims: [{ type: 'dive' }, { type: 'charge', speed: 200 }] },
        { name: 'swarm call', prims: [{ type: 'summon', n: 3 }] },
        { name: 'honey trap', prims: [{ type: 'snare' }, { type: 'slowPuddle' }] },
      ] },
    'colonel-klump': { id: 'colonel-klump', name: 'Colonel Klump', kind: 'sub', sting: 'rukus', size: [34, 28], look: { body: '#4a7a3a', accent: '#c0a060' },
      patterns: [
        { name: 'belly flop', prims: [{ type: 'hop' }, { type: 'slamRing', r: 110 }] },
        { name: 'barrel roll', prims: [{ type: 'rollBounce', t: 2.0, speed: 130 }] },
        { name: 'tail sweep', prims: [{ type: 'sweep' }] },
      ] },
    'tiki-takka': { id: 'tiki-takka', name: 'Tiki Takka', kind: 'sub', sting: 'rukus', size: [26, 34], look: { body: '#a0602a', accent: '#f06020' }, summons: 'vineviper',
      patterns: [
        { name: 'fire breath', prims: [{ type: 'fanShot', n: 5, spread: 0.9 }] },
        { name: 'totem slam', prims: [{ type: 'inkRain', n: 5 }] },
        { name: 'viper call', prims: [{ type: 'summon', n: 2 }] },
      ] },
  },
  // Main-boss keep (Rukus's Drum Dam in the south grove, docs/WORLDS.md), opens when all three medallions are owned
  // [W1 keep pattern, R3-15]: the Spillway Hall (doors slam, five waves) → the drum chamber (Baron Rukus; drops nothing) →
  // the Dam Vault, where the Vine Hook waits in the royal chest (w5-royal-vault #370).
  throne: { id: 'drum-dam', name: 'The Drum Dam', world: 5, floors: ['1F'], start: 'dd-hall', throne: true, vault: 'dd-vault',
    theme: { floor: '#7a5a3a', floor2: '#745436', wall: '#3a2a1a', wallTop: '#f0c020' },
    rooms: {
      'dd-hall': { floor: '1F', gx: 0, gy: 2, type: 'wave', waves: [[['vineviper', 3]], [['coconutlobber', 2], ['vineviper', 1]], [['canopybat', 2], ['thornmole', 2]], [['armordillo', 2], ['coconutlobber', 2]], [['armordillo', 2], ['canopybat', 2], ['vineviper', 1]]], doors: { n: { to: 'throne' } } },
      throne: { floor: '1F', gx: 0, gy: 1, type: 'sub', boss: 'rukus', doors: { s: { to: 'dd-hall' }, n: { to: 'dd-vault', lock: 'boss', royal: true } } },
      'dd-vault': { floor: '1F', gx: 0, gy: 0, type: 'vault', chest: { item: 'tool:vineHook', royal: true }, doors: { s: { to: 'throne', lock: 'boss', royal: true } } },
    } },
  // Dungeons (docs/WORLDS.md World 5). [MONSTERS FIRST] every room has hand-placed foes (or waves); a room's chest appears once they are beaten. Rooms are 40×30 tiles; objects/stairs use room tile coords; gx/gy place the mini-map.
  dungeons: {
    'canopy-ruins': {
      id: 'canopy-ruins', name: 'Canopy Ruins', world: 5, medallion: 'vine', floors: ['1F', '2F', '3F'], start: 'cr-entry',
      theme: { floor: '#6a8a4a', floor2: '#648446', wall: '#3a4a2a', wallTop: '#a0c060' },
      rooms: {
        'cr-entry': { foes: [['vineviper', 12, 12], ['canopybat', 28, 10]], floor: '1F', gx: 0, gy: 2, type: 'entrance', doors: { e: { to: 'cr-vine' } } },
        // signature: hit the vine switches in the order the lanterns flicker to swing the bridge across (sword, fist, roller or any shot)
        'cr-vine': { foes: [['canopybat', 10, 22], ['vineviper', 30, 22]], floor: '1F', gx: 1, gy: 2, type: 'puzzle', puzzle: { kind: 'vineOrder', order: [2, 3, 1] },
          objects: [{ type: 'vineSwitch', x: 12, y: 12, n: 1 }, { type: 'vineSwitch', x: 20, y: 12, n: 2 }, { type: 'vineSwitch', x: 28, y: 12, n: 3 },
            { type: 'lantern', x: 12, y: 9, n: 3, k: 2, of: 3 }, { type: 'lantern', x: 20, y: 9, n: 1, k: 0, of: 3 }, { type: 'lantern', x: 28, y: 9, n: 2, k: 1, of: 3 }],
          doors: { w: { to: 'cr-entry' }, e: { to: 'cr-k1', lock: 'puzzle' } } },
        'cr-k1': { foes: [['vineviper', 10, 10], ['coconutlobber', 30, 20], ['thornmole', 12, 22]], floor: '1F', gx: 2, gy: 2, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'cr-bridge' }, doors: { w: { to: 'cr-vine', lock: 'puzzle' } } },
        'cr-bridge': { foes: [['armordillo', 12, 18], ['canopybat', 28, 12], ['vineviper', 26, 22]], floor: '2F', gx: 2, gy: 1, type: 'normal', stairs: { x: 30, y: 6, to: 'cr-k1' }, doors: { w: { to: 'cr-bc', lock: 'big' }, e: { to: 'cr-trap', lock: 'small' } } },
        'cr-bc': { foes: [['coconutlobber', 10, 18], ['canopybat', 30, 20]], floor: '2F', gx: 1, gy: 1, type: 'bigchest', chest: { item: 'gear:boots-5' }, doors: { e: { to: 'cr-bridge', lock: 'big' } } },
        // trap room "Hive Hollow": the honeycomb walls close and Canopybats swarm
        'cr-trap': { floor: '2F', gx: 3, gy: 1, type: 'wave', waves: [[['flyer', 3]], [['flyer', 2], ['ranged', 1]]], stairs: { x: 30, y: 6, to: 'cr-bk' }, doors: { w: { to: 'cr-bridge', lock: 'small' } } },
        'cr-bk': { foes: [['thornmole', 14, 16], ['coconutlobber', 10, 8], ['armordillo', 30, 22]], floor: '3F', gx: 3, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'cr-trap' }, doors: { e: { to: 'cr-sub', lock: 'math' } } },
        'cr-sub': { floor: '3F', gx: 4, gy: 0, type: 'sub', boss: 'queen-zingzar', doors: { w: { to: 'cr-bk', lock: 'math' }, e: { to: 'cr-medal', lock: 'boss' } } },
        'cr-medal': { floor: '3F', gx: 5, gy: 0, type: 'treasure', doors: { w: { to: 'cr-sub', lock: 'boss' } } },
      },
    },
    'rumble-falls': {
      id: 'rumble-falls', name: 'Rumble Falls', world: 5, medallion: 'drum', floors: ['B1', '1F', '2F'], start: 'rf-entry',
      theme: { floor: '#5a7a8a', floor2: '#547484', wall: '#2a3a4a', wallTop: '#80c0e0' },
      rooms: {
        'rf-entry': { foes: [['vineviper', 12, 12], ['coconutlobber', 28, 10]], floor: '1F', gx: 0, gy: 1, type: 'entrance', doors: { e: { to: 'rf-pool' } } },
        // signature: drum the valves (left raises, right lowers) until the pool reaches the gauge's star — the crates float up to the ledge stairs
        'rf-pool': { foes: [['canopybat', 8, 24], ['vineviper', 32, 24]], floor: '1F', gx: 1, gy: 1, type: 'puzzle', puzzle: { kind: 'waterLevel', start: 0, max: 3, target: 2 },
          objects: [{ type: 'drumValve', x: 14, y: 12, dir: 1 }, { type: 'drumValve', x: 26, y: 12, dir: -1 }, { type: 'poolGauge', x: 20, y: 8 },
            { type: 'floatCrate', x: 17, y: 18 }, { type: 'floatCrate', x: 20, y: 18 }, { type: 'floatCrate', x: 23, y: 18 }],
          stairs: { x: 30, y: 6, to: 'rf-k2', needs: 'puzzle' }, doors: { w: { to: 'rf-entry' }, e: { to: 'rf-trap', lock: 'small' } } },
        'rf-k2': { foes: [['armordillo', 10, 10], ['thornmole', 30, 20], ['canopybat', 12, 22]], floor: 'B1', gx: 1, gy: 2, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'rf-pool' }, doors: { w: { to: 'rf-bc', lock: 'big' } } },
        'rf-bc': { foes: [['coconutlobber', 10, 18], ['vineviper', 30, 20]], floor: 'B1', gx: 0, gy: 2, type: 'bigchest', chest: { item: 'gold:350' }, doors: { e: { to: 'rf-k2', lock: 'big' } } },
        // trap room "Rapids Run": the current floor drags you while Coconutlobbers shell from above
        'rf-trap': { floor: '1F', gx: 2, gy: 1, type: 'wave', waves: [[['ranged', 2], ['melee', 1]], [['ranged', 3]]],
          objects: [8, 12, 16, 24, 28, 32].map((x) => ({ type: 'conveyor', x, y: 22, dir: 'left' })), stairs: { x: 30, y: 6, to: 'rf-bk' }, doors: { w: { to: 'rf-pool', lock: 'small' } } },
        'rf-bk': { foes: [['thornmole', 14, 16], ['canopybat', 10, 8], ['armordillo', 30, 22]], floor: '2F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'rf-trap' }, doors: { e: { to: 'rf-sub', lock: 'math' } } },
        'rf-sub': { floor: '2F', gx: 3, gy: 0, type: 'sub', boss: 'colonel-klump', doors: { w: { to: 'rf-bk', lock: 'math' }, e: { to: 'rf-medal', lock: 'boss' } } },
        'rf-medal': { floor: '2F', gx: 4, gy: 0, type: 'treasure', doors: { w: { to: 'rf-sub', lock: 'boss' } } },
      },
    },
    brambleworks: {
      id: 'brambleworks', name: 'The Brambleworks', world: 5, medallion: 'fang', floors: ['1F', 'B1'], start: 'bw-entry',
      theme: { floor: '#6a5a4a', floor2: '#645446', wall: '#3a2a1a', wallTop: '#c08040' },
      rooms: {
        'bw-entry': { foes: [['armordillo', 12, 12], ['vineviper', 28, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'bw-gear' } } },
        // signature: set all three gears spinning inside one window (longer on Little Hero) while the conveyors reverse every 3 s
        'bw-gear': { foes: [['thornmole', 8, 24], ['vineviper', 32, 24]], floor: '1F', gx: 1, gy: 0, type: 'puzzle', puzzle: { kind: 'gearTiming', flip: 3 },
          objects: [{ type: 'gearSwitch', x: 14, y: 12 }, { type: 'gearSwitch', x: 26, y: 12 }, { type: 'gearSwitch', x: 20, y: 18 },
            ...[16, 17, 18, 22, 23, 24].map((x) => ({ type: 'conveyor', x, y: 15, dir: 'left' }))],
          stairs: { x: 30, y: 6, to: 'bw-bk', needs: 'puzzle' }, doors: { w: { to: 'bw-entry' }, e: { to: 'bw-k1', lock: 'puzzle' } } },
        'bw-k1': { foes: [['vineviper', 10, 10], ['coconutlobber', 30, 20], ['armordillo', 12, 22]], floor: '1F', gx: 2, gy: 0, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'bw-gear', lock: 'puzzle' }, e: { to: 'bw-bc', lock: 'big' } } },
        'bw-bc': { foes: [['thornmole', 10, 18], ['canopybat', 30, 20]], floor: '1F', gx: 3, gy: 0, type: 'bigchest', chest: { item: 'gold:400' }, doors: { w: { to: 'bw-k1', lock: 'big' } } },
        'bw-bk': { foes: [['armordillo', 14, 16], ['coconutlobber', 10, 8], ['vineviper', 30, 22]], floor: 'B1', gx: 1, gy: 1, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'bw-gear' }, doors: { e: { to: 'bw-trap', lock: 'small' } } },
        // trap room "Thresher": Armordillos and Vinevipers charge in
        'bw-trap': { floor: 'B1', gx: 2, gy: 1, type: 'wave', waves: [[['shielded', 1], ['melee', 2]], [['melee', 2], ['burrower', 1]]], doors: { w: { to: 'bw-bk', lock: 'small' }, e: { to: 'bw-sub', lock: 'math' } } },
        'bw-sub': { floor: 'B1', gx: 3, gy: 1, type: 'sub', boss: 'tiki-takka', doors: { w: { to: 'bw-trap', lock: 'math' }, e: { to: 'bw-medal', lock: 'boss' } } },
        'bw-medal': { floor: 'B1', gx: 4, gy: 1, type: 'treasure', doors: { w: { to: 'bw-sub', lock: 'boss' } } },
      },
    },
  },
  music: { overworld: 'w5_overworld', town: 'w5_town', area2: 'w5_area2', dungeon: 'w5_dungeon' },
  // Regions in cell coords (first match wins): the village, the canopy, the root maze, the river heart, the east trees, the grove.
  regions: [
    { name: 'Drumroot Village', x0: 11, y0: 11, x1: 12, y1: 12, spawns: [], music: 'town' },
    { name: 'Canopy Walkways', x0: 1, y0: 1, x1: 22, y1: 4, spawns: ['canopybat', 'coconutlobber'], music: 'area2' },
    { name: 'Root Maze', x0: 1, y0: 5, x1: 5, y1: 16, spawns: ['vineviper', 'thornmole'] },
    { name: 'Laughing River', x0: 6, y0: 5, x1: 16, y1: 10, spawns: ['coconutlobber', 'vineviper'] },
    { name: 'East Canopy', x0: 17, y0: 5, x1: 22, y1: 16, spawns: ['armordillo', 'canopybat'], music: 'area2' },
    { name: 'Sunbanana Grove', x0: 6, y0: 11, x1: 16, y1: 16, spawns: ['thornmole', 'armordillo', 'vineviper'] },
  ],
};
