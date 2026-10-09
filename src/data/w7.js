// World 7 — Aetheria, the Shattered Expanse (floating archipelago, 30×22 cells [D45]). Map = the hand-designed sketch from
// docs/WORLDS.md (D22) + placements. S49: overworld, Skydock Aeris, enemies (G16). S50: four dungeons + the Four Lamentations. S51: Seraphel (two forms, D46) + the Star Compass.
export const W7 = {
  id: 7, name: 'Aetheria', band: 6,
  lush: true, // [W7 Phase 1] the W1-standard lush pass: organic shores, paving, yards, big trees, secret scenes, crystal-spire landmark, set pieces
  sketch: [
    '##############################',
    '#====.....o..:B:..oo....=====#',
    '#===......::::::::oo....=====#',
    '#==..4...:==========:....1.==#',
    '#==.....::=====^^===::......=#',
    '#===..:::===..H.====::...====#',
    '#====.:=====.....====:.======#',
    '#=====:=====..o..=====:======#',
    '#.....:......:::......:.....=#',
    '#.*...:::::::TT::::::::...*.=#',
    '#.....====...TT...====......=#',
    '#==========..::..============#',
    '#~~~~~====...::...===..:::..=#',
    '#~~2:::::::::::::::::::.3...=#',
    '#~~~~~====...::...====..:...=#',
    '#=========...::....=====.:.==#',
    '#====..*....SS.....=====...==#',
    '#====.......::......===..o..=#',
    '#=======....::..*.=====.....=#',
    '#=====..v.*.......====..*...=#',
    '#========.....==========....=#',
    '##############################',
  ],
  // Liquid A = lava (the Ember isle; Ice Bloom crusts it), liquid B = the cloud sea between the isles (soft clouds: you can't walk on them).
  liquids: { a: { name: 'lava', behaviour: 'block' }, b: { name: 'cloud sea', behaviour: 'block' } },
  palette: { ground: '#b8c8e8', ground2: '#b0c0e0', flower: '#f0e0ff', path: '#e8e0c8', tree: '#6a7ab0', treeTop: '#8a9ad0', cliff: '#5a6090', cliffTop: '#a0a8d8', upper: '#d0d8f0', liqA: '#f06020', liqB: '#f4f6ff', shore: '#ffffff', town: '#c0b0e0', pad: '#a0a0b0' },
  // No relic dungeon in Aetheria (the Star Compass is this world's reward). Secrets use D27 mechanics.
  gates: {
    relic: null,
    secrets: [
      { cell: [2, 9], gate: 'heavyBoulder', reward: 'gale-shrine' },
      { cell: [26, 9], gate: 'crackedRock', reward: 'umbral-vault-gold' },
      { cell: [7, 16], gate: 'pinHole', reward: 'crystal-garden' },
      { cell: [24, 19], gate: 'bramble', reward: 'sky-chest' },
      { cell: [16, 18], gate: 'heavyBoulder', reward: 'gold-nook-1' }, // [S55] D39 top-up
      { cell: [10, 19], gate: 'pinHole', reward: 'potion-nook-2' }, // [S55] D39 top-up
    ],
  },
  // Skydock Aeris inside the 2×2 T cells (16×16 tiles): cloud-docks around crystal spires on three terraces.
  town: {
    name: 'Skydock Aeris',
    buildings: [
      { id: 'shop', name: 'Lyra\'s Sky Goods', x: 1, y: 1, w: 5, h: 4, door: 2, roof: '#8a6ad0' },
      { id: 'harbor', name: 'Harbor Office', x: 9, y: 1, w: 6, h: 4, door: 3, roof: '#5a7ab0' },
      { id: 'observatory', name: 'Oracle\'s Observatory', x: 1, y: 9, w: 5, h: 4, door: 2, roof: '#3a3a7a' },
      { id: 'mooring', name: 'Mooring Loft', x: 10, y: 9, w: 5, h: 4, door: 2, roof: '#c0a060' },
    ],
    heal: { x: 7, y: 7, name: 'Aether Spring' },
    npcs: [
      { id: 'stratos', name: 'Captain Stratos', x: 4, y: 7, look: ['#e0e0e0', '#2a4a8a'], lines: ['The Spire only opens for four medallions.', 'No medallions, no apocalypse — house rules.'] },
      { id: 'lyra', name: 'Lyra', inside: 'shop', shop: true, x: 7, y: 3, look: ['#f0e0a0', '#8a6ad0'], lines: ['Sky goods, fresh off the cloud-boats!'] },
      { id: 'vess', name: 'Oracle Vess', x: 11, y: 7, look: ['#c0c0f0', '#3a3a7a'], lines: ['Beyond the Fallen Star… a star that never fell.'] },
      { id: 'pip', name: 'Pip', x: 8, y: 14, look: ['#6a3a1a', '#f08040'], quest: 'w7-stowaway-map', lines: ['I stowed away on an airship! Want to see my map?'] },
      { id: 'gale', name: 'Dockmaster Gale', x: 12, y: 14, look: ['#a0a0a0', '#40a0c0'], quest: 'w7-four-beacons', lines: ['Four beacons, four isles. Light them all and the sky sings.'] },
    ],
  },
  // Enemies (G16): one attack pattern each. xp per kill (tuned by the audit, G09).
  enemies: [
    { id: 'aetherwisp', name: 'Aetherwisp', archetype: 'flyer', pattern: [{ type: 'sidestep' }, { type: 'fanShot', n: 3, spread: 0.6 }], look: { shape: 'bird', body: '#c0e0ff', accent: '#8060f0' }, xp: 4 },
    { id: 'crystalsentinel', name: 'Crystalsentinel', archetype: 'shielded', pattern: [{ type: 'shellHide', t: 0.6 }, { type: 'slamRing', r: 70 }], look: { shape: 'knight', body: '#a0c0f0', accent: '#f0f0ff' }, xp: 5 },
    { id: 'manadrake', name: 'Manadrake', archetype: 'melee', pattern: [{ type: 'charge', speed: 170 }], look: { shape: 'blob', body: '#8a60d0', accent: '#f0d060' }, xp: 3 },
    { id: 'spellsniper', name: 'Spellsniper', archetype: 'ranged', pattern: [{ type: 'beam' }], look: { shape: 'bush', body: '#4a4a8a', accent: '#f060c0' }, xp: 4 },
    { id: 'riftmole', name: 'Riftmole', archetype: 'burrower', pattern: [{ type: 'popBehind' }, { type: 'lunge' }], look: { shape: 'mole', body: '#2a2a4a', accent: '#a060f0' }, xp: 4 },
  ],
  bosses: {
    // Final boss of the seven worlds (D46): form 1 (human, 4 patterns, Lamentation echoes at 66 %/33 %) → kneel + transformation →
    // form 2 (flying, one black wing, NEW bar = 2× HP, 4 patterns ending in the Supernova Countdown at 30 %). Audit counts 4 + 4.
    seraphel: { id: 'seraphel', name: 'Seraphel, the Fallen Star', kind: 'final', sting: 'seraphel', size: [30, 40], look: { body: '#c8c8e0', accent: '#20202a' },
      summons: 'aetherwisp', echoes: 1, music2: 'w7_boss_final',
      patterns: [
        { name: 'starfall blades', prims: [{ type: 'inkRain', n: 6 }] },
        { name: 'wing buffet', prims: [{ type: 'gust', r: 140, push: 90, t: 1.0 }] },
        { name: 'moonlight slash', prims: [{ type: 'beam' }] },
        { name: 'lamentation echoes', prims: [{ type: 'summon', n: 1 }, { type: 'slamRing', r: 60 }] },
      ],
      form2: { name: 'Seraphel, Wings of the Fallen Star', size: [36, 40], look: { body: '#d8d8f0', accent: '#10101a', wing: true },
        patterns: [
          { name: 'aerial dive slash', prims: [{ type: 'dive' }, { type: 'charge', speed: 220 }] },
          { name: 'black-feather storm', prims: [{ type: 'inkRain', n: 8 }] },
          { name: 'sword beam sweep', prims: [{ type: 'sweep' }, { type: 'beam' }] },
        ],
        finale: { at: 0.3, patterns: [{ name: 'supernova countdown', prims: [{ type: 'supernova' }] }] } } },
    // The Four Lamentations (SPEC 2.7 W7): 3 patterns each.
    sylphrena: { id: 'sylphrena', name: 'Sylphrena, Lament of Gale', kind: 'sub', sting: 'seraphel', size: [28, 30], look: { body: '#c0f0ff', accent: '#4080c0' },
      patterns: [
        { name: 'cyclone walls', prims: [{ type: 'gust', r: 120, push: 70, t: 1.0 }] },
        { name: 'dive-bomb gust', prims: [{ type: 'dive' }] },
        { name: 'updraft lift', prims: [{ type: 'zone', r: 30 }, { type: 'slamRing', r: 50 }] },
      ] },
    cindrax: { id: 'cindrax', name: 'Cindrax, Lament of Ember', kind: 'sub', sting: 'seraphel', size: [30, 30], look: { body: '#c04020', accent: '#ffd040' },
      patterns: [
        { name: 'meteor marks', prims: [{ type: 'inkRain', n: 5 }] },
        { name: 'flame dash', prims: [{ type: 'charge', speed: 200 }, { type: 'zone', r: 22 }] },
        { name: 'ember shield', prims: [{ type: 'shellHide', t: 0.8 }] },
      ] },
    nerissa: { id: 'nerissa', name: 'Nerissa, Lament of Tide', kind: 'sub', sting: 'seraphel', size: [30, 28], look: { body: '#4090d0', accent: '#c0f0f0' },
      patterns: [
        { name: 'tidal wave', prims: [{ type: 'sweep' }] },
        { name: 'whirlpool pull', prims: [{ type: 'pull' }] },
        { name: 'bubble prison', prims: [{ type: 'snare' }] },
      ] },
    nocturne: { id: 'nocturne', name: 'Nocturne, Lament of Umbra', kind: 'sub', sting: 'seraphel', size: [28, 32], look: { body: '#2a2040', accent: '#a080ff' },
      patterns: [
        { name: 'eclipse orbs', prims: [{ type: 'fanShot', n: 3, spread: 0.7 }, { type: 'slowPuddle' }] },
        { name: 'shadow clones', prims: [{ type: 'popBehind' }, { type: 'lunge' }] },
        { name: 'nightfall', prims: [{ type: 'nightfall', t: 3 }, { type: 'inkRain', n: 4 }] },
      ] },
  },
  // Main-boss keep: the Starfall Spire (docs/WORLDS.md), opens with four medallions [W1 keep pattern, R3-15]: the Skyfall
  // Hall (doors slam, five waves) → the Spire (Seraphel, both forms; drops nothing; pillars shelter you from the wing
  // buffet) → the Star Vault, where the Star Compass waits in the royal chest (w7-royal-vault #372).
  throne: { id: 'starfall-spire', name: 'The Starfall Spire', world: 7, floors: ['1F'], start: 'ss-hall', throne: true, vault: 'ss-vault',
    theme: { floor: '#3a3a6a', floor2: '#363664', wall: '#14142a', wallTop: '#e0e8ff', tint: 'umbral' },
    rooms: {
      'ss-hall': { floor: '1F', gx: 0, gy: 2, type: 'wave', waves: [[['manadrake', 3]], [['aetherwisp', 2], ['manadrake', 1]], [['riftmole', 2], ['spellsniper', 2]], [['crystalsentinel', 2], ['aetherwisp', 2]], [['crystalsentinel', 2], ['spellsniper', 2], ['riftmole', 1]]], doors: { n: { to: 'throne' } } },
      throne: { floor: '1F', gx: 0, gy: 1, type: 'sub', boss: 'seraphel', doors: { s: { to: 'ss-hall' }, n: { to: 'ss-vault', lock: 'boss', royal: true } }, objects: [[10, 9], [30, 9], [10, 20], [30, 20]].map(([x, y]) => ({ type: 'post', x, y })) },
      'ss-vault': { floor: '1F', gx: 0, gy: 0, type: 'vault', chest: { item: 'tool:starCompass', royal: true }, doors: { s: { to: 'throne', lock: 'boss', royal: true } } },
    } },
  // Dungeons (docs/WORLDS.md World 7) — a master remix of every earlier mechanic. Rooms are 40×30 tiles. [MONSTERS FIRST] every room has hand-placed foes (or waves); a room's chest appears once they are beaten.
  dungeons: {
    'gale-sanctum': {
      id: 'gale-sanctum', name: 'The Gale Sanctum', world: 7, medallion: 'gale', floors: ['1F', '2F', '3F'], start: 'gs-entry',
      theme: { floor: '#d8e8f8', floor2: '#d0e0f0', wall: '#6080a0', wallTop: '#ffffff', tint: 'gale' },
      rooms: {
        'gs-entry': { foes: [['manadrake', 12, 10], ['aetherwisp', 26, 20]], floor: '1F', gx: 0, gy: 2, type: 'entrance', doors: { e: { to: 'gs-k1' } } },
        'gs-k1': { foes: [['aetherwisp', 10, 8], ['manadrake', 30, 22], ['crystalsentinel', 12, 22]], floor: '1F', gx: 1, gy: 2, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'gs-entry' }, e: { to: 'gs-cloud', lock: 'small' } } },
        'gs-cloud': { foes: [['crystalsentinel', 12, 10], ['aetherwisp', 26, 20], ['manadrake', 10, 22]], floor: '1F', gx: 2, gy: 2, type: 'normal', stairs: { x: 30, y: 6, to: 'gs-fans' }, doors: { w: { to: 'gs-k1', lock: 'small' }, e: { to: 'gs-sub', lock: 'math' } } },
        // signature: puff the three cloud fans spinning together (Gust Jar) — the cloud bridge drifts across
        'gs-fans': { foes: [['aetherwisp', 10, 22], ['manadrake', 30, 22]], floor: '2F', gx: 2, gy: 1, type: 'puzzle', puzzle: { kind: 'updraft' },
          objects: [{ type: 'fan', x: 14, y: 9 }, { type: 'fan', x: 20, y: 9 }, { type: 'fan', x: 26, y: 9 }],
          stairs: { x: 30, y: 6, to: 'gs-cloud' }, doors: { w: { to: 'gs-bc', lock: 'big' }, n: { to: 'gs-eye', lock: 'puzzle' } } },
        'gs-bc': { foes: [['crystalsentinel', 10, 10], ['spellsniper', 30, 20], ['aetherwisp', 12, 22]], floor: '2F', gx: 1, gy: 1, type: 'bigchest', chest: { item: 'gear:boots-7' }, doors: { e: { to: 'gs-fans', lock: 'big' } } },
        // trap room "Eye of the Storm": Aetherwisps blink in
        'gs-eye': { floor: '3F', gx: 2, gy: 0, type: 'wave', waves: [[['flyer', 3]], [['flyer', 2], ['melee', 2]]], doors: { s: { to: 'gs-fans', lock: 'puzzle' }, w: { to: 'gs-bk' } } },
        'gs-bk': { foes: [['aetherwisp', 10, 8], ['spellsniper', 30, 22], ['manadrake', 8, 20]], floor: '3F', gx: 1, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, pit: { x: 18, y: 16, to: 'gs-cloud' }, doors: { e: { to: 'gs-eye' } } },
        'gs-sub': { floor: '1F', gx: 3, gy: 2, type: 'sub', boss: 'sylphrena', doors: { w: { to: 'gs-cloud', lock: 'math' }, e: { to: 'gs-medal', lock: 'boss' } } },
        'gs-medal': { floor: '1F', gx: 4, gy: 2, type: 'treasure', doors: { w: { to: 'gs-sub', lock: 'boss' } } },
      },
    },
    'emberfall-foundry': {
      id: 'emberfall-foundry', name: 'Emberfall Foundry', world: 7, medallion: 'ember', floors: ['B1', '1F', '2F'], start: 'ef-entry',
      theme: { floor: '#5a3a2a', floor2: '#543626', wall: '#2a1410', wallTop: '#ff8030', tint: 'ember' },
      rooms: {
        'ef-entry': { foes: [['manadrake', 12, 10], ['crystalsentinel', 28, 20]], floor: '1F', gx: 0, gy: 1, type: 'entrance', doors: { e: { to: 'ef-vent' } } },
        // signature: crust the heat vents with ICE shots (tap one — the right ammo is picked) while the conveyors run
        'ef-vent': { foes: [['manadrake', 8, 24], ['crystalsentinel', 32, 24]], floor: '1F', gx: 1, gy: 1, type: 'puzzle', puzzle: { kind: 'ventFreeze' },
          objects: [{ type: 'vent', x: 12, y: 10 }, { type: 'vent', x: 20, y: 8 }, { type: 'vent', x: 28, y: 10 }, ...[14, 15, 16, 24, 25, 26].map((x) => ({ type: 'conveyor', x, y: 18, dir: 'left' }))],
          stairs: { x: 30, y: 6, to: 'ef-ore', needs: 'puzzle' }, doors: { w: { to: 'ef-entry' }, e: { to: 'ef-k1', lock: 'small' } } },
        'ef-ore': { foes: [['manadrake', 10, 10], ['riftmole', 28, 20], ['crystalsentinel', 12, 22]], floor: 'B1', gx: 1, gy: 2, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'ef-vent' }, doors: {} },
        // trap room "Crucible": vents flare, Manadrakes charge
        'ef-k1': { floor: '1F', gx: 2, gy: 1, type: 'wave', waves: [[['melee', 3]], [['melee', 2], ['shielded', 1]]], stairs: { x: 30, y: 6, to: 'ef-bk' }, doors: { w: { to: 'ef-vent', lock: 'small' }, e: { to: 'ef-sub', lock: 'math' } } },
        'ef-bk': { foes: [['crystalsentinel', 10, 10], ['manadrake', 28, 22], ['spellsniper', 12, 22]], floor: '2F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'ef-k1' }, doors: { w: { to: 'ef-bc', lock: 'big' } } },
        'ef-bc': { foes: [['manadrake', 10, 10], ['crystalsentinel', 30, 20], ['aetherwisp', 12, 22]], floor: '2F', gx: 1, gy: 0, type: 'bigchest', chest: { item: 'gold:600' }, doors: { e: { to: 'ef-bk', lock: 'big' } } },
        'ef-sub': { floor: '1F', gx: 3, gy: 1, type: 'sub', boss: 'cindrax', doors: { w: { to: 'ef-k1', lock: 'math' }, e: { to: 'ef-medal', lock: 'boss' } } },
        'ef-medal': { floor: '1F', gx: 4, gy: 1, type: 'treasure', doors: { w: { to: 'ef-sub', lock: 'boss' } } },
      },
    },
    'tidespire-abyss': {
      id: 'tidespire-abyss', name: 'Tidespire Abyss', world: 7, medallion: 'tide', floors: ['1F', '2F', '3F'], start: 'ta-entry',
      theme: { floor: '#3a6a8a', floor2: '#346484', wall: '#14304a', wallTop: '#80e0ff', tint: 'tide' },
      rooms: {
        'ta-entry': { foes: [['riftmole', 12, 10], ['spellsniper', 28, 20]], floor: '1F', gx: 0, gy: 2, type: 'entrance', doors: { e: { to: 'ta-orb1' } } },
        // signature: tide valves raise/lower the orb water — set it to the gauge's star
        'ta-orb1': { foes: [['spellsniper', 8, 24], ['riftmole', 32, 24]], floor: '1F', gx: 1, gy: 2, type: 'puzzle', puzzle: { kind: 'waterLevel', start: 3, max: 4, target: 1 },
          objects: [{ type: 'drumValve', x: 14, y: 12, dir: 1 }, { type: 'drumValve', x: 26, y: 12, dir: -1 }, { type: 'poolGauge', x: 20, y: 8 }, { type: 'floatCrate', x: 18, y: 18 }, { type: 'floatCrate', x: 22, y: 18 }],
          stairs: { x: 30, y: 6, to: 'ta-orb2', needs: 'puzzle' }, doors: { w: { to: 'ta-entry' }, e: { to: 'ta-bc', lock: 'big' } } },
        'ta-orb2': { foes: [['riftmole', 12, 10], ['aetherwisp', 26, 20], ['spellsniper', 10, 22]], floor: '2F', gx: 1, gy: 1, type: 'normal', stairs: { x: 30, y: 6, to: 'ta-orb1' }, doors: { w: { to: 'ta-k2' }, e: { to: 'ta-trap', lock: 'small' } } },
        'ta-k2': { foes: [['spellsniper', 10, 10], ['riftmole', 28, 20], ['aetherwisp', 12, 22]], floor: '2F', gx: 0, gy: 1, type: 'key', chest: { item: 'key' }, doors: { e: { to: 'ta-orb2' } } },
        // trap room "Riptide": Riftmoles pop out of portals
        'ta-trap': { floor: '2F', gx: 2, gy: 1, type: 'wave', waves: [[['burrower', 2], ['ranged', 1]], [['burrower', 2], ['flyer', 1]]], stairs: { x: 30, y: 6, to: 'ta-bk' }, doors: { w: { to: 'ta-orb2', lock: 'small' } } },
        'ta-bk': { foes: [['riftmole', 10, 8], ['spellsniper', 30, 22], ['crystalsentinel', 8, 22]], floor: '3F', gx: 2, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'ta-trap' }, pit: { x: 18, y: 16, to: 'ta-orb1' }, doors: {} },
        'ta-bc': { foes: [['aetherwisp', 10, 10], ['riftmole', 30, 20], ['spellsniper', 12, 22]], floor: '1F', gx: 2, gy: 2, type: 'bigchest', chest: { item: 'gold:650' }, doors: { w: { to: 'ta-orb1', lock: 'big' }, e: { to: 'ta-sub', lock: 'math' } } },
        'ta-sub': { floor: '1F', gx: 3, gy: 2, type: 'sub', boss: 'nerissa', doors: { w: { to: 'ta-bc', lock: 'math' }, e: { to: 'ta-medal', lock: 'boss' } } },
        'ta-medal': { floor: '1F', gx: 4, gy: 2, type: 'treasure', doors: { w: { to: 'ta-sub', lock: 'boss' } } },
      },
    },
    'umbral-vault': {
      id: 'umbral-vault', name: 'The Umbral Vault', world: 7, medallion: 'umbral', floors: ['B1', 'B2'], start: 'uv-entry',
      theme: { floor: '#2a2438', floor2: '#262034', wall: '#0e0a18', wallTop: '#a080ff', tint: 'umbral' },
      rooms: {
        'uv-entry': { foes: [['riftmole', 12, 10], ['spellsniper', 28, 20]], floor: 'B1', gx: 1, gy: 0, type: 'entrance', doors: { e: { to: 'uv-hub' } } },
        'uv-hub': { foes: [['crystalsentinel', 10, 10], ['riftmole', 28, 22], ['spellsniper', 12, 22]], floor: 'B1', gx: 2, gy: 0, type: 'key', chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'uv-mirror' }, doors: { w: { to: 'uv-entry' }, e: { to: 'uv-bc', lock: 'big' } } },
        'uv-bc': { foes: [['spellsniper', 10, 10], ['crystalsentinel', 30, 20], ['riftmole', 12, 22]], floor: 'B1', gx: 3, gy: 0, type: 'bigchest', chest: { item: 'gold:700' }, doors: { w: { to: 'uv-hub', lock: 'big' } } },
        // signature: turn the two mirrors (hit them) so both light beams reach their eye-targets
        'uv-mirror': { foes: [['riftmole', 10, 25], ['spellsniper', 26, 26]], floor: 'B2', gx: 1, gy: 1, type: 'puzzle', puzzle: { kind: 'mirrorBeam' },
          objects: [{ type: 'beamSource', x: 6, y: 12, dir: 'right' }, { type: 'mirror', x: 20, y: 12, dir: '\\' }, { type: 'beamTarget', x: 20, y: 6 },
            { type: 'beamSource', x: 6, y: 20, dir: 'right' }, { type: 'mirror', x: 30, y: 20, dir: '\\' }, { type: 'beamTarget', x: 30, y: 15 }],
          stairs: { x: 34, y: 6, to: 'uv-hub' }, doors: { e: { to: 'uv-bk', lock: 'puzzle' } } },
        // trap room "Eclipse": lights out, Spellsnipers laser-line
        'uv-bk': { floor: 'B2', gx: 2, gy: 1, type: 'wave', waves: [[['ranged', 2], ['melee', 1]], [['ranged', 2], ['burrower', 1]]], chest: { item: 'bigKey' }, doors: { w: { to: 'uv-mirror', lock: 'puzzle' }, e: { to: 'uv-sub', lock: 'small' } } },
        'uv-sub': { floor: 'B2', gx: 3, gy: 1, type: 'sub', boss: 'nocturne', doors: { w: { to: 'uv-bk', lock: 'small' }, e: { to: 'uv-medal', lock: 'boss' } } },
        'uv-medal': { floor: 'B2', gx: 4, gy: 1, type: 'treasure', doors: { w: { to: 'uv-sub', lock: 'boss' } } },
      },
    },
  },
  music: { overworld: 'w7_overworld', town: 'w7_town', area2: 'w7_area2', dungeon: 'w7_dungeon' },
  // Regions in cell coords (first match wins): the town, the Spire approach, the four isles, the crossing, the shoals.
  regions: [
    { name: 'Skydock Aeris', x0: 13, y0: 9, x1: 14, y1: 10, spawns: [], music: 'town' },
    { name: 'Starfall Approach', x0: 9, y0: 1, x1: 20, y1: 7, spawns: ['aetherwisp', 'spellsniper'], music: 'area2' },
    { name: 'Gale Isle', x0: 21, y0: 1, x1: 28, y1: 7, spawns: ['aetherwisp', 'manadrake'] },
    { name: 'Umbral Isle', x0: 1, y0: 1, x1: 8, y1: 7, spawns: ['riftmole', 'crystalsentinel'] },
    { name: 'Ember Isle', x0: 1, y0: 11, x1: 9, y1: 15, spawns: ['manadrake', 'crystalsentinel'], music: 'area2' },
    { name: 'Tide Isle', x0: 19, y0: 11, x1: 28, y1: 16, spawns: ['spellsniper', 'riftmole'] },
    { name: 'Worldsong Crossing', x0: 1, y0: 8, x1: 28, y1: 20, spawns: ['manadrake', 'aetherwisp', 'riftmole'] },
  ],
};
