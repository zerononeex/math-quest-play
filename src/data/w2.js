// World 2 — Tumbletop Kingdom (bouncy hills). Map = the hand-designed ring-road sketch from docs/WORLDS.md (D22) + placements.
// S34: overworld, Plip Village, enemies. Dungeons, sub-bosses (S35) and King Gormash (S36) land next.
export const W2 = {
  id: 2, name: 'Tumbletop', band: 1,
  lush: true, // [W2 Phase 1] the W1-standard lush pass: organic shores, paving, yards, big trees, secret scenes, pillar-hill landmark, set pieces
  sketch: [
    '########################',
    '#....^^^^^^H^^^^^^^....#',
    '#..1.^....oo....^.2....#',
    '#....^..~~~~~~..^....*.#',
    '#..::H.~~====~~.H::....#',
    '#..:.^.~==~~==~.^..:...#',
    '#..:.^.~=~oo~=~.^..:*..#',
    '#..:.^.~==~~==~.^..:...#',
    '#T::.v.~~====~~.v..::.S#',
    '#T...v..~~~~~~..v....:.#',
    '#..*.vvvvvvHvvvvv.*..:.#',
    '#.......o......o.....:.#',
    '#R..:::::::::::::::::..#',
    '#...:..............*...#',
    '#...:.....o...B........#',
    '#.*.:..........::......#',
    '#...::::::::::::.......#',
    '########################',
  ],
  // Liquid A = the Soda Lake (blocks walking, ICE freezes), liquid B = fizzing soda shallows (walkable, slows ×0.6).
  liquids: { a: { name: 'soda lake', behaviour: 'block' }, b: { name: 'fizzing soda', behaviour: 'slow', slow: 0.4 } },
  palette: { ground: '#7ccc5a', ground2: '#6ebe4c', flower: '#f8a0c8', path: '#e8c888', tree: '#3a8a4a', treeTop: '#56b060', cliff: '#c08a58', cliffTop: '#e0b078', upper: '#90dc70', liqA: '#58b8f0', liqB: '#a8e0f8', shore: '#f0e0a8', town: '#e8d0b0', pad: '#a0a0b0' },
  // Relic (Glimmer Grotto) sits behind the Big Gap: a hook post (Vine Hook, W5) [D09]. Secrets use D27 mechanics.
  // Relic mini-dungeon (SPEC 2.8, D09): 5 rooms around its gate tool + one other (src/game/relics.js builds the rooms).
  relicDungeon: { id: 'glimmer-grotto', name: 'Glimmer Grotto', relic: 'tide-pearl', relicName: 'Tide Pearl', tools: ['vineHook', 'iceBloom'],
    foes: { 'rl-entry': [['goombrat', 14, 14], ['cloudhopper', 28, 12]], 'rl-gate1': [['spikeball', 10, 20], ['chomper-plant', 32, 22]], 'rl-gate2': [['cloudhopper', 20, 20]] } },
  gates: {
    relic: { gate: 'hookPoint', tool: 'vineHook' },
    secrets: [
      { cell: [20, 6], gate: 'heavyBoulder', reward: 'potion-cave', seed: true },
      { cell: [3, 10], gate: 'crackedRock', reward: 'coin-burrow', seed: true },
      { cell: [19, 13], gate: 'pinHole', reward: 'tiny-gadget-shop', seed: true },
      { cell: [2, 15], gate: 'iceBlock', reward: 'soda-falls-chest' },
      { cell: [21, 3], gate: 'heavyBoulder', reward: 'gold-nook-1' }, // [S55] D39 top-up
      { cell: [18, 10], gate: 'pinHole', reward: 'potion-nook-2' }, // [S55] D39 top-up
    ],
  },
  // Plip Village inside the two T cells (8×16 tiles): three round houses stacked on terraces, lanes lead east to the ring.
  town: {
    name: 'Plip Village',
    buildings: [
      { id: 'shop', name: 'Sella\'s Shell Shop', x: 0, y: 1, w: 5, h: 4, door: 2, roof: '#e05a8a' },
      { id: 'mayor', name: 'Mayor Bop\'s Dome', x: 0, y: 6, w: 5, h: 4, door: 2, roof: '#f0a040' },
      { id: 'pip-house', name: 'Pip\'s Bouncy House', x: 0, y: 11, w: 5, h: 4, door: 2, roof: '#50a0e0' },
    ],
    heal: { x: 6, y: 5, name: 'Soda-Fizz Fountain' },
    npcs: [
      { id: 'tinker-plip', name: 'Tinker Plip', x: 6, y: 8, look: ['#f0f0f0', '#e08a2a'], hint: true, lines: ['Glimmer Grotto glitters across the Big Gap. No legs can cross it…', '…but a hook from the jungle might.'] },
      { id: 'mayor-bop', name: 'Mayor Bop', x: 6, y: 3, look: ['#303030', '#c04060'], quest: 'w2-giggle-delivery', lines: ['Our windmills run on giggles. He stole the giggles!'] },
      { id: 'sella', name: 'Sella', inside: 'shop', shop: true, x: 7, y: 3, look: ['#f0c060', '#40a0a0'], lines: ['Shells bounce. YOU shouldn\'t.'] },
      { id: 'pip', name: 'Pip', x: 6, y: 13, look: ['#a05a2a', '#f0d040'], quest: 'w2-bounce-race', lines: ['I bounced clean over my house yesterday!'] },
    ],
  },
  // Enemies (SPEC 2.7 W2): one attack pattern each. xp per kill (tuned by the audit, G09).
  enemies: [
    { id: 'goombrat', name: 'Goombrat', archetype: 'melee', pattern: [{ type: 'hop' }], look: { shape: 'blob', body: '#a0602a', accent: '#302010' }, xp: 3 },
    { id: 'chomper-plant', name: 'Chomper Plant', archetype: 'turret', pattern: [{ type: 'bounceShot' }, { type: 'bounceShot' }], look: { shape: 'bush', body: '#e04040', accent: '#f8f0f0' }, xp: 4 },
    { id: 'shellback', name: 'Shellback', archetype: 'shielded', pattern: [{ type: 'shellHide', t: 0.8 }, { type: 'charge', speed: 160 }], look: { shape: 'knight', body: '#50a050', accent: '#f08a20' }, xp: 5 },
    { id: 'cloudhopper', name: 'Cloudhopper', archetype: 'flyer', pattern: [{ type: 'dive' }], look: { shape: 'bird', body: '#f0f8ff', accent: '#5a6a8a' }, xp: 4 },
    { id: 'spikeball', name: 'Spikeball', archetype: 'roller', pattern: [{ type: 'rollBounce', speed: 120, gain: 1.25, max: 240, t: 2.0 }], look: { shape: 'ball', body: '#6a6a7a', accent: '#f0f0f0' }, xp: 4 },
  ],
  // Sub-bosses (SPEC 2.7 W2): patterns are compositions of pattern primitives (bosses.js).
  bosses: {
    // Main boss (SPEC 2.7 W2, D13: 4 patterns — phase 2 counts as one).
    gormash: { id: 'gormash', name: 'King Gormash, the Shell Tyrant', kind: 'main', sting: 'gormash', size: [40, 40], look: { body: '#3a8a3a', accent: '#e0602a', crown: true }, summons: 'shellback',
      patterns: [
        { name: 'shell-spin charge', prims: [{ type: 'rollBounce', speed: 170, gain: 1.15, max: 230, t: 2.2 }] },
        { name: 'fire-breath sweep', prims: [{ type: 'sweep', len: 90 }] },
        { name: 'stomp rings', prims: [{ type: 'slamRing', r: 100 }, { type: 'slamRing', r: 70 }] },
      ],
      phase2: [{ name: 'triple-fire + minion call', prims: [{ type: 'fanShot', n: 3, spread: 0.6 }, { type: 'summon', n: 2 }] }] },
    cannonjaw: { id: 'cannonjaw', name: 'Capt. Cannonjaw', kind: 'sub', sting: 'gormash', size: [30, 28], look: { body: '#4a8a4a', accent: '#5a5a6a' },
      patterns: [
        { name: 'cannon volley', prims: [{ type: 'lob', r: 18 }, { type: 'lob', r: 18 }, { type: 'lob', r: 18 }] },
        { name: 'shell-spin charge', prims: [{ type: 'spin' }, { type: 'charge', speed: 190 }] },
      ] },
    wobblewitch: { id: 'wobblewitch', name: 'Wobblewitch', kind: 'sub', sting: 'gormash', size: [24, 32], look: { body: '#7a4aa0', accent: '#f0d040' }, summons: 'goombrat',
      patterns: [
        { name: 'potion lob', prims: [{ type: 'lob', r: 16 }, { type: 'zone', r: 22 }] },
        { name: 'broom dash', prims: [{ type: 'charge', speed: 230 }] },
        { name: 'wobble-taunt', prims: [{ type: 'summon', n: 1 }] },
      ] },
  },
  // Main-boss keep (Gormash's Shell Fort, docs/WORLDS.md), opens when both medallions are owned [W1 keep pattern, R3-15]: the
  // Spike Court (doors slam, five waves) → the throne room (King Gormash; drops nothing) → the Coin Vault, where the Fire
  // Bloom waits in the royal chest (w2-royal-vault #367).
  throne: { id: 'shell-fort', name: 'Gormash\'s Shell Fort', world: 2, floors: ['1F'], start: 'sf-hall', throne: true, vault: 'sf-vault',
    theme: { floor: '#b08a5a', floor2: '#a88252', wall: '#5a3a2a', wallTop: '#8a5a3a' },
    rooms: {
      'sf-hall': { floor: '1F', gx: 0, gy: 2, type: 'wave', waves: [[['goombrat', 3]], [['spikeball', 2], ['goombrat', 1]], [['cloudhopper', 2], ['chomper-plant', 2]], [['shellback', 2], ['spikeball', 2]], [['shellback', 2], ['goombrat', 2], ['cloudhopper', 1]]], doors: { n: { to: 'throne' } } },
      throne: { floor: '1F', gx: 0, gy: 1, type: 'sub', boss: 'gormash', doors: { s: { to: 'sf-hall' }, n: { to: 'sf-vault', lock: 'boss', royal: true } } },
      'sf-vault': { floor: '1F', gx: 0, gy: 0, type: 'vault', chest: { item: 'tool:fireBloom', royal: true }, doors: { s: { to: 'throne', lock: 'boss', royal: true } } },
    } },
  // Dungeons (docs/WORLDS.md World 2). [MONSTERS FIRST] every room has hand-placed foes (or waves); a room's chest appears once they are beaten. Rooms are 40×30 tiles; objects/stairs use room tile coords; gx/gy place the mini-map.
  dungeons: {
    'giggle-caverns': {
      id: 'giggle-caverns', name: 'Giggle Caverns', world: 2, medallion: 'coin', floors: ['1F', '2F', '3F'], start: 'gc-entry',
      theme: { floor: '#c89a6a', floor2: '#c0925f', wall: '#7a3a5a', wallTop: '#a05a7a' },
      rooms: {
        'gc-entry': { foes: [['goombrat', 12, 12], ['cloudhopper', 28, 10]], floor: '1F', gx: 0, gy: 2, type: 'entrance', doors: { e: { to: 'gc-k1' } } },
        'gc-k1': { foes: [['goombrat', 10, 10], ['spikeball', 30, 18], ['goombrat', 12, 22]], floor: '1F', gx: 1, gy: 2, type: 'key', chest: { item: 'key' }, doors: { w: { to: 'gc-entry' }, n: { to: 'gc-wind' } } },
        // signature: a soda gap splits the room; springy mushroom pads bounce you over to the goal switch (bounce-pad puzzle)
        'gc-wind': { foes: [['cloudhopper', 30, 20]], floor: '2F', gx: 1, gy: 1, type: 'puzzle', puzzle: { kind: 'bounceGap' }, water: [[2, 9, 36, 3]], stairs: { x: 30, y: 6, to: 'gc-bk', needs: 'puzzle' },
          objects: [{ type: 'bouncePad', x: 20, y: 14, to: [20, 7] }, { type: 'bouncePad', x: 24, y: 7, to: [24, 14] }, { type: 'goalSwitch', x: 14, y: 5 }],
          doors: { s: { to: 'gc-k1' }, w: { to: 'gc-k2', lock: 'small' }, e: { to: 'gc-bc', lock: 'big' } } },
        'gc-k2': { foes: [['chomper-plant', 8, 8], ['goombrat', 28, 20], ['shellback', 12, 20]], floor: '2F', gx: 0, gy: 1, type: 'key', chest: { item: 'key' }, doors: { e: { to: 'gc-wind', lock: 'small' } } },
        'gc-bc': { foes: [['spikeball', 10, 18], ['cloudhopper', 30, 20]], floor: '2F', gx: 2, gy: 1, type: 'bigchest', chest: { item: 'tool:gustJar' }, doors: { w: { to: 'gc-wind', lock: 'big' } } },
        'gc-bk': { foes: [['shellback', 12, 18], ['chomper-plant', 32, 10], ['goombrat', 26, 22]], floor: '3F', gx: 1, gy: 0, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'gc-wind' }, doors: { e: { to: 'gc-trap', lock: 'small' } } },
        // trap room "Laughing Hall": doors shut, pop-up Goombrats bounce in
        'gc-trap': { floor: '3F', gx: 2, gy: 0, type: 'wave', waves: [[['melee', 3]], [['melee', 2], ['flyer', 1]]], pit: { x: 30, y: 20, to: 'gc-hall' }, doors: { w: { to: 'gc-bk', lock: 'small' } } },
        'gc-hall': { foes: [['shellback', 14, 16], ['spikeball', 26, 18], ['chomper-plant', 8, 8], ['cloudhopper', 30, 12]], floor: '1F', gx: 2, gy: 2, type: 'normal', stairs: { x: 30, y: 6, to: 'gc-trap' }, doors: { e: { to: 'gc-sub', lock: 'math' } } },
        'gc-sub': { floor: '1F', gx: 3, gy: 2, type: 'sub', boss: 'cannonjaw', doors: { w: { to: 'gc-hall', lock: 'math' }, e: { to: 'gc-medal', lock: 'boss' } } },
        'gc-medal': { floor: '1F', gx: 4, gy: 2, type: 'treasure', doors: { w: { to: 'gc-sub', lock: 'boss' } } },
      },
    },
    'soda-springs-depot': {
      id: 'soda-springs-depot', name: 'Soda Springs Depot', world: 2, medallion: 'star', floors: ['B1', '1F'], start: 'sd-entry',
      theme: { floor: '#8aa0b0', floor2: '#8298a8', wall: '#3a4a6a', wallTop: '#5a6a8a' },
      rooms: {
        'sd-entry': { foes: [['goombrat', 12, 14], ['cloudhopper', 26, 10]], floor: '1F', gx: 0, gy: 0, type: 'entrance', stairs: { x: 30, y: 6, to: 'sd-trap' }, doors: { e: { to: 'sd-v1' } } },
        'sd-v1': { foes: [['spikeball', 10, 10], ['goombrat', 30, 18], ['chomper-plant', 32, 8]], floor: '1F', gx: 1, gy: 0, type: 'normal', doors: { w: { to: 'sd-entry' }, e: { to: 'sd-v2', lock: 'small' } } },
        // trap room "Bottling Line": conveyors push toward the vats while Shellbacks roll
        'sd-trap': { floor: 'B1', gx: 0, gy: 1, type: 'wave', waves: [[['shielded', 2]], [['roller', 2]]], chest: { item: 'key' }, stairs: { x: 30, y: 6, to: 'sd-entry' },
          objects: [8, 12, 16, 24, 28].map((x) => ({ type: 'conveyor', x, y: 20, dir: 'left', speed: 40 })), doors: {} },
        // signature: turn the valves in order of rising fizz pitch (bubbles = pitch) to lower the soda
        'sd-v2': { foes: [['goombrat', 12, 22], ['cloudhopper', 30, 24]], floor: '1F', gx: 2, gy: 0, type: 'puzzle', puzzle: { kind: 'valveOrder', order: [2, 3, 1] }, stairs: { x: 30, y: 20, to: 'sd-bk', needs: 'puzzle' },
          objects: [{ type: 'valve', x: 10, y: 10, n: 1, pitch: 3 }, { type: 'valve', x: 20, y: 8, n: 2, pitch: 1 }, { type: 'valve', x: 30, y: 10, n: 3, pitch: 2 }],
          doors: { w: { to: 'sd-v1', lock: 'small' }, e: { to: 'sd-v3' } } },
        'sd-v3': { foes: [['shellback', 12, 18], ['cloudhopper', 28, 10], ['goombrat', 30, 22]], floor: '1F', gx: 3, gy: 0, type: 'normal', chest: { item: 'gold:60' }, doors: { w: { to: 'sd-v2' } } },
        'sd-bk': { foes: [['spikeball', 12, 20], ['chomper-plant', 8, 8], ['shellback', 28, 18]], floor: 'B1', gx: 2, gy: 1, type: 'bigkey', chest: { item: 'bigKey' }, stairs: { x: 30, y: 6, to: 'sd-v2' }, doors: { e: { to: 'sd-bc', lock: 'big' }, s: { to: 'sd-hall' } } },
        'sd-bc': { foes: [['goombrat', 10, 18], ['cloudhopper', 30, 20]], floor: 'B1', gx: 3, gy: 1, type: 'bigchest', chest: { item: 'gear:helmet-2' }, doors: { w: { to: 'sd-bk', lock: 'big' } } },
        'sd-hall': { foes: [['shellback', 14, 16], ['spikeball', 26, 18], ['chomper-plant', 32, 8], ['cloudhopper', 10, 10]], floor: 'B1', gx: 2, gy: 2, type: 'normal', doors: { n: { to: 'sd-bk' }, w: { to: 'sd-sub', lock: 'math' } } },
        'sd-sub': { floor: 'B1', gx: 1, gy: 2, type: 'sub', boss: 'wobblewitch', doors: { e: { to: 'sd-hall', lock: 'math' }, s: { to: 'sd-medal', lock: 'boss' } } },
        'sd-medal': { floor: 'B1', gx: 1, gy: 3, type: 'treasure', doors: { n: { to: 'sd-sub', lock: 'boss' } } },
      },
    },
  },
  music: { overworld: 'w2_overworld', town: 'w2_town', area2: 'w2_area2', dungeon: 'w2_dungeon' },
  // Regions in cell coords (first match wins): the village, the hilltop ring, the lake shore, the east/west rings, the south plains.
  regions: [
    { name: 'Plip Village', x0: 1, y0: 8, x1: 1, y1: 9, spawns: [], music: 'town' },
    { name: 'Pillar Hilltops', x0: 1, y0: 1, x1: 22, y1: 2, spawns: ['cloudhopper', 'goombrat'], music: 'area2' },
    { name: 'Soda Lake Shore', x0: 6, y0: 3, x1: 15, y1: 9, spawns: ['chomper-plant', 'cloudhopper'] },
    { name: 'Windmill West', x0: 1, y0: 3, x1: 5, y1: 11, spawns: ['goombrat', 'shellback'] },
    { name: 'Coin Tower East', x0: 16, y0: 3, x1: 22, y1: 11, spawns: ['spikeball', 'goombrat'] },
    { name: 'Shell Fort Plains', x0: 1, y0: 12, x1: 22, y1: 16, spawns: ['shellback', 'spikeball', 'chomper-plant'] },
  ],
};
