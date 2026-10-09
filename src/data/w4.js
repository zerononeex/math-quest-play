// World 4 — Pufftop Isles (vertical climb). Map = the hand-designed sketch from docs/WORLDS.md (D22) + placements.
// S40: overworld, Pudding Port, enemies. Dungeons + sub-bosses (S41) and King Dundor (S42) land next.
export const W4 = {
  id: 4, name: 'Pufftop Isles', band: 3,
  lush: true, // [W4 Phase 1] the W1-standard lush pass: organic shores, paving, yards, big trees, secret scenes, cake landmark, set pieces
  sketch: [
    '########################',
    '#^^^^^^^^^B^^^^^^^^^^^^#',
    '#.....o...:.*....3.....#',
    '#.====oo..:...=====..*.#',
    '#^^^^^^^^^H^^^^^^^^^^^^#',
    '#..2.....::....*...~~..#',
    '#.=====..:..*..=====~~.#',
    '#vvvvvvvvHvvvvvvvvvvvv.#',
    '#^^^^^^^^H^^^^^^^^^^^^^#',
    '#...*....:....1....~~~.#',
    '#.~~~....:::::::..~~~~.#',
    '#.~~~..o.....o.....R~~.#',
    '#^^^^^^^^H^^^^^^^^^^^^^#',
    '#.......::............*#',
    '#.TTT...::.....~~~~~~~.#',
    '#.TTT:::::::S..~~~~~~~.#',
    '#~~~~~~~~~~~~~~~~~~~~~~#',
    '########################',
  ],
  // Liquid A = frosting pools (block walking, FIRE/ICE interact), liquid B = the caramel river (walkable, sticky ×0.6).
  liquids: { a: { name: 'frosting', behaviour: 'block' }, b: { name: 'caramel', behaviour: 'slow', slow: 0.4 } },
  palette: { ground: '#f8d8e0', ground2: '#f0ccd6', flower: '#80d0f0', path: '#e0a870', tree: '#d0608a', treeTop: '#f080a8', cliff: '#a0603a', cliffTop: '#f0e0c0', upper: '#fce8ee', liqA: '#f8f8ff', liqB: '#c8782a', shore: '#fff0d0', town: '#f0c8a0', pad: '#a0a0b0' },
  // Relic (The Icing Vault) is sealed in winter-white ice: only FIRE melts it (Fire Bloom, W2) [D09]. Secrets use D27 mechanics.
  // Relic mini-dungeon (SPEC 2.8, D09): 5 rooms around its gate tool + one other (src/game/relics.js builds the rooms).
  relicDungeon: { id: 'icing-vault', name: 'The Icing Vault', relic: 'puff-crystal', relicName: 'Puff Crystal', tools: ['fireBloom', 'powerGlove'],
    foes: { 'rl-entry': [['waddlepuff', 14, 14], ['driftbloom', 28, 12]], 'rl-gate1': [['spitseed', 10, 20], ['bouncebean', 32, 22]], 'rl-gate2': [['candy-crab', 20, 20]] } },
  gates: {
    relic: { gate: 'iceBlock', tool: 'fireBloom' },
    secrets: [
      { cell: [15, 5], gate: 'bramble', reward: 'cocoa-cave', seed: true },
      { cell: [4, 9], gate: 'heavyBoulder', reward: 'jawbreaker-potion-room', seed: true },
      { cell: [22, 13], gate: 'crackedRock', reward: 'cake-gold-cellar', seed: true }, // [W4 Phase 1] moved east from 19,13: the lush frosting shore sealed its approach
      { cell: [21, 3], gate: 'crackedWall', reward: 'gold-nook-1' }, // [S55] D39 top-up
      { cell: [12, 6], gate: 'crackedRock', reward: 'potion-nook-2' }, // [S55] D39 top-up
      { cell: [12, 2], gate: 'bramble', reward: 'gold-nook-3' }, // [S55] D39 top-up
    ],
  },
  // Pudding Port inside the 3×2 T cells (24×16 tiles): candy-cane docks, terraced candy houses, the floating bakery.
  town: {
    name: 'Pudding Port',
    buildings: [
      { id: 'shop', name: 'Sundae\'s Sweet Shop', x: 1, y: 1, w: 6, h: 4, door: 3, roof: '#f06090' },
      { id: 'hall', name: 'Mayor Meringue\'s Hall', x: 9, y: 1, w: 6, h: 4, door: 2, roof: '#f8f0f0' },
      { id: 'bakery', name: 'Floating Bakery', x: 17, y: 1, w: 6, h: 4, door: 3, roof: '#f0b040' },
      { id: 'puff-house', name: 'Candy House', x: 1, y: 9, w: 5, h: 4, door: 2, roof: '#80c0f0' },
    ],
    heal: { x: 12, y: 11, name: 'Warm Custard Spring' },
    npcs: [
      { id: 'baker-poppy', name: 'Baker Poppy', x: 19, y: 7, look: ['#f0f0f0', '#f0a040'], hint: true, quest: 'w4-missing-sprinkles', lines: ['The Icing Vault\'s sealed in winter-white ice, sugar.', 'Only real FIRE melts it — the flowery kind from Tumbletop.'] },
      { id: 'mayor-meringue', name: 'Mayor Meringue', x: 11, y: 7, look: ['#f8f8f8', '#a060c0'], lines: ['He ate the town hall. Twice.'] },
      { id: 'sundae', name: 'Sundae', inside: 'shop', shop: true, x: 7, y: 3, look: ['#8a4a2a', '#f06090'], lines: ['Everything\'s edible. The cutlery too.'] },
      { id: 'puff', name: 'Puff', x: 8, y: 13, look: ['#fff0a0', '#60c0a0'], quest: 'w4-frosting-slalom', lines: ['Race you down the frosting run!'] },
    ],
  },
  // Enemies (SPEC 2.7 W4): one attack pattern each. xp per kill (tuned by the audit, G09).
  enemies: [
    { id: 'waddlepuff', name: 'Waddlepuff', archetype: 'melee', pattern: [{ type: 'charge', speed: 110 }], look: { shape: 'blob', body: '#fff0e0', accent: '#c07040' }, xp: 3 },
    { id: 'spitseed', name: 'Spitseed', archetype: 'ranged', pattern: [{ type: 'fanShot', n: 3, spread: 0.5 }], look: { shape: 'bush', body: '#50b050', accent: '#f04050' }, xp: 4 },
    { id: 'candy-crab', name: 'Candy Crab', archetype: 'shielded', pattern: [{ type: 'sidestep', t: 0.35, speed: 100 }, { type: 'lunge' }], look: { shape: 'knight', body: '#f06060', accent: '#80f0f0' }, xp: 5 },
    { id: 'driftbloom', name: 'Driftbloom', archetype: 'flyer', pattern: [{ type: 'dive' }, { type: 'snare' }], look: { shape: 'bird', body: '#f0f080', accent: '#ffffff' }, xp: 4 },
    { id: 'bouncebean', name: 'Bouncebean', archetype: 'hopper', pattern: [{ type: 'hop' }, { type: 'hop' }, { type: 'hop' }, { type: 'slamRing', r: 44 }], look: { shape: 'bug', body: '#f040a0', accent: '#40f0a0' }, xp: 4 },
  ],
  // Sub-bosses (SPEC 2.7 W4): patterns are compositions of pattern primitives (bosses.js).
  bosses: {
    // Main boss (SPEC 2.7 W4, D13: 4 patterns — phase 2 counts as one). weakCrown: the Sour Star takes ×2 while he is stunned.
    dundor: { id: 'dundor', name: 'King Dundor, the Glutton King', kind: 'main', sting: 'dundor', size: [46, 42], look: { body: '#8a6a5a', accent: '#f0e040', crown: true }, weakCrown: true,
      patterns: [
        { name: 'mallet slam', prims: [{ type: 'slamRing', r: 120 }] },
        { name: 'royal inhale', prims: [{ type: 'pull' }, { type: 'fanShot', n: 3, spread: 0.8 }] },
        { name: 'belly bounce', prims: [{ type: 'charge', speed: 170 }, { type: 'slamRing', r: 50 }, { type: 'charge', speed: 170 }, { type: 'slamRing', r: 50 }, { type: 'charge', speed: 170 }, { type: 'slamRing', r: 60 }] },
      ],
      phase2: [{ name: 'star-spit frenzy', prims: [{ type: 'pull' }, { type: 'fanShot', n: 5, spread: 1.2 }, { type: 'fanShot', n: 5, spread: 1.2 }, { type: 'fanShot', n: 5, spread: 1.2 }] }] },
    'sir-waddlelot': { id: 'sir-waddlelot', name: 'Sir Waddlelot', kind: 'sub', sting: 'dundor', size: [28, 30], look: { body: '#fff0e0', accent: '#8a8aa0' },
      patterns: [
        { name: 'spear jab combo', prims: [{ type: 'lunge' }, { type: 'lunge' }, { type: 'lunge' }] },
        { name: 'shield bash charge', prims: [{ type: 'charge', speed: 190 }] },
      ] },
    'chef-chompers': { id: 'chef-chompers', name: 'Chef Chompers', kind: 'sub', sting: 'dundor', size: [32, 30], look: { body: '#3a8a4a', accent: '#f8f8f8' }, summons: 'waddlepuff',
      patterns: [
        { name: 'pan slam', prims: [{ type: 'slamRing', r: 100 }] },
        { name: 'food throw', prims: [{ type: 'lob', r: 18 }, { type: 'lob', r: 18 }] },
        { name: 'sous-chef call', prims: [{ type: 'summon', n: 1 }] },
      ] },
    brollygust: { id: 'brollygust', name: 'Brollygust', kind: 'sub', sting: 'dundor', size: [30, 26], look: { body: '#5a3a8a', accent: '#f080c0' },
      patterns: [
        { name: 'gust push', prims: [{ type: 'gust', r: 110, push: 80, t: 1.0 }] },
        { name: 'dive-bomb', prims: [{ type: 'dive' }] },
        { name: 'umbrella spin', prims: [{ type: 'shellHide', t: 0.6 }, { type: 'spin' }] },
      ] },
  },
  // Main-boss keep (the Glutton Palace on the cloud-cake summit, docs/WORLDS.md), opens when all three medallions are owned
  // [W1 keep pattern, R3-15]: the Sprinkle Hall (doors slam, five waves) → the banquet room (King Dundor; drops nothing) →
  // the Sugar Vault, where the Bomb Bag waits in the royal chest (w4-royal-vault #369).
  throne: { id: 'glutton-palace', name: 'The Glutton Palace', world: 4, floors: ['1F'], start: 'gp-hall', throne: true, vault: 'gp-vault',
    theme: { floor: '#f8e0e8', floor2: '#f0d8e0', wall: '#a0405a', wallTop: '#f0c040' },
    rooms: {
      'gp-hall': { floor: '1F', gx: 0, gy: 2, type: 'wave', waves: [[['waddlepuff', 3]], [['spitseed', 2], ['waddlepuff', 1]], [['driftbloom', 2], ['bouncebean', 2]], [['candy-crab', 2], ['spitseed', 2]], [['candy-crab', 2], ['driftbloom', 2], ['waddlepuff', 1]]], doors: { n: { to: 'throne' } } },
      throne: { floor: '1F', gx: 0, gy: 1, type: 'sub', boss: 'dundor', doors: { s: { to: 'gp-hall' }, n: { to: 'gp-vault', lock: 'boss', royal: true } } },
      'gp-vault': { floor: '1F', gx: 0, gy: 0, type: 'vault', chest: { item: 'tool:bombBag', royal: true }, doors: { s: { to: 'throne', lock: 'boss', royal: true } } },
    } },
  // Dungeons (docs/WORLDS.md World 4). [MONSTERS FIRST] every room has hand-placed foes (or waves); a room's chest appears once they are beaten. Rooms are 40×30 tiles; objects/stairs use room tile coords; gx/gy place the mini-map.
  dungeons: {
    'caramel-caves': {
      id: 'caramel-caves', name: 'Caramel Caves', world: 4, medallion: 'sugar', floors: ['B2', 'B1', '1F'], start: 'cc-entry',
      theme: { floor: '#b8783a', floor2: '#b07036', wall: '#5a3a1a', wallTop: '#e0a050' },
      rooms: {
        'cc-entry': { foes: [['waddlepuff', 12, 12], ['bouncebean', 28, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'cc-lever' } } },
        // signature: pull the levers in pairs before the caramel hardens (5 s per lever) to lower the bridge
        'cc-lever': { foes: [['waddlepuff', 32, 8], ['spitseed', 8, 24]], floor: '1F', gx: 1, gy: 0, type: 'puzzle', puzzle: { kind: 'leverPairs' },
          objects: [{ type: 'lever', x: 10, y: 9, pair: 'a', time: 5 }, { type: 'lever', x: 16, y: 9, pair: 'a', time: 5 }, { type: 'lever', x: 24, y: 20, pair: 'b', time: 5 }, { type: 'lever', x: 30, y: 20, pair: 'b', time: 5 }],
          doors: { w: { to: 'cc-entry' }, e: { to: 'cc-k1', lock: 'puzzle' } } },
        'cc-k1': { foes: [['waddlepuff', 10, 10], ['candy-crab', 30, 18], ['spitseed', 12, 22]], floor: '1F', gx: 2, gy: 0, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'cc-trap' }, doors: { w: { to: 'cc-lever', lock: 'puzzle' } } },
        // trap room "Sticky Parlour": Waddlepuffs roll in
        'cc-trap': { floor: 'B1', gx: 2, gy: 1, type: 'wave', waves: [[['melee', 3]], [['melee', 2], ['hopper', 1]]], stairs: { x: 30, y: 6, to: 'cc-k1' }, doors: { w: { to: 'cc-pit', lock: 'small' } } },
        'cc-pit': { foes: [['candy-crab', 12, 18], ['bouncebean', 28, 10], ['waddlepuff', 26, 22]], floor: 'B1', gx: 1, gy: 1, type: 'normal', pit: { x: 18, y: 16, to: 'cc-bk' }, doors: { e: { to: 'cc-trap', lock: 'small' }, w: { to: 'cc-bc', lock: 'big' } } },
        'cc-bc': { foes: [['spitseed', 10, 18], ['bouncebean', 30, 20]], floor: 'B1', gx: 0, gy: 1, type: 'bigchest', chest: { item: 'gear:boots-4' }, doors: { e: { to: 'cc-pit', lock: 'big' } } },
        'cc-bk': { foes: [['candy-crab', 14, 16], ['spitseed', 10, 8], ['waddlepuff', 30, 22]], floor: 'B2', gx: 1, gy: 2, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'cc-pit' }, doors: { e: { to: 'cc-sub', lock: 'math' } } },
        'cc-sub': { floor: 'B2', gx: 2, gy: 2, type: 'sub', boss: 'sir-waddlelot', doors: { w: { to: 'cc-bk', lock: 'math' }, e: { to: 'cc-medal', lock: 'boss' } } },
        'cc-medal': { floor: 'B2', gx: 3, gy: 2, type: 'treasure', doors: { w: { to: 'cc-sub', lock: 'boss' } } },
      },
    },
    'frosting-falls': {
      id: 'frosting-falls', name: 'Frosting Falls', world: 4, medallion: 'frost', floors: ['1F', '2F'], start: 'ff-entry',
      theme: { floor: '#e0f0ff', floor2: '#d8e8f8', wall: '#6a8ab0', wallTop: '#f8f8ff' },
      rooms: {
        'ff-entry': { foes: [['driftbloom', 12, 12], ['waddlepuff', 28, 10]], floor: '1F', gx: 0, gy: 1, type: 'entrance', doors: { e: { to: 'ff-k1' } } },
        'ff-k1': { foes: [['spitseed', 10, 10], ['driftbloom', 28, 20], ['bouncebean', 12, 22]], floor: '1F', gx: 1, gy: 1, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'ff-k2' }, doors: { w: { to: 'ff-entry' }, e: { to: 'ff-trap', lock: 'small' } } },
        // trap room "Brain Freeze": Frostcones from both sides
        'ff-trap': { floor: '1F', gx: 2, gy: 1, type: 'wave', waves: [[['flyer', 2], ['ranged', 1]], [['flyer', 3]]], chest: { item: 'gold:40' }, doors: { w: { to: 'ff-k1', lock: 'small' } } },
        'ff-k2': { foes: [['candy-crab', 12, 18], ['driftbloom', 10, 8], ['spitseed', 26, 22]], floor: '2F', gx: 0, gy: 0, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'ff-k1' }, doors: { e: { to: 'ff-slide' } } },
        // signature: hit the ice sliders so they glide up and stop on the plates (the pink posts stop them)
        'ff-slide': { foes: [['driftbloom', 34, 14], ['waddlepuff', 6, 24]], floor: '2F', gx: 1, gy: 0, type: 'puzzle', puzzle: { kind: 'slideBlock' },
          objects: [{ type: 'slider', x: 14, y: 20 }, { type: 'slider', x: 26, y: 20 }, { type: 'plate', x: 14, y: 10, weight: 'slider' }, { type: 'plate', x: 26, y: 10, weight: 'slider' },
            { type: 'post', x: 14, y: 9 }, { type: 'post', x: 26, y: 9 }, { type: 'resetSwitch', x: 20, y: 24 }],
          doors: { w: { to: 'ff-k2' }, e: { to: 'ff-bk', lock: 'puzzle' } } },
        'ff-bk': { foes: [['candy-crab', 14, 16], ['spitseed', 10, 8], ['driftbloom', 30, 22]], floor: '2F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'ff-bc' }, doors: { w: { to: 'ff-slide', lock: 'puzzle' } } },
        'ff-bc': { foes: [['bouncebean', 10, 18], ['driftbloom', 30, 20]], floor: '1F', gx: 3, gy: 1, type: 'bigchest', chest: { item: 'gold:250' }, stairs: { x: 30, y: 6, to: 'ff-bk' }, doors: { e: { to: 'ff-sub', lock: 'small' } } },
        'ff-sub': { floor: '1F', gx: 4, gy: 1, type: 'sub', boss: 'chef-chompers', doors: { w: { to: 'ff-bc', lock: 'small' }, e: { to: 'ff-medal', lock: 'boss' } } },
        'ff-medal': { floor: '1F', gx: 5, gy: 1, type: 'treasure', doors: { w: { to: 'ff-sub', lock: 'boss' } } },
      },
    },
    'gummy-depths': {
      id: 'gummy-depths', name: 'The Gummy Depths', world: 4, medallion: 'dream', floors: ['1F', 'B1', 'B2'], start: 'gd-entry',
      theme: { floor: '#5a3a6a', floor2: '#543666', wall: '#2a1a3a', wallTop: '#f060c0' },
      rooms: {
        'gd-entry': { foes: [['bouncebean', 12, 12], ['driftbloom', 28, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'gd-torch' } } },
        // signature: light the dream torches in the order the lanterns show (FIRE shots, or a lit torch) — a wrong one blows all out
        'gd-torch': { foes: [['bouncebean', 8, 24], ['spitseed', 32, 24]], floor: '1F', gx: 1, gy: 0, type: 'puzzle', puzzle: { kind: 'torchOrder', order: [3, 1, 2] },
          objects: [{ type: 'dreamTorch', x: 12, y: 12, n: 1 }, { type: 'dreamTorch', x: 20, y: 12, n: 2 }, { type: 'dreamTorch', x: 28, y: 12, n: 3 },
            { type: 'lantern', x: 12, y: 9, n: 2, k: 1, of: 3 }, { type: 'lantern', x: 20, y: 9, n: 3, k: 2, of: 3 }, { type: 'lantern', x: 28, y: 9, n: 1, k: 0, of: 3 }],
          doors: { w: { to: 'gd-entry' }, e: { to: 'gd-k1', lock: 'puzzle' } } },
        'gd-k1': { foes: [['spitseed', 10, 10], ['bouncebean', 28, 20], ['candy-crab', 12, 22]], floor: '1F', gx: 2, gy: 0, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'gd-bounce' }, doors: { w: { to: 'gd-torch', lock: 'puzzle' } } },
        'gd-bounce': { foes: [['candy-crab', 12, 18], ['driftbloom', 10, 8], ['bouncebean', 26, 22], ['waddlepuff', 30, 14]], floor: 'B1', gx: 1, gy: 1, type: 'normal', stairs: { x: 30, y: 6, to: 'gd-k1' }, doors: { w: { to: 'gd-bc', lock: 'big' }, e: { to: 'gd-trap', lock: 'small' } } },
        // trap room "Nightmare Nursery": Dreamfloats swarm
        'gd-trap': { floor: 'B1', gx: 2, gy: 1, type: 'wave', waves: [[['flyer', 3]], [['flyer', 2], ['hopper', 2]]], pit: { x: 18, y: 16, to: 'gd-bk' }, doors: { w: { to: 'gd-bounce', lock: 'small' } } },
        'gd-bc': { foes: [['spitseed', 10, 18], ['driftbloom', 30, 20]], floor: 'B1', gx: 0, gy: 1, type: 'bigchest', chest: { item: 'gold:300' }, doors: { e: { to: 'gd-bounce', lock: 'big' } } },
        'gd-bk': { foes: [['candy-crab', 14, 16], ['bouncebean', 10, 8], ['spitseed', 30, 22]], floor: 'B2', gx: 1, gy: 2, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'gd-bounce' }, doors: { e: { to: 'gd-sub', lock: 'math' } } },
        'gd-sub': { floor: 'B2', gx: 2, gy: 2, type: 'sub', boss: 'brollygust', doors: { w: { to: 'gd-bk', lock: 'math' }, e: { to: 'gd-medal', lock: 'boss' } } },
        'gd-medal': { floor: 'B2', gx: 3, gy: 2, type: 'treasure', doors: { w: { to: 'gd-sub', lock: 'boss' } } },
      },
    },
  },
  music: { overworld: 'w4_overworld', town: 'w4_town', area2: 'w4_area2', dungeon: 'w4_dungeon' },
  // Regions in cell coords (first match wins): the port, then the four stacked levels south → north.
  regions: [
    { name: 'Pudding Port', x0: 2, y0: 14, x1: 4, y1: 15, spawns: [], music: 'town' },
    { name: 'Candy-Cane Docks', x0: 1, y0: 13, x1: 22, y1: 15, spawns: ['waddlepuff', 'spitseed'] },
    { name: 'Caramel Foothills', x0: 1, y0: 9, x1: 22, y1: 11, spawns: ['candy-crab', 'bouncebean', 'waddlepuff'] },
    { name: 'Frosting Cliffs', x0: 1, y0: 5, x1: 22, y1: 7, spawns: ['driftbloom', 'bouncebean'], music: 'area2' },
    { name: 'Cloud-cake Summit', x0: 1, y0: 2, x1: 22, y1: 3, spawns: ['driftbloom', 'spitseed', 'candy-crab'], music: 'area2' },
  ],
};
