// World 1 — Verdania, the Meadow Wilds. Map = the hand-designed macro sketch from docs/WORLDS.md (D22) + placements.
export const W1 = {
  id: 1, name: 'Verdania', band: 0,
  sketch: [
    '##########^^^^##########',
    '#..B.....^oooo^....1..##',
    '#........^oooo^.......##',
    '#^^^^^H^^^^::^^^^H^^^^^#',
    '#....v:....::....:v....#',
    '#..*..:....::....:.~~~.#',
    '#R....:...TTTT...:~~~~.#',
    '#.....:...TTTT...:~==~.#',
    '#:::::::::TTTT:::::==2.#',
    '#.........TTTT....~==~.#',
    '#..o......TTTT.....~~..#',
    '#......*...::......*...#',
    '#vvvv......::.......o..#',
    '#..........::..........#',
    '#....~~....::.....*....#',
    '#.*..~~....SS..........#',
    '#......*...............#',
    '########################',
  ],
  // Liquid A = spring water (blocks walking, ICE freezes), liquid B = marsh (blocks like water [R1-3]; boardwalks cross it).
  liquids: { a: { name: 'spring water', behaviour: 'block' }, b: { name: 'marsh', behaviour: 'block' } },
  // [A4] the castle's moat feeds a river: out of its east end, east under a bridge, into Spring Marsh lake (tile coords)
  river: [[112.5, 32.5], [113, 36], [118, 37.5], [125, 36], [136, 38.5], [148, 44], [154, 47]],
  castle: { mx: 96, frontY: 32 }, // [A8a] kit-built castle (game/castle.js): centre column + the front wall's foot row; moat below it
  lush: true, // [A4] W1 DESIGN RULES builder: bridges, one road per twin column, the signature castle on the 'oo' cells (other worlds in their own lush pass)
  palette: { ground: '#58a848', ground2: '#4e9a40', flower: '#f0e070', path: '#c8a870', tree: '#2a6a2a', treeTop: '#3a8a3a', cliff: '#7a6a50', cliffTop: '#9a8a68', upper: '#68b858', liqA: '#3a8ad8', liqB: '#6a7a40', shore: '#d8c890', town: '#b8a888', pad: '#a0a0b0' },
  // Gated cells: the entrance/secret is walled in; only the gate tile (an interactable) opens it.
  // Relic mini-dungeon (SPEC 2.8, D09): 5 rooms around its gate tool + one other (src/game/relics.js builds the rooms).
  relicDungeon: { id: 'hollow-mound', name: 'The Hollow Mound', relic: 'sun-shard', relicName: 'Sun Shard', tools: ['bombBag', 'fireBloom'],
    foes: { 'rl-entry': [['mud-blob', 14, 14], ['moss-bat', 28, 12]], 'rl-gate1': [['root-rat', 10, 20], ['peeper-bud', 32, 22]], 'rl-gate2': [['moss-bat', 20, 20]] } }, // [DUNGEON-LIFE] roaming foes per room
  gates: {
    relic: { gate: 'crackedWall', tool: 'bombBag' },
    secrets: [
      { cell: [3, 5], gate: 'crackedWall', reward: 'fairy-cave' },
      { cell: [7, 11], gate: 'heavyBoulder', reward: 'gold-cellar' },
      { cell: [18, 14], gate: 'bramble', reward: 'bestiary-shrine', seed: true },
      { cell: [7, 16], gate: 'crackedRock', reward: 'potion-cave', seed: true, dy: -3 }, // [R1-11] up into the open meadow: a grass approach, not the canopy
      { cell: [19, 11], gate: 'pinHole', reward: 'tea-party', seed: true },
      { cell: [2, 15], gate: 'bramble', reward: 'gold-nook-1' }, // [S55] D39 top-up
    ],
  },
  // [D52] W1 maze mini-game (game/maze.js): a wooden fence maze east of the landing pad (sketch cells 14-17 x 13-14, all '.').
  // '#' fence, '.' lane (2 tiles wide), 'S' start gap, 'F' finish gap into the prize pen (reachable only through the maze),
  // 'h' hay pile, ' ' meadow left as it is. The keeper stands west of the start and times you.
  maze: {
    cx: 14, cy: 13, time: 50, pedestal: [26, 5], keeper: { name: 'Old Hollis', x: -2, y: 6, lines: ['Hah! Fancy a run through my fence maze?', 'Reach the prize before the clock runs out. Go!'] },
    rows: [
      '#########################   ',
      '#...........#...........#   ',
      '#...........#...........#   ',
      '#..#######..####..####..####',
      '#.....#..#.....#.....#..F..#',
      '#.....#..#.....#.....#..F..#',
      '####..#..####..####..#..####',
      'S..#..#........#.....#..#   ',
      'S..#..#........#.....#..#   ',
      '#..#..#..#######..####..#   ',
      '#.....#..#........#.....#   ',
      '#.....#..#........#.....#   ',
      '#######..##########..#..#   ',
      '#h...................#..#   ',
      '#....................#..#   ',
      '#########################   ',
    ],
  },
  // Town (Sunnyvale) laid out inside the T cells; tile offsets are relative to the town's top-left tile.
  town: {
    name: 'Sunnyvale',
    // [A4f] Sunnyvale spans 4×5 sketch cells (32×40 tiles, ~2×3 screens): two avenues cross at the plaza (x 15–17, y 18–20);
    // every building at the same whole-number 2x (user review: one pixel size per town; importance = art + bigger plot)
    buildings: [
      { id: 'shop', name: 'Pippa\'s Shop', x: 5, y: 6, w: 6, h: 7, door: 3, scale: 2, yard: null, roof: '#4a7a3a' },
      { id: 'elder', name: 'Elder\'s Cottage', x: 20, y: 3, w: 9, h: 10, door: 4, scale: 2, yard: 'hedge', guardians: true, roof: '#5a8a4a' },
      { id: 'cottage-a', name: 'Moss Cottage', x: 5, y: 26, w: 6, h: 7, door: 3, scale: 2, yard: 'garden', roof: '#6a9a3a' },
      { id: 'inn', name: 'Glen Inn', x: 20, y: 24, w: 9, h: 10, door: 4, scale: 2, yard: 'hedge', roof: '#3a6a4a' },
    ],
    heal: { x: 12, y: 15, name: 'Fairy Spring' },
    bigTrees: [[1, 1], [29, 0], [1, 37], [29, 37]], // [A4f] big round trees (w1-big-trees) framing the town's corners
    npcs: [
      { id: 'mossbeard', name: 'Elder Mossbeard', x: 26, y: 14, look: ['#e0e0e0', '#5a7a3a'], hint: true, quest: 'w1-stone-circle', lines: ['The Heartwood hid a Sun Shard under the Hollow Mound, far to the west.', 'Its door is cracked stone. Something that goes BOOM might open it one day.'] },
      { id: 'pippa', name: 'Pippa', inside: 'shop', shop: true, x: 7, y: 3, look: ['#f0a060', '#c04060'], lines: ['Mind the moles — they tickle before they tackle!'] },
      { id: 'tavin', name: 'Tavin', x: 11, y: 22, look: ['#6a4a2a', '#3a5a8a'], lines: ['The Deep smells of rain. Follow the fireflies.'] },
      { id: 'wrenley', name: 'Wrenley', x: 13, y: 23, look: ['#f0c040', '#e05050'], quest: 'w1-lost-lamb', lines: ['I saw the Thorn King pick his nose. With a VINE.'] },
    ],
  },
  // Enemies (SPEC 2.7 W1): each has exactly one attack pattern built from primitives. xp per kill (tuned by the audit, G09).
  enemies: [
    { id: 'sproutling', name: 'Sproutling', archetype: 'hopper', pattern: [{ type: 'hop' }, { type: 'hop' }, { type: 'lunge' }], look: { shape: 'bug', body: '#8ac040', accent: '#8a5a2a' }, xp: 3 },
    { id: 'thornspitter', name: 'Thornspitter', archetype: 'turret', pattern: [{ type: 'fanShot', n: 3, spread: 0.6 }], look: { shape: 'bush', body: '#3a7a2a', accent: '#f080a0' }, xp: 4 },
    { id: 'barkbeetle', name: 'Barkbeetle', archetype: 'shielded', pattern: [{ type: 'charge', speed: 150 }], look: { shape: 'knight', body: '#7a5a3a', accent: '#a07a4a' }, xp: 5 },
    { id: 'dewdrop-wisp', name: 'Dewdrop Wisp', archetype: 'flyer', pattern: [{ type: 'slowPuddle' }], look: { shape: 'bird', body: '#80c8f0', accent: '#e0f8ff' }, xp: 4 },
    { id: 'burrow-mole', name: 'Burrow Mole', archetype: 'burrower', pattern: [{ type: 'burrow' }], look: { shape: 'mole', body: '#7a5a3a', accent: '#f0f0f0' }, xp: 4 },
  ],
  // [DUNGEON-LIFE] Dungeon creatures (art #325 w1-dungeon-enemies, 4 frames each; code looks until then). Gentle for W1:
  // one pattern each from the existing primitives, slow wind-ups (archetype tells), W1 damage.
  dungeonEnemies: [
    { id: 'moss-bat', name: 'Moss Bat', archetype: 'flyer', pattern: [{ type: 'dive' }], look: { shape: 'bird', body: '#5a7a3a', accent: '#c0e080' }, xp: 2 },
    { id: 'root-rat', name: 'Root Rat', archetype: 'hopper', pattern: [{ type: 'hop' }, { type: 'lunge' }], look: { shape: 'bug', body: '#8a6a4a', accent: '#e0b090' }, xp: 2 },
    { id: 'mud-blob', name: 'Mud Blob', archetype: 'melee', pattern: [{ type: 'lunge' }], look: { shape: 'blob', body: '#7a5a3a', accent: '#f0e0a0' }, xp: 2 },
    { id: 'shellback', name: 'Shellback', archetype: 'shielded', pattern: [{ type: 'charge', speed: 120 }], look: { shape: 'knight', body: '#4a7a5a', accent: '#c0a060' }, xp: 3 },
    { id: 'peeper-bud', name: 'Peeper Bud', archetype: 'turret', pattern: [{ type: 'fanShot', n: 2, spread: 0.4 }], look: { shape: 'bush', body: '#5a8a3a', accent: '#f0f0f0' }, xp: 2 },
  ],
  // Sub-bosses (SPEC 2.7 W1): patterns are compositions of pattern primitives (bosses.js).
  bosses: {
    malachar: { id: 'malachar', name: 'Malachar, the Thorn King', kind: 'main', sting: 'malachar', size: [96, 90], artScale: 4, // [A5] big boss: your w1-boss art at a whole-number 4x (≈1/3 of the arena); hitbox ≈ his body
      look: { body: '#3a5a2a', accent: '#8a2a4a', crown: true }, summons: 'thornspitter',
      patterns: [
        { name: 'thorn-lash sweep', prims: [{ type: 'sweep', len: 70 }] },
        { name: 'root snare', prims: [{ type: 'snare' }] },
        { name: 'briar minion call', prims: [{ type: 'summon', n: 2 }] },
      ],
      phase2: [{ name: 'vine storm', prims: [{ type: 'vineStorm' }] }] },
    briarback: { id: 'briarback', name: 'Briarback', kind: 'sub', sting: 'malachar', size: [84, 64], artScale: 4, look: { body: '#6a4a2a', accent: '#3a8a2a' },
      patterns: [{ name: 'bristle charge', prims: [{ type: 'charge', speed: 170 }] }, { name: 'thorn spray', prims: [{ type: 'fanShot', n: 5, spread: 1.4 }] }] },
    mossmother: { id: 'mossmother', name: 'Mossmother', kind: 'sub', sting: 'malachar', size: [84, 72], artScale: 4, look: { body: '#4a7a4a', accent: '#c0e080' },
      patterns: [{ name: 'spore zones', prims: [{ type: 'lob', r: 18 }, { type: 'lob', r: 18 }] }, { name: 'fist slam', prims: [{ type: 'slamRing', r: 90 }] }],
      phase2: [{ name: 'sproutling call', prims: [{ type: 'summon', n: 2 }] }], summons: 'sproutling' },
  },
  // Dungeons (docs/WORLDS.md World 1). Rooms are 40×30 tiles; objects/stairs use room tile coords; gx/gy place the mini-map.
  // Main-boss keep (the Bramble Throne), opens when both medallions are owned [R3-15]: the Thorn Hall (doors slam, five
  // waves) → the throne room (Malachar) → the royal vault, where the Power Glove waits in the royal chest (the boss drops nothing).
  throne: { id: 'bramble-throne', name: 'The Bramble Throne', world: 1, floors: ['1F'], start: 'bt-hall', throne: true, vault: 'bt-vault',
    theme: { floor: '#3a4a2a', floor2: '#35442a', wall: '#2a1a2a', wallTop: '#4a2a3a' },
    rooms: {
      'bt-hall': { floor: '1F', gx: 0, gy: 2, type: 'wave', waves: [[['mud-blob', 3]], [['root-rat', 3]], [['moss-bat', 2], ['sproutling', 2]], [['shellback', 2], ['root-rat', 2]], [['peeper-bud', 2], ['mud-blob', 2], ['moss-bat', 1]]], doors: { n: { to: 'throne' } } },
      throne: { floor: '1F', gx: 0, gy: 1, type: 'sub', boss: 'malachar', arena: 'pillars', doors: { s: { to: 'bt-hall' }, n: { to: 'bt-vault', lock: 'boss', royal: true } } },
      'bt-vault': { floor: '1F', gx: 0, gy: 0, type: 'vault', chest: { item: 'tool:powerGlove', royal: true }, doors: { s: { to: 'throne', lock: 'boss', royal: true } } },
    } },
  dungeons: {
    'thornwood-deep': {
      id: 'thornwood-deep', name: 'Thornwood Deep', world: 1, medallion: 'leaf', floors: ['B1', '1F'], start: 'td-entry',
      theme: { floor: '#4a5a3a', floor2: '#44533a', wall: '#3a2a1a', wallTop: '#5a4a2a' },
      rooms: {
        'td-entry': { foes: [['mud-blob', 12, 12], ['moss-bat', 28, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'td-k1' } } },
        'td-k1': { foes: [['root-rat', 10, 10], ['mud-blob', 30, 18], ['sproutling', 12, 22]], floor: '1F', gx: 1, gy: 0, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'td-entry' }, e: { to: 'td-push', lock: 'small' } } },
        'td-push': { foes: [['moss-bat', 34, 22]], floor: '1F', gx: 2, gy: 0, type: 'puzzle', puzzle: { kind: 'pushBlock' }, stairs: { x: 30, y: 6, to: 'td-trap', needs: 'puzzle' },
          objects: [{ type: 'block', x: 14, y: 16 }, { type: 'block', x: 26, y: 16 }, { type: 'plate', x: 14, y: 9, weight: 'block' }, { type: 'plate', x: 26, y: 9, weight: 'block' }, { type: 'resetSwitch', x: 20, y: 24 }],
          doors: { w: { to: 'td-k1', lock: 'small' } } },
        'td-trap': { floor: 'B1', gx: 0, gy: 1, type: 'wave', waves: [[['hopper', 3]], [['turret', 2]]], chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'td-push' }, doors: { e: { to: 'td-bk' } } },
        'td-bk': { foes: [['shellback', 12, 18], ['peeper-bud', 32, 8], ['root-rat', 26, 20]], floor: 'B1', gx: 1, gy: 1, type: 'bigkey', chest: { item: 'bigKey' }, doors: { w: { to: 'td-trap' }, e: { to: 'td-bc', lock: 'big' } } },
        'td-bc': { foes: [['mud-blob', 10, 18], ['moss-bat', 30, 20]], floor: 'B1', gx: 2, gy: 1, type: 'bigchest', chest: { item: 'gear:boots-1' }, stairs: { x: 30, y: 6, to: 'td-hall' }, doors: { w: { to: 'td-bk', lock: 'big' } } },
        'td-hall': { foes: [['shellback', 14, 14], ['root-rat', 26, 18], ['peeper-bud', 8, 8], ['moss-bat', 30, 12]], floor: '1F', gx: 2, gy: 1, type: 'normal', stairs: { x: 30, y: 6, to: 'td-bc' }, doors: { w: { to: 'td-sub', lock: 'math' } } },
        'td-sub': { floor: '1F', gx: 1, gy: 1, type: 'sub', boss: 'briarback', arena: 'pillars', doors: { e: { to: 'td-hall', lock: 'math' }, w: { to: 'td-medal', lock: 'boss' } } },
        'td-medal': { floor: '1F', gx: 0, gy: 1, type: 'treasure', doors: { e: { to: 'td-sub', lock: 'boss' } } },
      },
    },
    'sunken-grove': {
      id: 'sunken-grove', name: 'Sunken Grove', world: 1, medallion: 'stone', floors: ['1F', '2F'], start: 'sg-entry',
      theme: { floor: '#4a6a6a', floor2: '#446262', wall: '#2a3a4a', wallTop: '#4a5a6a' },
      rooms: {
        'sg-entry': { foes: [['mud-blob', 12, 14], ['moss-bat', 28, 12]], floor: '1F', gx: 0, gy: 1, type: 'entrance', doors: { n: { to: 'sg-lily' } } },
        'sg-lily': { foes: [['peeper-bud', 8, 10], ['moss-bat', 30, 10]], floor: '1F', gx: 0, gy: 0, type: 'key', chest: { item: 'key' }, water: [[2, 17, 36, 8]],
          objects: [...[17, 18, 19, 20, 21, 22, 23, 24].flatMap((y) => [{ type: 'lily', x: 19, y }, { type: 'lily', x: 20, y }])],
          doors: { s: { to: 'sg-entry' }, e: { to: 'sg-switch', lock: 'small' } } },
        'sg-switch': { foes: [['moss-bat', 20, 22]], floor: '1F', gx: 1, gy: 0, type: 'puzzle', puzzle: { kind: 'switchOrder', order: [2, 1, 3] }, stairs: { x: 30, y: 6, to: 'sg-frog', needs: 'puzzle' },
          objects: [{ type: 'orderSwitch', x: 10, y: 12, n: 1 }, { type: 'orderSwitch', x: 20, y: 9, n: 2 }, { type: 'orderSwitch', x: 30, y: 16, n: 3 }],
          doors: { w: { to: 'sg-lily', lock: 'small' } } },
        'sg-frog': { floor: '2F', gx: 1, gy: 0, type: 'wave', waves: [[['flyer', 2]], [['hopper', 2]]], stairs: { x: 30, y: 6, to: 'sg-switch' }, doors: { e: { to: 'sg-bk' } } },
        'sg-bk': { foes: [['shellback', 14, 16], ['root-rat', 26, 12], ['peeper-bud', 32, 22]], floor: '2F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 8, y: 6, to: 'sg-hall' }, doors: { w: { to: 'sg-frog' } } },
        'sg-hall': { foes: [['mud-blob', 12, 18], ['root-rat', 28, 14], ['moss-bat', 20, 10]], floor: '1F', gx: 2, gy: 1, type: 'normal', stairs: { x: 8, y: 6, to: 'sg-bk' }, doors: { e: { to: 'sg-bc', lock: 'big' }, w: { to: 'sg-sub', lock: 'math' } } },
        'sg-bc': { foes: [['peeper-bud', 10, 10], ['shellback', 28, 18]], floor: '1F', gx: 3, gy: 1, type: 'bigchest', chest: { item: 'gold:150' }, doors: { w: { to: 'sg-hall', lock: 'big' } } },
        'sg-sub': { floor: '1F', gx: 1, gy: 1, type: 'sub', boss: 'mossmother', arena: 'pillars', doors: { e: { to: 'sg-hall', lock: 'math' }, s: { to: 'sg-medal', lock: 'boss' } } },
        'sg-medal': { floor: '1F', gx: 1, gy: 2, type: 'treasure', doors: { n: { to: 'sg-sub', lock: 'boss' } } },
      },
    },
  },
  music: { overworld: 'w1_overworld', town: 'w1_town', area2: 'w1_area2', dungeon: 'w1_dungeon' },
  regions: [
    { name: 'Verdania Castle', x0: 10, y0: 0, x1: 13, y1: 3, spawns: [] }, // [CASTLE-ROOF] the courtyard reads the castle's own name (first match wins)
    { name: 'Heartwood Plateau', x0: 1, y0: 1, x1: 22, y1: 2, spawns: ['barkbeetle', 'dewdrop-wisp'], music: 'area2' },
    { name: 'Sunnyvale', x0: 10, y0: 6, x1: 13, y1: 10, spawns: [], music: 'town' },
    { name: 'Spring Marsh', x0: 17, y0: 5, x1: 22, y1: 10, spawns: ['dewdrop-wisp', 'sproutling'] },
    { name: 'Old Stone Meadow', x0: 1, y0: 4, x1: 9, y1: 16, spawns: ['sproutling', 'burrow-mole'] },
    { name: 'Firefly Hollow', x0: 14, y0: 11, x1: 22, y1: 16, spawns: ['thornspitter', 'sproutling', 'burrow-mole'] },
  ],
};
