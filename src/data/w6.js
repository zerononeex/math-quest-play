// World 6 — The Sproutlands (giant-scale garden). Map = the hand-designed sketch from docs/WORLDS.md (D22) + placements.
// S46: overworld, Dewdrop Hollow, enemies, Sproutling nests (buddies: src/game/buddies.js). S47: dungeons + sub-bosses. S48: Gorg + the Shrink Cap.
export const W6 = {
  id: 6, name: 'The Sproutlands', band: 5,
  lush: true, // [W6 Phase 1] the W1-standard lush pass: organic shores, paving, yards, big trees, secret scenes, giant-flower landmark, set pieces
  sketch: [
    '########################',
    '#..oooo.......3.....oo.#',
    '#..oooo..*.......*..oo.#',
    '#....H.....~~~~~.......#',
    '#....:....~~~~~~~..=...#',
    '#.:::::::.~~~o~~~..==..#',
    '#.:....:..~~~~~~~...=..#',
    '#.:.1..:...~~~~~.......#',
    '#.:....::::::::::::....#',
    '#.:...............:.*..#',
    '#.::TT.....oo...*.:....#',
    '#...TT.....oo.....:.2..#',
    '#..vvvv...........:....#',
    '#R.......==...*...:....#',
    '#........===......:..o.#',
    '#..*.....==.......:....#',
    '#.....B..........SS....#',
    '########################',
  ],
  // Liquid A = dew puddles (deep lakes to a bug-size hero: block, ICE freezes), liquid B = tree sap (walkable, sticky ×0.5).
  liquids: { a: { name: 'dew', behaviour: 'block' }, b: { name: 'sap', behaviour: 'slow', slow: 0.5 } },
  palette: { ground: '#6ab04a', ground2: '#62a644', flower: '#f070a0', path: '#c8a060', tree: '#3a7a2a', treeTop: '#5aa03a', cliff: '#a0603a', cliffTop: '#d08050', upper: '#80c060', liqA: '#8ad0f0', liqB: '#d09030', shore: '#e0d8a0', town: '#b08a50', pad: '#a0a0b0' },
  // Relic (The Root Cellar): a pebble "boulder" plugs the cellar door — Power Glove lifts it [D09]. Secrets use D27 mechanics.
  // Relic mini-dungeon (SPEC 2.8, D09): 5 rooms around its gate tool + one other (src/game/relics.js builds the rooms).
  relicDungeon: { id: 'root-cellar', name: 'The Root Cellar', relic: 'sprout-gear', relicName: 'Sprout Gear', tools: ['powerGlove', 'shrinkCap'],
    foes: { 'rl-entry': [['grublet', 14, 14], ['gnatdancer', 28, 12]], 'rl-gate1': [['spitpea', 10, 20], ['dewmole', 32, 22]], 'rl-gate2': [['shellgrub', 20, 20]] } },
  gates: {
    relic: { gate: 'heavyBoulder', tool: 'powerGlove' },
    secrets: [
      { cell: [20, 9], gate: 'bramble', reward: 'sap-cave-gold', seed: true },
      { cell: [14, 13], gate: 'crackedRock', reward: 'beetle-shop-cache', seed: true },
      { cell: [3, 15], gate: 'heavyBoulder', reward: 'flowerpot-drain-tunnel', seed: true },
      { cell: [16, 10], gate: 'bramble', reward: 'gold-nook-1' }, // [S55] D39 top-up
      { cell: [9, 2], gate: 'heavyBoulder', reward: 'potion-nook-2' }, // [S55] D39 top-up
      { cell: [17, 2], gate: 'pinHole', reward: 'gold-nook-3' }, // [S55] D39 top-up
    ],
  },
  // Dewdrop Hollow inside the 2×2 T cells (16×16 tiles): acorn houses on ring terraces in a hollow stump.
  town: {
    name: 'Dewdrop Hollow',
    buildings: [
      { id: 'shop', name: 'Petal\'s Seed Shop', x: 1, y: 1, w: 5, h: 4, door: 2, roof: '#e07090' },
      { id: 'lab', name: 'Sprocket\'s Lab', x: 9, y: 1, w: 6, h: 4, door: 3, roof: '#8090a0' },
      { id: 'acorn-hall', name: 'Acorn Hall', x: 1, y: 9, w: 5, h: 4, door: 2, roof: '#a06a3a' },
      { id: 'dewey-house', name: 'Dewey\'s Acorn', x: 10, y: 9, w: 5, h: 4, door: 2, roof: '#c08a4a' },
    ],
    heal: { x: 7, y: 7, name: 'Dewdrop Pool' },
    npcs: [
      { id: 'sprocket', name: 'Professor Sprocket', x: 4, y: 7, look: ['#e0e0e0', '#6080c0'], hint: true, lines: ['The Root Cellar? A pebble plugs the door — to us it is a boulder!', 'A strong glove could lift it. You had one back in Verdania, yes?'] },
      { id: 'mayor-acorn', name: 'Mayor Acorn', x: 11, y: 7, look: ['#8a5a2a', '#c0a060'], lines: ['We\'re small, but our hearts are regular-sized.'] },
      { id: 'petal', name: 'Petal', inside: 'shop', shop: true, x: 7, y: 3, look: ['#f080a0', '#80c060'], lines: ['One human coin feeds a family of twelve!'] },
      { id: 'dewey', name: 'Dewey', x: 8, y: 14, look: ['#3a2a1a', '#80c0f0'], quest: 'w6-console-riddle', lines: ['There\'s a giant game console out there. The buttons are riddles!'] },
      { id: 'sprout', name: 'Sprout', x: 12, y: 14, look: ['#80c050', '#c08a4a'], quest: 'w6-sproutling-homecoming', lines: ['Squeak! Sproutlings follow you. Tap a foe or a switch to send one!', 'Lost ones regrow at the nests. Squeak!'] },
    ],
  },
  // Sproutling nests (cell coords): walk by one and your buddies regrow to 3.
  nests: [[6, 7], [12, 9], [19, 13], [3, 13]],
  // Enemies (SPEC 2.7 W6): one attack pattern each. xp per kill (tuned by the audit, G09).
  enemies: [
    { id: 'grublet', name: 'Grublet', archetype: 'melee', pattern: [{ type: 'hop' }, { type: 'lunge' }], look: { shape: 'blob', body: '#e0d080', accent: '#60a040' }, xp: 3 },
    { id: 'spitpea', name: 'Spitpea', archetype: 'ranged', pattern: [{ type: 'fanShot', n: 1, spread: 0 }, { type: 'slowPuddle' }], look: { shape: 'bush', body: '#6ac04a', accent: '#2a6a2a' }, xp: 4 },
    { id: 'shellgrub', name: 'Shellgrub', archetype: 'shielded', pattern: [{ type: 'shellHide', t: 0.6 }, { type: 'rollBounce', t: 1.0, speed: 110 }], look: { shape: 'knight', body: '#a07a4a', accent: '#e0d080' }, xp: 5 },
    { id: 'gnatdancer', name: 'Gnatdancer', archetype: 'flyer', pattern: [{ type: 'circleGlide', t: 0.8 }, { type: 'dive' }], look: { shape: 'bug', body: '#4a4a6a', accent: '#f0f0a0' }, xp: 4 },
    { id: 'dewmole', name: 'Dewmole', archetype: 'burrower', pattern: [{ type: 'burrow' }, { type: 'slowPuddle' }], look: { shape: 'mole', body: '#6a5a8a', accent: '#8ad0f0' }, xp: 4 },
  ],
  bosses: {
    // Main boss (SPEC 2.7 W6, D13: 4 patterns — phase 2 counts as one).
    gorg: { id: 'gorg', name: 'Gorg, the All-Maw', kind: 'main', sting: 'gorg', size: [48, 40], look: { body: '#6a4a8a', accent: '#f06080', crown: false },
      patterns: [
        { name: 'chomp lunge', prims: [{ type: 'lob', r: 24 }, { type: 'charge', speed: 210 }] },
        { name: 'tongue lash', prims: [{ type: 'beam' }, { type: 'pull' }] },
        { name: 'spore drift', prims: [{ type: 'inkRain', n: 4 }, { type: 'zone', r: 30 }] },
      ],
      phase2: [{ name: 'burrow + erupt', prims: [{ type: 'burrow' }, { type: 'slamRing', r: 120 }] }] },
    // Sub-bosses (SPEC 2.7 W6): 3 patterns each.
    'sgt-stinkbug': { id: 'sgt-stinkbug', name: 'Sgt. Stinkbug', kind: 'sub', sting: 'gorg', size: [30, 24], look: { body: '#6a7a3a', accent: '#c0d060' }, summons: 'grublet',
      patterns: [
        { name: 'gas cloud', prims: [{ type: 'zone', r: 40 }, { type: 'slowPuddle' }] },
        { name: 'bayonet charge', prims: [{ type: 'charge', speed: 190 }] },
        { name: 'rally', prims: [{ type: 'summon', n: 2 }] },
      ] },
    'mantis-marauder': { id: 'mantis-marauder', name: 'Mantis Marauder', kind: 'sub', sting: 'gorg', size: [26, 34], look: { body: '#5ab04a', accent: '#f0f080' },
      patterns: [
        { name: 'slash combo', prims: [{ type: 'lunge' }, { type: 'sweep' }] },
        { name: 'marked leap', prims: [{ type: 'dive' }] },
        { name: 'camouflage ambush', prims: [{ type: 'popBehind' }, { type: 'lunge' }] },
      ] },
    'queen-aphid': { id: 'queen-aphid', name: 'Queen Aphid', kind: 'sub', sting: 'gorg', size: [32, 28], look: { body: '#80d060', accent: '#f0c0e0' }, summons: 'gnatdancer',
      patterns: [
        { name: 'honey pools', prims: [{ type: 'snare' }, { type: 'slowPuddle' }] },
        { name: 'drone swarm', prims: [{ type: 'summon', n: 4 }] },
        { name: 'scepter zap', prims: [{ type: 'beam' }, { type: 'beam' }] },
      ] },
  },
  // Main-boss keep (Gorg's Maw Hollow under the garden bench, docs/WORLDS.md), opens when all three medallions are owned
  // [W1 keep pattern, R3-15]: the Burrow Hall (doors slam, five waves) → the Maw (Gorg, the All-Maw; drops nothing) →
  // the Seed Vault, where the Shrink Cap waits in the royal chest (w6-royal-vault #371).
  throne: { id: 'maw-hollow', name: 'The Maw Hollow', world: 6, floors: ['1F'], start: 'mh-hall', throne: true, vault: 'mh-vault',
    theme: { floor: '#5a4a3a', floor2: '#544436', wall: '#2a1a14', wallTop: '#a0c050' },
    rooms: {
      'mh-hall': { floor: '1F', gx: 0, gy: 2, type: 'wave', waves: [[['grublet', 3]], [['spitpea', 2], ['grublet', 1]], [['gnatdancer', 2], ['dewmole', 2]], [['shellgrub', 2], ['spitpea', 2]], [['shellgrub', 2], ['gnatdancer', 2], ['grublet', 1]]], doors: { n: { to: 'throne' } } },
      throne: { floor: '1F', gx: 0, gy: 1, type: 'sub', boss: 'gorg', doors: { s: { to: 'mh-hall' }, n: { to: 'mh-vault', lock: 'boss', royal: true } } },
      'mh-vault': { floor: '1F', gx: 0, gy: 0, type: 'vault', chest: { item: 'tool:shrinkCap', royal: true }, doors: { s: { to: 'throne', lock: 'boss', royal: true } } },
    } },
  // Dungeons (docs/WORLDS.md World 6). [MONSTERS FIRST] every room has hand-placed foes (or waves); a room's chest appears once they are beaten. Rooms are 40×30 tiles; objects/stairs use room tile coords; gx/gy place the mini-map.
  // Sproutling buddies follow into every room (a new room regrows the team).
  dungeons: {
    'petal-burrow': {
      id: 'petal-burrow', name: 'Petal Burrow', world: 6, medallion: 'dew', floors: ['1F', 'B1', 'B2'], start: 'pb-entry',
      theme: { floor: '#8a6a4a', floor2: '#846446', wall: '#4a3020', wallTop: '#f080a0' },
      rooms: {
        'pb-entry': { foes: [['grublet', 12, 12], ['gnatdancer', 28, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'pb-scent' } } },
        // signature: follow the pink scent marks to the two plates — stand on one, send a Sproutling to hold the other
        'pb-scent': { foes: [['spitpea', 8, 24], ['grublet', 32, 24]], floor: '1F', gx: 1, gy: 0, type: 'puzzle', puzzle: { kind: 'plateHold' },
          objects: [{ type: 'plate', x: 12, y: 9 }, { type: 'plate', x: 28, y: 9 }, ...[[14, 20], [13, 17], [12, 14], [12, 11], [26, 20], [27, 17], [28, 14], [28, 11]].map(([x, y]) => ({ type: 'scent', x, y }))],
          doors: { w: { to: 'pb-entry' }, e: { to: 'pb-k1', lock: 'puzzle' } } },
        'pb-k1': { foes: [['grublet', 10, 10], ['spitpea', 30, 20], ['dewmole', 12, 22]], floor: '1F', gx: 2, gy: 0, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'pb-pit' }, doors: { w: { to: 'pb-scent', lock: 'puzzle' } } },
        'pb-pit': { foes: [['shellgrub', 12, 18], ['gnatdancer', 26, 12], ['grublet', 26, 22]], floor: 'B1', gx: 1, gy: 1, type: 'normal', stairs: { x: 30, y: 6, to: 'pb-k1' }, doors: { w: { to: 'pb-bc', lock: 'big' }, e: { to: 'pb-trap', lock: 'small' } } },
        'pb-bc': { foes: [['spitpea', 10, 18], ['gnatdancer', 30, 20]], floor: 'B1', gx: 0, gy: 1, type: 'bigchest', chest: { item: 'gear:boots-6' }, doors: { e: { to: 'pb-pit', lock: 'big' } } },
        // trap room "Ant Nursery": the tunnels seal and Grublets flood in
        'pb-trap': { floor: 'B1', gx: 2, gy: 1, type: 'wave', waves: [[['melee', 3]], [['melee', 2], ['ranged', 1]]], pit: { x: 18, y: 16, to: 'pb-bk' }, doors: { w: { to: 'pb-pit', lock: 'small' } } },
        'pb-bk': { foes: [['dewmole', 14, 16], ['spitpea', 10, 8], ['shellgrub', 30, 22]], floor: 'B2', gx: 1, gy: 2, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'pb-pit' }, doors: { e: { to: 'pb-sub', lock: 'math' } } },
        'pb-sub': { floor: 'B2', gx: 2, gy: 2, type: 'sub', boss: 'sgt-stinkbug', doors: { w: { to: 'pb-bk', lock: 'math' }, e: { to: 'pb-medal', lock: 'boss' } } },
        'pb-medal': { floor: 'B2', gx: 3, gy: 2, type: 'treasure', doors: { w: { to: 'pb-sub', lock: 'boss' } } },
      },
    },
    'compost-heap': {
      id: 'compost-heap', name: 'The Compost Heap', world: 6, medallion: 'petal', floors: ['1F', '2F', '3F'], start: 'ch-entry',
      theme: { floor: '#6a4a2a', floor2: '#644426', wall: '#3a2a14', wallTop: '#a0c050' },
      rooms: {
        'ch-entry': { foes: [['grublet', 12, 12], ['spitpea', 28, 10]], floor: '1F', gx: 0, gy: 2, type: 'entrance', doors: { e: { to: 'ch-k1' } } },
        'ch-k1': { foes: [['shellgrub', 10, 10], ['dewmole', 30, 20], ['gnatdancer', 12, 22]], floor: '1F', gx: 1, gy: 2, type: 'normal', stairs: { x: 30, y: 6, to: 'ch-dig' }, doors: { w: { to: 'ch-entry' }, e: { to: 'ch-bc', lock: 'small' } } },
        // signature: carry the seeds to the soil spots (walk over a seed, or send a Sproutling to fetch it) — the vines grow the way up
        'ch-dig': { foes: [['gnatdancer', 12, 24], ['grublet', 28, 24]], floor: '2F', gx: 1, gy: 1, type: 'puzzle', puzzle: { kind: 'seedPlant' },
          objects: [{ type: 'seed', x: 8, y: 20 }, { type: 'seed', x: 32, y: 20 }, { type: 'soil', x: 16, y: 10 }, { type: 'soil', x: 24, y: 10 }],
          stairs: { x: 30, y: 6, to: 'ch-k1' }, doors: { w: { to: 'ch-k2' }, e: { to: 'ch-trap', lock: 'puzzle' } } },
        'ch-k2': { foes: [['grublet', 10, 10], ['spitpea', 30, 20], ['shellgrub', 12, 22]], floor: '2F', gx: 0, gy: 1, type: 'key', chest: { item: 'key' }, doors: { e: { to: 'ch-dig' } } },
        // trap room "Rot Room": Gnatdancers circle while the floor squelches
        'ch-trap': { floor: '2F', gx: 2, gy: 1, type: 'wave', waves: [[['flyer', 3]], [['flyer', 2], ['burrower', 1]]], stairs: { x: 30, y: 6, to: 'ch-bk' }, doors: { w: { to: 'ch-dig', lock: 'puzzle' } } },
        'ch-bk': { foes: [['dewmole', 12, 20], ['spitpea', 10, 8], ['shellgrub', 30, 22]], floor: '3F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'ch-trap' }, pit: { x: 18, y: 16, to: 'ch-k1' }, doors: {} },
        'ch-bc': { foes: [['spitpea', 10, 18], ['gnatdancer', 30, 20]], floor: '1F', gx: 2, gy: 2, type: 'bigchest', chest: { item: 'gold:450' }, doors: { w: { to: 'ch-k1', lock: 'small' }, e: { to: 'ch-sub', lock: 'big' } } },
        'ch-sub': { floor: '1F', gx: 3, gy: 2, type: 'sub', boss: 'mantis-marauder', doors: { w: { to: 'ch-bc', lock: 'big' }, e: { to: 'ch-medal', lock: 'boss' } } },
        'ch-medal': { floor: '1F', gx: 4, gy: 2, type: 'treasure', doors: { w: { to: 'ch-sub', lock: 'boss' } } },
      },
    },
    'milkweed-spire': {
      id: 'milkweed-spire', name: 'Milkweed Spire', world: 6, medallion: 'seed', floors: ['1F', '2F', '3F', '4F'], start: 'ms-entry',
      theme: { floor: '#d0e0c0', floor2: '#c8d8b8', wall: '#5a7a4a', wallTop: '#f8f8f0' },
      rooms: {
        'ms-entry': { foes: [['gnatdancer', 12, 12], ['grublet', 28, 10]], floor: '1F', gx: 0, gy: 3, type: 'entrance', doors: { e: { to: 'ms-k1' } } },
        'ms-k1': { foes: [['spitpea', 10, 10], ['shellgrub', 30, 20], ['gnatdancer', 12, 22]], floor: '1F', gx: 1, gy: 3, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'ms-lens' }, doors: { w: { to: 'ms-entry' } } },
        'ms-lens': { foes: [['shellgrub', 12, 18], ['gnatdancer', 28, 12], ['dewmole', 26, 22]], floor: '2F', gx: 1, gy: 2, type: 'normal', stairs: { x: 30, y: 6, to: 'ms-k1' }, doors: { e: { to: 'ms-k2', lock: 'small' } } },
        'ms-k2': { foes: [['grublet', 10, 10], ['spitpea', 30, 20], ['dewmole', 12, 22]], floor: '2F', gx: 2, gy: 2, type: 'normal', chest: { item: 'gold:60' }, stairs: { x: 30, y: 6, to: 'ms-fan' }, doors: { w: { to: 'ms-lens', lock: 'small' } } },
        // signature: puff all three milkweed fans spinning at once with the Gust Jar — the updraft carries you on
        'ms-fan': { foes: [['gnatdancer', 10, 22], ['spitpea', 30, 22]], floor: '3F', gx: 1, gy: 1, type: 'puzzle', puzzle: { kind: 'updraft' },
          objects: [{ type: 'fan', x: 16, y: 9 }, { type: 'fan', x: 20, y: 9 }, { type: 'fan', x: 24, y: 9 }],
          stairs: { x: 30, y: 6, to: 'ms-k2' }, doors: { w: { to: 'ms-bc', lock: 'big' }, e: { to: 'ms-trap', lock: 'puzzle' } } },
        'ms-bc': { foes: [['shellgrub', 10, 18], ['gnatdancer', 30, 20]], floor: '3F', gx: 0, gy: 1, type: 'bigchest', chest: { item: 'gold:500' }, doors: { e: { to: 'ms-fan', lock: 'big' } } },
        // trap room "Aphid Farm": honey floor, Gnatdancer swarms
        'ms-trap': { floor: '3F', gx: 2, gy: 1, type: 'wave', waves: [[['flyer', 3]], [['flyer', 2], ['melee', 2]]], stairs: { x: 30, y: 6, to: 'ms-bk' }, doors: { w: { to: 'ms-fan', lock: 'puzzle' } } },
        'ms-bk': { foes: [['dewmole', 14, 16], ['spitpea', 10, 8], ['shellgrub', 30, 22]], floor: '4F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'ms-trap' }, doors: { e: { to: 'ms-sub', lock: 'math' } } },
        'ms-sub': { floor: '4F', gx: 3, gy: 0, type: 'sub', boss: 'queen-aphid', doors: { w: { to: 'ms-bk', lock: 'math' }, e: { to: 'ms-medal', lock: 'boss' } } },
        'ms-medal': { floor: '4F', gx: 4, gy: 0, type: 'treasure', doors: { w: { to: 'ms-sub', lock: 'boss' } } },
      },
    },
  },
  music: { overworld: 'w6_overworld', town: 'w6_town', area2: 'w6_area2', dungeon: 'w6_dungeon' },
  // Regions in cell coords (first match wins).
  regions: [
    { name: 'Dewdrop Hollow', x0: 4, y0: 10, x1: 5, y1: 11, spawns: [], music: 'town' },
    { name: 'Flowerpot Terrace', x0: 1, y0: 1, x1: 9, y1: 7, spawns: ['grublet', 'gnatdancer'], music: 'area2' },
    { name: 'Dewdrop Lake', x0: 10, y0: 1, x1: 17, y1: 7, spawns: ['gnatdancer', 'dewmole'] },
    { name: 'Hose Coil Meadow', x0: 18, y0: 1, x1: 22, y1: 16, spawns: ['spitpea', 'shellgrub'], music: 'area2' },
    { name: 'Sap Flats', x0: 6, y0: 12, x1: 17, y1: 16, spawns: ['dewmole', 'spitpea', 'grublet'] },
    { name: 'Bottlecap Path', x0: 1, y0: 8, x1: 17, y1: 16, spawns: ['grublet', 'shellgrub'] },
  ],
};
