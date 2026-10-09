// World 3 — Chroma Bay (island-hop). Map = the hand-designed sketch from docs/WORLDS.md (D22) + placements.
// S37: overworld, Neon Pier, enemies. Dungeons + sub-bosses (S38) and Inkmaster Vex (S39) land next.
export const W3 = {
  id: 3, name: 'Chroma Bay', band: 2,
  lush: true, // [W3 Phase 1] the W1-standard lush pass: organic shores, paving, yards, big trees, secret scenes, shell landmark, set pieces
  sketch: [
    '########################',
    '#~~~~~~~~~~~~~~~~~~~~~~#',
    '#~..1..~~~~~~~~~~..2..~#',
    '#~*...*~~~~oo~~~~.....~#',
    '#~..:..:::::::::::::..~#',
    '#~~~:~~~~~====~~~~~:~~~#',
    '#~~~:~~~~~====~~~~~:~~~#',
    '#~..:..~~~~~~~~~~~.:..~#',
    '#~.TT..::::::::::::.*.~#',
    '#~.TT..~~~~~~~~~~~..3.~#',
    '#~.HH..~~~~====~~~~~..~#',
    '#~.vv..~~~.o..~~~~~~~~~#',
    '#~..:..~~~..*.~~~~~~~~~#',
    '#~..:::::::::::::::B..~#',
    '#~..:..~~~~~~~~~~.....~#',
    '#~.RS..~~~~~===~~~..*.~#',
    '#~.*...~~~~~~~~~~~~~..~#',
    '########################',
  ],
  // Liquid A = the ink sea (blocks walking, ICE freezes), liquid B = tide pools (walkable, slows ×0.6).
  liquids: { a: { name: 'ink sea', behaviour: 'block' }, b: { name: 'tide pools', behaviour: 'slow', slow: 0.4 } },
  palette: { ground: '#e8d8a0', ground2: '#e0cf94', flower: '#ff60c0', path: '#b89a70', tree: '#2a4a6a', treeTop: '#3a6a8a', cliff: '#6a5a8a', cliffTop: '#8a7aaa', upper: '#f0e4b0', liqA: '#2a2a6a', liqB: '#50c0c0', shore: '#f8f0c8', town: '#9a7a5a', pad: '#a0a0b0' },
  // Relic (The Tiny Atoll) sits behind a pin-hole tunnel (Shrink Cap, W6) [D09]. Secrets use D27 mechanics.
  // Relic mini-dungeon (SPEC 2.8, D09): 5 rooms around its gate tool + one other (src/game/relics.js builds the rooms).
  relicDungeon: { id: 'tiny-atoll', name: 'The Tiny Atoll', relic: 'chroma-vial', relicName: 'Chroma Vial', tools: ['shrinkCap', 'bombBag'],
    foes: { 'rl-entry': [['splatterfish', 14, 14], ['skimmer', 28, 12]], 'rl-gate1': [['inkblot', 10, 20], ['inkspitter', 32, 22]], 'rl-gate2': [['skimmer', 20, 20]] } },
  gates: {
    relic: { gate: 'pinHole', tool: 'shrinkCap' },
    secrets: [
      { cell: [20, 8], gate: 'iceBlock', reward: 'lookout-chest', seed: true },
      { cell: [12, 12], gate: 'crackedRock', reward: 'speaker-stack-cave', seed: true },
      { cell: [20, 15], gate: 'heavyBoulder', reward: 'bottle-message-cave' },
      { cell: [3, 16], gate: 'bramble', reward: 'hermit-shell-house', seed: true },
      { cell: [2, 3], gate: 'pinHole', reward: 'gold-nook-1' }, // [S55] D39 top-up
      { cell: [6, 3], gate: 'crackedWall', reward: 'potion-nook-2' }, // [S55] D39 top-up
    ],
  },
  // Neon Pier inside the 2×2 T cells (16×16 tiles): boardwalk shops on two decks, ink-raft dock to the east.
  town: {
    name: 'Neon Pier',
    buildings: [
      { id: 'shop', name: 'Shelly\'s Ink & Reef', x: 1, y: 1, w: 6, h: 4, door: 3, roof: '#40c0e0' },
      { id: 'marina', name: 'Marina\'s Chart House', x: 9, y: 1, w: 6, h: 4, door: 2, roof: '#f06090' },
      { id: 'ripple', name: 'Ripple\'s Record Booth', x: 1, y: 10, w: 5, h: 4, door: 2, roof: '#a060f0' },
      { id: 'ferry', name: 'Ferry Office', x: 10, y: 10, w: 5, h: 4, door: 2, roof: '#f0c040' },
    ],
    heal: { x: 8, y: 7, name: 'Prism Tidepool' },
    npcs: [
      { id: 'dj-ripple', name: 'DJ Ripple', x: 5, y: 7, look: ['#303030', '#a060f0'], hint: true, quest: 'w3-lost-tune', lines: ['The Tiny Atoll? Pinhole entrance, kid. You\'d need to be THIS small.', 'The garden world shrinks folks, word is.'] },
      { id: 'marina', name: 'Marina', x: 11, y: 7, look: ['#f0a040', '#2a6aa0'], quest: 'w3-colour-town', lines: ['I map in ink. It\'s waterproof. Mostly.'] },
      { id: 'shelly', name: 'Shelly', inside: 'shop', shop: true, x: 7, y: 3, look: ['#f06080', '#40c0e0'], lines: ['Fresh ink daily! Slightly used ink half price.'] },
      { id: 'finn', name: 'Finn', x: 3, y: 15, look: ['#6a4a2a', '#f0e040'], lines: ['I saw a jellyfish wearing sunglasses. True story!'] },
      { id: 'bubbles', name: 'Bubbles', x: 13, y: 15, look: ['#a0e0ff', '#f08a40'], lines: ['Welcome to Chroma Bay! Mind the ink — it\'s deeper than it looks.'] },
    ],
  },
  // Enemies (SPEC 2.7 W3): one attack pattern each. xp per kill (tuned by the audit, G09).
  enemies: [
    { id: 'splatterfish', name: 'Splatterfish', archetype: 'melee', pattern: [{ type: 'hop' }, { type: 'lunge' }], look: { shape: 'fish', body: '#f08040', accent: '#40a0f0' }, xp: 3 },
    { id: 'inkspitter', name: 'Inkspitter', archetype: 'ranged', pattern: [{ type: 'fanShot', n: 3, spread: 0.5 }, { type: 'snare' }], look: { shape: 'fish', body: '#8040c0', accent: '#202040' }, xp: 4 },
    { id: 'shieldbuddy', name: 'Shieldbuddy', archetype: 'shielded', pattern: [{ type: 'sidestep', t: 0.4 }, { type: 'lunge' }], look: { shape: 'knight', body: '#e04040', accent: '#f0f0f0' }, xp: 5 },
    { id: 'skimmer', name: 'Skimmer', archetype: 'flyer', pattern: [{ type: 'circleGlide', t: 1.0, r: 24 }, { type: 'charge', speed: 200 }], look: { shape: 'bird', body: '#3a5a8a', accent: '#f0d040' }, xp: 4 },
    { id: 'inkblot', name: 'Inkblot', archetype: 'burrower', pattern: [{ type: 'popBehind' }], look: { shape: 'mole', body: '#202030', accent: '#f0f0f0' }, xp: 4 },
  ],
  // Sub-bosses (SPEC 2.7 W3): patterns are compositions of pattern primitives (bosses.js).
  bosses: {
    // Main boss (SPEC 2.7 W3, D13: 4 patterns — phase 2 counts as one).
    vex: { id: 'vex', name: 'Inkmaster Vex', kind: 'main', sting: 'vex', size: [44, 40], look: { body: '#5a2a8a', accent: '#40e0f0', crown: true },
      patterns: [
        { name: 'ink rain', prims: [{ type: 'inkRain', n: 5, r: 16 }] },
        { name: 'triple tentacle slam', prims: [{ type: 'lob', r: 22 }, { type: 'lob', r: 22 }, { type: 'lob', r: 22 }] },
        { name: 'hypno-lights', prims: [{ type: 'hypno', r: 22, t: 1.6 }] },
      ],
      phase2: [{ name: 'grayscale wave', prims: [{ type: 'grayWave', t: 3, still: 0.6 }] }] },
    'mc-bubbles': { id: 'mc-bubbles', name: 'MC Bubbles', kind: 'sub', sting: 'vex', size: [26, 30], look: { body: '#60c0f0', accent: '#f060c0' },
      patterns: [
        { name: 'bubble barrage', prims: [{ type: 'fanShot', n: 5, spread: 1.6 }, { type: 'fanShot', n: 4, spread: 1.2 }] },
        { name: 'bass drop', prims: [{ type: 'slamRing', r: 110 }] },
      ] },
    'squeegee-sergeant': { id: 'squeegee-sergeant', name: 'Squeegee Sergeant', kind: 'sub', sting: 'vex', size: [30, 28], look: { body: '#5a5a6a', accent: '#40c0e0' }, summons: 'splatterfish',
      patterns: [
        { name: 'roller charge', prims: [{ type: 'slowPuddle' }, { type: 'charge', speed: 200 }, { type: 'slowPuddle' }] },
        { name: 'squeegee slam', prims: [{ type: 'beam' }] },
        { name: 'call the Splatterfish', prims: [{ type: 'summon', n: 2 }] },
      ] },
    'dj-tentaclaw': { id: 'dj-tentaclaw', name: 'DJ Tentaclaw', kind: 'sub', sting: 'vex', size: [32, 32], look: { body: '#a040a0', accent: '#f0f040' },
      patterns: [
        { name: 'beat-drop shockwaves', prims: [{ type: 'slamRing', r: 70 }, { type: 'slamRing', r: 110 }] },
        { name: 'vinyl throw', prims: [{ type: 'bounceShot' }] },
        { name: 'light-rig sweep', prims: [{ type: 'sweep', len: 100 }] },
      ] },
  },
  // Main-boss keep (the Grayscale Engine, docs/WORLDS.md), opens when all three medallions are owned [W1 keep pattern, R3-15]:
  // the Drain Hall (doors slam, five waves) → the engine room (Inkmaster Vex; drops nothing) → the Colour Vault, where the
  // Ice Bloom waits in the royal chest (w3-royal-vault #368).
  throne: { id: 'grayscale-engine', name: 'The Grayscale Engine', world: 3, floors: ['1F'], start: 'ge-hall', throne: true, vault: 'ge-vault',
    theme: { floor: '#5a5a6a', floor2: '#545464', wall: '#2a2a3a', wallTop: '#8a40a0' },
    rooms: {
      'ge-hall': { floor: '1F', gx: 0, gy: 2, type: 'wave', waves: [[['splatterfish', 3]], [['inkspitter', 2], ['splatterfish', 1]], [['skimmer', 2], ['inkblot', 2]], [['shieldbuddy', 2], ['inkspitter', 2]], [['shieldbuddy', 2], ['skimmer', 2], ['splatterfish', 1]]], doors: { n: { to: 'throne' } } },
      throne: { floor: '1F', gx: 0, gy: 1, type: 'sub', boss: 'vex', doors: { s: { to: 'ge-hall' }, n: { to: 'ge-vault', lock: 'boss', royal: true } } },
      'ge-vault': { floor: '1F', gx: 0, gy: 0, type: 'vault', chest: { item: 'tool:iceBloom', royal: true }, doors: { s: { to: 'throne', lock: 'boss', royal: true } } },
    } },
  // Dungeons (docs/WORLDS.md World 3). [MONSTERS FIRST] every room has hand-placed foes (or waves); a room's chest appears once they are beaten. Rooms are 40×30 tiles; objects/stairs use room tile coords; gx/gy place the mini-map.
  dungeons: {
    'reefside-studio': {
      id: 'reefside-studio', name: 'Reefside Studio', world: 3, medallion: 'ink', floors: ['1F', '2F'], start: 'rs-entry',
      theme: { floor: '#3a3a5a', floor2: '#363654', wall: '#1a1a3a', wallTop: '#e040a0' },
      rooms: {
        'rs-entry': { foes: [['splatterfish', 12, 12], ['skimmer', 28, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'rs-k1' } } },
        'rs-k1': { foes: [['splatterfish', 10, 10], ['inkblot', 30, 18], ['inkspitter', 12, 22]], floor: '1F', gx: 1, gy: 0, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'rs-entry' }, e: { to: 'rs-booth', lock: 'small' } } },
        'rs-booth': { foes: [['shieldbuddy', 12, 18], ['skimmer', 28, 10], ['splatterfish', 26, 22]], floor: '1F', gx: 2, gy: 0, type: 'normal', stairs: { x: 30, y: 6, to: 'rs-mix' }, doors: { w: { to: 'rs-k1', lock: 'small' } } },
        // signature: paint the floor so every row matches its colour bar (hit a tile to cycle red → blue → yellow)
        'rs-mix': { foes: [['skimmer', 32, 24], ['splatterfish', 8, 24]], floor: '2F', gx: 2, gy: 1, type: 'puzzle', puzzle: { kind: 'paintRows' }, stairs: { x: 30, y: 6, to: 'rs-booth' },
          objects: [
            { type: 'colorBar', x: 11, y: 12, c: 1 }, ...[14, 17, 20, 23].map((x, i) => ({ type: 'paintTile', x, y: 12, c: i % 3 })),
            { type: 'colorBar', x: 11, y: 18, c: 2 }, ...[14, 17, 20, 23].map((x, i) => ({ type: 'paintTile', x, y: 18, c: (i + 1) % 3 })),
          ],
          doors: { e: { to: 'rs-bk' }, s: { to: 'rs-stage', lock: 'puzzle' } } },
        // trap room "Sound Check": doors shut while Splatterfish flop in; the big key waits on the far side
        'rs-bk': { floor: '2F', gx: 3, gy: 1, type: 'wave', waves: [[['melee', 3]], [['melee', 2], ['ranged', 1]]], chest: { item: 'bigKey' }, doors: { w: { to: 'rs-mix' } } },
        'rs-stage': { foes: [['inkspitter', 8, 8], ['splatterfish', 28, 20], ['shieldbuddy', 12, 20], ['skimmer', 30, 12]], floor: '1F', gx: 2, gy: 2, type: 'normal', doors: { n: { to: 'rs-mix', lock: 'puzzle' }, w: { to: 'rs-bc', lock: 'big' }, e: { to: 'rs-sub', lock: 'math' } } },
        'rs-bc': { foes: [['inkblot', 10, 18], ['skimmer', 30, 20]], floor: '1F', gx: 1, gy: 2, type: 'bigchest', chest: { item: 'gear:boots-3' }, doors: { e: { to: 'rs-stage', lock: 'big' } } },
        'rs-sub': { floor: '1F', gx: 3, gy: 2, type: 'sub', boss: 'mc-bubbles', doors: { w: { to: 'rs-stage', lock: 'math' }, e: { to: 'rs-medal', lock: 'boss' } } },
        'rs-medal': { floor: '1F', gx: 4, gy: 2, type: 'treasure', doors: { w: { to: 'rs-sub', lock: 'boss' } } },
      },
    },
    'kelpscreen-labyrinth': {
      id: 'kelpscreen-labyrinth', name: 'Kelpscreen Labyrinth', world: 3, medallion: 'wave', floors: ['B1', '1F'], start: 'kl-entry',
      theme: { floor: '#2a5a5a', floor2: '#285454', wall: '#1a3a2a', wallTop: '#3a8a5a' },
      rooms: {
        'kl-entry': { foes: [['splatterfish', 12, 14], ['skimmer', 28, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', doors: { e: { to: 'kl-k1' }, s: { to: 'kl-eels', lock: 'small' } } },
        'kl-k1': { foes: [['inkspitter', 32, 8], ['splatterfish', 10, 20], ['inkblot', 28, 20]], floor: '1F', gx: 1, gy: 0, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'kl-entry' }, e: { to: 'kl-sluice' } } },
        // signature: set the sluice gates (open/shut) so the current floats the raft down to the centre
        'kl-sluice': { foes: [['skimmer', 8, 24], ['splatterfish', 32, 24]], floor: '1F', gx: 2, gy: 0, type: 'puzzle', puzzle: { kind: 'sluiceSet', target: [1, 0, 1] },
          objects: [{ type: 'sluice', x: 12, y: 10, n: 1 }, { type: 'sluice', x: 20, y: 10, n: 2, on: true }, { type: 'sluice', x: 28, y: 10, n: 3 }, ...[12, 16, 20, 24, 28].map((x) => ({ type: 'conveyor', x, y: 18, dir: 'right', speed: 30 }))],
          doors: { w: { to: 'kl-k1' }, s: { to: 'kl-centre', lock: 'puzzle' } } },
        // trap room "Eel Garden": the kelp closes, Inkspitters surface
        'kl-eels': { floor: 'B1', gx: 0, gy: 1, type: 'wave', waves: [[['ranged', 2]], [['ranged', 2], ['melee', 1]]], doors: { n: { to: 'kl-entry', lock: 'small' }, e: { to: 'kl-centre' } } },
        'kl-centre': { foes: [['shieldbuddy', 12, 18], ['inkspitter', 32, 8], ['skimmer', 26, 22]], floor: 'B1', gx: 2, gy: 1, type: 'bigkey', chest: { item: 'bigKey' }, doors: { n: { to: 'kl-sluice', lock: 'puzzle' }, w: { to: 'kl-eels' }, s: { to: 'kl-sub', lock: 'math' } } },
        'kl-sub': { floor: '1F', gx: 2, gy: 2, type: 'sub', boss: 'squeegee-sergeant', doors: { n: { to: 'kl-centre', lock: 'math' }, w: { to: 'kl-bc', lock: 'big' }, e: { to: 'kl-medal', lock: 'boss' } } },
        'kl-bc': { foes: [['splatterfish', 10, 18], ['inkblot', 30, 20]], floor: '1F', gx: 1, gy: 2, type: 'bigchest', chest: { item: 'gold:200' }, doors: { e: { to: 'kl-sub', lock: 'big' } } },
        'kl-medal': { floor: '1F', gx: 3, gy: 2, type: 'treasure', doors: { w: { to: 'kl-sub', lock: 'boss' } } },
      },
    },
    'the-bleachworks': {
      id: 'the-bleachworks', name: 'The Bleachworks', world: 3, medallion: 'prism', floors: ['1F', '2F', '3F'], start: 'bw-entry',
      theme: { floor: '#8a8a8a', floor2: '#848484', wall: '#3a3a3a', wallTop: '#6a6a6a' },
      rooms: {
        'bw-entry': { foes: [['splatterfish', 12, 12], ['skimmer', 28, 10]], floor: '1F', gx: 0, gy: 2, type: 'entrance', doors: { e: { to: 'bw-k1' } } },
        'bw-k1': { foes: [['inkspitter', 8, 8], ['splatterfish', 28, 20], ['inkblot', 12, 20]], floor: '1F', gx: 1, gy: 2, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'bw-entry' }, e: { to: 'bw-k2', lock: 'small' } } },
        'bw-k2': { foes: [['shieldbuddy', 12, 18], ['skimmer', 30, 12], ['splatterfish', 26, 22]], floor: '1F', gx: 2, gy: 2, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'bw-sort' }, doors: { w: { to: 'bw-k1', lock: 'small' }, e: { to: 'bw-sub', lock: 'small' } } },
        // signature: conveyor sorting — push each colour crate onto the plate of its colour
        'bw-sort': { foes: [['skimmer', 34, 12]], floor: '2F', gx: 2, gy: 1, type: 'puzzle', puzzle: { kind: 'crateSort' }, stairs: { x: 30, y: 6, to: 'bw-k2' },
          objects: [
            { type: 'block', x: 14, y: 16, c: 0 }, { type: 'block', x: 20, y: 16, c: 1 }, { type: 'block', x: 26, y: 16, c: 2 },
            { type: 'plate', x: 14, y: 9, c: 0, weight: 'block' }, { type: 'plate', x: 20, y: 9, c: 1, weight: 'block' }, { type: 'plate', x: 26, y: 9, c: 2, weight: 'block' },
            ...[16, 18, 22, 24].map((x) => ({ type: 'conveyor', x, y: 22, dir: 'left', speed: 35 })), { type: 'resetSwitch', x: 20, y: 24 },
          ],
          doors: { w: { to: 'bw-bc', lock: 'big' }, e: { to: 'bw-vat', lock: 'math' }, n: { to: 'bw-bk', lock: 'puzzle' } } },
        // trap room "Bleach Vat": drones chase while the catwalk rattles
        'bw-vat': { floor: '2F', gx: 3, gy: 1, type: 'wave', waves: [[['flyer', 3]], [['flyer', 2], ['melee', 2]]], doors: { w: { to: 'bw-sort', lock: 'math' } } },
        'bw-bc': { foes: [['inkblot', 10, 18], ['skimmer', 30, 20]], floor: '2F', gx: 1, gy: 1, type: 'bigchest', chest: { item: 'gold:150' }, doors: { e: { to: 'bw-sort', lock: 'big' } } },
        'bw-bk': { foes: [['shieldbuddy', 14, 16], ['inkspitter', 32, 8], ['splatterfish', 10, 22]], floor: '3F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, doors: { s: { to: 'bw-sort', lock: 'puzzle' }, e: { to: 'bw-k3', lock: 'small' } } },
        'bw-k3': { foes: [['skimmer', 10, 10], ['inkspitter', 32, 10], ['inkblot', 26, 22], ['splatterfish', 12, 20]], floor: '3F', gx: 3, gy: 0, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'bw-bk', lock: 'small' } } },
        'bw-sub': { floor: '1F', gx: 3, gy: 2, type: 'sub', boss: 'dj-tentaclaw', doors: { w: { to: 'bw-k2', lock: 'small' }, e: { to: 'bw-medal', lock: 'boss' } } },
        'bw-medal': { floor: '1F', gx: 4, gy: 2, type: 'treasure', doors: { w: { to: 'bw-sub', lock: 'boss' } } },
      },
    },
  },
  music: { overworld: 'w3_overworld', town: 'w3_town', area2: 'w3_area2', dungeon: 'w3_dungeon' },
  // Regions in cell coords (first match wins): the pier, the three islands, the central reef, the south shore.
  regions: [
    { name: 'Neon Pier', x0: 3, y0: 8, x1: 4, y1: 9, spawns: [], music: 'town' },
    { name: 'Studio Isle', x0: 1, y0: 1, x1: 6, y1: 4, spawns: ['splatterfish', 'inkspitter'] },
    { name: 'Record Isle', x0: 16, y0: 1, x1: 22, y1: 4, spawns: ['skimmer', 'shieldbuddy'], music: 'area2' },
    { name: 'Lighthouse Reef', x0: 17, y0: 7, x1: 22, y1: 16, spawns: ['inkblot', 'skimmer'], music: 'area2' },
    { name: 'Coral Flats', x0: 5, y0: 5, x1: 16, y1: 12, spawns: ['inkspitter', 'splatterfish'] },
    { name: 'Grayscale Shore', x0: 1, y0: 10, x1: 16, y1: 16, spawns: ['shieldbuddy', 'inkblot', 'splatterfish'] },
  ],
};
