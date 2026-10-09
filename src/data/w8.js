// World 8 — Starhaven, the secret world (36×24 cells [D45]): the Star Plaza (trophy hall, star-shop, rush + survival gates) ringed
// by seven starry echoes of worlds 1–7, the most secrets of any world. Map = the hand-designed sketch in docs/WORLDS.md (D22).
// S52: overworld, plaza, enemies (G17), Astronova (three phases + a false fourth, D47). Rush/Survival gates arrive in S53/S54.
export const W8 = {
  id: 8, name: 'Starhaven', band: 7,
  sketch: [
    '####################################',
    '#..*....o.....::B::.....o.....*....#',
    '#.......:::::::::::::::::::........#',
    '#.~~~~..:....====H====....:..^^^^..#',
    '#.~o~~..:....=.......=....:..^.o^..#',
    '#.~~~~..:....=..o.o..=....:..^^H^..#',
    '#.......:....====:====....:........#',
    '#.*.....1.......:::.......2.....*..#',
    '#.......:.......:.:.......:........#',
    '#====...::::::::TT::::::::::...~~~~#',
    '#=**=...:.......TT:.......:....~o~~#',
    '#=..=...::::::::::::::::::::...~~~~#',
    '#.......:.......:.:.......:........#',
    '#..H....:.......:::.......:....v...#',
    '#..^^^..3.......:S:.......:..*.....#',
    '#.o^^^..:.......:::.......:........#',
    '#..^^^..::::::::::::::::::::..===..#',
    '#.......:......o.....o.....:..=o=..#',
    '#.*.....:..~~~~.....====...:..===..#',
    '#.......:..~o~~.....=*==...:.......#',
    '#..::::::..~~~~.....=.==...::::::..#',
    '#..:*...............*...........*..#',
    '#..o...........o.....o.........o...#',
    '####################################',
  ],
  // Liquid A = starlight pools (block; they heal slowly at their edge outside rush modes), liquid B = nebula (block).
  liquids: { a: { name: 'starlight', behaviour: 'block' }, b: { name: 'nebula', behaviour: 'block' } },
  palette: { ground: '#3a3a6a', ground2: '#363664', flower: '#ffe8a0', path: '#c8b8f0', tree: '#2a2a50', treeTop: '#5a5a90', cliff: '#4a4a80', cliffTop: '#9090d0', upper: '#5a5a8a', liqA: '#a0e0ff', liqB: '#b080e0', shore: '#e8e0ff', town: '#8a7ad0', pad: '#a0a0b0' },
  // No relic here. 12 secrets (D45: the most of any world), every tool used.
  gates: {
    relic: null,
    secrets: [
      { cell: [3, 1], gate: 'heavyBoulder', reward: 'comet-rock-chest' },
      { cell: [30, 1], gate: 'crackedRock', reward: 'star-shell-vault' },
      { cell: [2, 7], gate: 'pinHole', reward: 'star-sprite-village' },
      { cell: [32, 7], gate: 'bramble', reward: 'moon-candy-vault' },
      { cell: [2, 10], gate: 'heavyBoulder', reward: 'echo-drum' },
      { cell: [3, 10], gate: 'crackedRock', reward: 'crystal-crown-cache' },
      { cell: [29, 14], gate: 'pinHole', reward: 'buried-star-chest' },
      { cell: [2, 18], gate: 'bramble', reward: 'nebula-cave-page' },
      { cell: [21, 19], gate: 'heavyBoulder', reward: 'comet-tail-chest' },
      { cell: [4, 21], gate: 'crackedRock', reward: 'lore-mural' },
      { cell: [20, 21], gate: 'pinHole', reward: 'dock-star-banner' },
      { cell: [32, 21], gate: 'bramble', reward: 'chalice-flourish' },
    ],
  },
  // The Star Plaza (2×2 T cells): star-shop (tier-8 set), trophy hall, Stargazer's lodge, the comet post office.
  town: {
    name: 'Star Plaza',
    buildings: [
      { id: 'shop', name: 'Star-shop', x: 1, y: 1, w: 5, h: 4, door: 2, roof: '#8a6ad0' },
      { id: 'trophy-hall', name: 'Trophy Hall', x: 9, y: 1, w: 6, h: 4, door: 3, roof: '#f0c040' },
      { id: 'lodge', name: 'Stargazer\'s Lodge', x: 1, y: 9, w: 5, h: 4, door: 2, roof: '#3a3a8a' },
      { id: 'post', name: 'Comet Post', x: 10, y: 9, w: 5, h: 4, door: 2, roof: '#e08040' },
    ],
    heal: { x: 7, y: 7, name: 'Star Chalice Fountain' },
    npcs: [
      { id: 'attendant', name: 'Star Attendant', x: 4, y: 7, look: ['#f0f0ff', '#8a6ad0'], lines: ['Welcome to Starhaven — where every world\'s light gathers.', 'Astronova waits in the observatory. He is kind… and very wise.'] },
      { id: 'lumi', name: 'Stargazer Lumi', x: 11, y: 7, look: ['#c0c0ff', '#3a3a8a'], quest: 'w8-constellation-cartographer', lines: ['Seven star-charts blew away — one into every echo of your worlds!'] },
      { id: 'star-keeper', name: 'Star Keeper', inside: 'shop', shop: true, x: 7, y: 3, look: ['#ffe8a0', '#8a6ad0'], lines: ['Starforged gear, fresh from the comet kilns.'] },
      { id: 'nova', name: 'Postmaster Nova', x: 8, y: 14, look: ['#f0a060', '#e08040'], quest: 'w8-comet-courier', lines: ['Comet letters fade fast. Can you run?'] },
      { id: 'orion', name: 'Captain Orion', x: 12, y: 14, look: ['#a0a0c0', '#2a4a8a'], quest: 'w8-elite-hunt', lines: ['Seven star elites prowl the echoes. Beat them all, if you dare.'] },
    ],
  },
  // Enemies (G17) — Starhaven's own four; Survival draws from every world's roster (S54).
  enemies: [
    { id: 'stardrop', name: 'Stardrop', archetype: 'hopper', pattern: [{ type: 'lob', r: 16 }, { type: 'hop' }], look: { shape: 'ball', body: '#ffe060', accent: '#ffffff' }, xp: 4 },
    { id: 'cometfish', name: 'Cometfish', archetype: 'roller', pattern: [{ type: 'rollBounce', t: 1.2, speed: 140 }, { type: 'zone', r: 16 }], look: { shape: 'fish', body: '#ff8040', accent: '#ffe060' }, xp: 4 },
    { id: 'nebulisk', name: 'Nebulisk', archetype: 'flyer', pattern: [{ type: 'circleGlide', t: 1.0 }, { type: 'zone', r: 30 }], look: { shape: 'bird', body: '#b080e0', accent: '#f0d0ff' }, xp: 4 },
    { id: 'meteormite', name: 'Meteormite', archetype: 'shielded', pattern: [{ type: 'shellHide', t: 0.6 }, { type: 'lob', r: 20 }], look: { shape: 'knight', body: '#6a5a4a', accent: '#ff6030' }, xp: 5 },
  ],
  bosses: {
    // [D47] Astronova, the wise Warden of the Star: three phases (each its own full bar) and a false fourth — he tests, never hates.
    astronova: { id: 'astronova', name: 'Astronova, Warden of the Star', kind: 'final', sting: 'astronova', size: [32, 40], look: { body: '#e8e0ff', accent: '#ffe070', crown: true },
      patterns: [
        { name: 'star shower', prims: [{ type: 'inkRain', n: 5 }] },
        { name: 'constellation charge', prims: [{ type: 'charge', speed: 180 }, { type: 'charge', speed: 180 }, { type: 'charge', speed: 180 }] },
        { name: 'gravity wells', prims: [{ type: 'pull' }, { type: 'zone', r: 26 }] },
      ],
      forms: [
        { name: 'Astronova, Constellation Armor', hpMult: 1.5, size: [36, 42], look: { body: '#b0c0ff', accent: '#ffffff', crown: true },
          lines: ['Your arm is strong, little star.', 'Show me your mind.'], question: 'Show me your mind!',
          patterns: [
            { name: 'comet-tail sweep', prims: [{ type: 'sweep' }] },
            { name: 'meteor dance', prims: [{ type: 'beatWait' }, { type: 'slamRing', r: 70 }, { type: 'beatWait' }, { type: 'slamRing', r: 90 }] },
            { name: 'star clones', prims: [{ type: 'popBehind' }, { type: 'lunge' }] },
          ] },
        { name: 'Astronova, Nova Titan', hpMult: 2.0, size: [48, 52], look: { body: '#ffd0a0', accent: '#ff6030', crown: true }, music: 'w8_boss_final',
          lines: ['Mind and heart, both bright.', 'Now — stand against the whole sky.'],
          patterns: [
            { name: 'black-hole pull', prims: [{ type: 'pull' }, { type: 'slamRing', r: 60 }] },
            { name: 'galaxy spiral', prims: [{ type: 'fanShot', n: 10, spread: 6.2 }, { type: 'fanShot', n: 10, spread: 6.2 }] },
            { name: 'supernova rain', prims: [{ type: 'inkRain', n: 8 }, { type: 'slamRing', r: 130 }] },
          ] },
      ],
      farewell: { s: 8, music: 'w8_farewell', lines: ['Three times you stood when stars would fall.', 'The light is yours.'] } },
  },
  // Gates 1 and 2 of the plaza: the Rush Gate and the Sub-boss Rush (their boss chains are built from every world, S53).
  dungeons: {
    'boss-rush': { id: 'boss-rush', name: 'Boss Rush', world: 8, rush: 'boss', floors: ['1F'], start: 'r1', rooms: {} },
    'subboss-rush': { id: 'subboss-rush', name: 'Sub-boss Rush', world: 8, rush: 'sub', floors: ['1F'], start: 'r1', rooms: {} },
    survival: { id: 'survival', name: 'Survival', world: 8, survival: true, floors: ['1F'], start: 'arena', rooms: {} }, // gate 3 (S54)
  },
  // Astronova's observatory (always open in Starhaven). Checkpoints return you to the phase you reached.
  throne: { id: 'astronova-observatory', name: 'Astronova\'s Observatory', world: 8, floors: ['1F'], start: 'throne', throne: true,
    theme: { floor: '#2a2a5a', floor2: '#262656', wall: '#0e0e2a', wallTop: '#ffe070' },
    rooms: { throne: { floor: '1F', gx: 0, gy: 0, type: 'sub', boss: 'astronova', doors: {} } } },
  music: { overworld: 'w8_overworld', town: 'w8_town', area2: 'w8_area2', dungeon: 'w8_dungeon' },
  // Regions (cell coords, first match wins): the plaza, the observatory, and the seven echoes of worlds 1–7.
  regions: [
    { name: 'Star Plaza', x0: 16, y0: 9, x1: 17, y1: 10, spawns: [], music: 'town' },
    { name: 'Observatory Rise', x0: 9, y0: 1, x1: 25, y1: 6, spawns: ['nebulisk', 'stardrop'], music: 'area2' },
    { name: 'Starlit Meadow', x0: 1, y0: 1, x1: 8, y1: 8, spawns: ['stardrop', 'cometfish'] },
    { name: 'Bouncing Comet Hills', x0: 26, y0: 1, x1: 34, y1: 8, spawns: ['cometfish', 'stardrop'] },
    { name: 'Nebula Ink Reef', x0: 27, y0: 9, x1: 34, y1: 12, spawns: ['nebulisk', 'meteormite'] },
    { name: 'Candy Moon Isles', x0: 27, y0: 13, x1: 34, y1: 22, spawns: ['stardrop', 'meteormite'], music: 'area2' },
    { name: 'Stardrum Jungle', x0: 17, y0: 15, x1: 26, y1: 22, spawns: ['cometfish', 'meteormite'] },
    { name: 'Giant Star Garden', x0: 8, y0: 15, x1: 16, y1: 22, spawns: ['nebulisk', 'stardrop'] },
    { name: 'Sky Crystal Heights', x0: 1, y0: 9, x1: 7, y1: 22, spawns: ['meteormite', 'nebulisk'], music: 'area2' },
    { name: 'Star Crossing', x0: 8, y0: 7, x1: 26, y1: 14, spawns: ['stardrop', 'cometfish', 'nebulisk'] },
  ],
};
