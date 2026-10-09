import { ATLAS, imgReady, drawSprite, opaqueBox } from '../../engine/atlas.js';

// Code-drawn 16×16 interactables (fallback until the w<n>-puzzle / dungeon-objects sheets are cut).
const GENERIC = {
  colorSwitch: '#c0c0c0', timedSwitch: '#e0a040', eyeSwitch: '#f0f0f0', bridge: '#8a6a3a', drain: '#3a5a9a', hole: '#10101a', cave: '#10101a',
  fan: '#90b0c0', windmill: '#c0a070', pinwheel: '#f080a0', leafBoat: '#60b040', block: '#9a8a70', pot: '#b07040', conveyor: '#606070',
  ice: '#d0f0ff', ledge: '#6a5a3a', mirror: '#e0e8ff', beamSource: '#ffe060', beamTarget: '#a0a0a0', waterSwitch: '#4080ff',
  lowFloor: '#7a8a6a', floatTile: '#9ab080', torchSig: '#6a4a2a', heavyBoulder: '#707068', crackedRock: '#8a7a6a', bramble: '#3a6a2a',
};

export function drawProp(ctx, o, x, y, sys) {
  const g = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  if (o.type === 'trap') return;
  if ((o.type === 'block' || o.type === 'plate') && o.c != null) { const col = ['#e04060', '#40a0f0', '#f0d040'][o.c]; if (o.type === 'plate') { g('#10101a', 1, 1, 14, 14); g(col, 3, 3, 10, 10); g('#a0a0a0', 5, 5, 6, 6); } else { g('#10101a', 0, 0, 16, 16); g('#9a8a70', 1, 1, 14, 14); g(col, 4, 4, 8, 8); } return; } // W3 colour crates / plates
  if (o.type === 'toggleBlock') { const up = sys && o.color === sys.colour; g('#10101a', 1, 1, 14, 14); g(o.color === 'red' ? (up ? '#e04040' : '#602020') : up ? '#4060e0' : '#202060', 2, 2, 12, up ? 12 : 4); return; }
  if (o.type === 'pit') { g(sys && sys.signals[o.cover] ? '#6a5a4a' : '#05050a', 0, 0, 16, 16); return; }
  if (o.type === 'fallingTile') { if (!o.gone) { g('#8a7a6a', 1, 1, 14, 14); g('#5a4a3a', 4, 7, 8, 1); } else g('#05050a', 0, 0, 16, 16); return; }
  if (o.type === 'platform') return;
  if (o.type === 'fog') { if (!o.cleared) g('rgba(220,220,230,0.8)', 0, 0, 16, 16); return; }
  if (o.type === 'door' || o.type === 'bridge' || o.type === 'drain') { const shut = sys && sys.map.solid[sys.map.idx(o.tx, o.ty)]; if (o.type === 'door') { if (shut) { g('#10101a', 0, 0, 16, 16); g('#7a4a2a', 1, 1, 14, 15); } } else g(shut ? (o.type === 'bridge' ? '#05050a' : '#2a5aa0') : '#8a6a3a', 0, 0, 16, 16); return; }
  if (GENERIC[o.type]) {
    const off = (o.type === 'crackedRock' && o.open) || (o.type === 'heavyBoulder' && o.lifted) || (o.type === 'bramble' && o.burnt) || (o.type === 'lowFloor' && sys && sys.level === 'high');
    g('#10101a', 1, 1, 14, 14); g(off ? '#3a3a3a' : o.color || GENERIC[o.type], 2, 2, 12, 12);
    if (o.on || o.lit || o.spinning || o.t > 0 || o.down) g('#ffffff', 6, 6, 4, 4);
    if (o.type === 'mirror') { ctx.fillStyle = '#10101a'; for (let i = 0; i < 12; i++) ctx.fillRect(x + 2 + i, y + (o.dir === '/' ? 13 - i : 2 + i), 1, 1); }
    return;
  }
  drawBasic(ctx, o, x, y);
}

function drawBasic(ctx, o, x, y) {
  const f = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  switch (o.type) {
    case 'torch': f('#10101a', 5, 6, 6, 10); f('#6a4a2a', 6, 7, 4, 9); if (o.lit) { f('#ff8020', 5, 0, 6, 6); f('#ffe040', 6, 2, 4, 3); } else f('#303030', 6, 4, 4, 3); break;
    case 'iceBlock': if (!o.melted) { f('#10101a', 0, 0, 16, 16); f('#a0e0ff', 1, 1, 14, 14); f('#e0f8ff', 3, 3, 4, 4); } else f('rgba(120,200,255,0.3)', 2, 10, 12, 4); break;
    case 'water': f(o.frozen ? '#c8f0ff' : '#2a6ad0', 0, 0, 16, 16); if (!o.frozen) f('#5a9af0', 3, 5, 6, 1); else f('#ffffff', 4, 4, 3, 1); break;
    case 'crystal': f('#10101a', 3, 1, 10, 14); f(o.on ? '#4a7aff' : '#ff4a4a', 4, 2, 8, 12); f('#ffffff', 5, 3, 2, 3); break;
    case 'plate': f('#10101a', 1, 1, 14, 14); f(o.down ? '#606060' : '#a0a0a0', 2, 2, 12, 12); break;
    case 'crackedWall': if (!o.open) { f('#5a4a3a', 0, 0, 16, 16); f('#10101a', 7, 2, 1, 6); f('#10101a', 5, 8, 4, 1); f('#10101a', 9, 9, 1, 5); } else f('#10101a', 2, 2, 12, 12); break;
    case 'boulder': if (!o.lifted) { f('#10101a', 1, 2, 14, 13); f('#8a8a80', 2, 3, 12, 11); f('#b0b0a8', 4, 5, 3, 2); } break;
    case 'hookPoint': f('#10101a', 5, 5, 6, 6); f('#40c060', 6, 6, 4, 4); break;
    case 'pinHole': f('#10101a', 6, 10, 4, 4); break;
    case 'chest': f('#10101a', 1, 4, 14, 11); f(o.opened ? '#6a4a2a' : '#b07a2a', 2, 5, 12, 9); f('#ffd040', 7, 8, 2, 3); break;
    case 'door': if (!o.open) { f('#10101a', 0, 0, 16, 16); f('#7a4a2a', 1, 1, 14, 15); f('#ffd040', 11, 8, 2, 2); } break;
    case 'paintTile': { const col = ['#e04060', '#40a0f0', '#f0d040'][o.c || 0]; f('#10101a', 0, 0, 16, 16); f(col, 1, 1, 14, 14); f('rgba(255,255,255,0.35)', 2, 2, 5, 3); break; }
    case 'colorBar': { const col = ['#e04060', '#40a0f0', '#f0d040'][o.c || 0]; f('#10101a', 0, 2, 16, 12); f(col, 1, 3, 14, 10); f('#ffffff', 6, 6, 4, 4); break; }
    case 'sluice': f('#10101a', 1, 0, 14, 16); f('#5a6a7a', 2, 1, 12, 14); f(o.on ? '#40c0f0' : '#304050', 4, o.on ? 2 : 8, 8, 6); f('#f0f0f0', 7, o.on ? 3 : 12, 2, 2); break;
    case 'lever': f('#10101a', 5, 2, 6, 14); f('#8a6a4a', 6, 8, 4, 8); f(o.latched ? '#40c060' : o.on ? '#f0c040' : '#a0a0a0', o.on ? 8 : 2, 2, 6, 4); break;
    case 'slider': f('#10101a', 0, 0, 16, 16); f('#c8f0ff', 1, 1, 14, 14); f('#ffffff', 3, 3, 5, 3); f('#90d0f0', 9, 10, 4, 3); break;
    case 'post': f('#10101a', 4, 2, 8, 14); f('#e060a0', 5, 3, 6, 12); f('#ffffff', 5, 5, 6, 2); break;
    case 'dreamTorch': f('#10101a', 5, 6, 6, 10); f('#7a4aa0', 6, 7, 4, 9); if (o.lit) { f('#ff80e0', 5, 0, 6, 6); f('#ffe0ff', 6, 2, 4, 3); } else f('#303040', 6, 4, 4, 3); break;
    case 'lantern': { const on = Math.floor(performance.now() / 700) % (o.of || 3) === (o.k || 0); f('#10101a', 4, 2, 8, 12); f(on ? '#ffe070' : '#6a5a3a', 5, 3, 6, 10); ctx.fillStyle = '#10101a'; ctx.font = '8px monospace'; ctx.fillText(String(o.n || ''), x + 6, y + 11); break; }
    case 'valve': f('#10101a', 2, 2, 12, 12); f(o.on ? '#40c080' : '#c0c0d0', 3, 3, 10, 10); f('#10101a', 7, 1, 2, 14); f('#10101a', 1, 7, 14, 2); for (let i = 0; i < (o.pitch || 1); i++) f('#a0e8ff', 3 + i * 3, -4 - (i % 2) * 2, 2, 2); break; // bubbles = fizz pitch
    case 'bouncePad': f('#10101a', 0, 6, 16, 10); f('#e04050', 1, 7, 14, 6); f('#ffffff', 3, 8, 3, 2); f('#ffffff', 10, 9, 2, 2); f('#f0e0c0', 5, 13, 6, 3); break;
    case 'goalSwitch': f('#10101a', 3, 1, 10, 14); f(o.on ? '#ffe040' : '#8a6a2a', 4, 2, 8, 12); f('#ffffff', 6, 4, 2, 2); break;
    case 'vineSwitch': f('#10101a', 2, 1, 12, 14); f(o.on ? '#80f060' : '#2a6a2a', 3, 2, 10, 12); f('#1a4a1a', 7, 0, 2, 16); f(o.on ? '#ffffff' : '#c0e040', 6, 6, 4, 4); break;
    case 'drumValve': f('#10101a', 1, 3, 14, 12); f('#b0703a', 2, 4, 12, 10); f('#f0e0c0', 2, 4, 12, 3); f('#10101a', (o.dir || 1) > 0 ? 7 : 7, (o.dir || 1) > 0 ? 8 : 10, 2, 3); f('#10101a', 5, (o.dir || 1) > 0 ? 10 : 9, 6, 1); break; // arrow: up raises, down lowers
    case 'poolGauge': { const mx = o.max || 3; f('#10101a', 4, 0, 8, 16); for (let i = 0; i <= mx; i++) { const yy = 14 - Math.round((i / mx) * 12); f(i <= (o.lvl || 0) ? '#40a0f0' : '#304050', 5, yy, 6, 2); if (i === o.target) f('#ffe040', 12, yy - 1, 3, 3); } break; }
    case 'floatCrate': { const dy = -Math.min(6, (o.lvl || 0) * 2); f('#2a6ad0', 0, 10, 16, 6); f('#10101a', 1, 1 + dy, 14, 13); f('#b07a3a', 2, 2 + dy, 12, 11); f('#7a4a2a', 2, 7 + dy, 12, 1); break; }
    case 'gearSwitch': { const a = o.latched ? 0 : o.on ? performance.now() / 120 : 0; f('#10101a', 1, 1, 14, 14); f(o.latched ? '#40c060' : o.on ? '#f0c040' : '#8a8a90', 2, 2, 12, 12); ctx.fillStyle = '#10101a'; for (let k = 0; k < 4; k++) { const an = a + (k * Math.PI) / 2; ctx.fillRect(x + 7 + Math.round(Math.cos(an) * 4), y + 7 + Math.round(Math.sin(an) * 4), 2, 2); } break; }
    case 'scent': f('rgba(240,160,220,0.55)', 3, 6, 3, 3); f('rgba(240,160,220,0.55)', 9, 9, 3, 3); break;
    case 'soil': f('#10101a', 1, 5, 14, 10); f('#5a3a1a', 2, 6, 12, 8); if (o.planted) { f('#3a8a2a', 7, -6, 3, 12); f('#60c040', 3, -4, 5, 3); f('#60c040', 9, -1, 5, 3); } break;
    case 'vent': if (!o.frozen) { f('#10101a', 1, 1, 14, 14); f('#8a3a1a', 2, 2, 12, 12); f('#ff8020', 4, 4, 8, 8); f('#ffe060', 6, 6, 4, 4); } else { f('#10101a', 1, 1, 14, 14); f('#a0e0ff', 2, 2, 12, 12); f('#ffffff', 4, 4, 3, 2); } break;
    case 'seed': if (!o.taken) { f('#10101a', 5, 6, 7, 8); f('#c08a3a', 6, 7, 5, 6); f('#80c050', 8, 3, 2, 4); } break;
    default: f('#808080', 0, 0, 16, 16);
  }
}

// [A5] Overworld secret gates in the user's art (w<n>-nature cracked rock / boulder, w<n>-puzzle bramble wall + its burning
// frame): foot on the tile's bottom edge, centred. Returns false when the sheet is missing (the code fallback draws instead).
// [W4 Phase 4] W1's puzzle frame 20 is its bramble wall; W2+ puzzle sheets hold other pieces there (W2 a giggle bell, W3 a
// conveyor, W4 a gumdrop): their brambles use the world's own w<n>-nature thorny bramble clump (frame 11)
const GATE_ART = { crackedRock: ['nature', 7], crackedWall: ['nature', 7], heavyBoulder: ['nature', 8], bramble: ['puzzle', 20] };
export function drawGateArt(ctx, o, x, y, world) {
  const a = o.type === 'bramble' && world !== 1 ? ['nature', 11] : GATE_ART[o.type]; if (!a) return false;
  const sh = 'w' + world + '-' + a[0]; if (!imgReady(sh)) return false;
  const gone = o.open || o.lifted || o.burnt;
  if (gone) { // what is left: a dark opening where the rock was; nothing where the boulder or the brambles were
    if (o.type === 'crackedRock' || o.type === 'crackedWall') { ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.ellipse(x + 8, y + 11, 6, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    return true;
  }
  const names = Object.keys(ATLAS[sh].meta.frames), n = names[Math.min(a[1], names.length - 1)], f = ATLAS[sh].meta.frames[n];
  drawSprite(ctx, sh, n, Math.round(x + 8 - f.w / 2), Math.round(y + 16 - (f.bb ? f.bb[3] : f.h)));
  return true;
}

// [A5] Dungeon props in the user's art: w<n>-dungeon-objects (pot, push block, pressure plate, crystal) and w<n>-puzzle
// (leafy push block, lily pads, numbered switch stones off/lit, torch pedestal unlit/lit, eye switch shut/open). Foot on the
// tile's bottom edge (plates and lily pads lie flat on the tile). Returns false → the code look draws instead.
const DPROP = {
  plate: (o) => ['dungeon-objects', 13, true], pot: (o) => ['dungeon-objects', 11], crystal: (o) => ['dungeon-objects', 15],
  block: (o) => ['puzzle', 0], lily: (o) => ['puzzle', 4, true],
  orderSwitch: (o) => ['puzzle', (o.on ? 12 : 8) + Math.max(0, Math.min(3, (o.n || 1) - 1))],
  torch: (o) => ['puzzle', o.lit ? 17 : 16], eyeSwitch: (o) => ['puzzle', o.on ? 19 : 18],
};
// [W2 Phase 4] worlds whose w<n>-puzzle sheet is not W1's set get their own table (W2: bounce pad 0-3, valve 4-7, windmill
// 8-11, pipe 12-15, spring 16-19, giggle bell 20-23); the push block comes from dungeon-objects there
const DPROP_W = {
  2: { plate: DPROP.plate, pot: DPROP.pot, crystal: DPROP.crystal, block: (o) => ['dungeon-objects', 12],
    bouncePad: (o) => ['puzzle', 0, true], valve: (o) => ['puzzle', o.on ? 6 : 4], goalSwitch: (o) => ['puzzle', o.on ? 21 : 20],
    water: (o) => ['liquid-a', 0, true], // the soda lagoon (Glimmer Grotto); frozen: an ice sheen over it (below)
    // #373 w2-dungeon-extras (ART NEEDED until uploaded; the code look draws meanwhile): conveyor belt frames 0-1, hook post 2
    conveyor: (o) => ['dungeon-extras', Math.floor(performance.now() / 150) % 2, true], hookPoint: (o) => ['dungeon-extras', 2] },
  // [W3 Phase 4] w3-puzzle: paint switch off/lit red 0-1, blue 2-3, yellow 4-5, green 6-7; current arrows 8-15; conveyor belt
  // right 16-17, down 18-19, left 20-21 (plain / chevrons, alternated so the belt runs); bleach drain grate shut 22 / flowing 23
  3: { plate: DPROP.plate, pot: DPROP.pot, crystal: DPROP.crystal, block: (o) => ['dungeon-objects', 12],
    paintTile: (o) => ['puzzle', [1, 3, 5][o.c || 0], true], colorBar: (o) => ['puzzle', [1, 3, 5][o.c || 0]],
    sluice: (o) => ['puzzle', o.on ? 23 : 22],
    conveyor: (o) => ['puzzle', ({ right: 16, left: 20 }[o.dir] ?? 18) + (Math.floor(performance.now() / 150) % 2), true],
    // #374 w3-dungeon-extras (ART NEEDED until uploaded; the code look draws meanwhile): the Tiny Atoll's pin-hole tunnel shut 0 / open 1
    pinHole: (o) => ['dungeon-extras', o.open ? 1 : 0] },
  // [W4 Phase 4] w4-puzzle (12 blobs): lever up 0 / pulled 1, candy bridge 2-3, ice slider 4 (gliding 5), candle unlit 6 / lit 7,
  // sugar crystal dark 8 / lit 9, gumdrop bumper 10 (squashed 11). The lantern keeps its order number and the lever its latch light.
  4: { plate: DPROP.plate, pot: DPROP.pot, crystal: DPROP.crystal, block: (o) => ['dungeon-objects', 12],
    lever: (o) => ['puzzle', o.on || o.latched ? 1 : 0], slider: (o) => ['puzzle', 4], post: (o) => ['puzzle', 10],
    dreamTorch: (o) => ['puzzle', o.lit ? 7 : 6],
    lantern: (o) => ['puzzle', Math.floor(performance.now() / 700) % (o.of || 3) === (o.k || 0) ? 9 : 8] },
  // [W5 Phase 4] w5-puzzle (24 blobs, 4 states per row): vine switch bare 0 → grown 3, water gauge empty 4 → full 7, gear 8-11,
  // timed log drum 12-15, hook post 16 (hooked 19), rope anchor 20-23. Lanterns are w5-lights' hanging lantern (dark 4 / lit 5),
  // the rapids current is w5-water-extras' river strip (4), floating crates are the dungeon-objects crate lifted by the pool.
  // Clues stay over the art: drum arrows, gauge target star, lantern order numbers, the latched gear's green light.
  5: { plate: DPROP.plate, pot: DPROP.pot, crystal: DPROP.crystal, block: (o) => ['dungeon-objects', 12],
    vineSwitch: (o) => ['puzzle', o.on ? 3 : 0], drumValve: (o) => ['puzzle', (o.dir || 1) > 0 ? 12 : 14],
    poolGauge: (o) => ['puzzle', 4 + Math.max(0, Math.min(3, Math.round(((o.lvl || 0) / (o.max || 3)) * 3)))],
    floatCrate: (o) => ['dungeon-objects', 12], gearSwitch: (o) => ['puzzle', o.latched ? 11 : o.on ? 8 + (Math.floor(performance.now() / 120) % 4) : 8],
    conveyor: (o) => ['water-extras', 4, true], hookPoint: (o) => ['puzzle', o.hooked ? 19 : 16], water: (o) => ['liquid-a', 0, true],
    lantern: (o) => ['lights', Math.floor(performance.now() / 700) % (o.of || 3) === (o.k || 0) ? 5 : 4] },
  // [W6 Phase 4] w6-puzzle (24 blobs, 4 states per row): scent flower bud 0 / open 1 / sparkling 2 (3 wilted), dig spot 4-7
  // (6 = the dug hole), updraft vent idle 8 / puffing 9-11, seed planter empty 12 / seeded 13 / sprout 14 / grown 15, leaf
  // boat 16-19, sproutling nest 20-23. Loose seeds are w6-nature's giant seeds (14); the Root Cellar's pin-hole passage is the
  // dug hole (a bug-size tunnel mouth: the Shrink Cap's way in).
  6: { plate: DPROP.plate, pot: DPROP.pot, crystal: DPROP.crystal, block: (o) => ['dungeon-objects', 12],
    scent: (o) => ['puzzle', 1 + (Math.floor(performance.now() / 500 + o.tx) % 2)],
    seed: (o) => (o.taken ? null : ['nature', 14]), soil: (o) => ['puzzle', o.planted ? 15 : 12],
    fan: (o) => ['puzzle', o.t > 0 ? 9 + (Math.floor(performance.now() / 120) % 3) : 8], pinHole: (o) => ['puzzle', 6, true] },
  // [W7 Phase 4] w7-puzzle (22 blobs): wind fan idle 0 / spinning 1-2, heat vent cool 3 / glowing 4 / flaring 5 (6 = flare
  // merged with a fan), tide switch orb shut 7 / lit 8 / swirling 9 / open 10, light mirror 11 (12-13 with a beam), beam
  // receiver dark 14 / lit 16 / blazing 17 (15 merged), star path tile dim 18-19 / lit 20-21. The tide gauge has no row:
  // a star tile brightening with the level + the level bars and target star over it; the beam source is the blazing
  // receiver; the foundry conveyors are pulsing star path tiles. Clues stay over the art: valve arrows, gauge target star +
  // bars, the mirror's slant, a frozen vent's ice sheen.
  7: { plate: DPROP.plate, pot: DPROP.pot, crystal: DPROP.crystal, block: (o) => ['dungeon-objects', 12], floatCrate: (o) => ['dungeon-objects', 12],
    fan: (o) => ['puzzle', o.t > 0 ? 1 + (Math.floor(performance.now() / 120) % 2) : 0],
    vent: (o) => ['puzzle', o.frozen ? 3 : 4 + (Math.floor(performance.now() / 200) % 2)],
    conveyor: (o) => ['puzzle', 20 + (Math.floor(performance.now() / 150) % 2), true],
    drumValve: (o) => ['puzzle', (o.dir || 1) > 0 ? 10 : 7],
    poolGauge: (o) => ['puzzle', 18 + Math.max(0, Math.min(3, Math.round(((o.lvl || 0) / (o.max || 3)) * 3)))],
    mirror: (o) => ['puzzle', 11], beamSource: (o) => ['puzzle', 17], beamTarget: (o) => ['puzzle', o.lit ? 16 : 14],
    post: (o) => ['dungeon-life', 17] }, // [W7 Phase 6] the Spire's sheltering pillars = w7-dungeon-life's sky-marble guardian statue
};
export function drawDungeonPropArt(ctx, o, x, y, world, sys) {
  const pick = DPROP_W[world] ? DPROP_W[world][o.type] : DPROP[o.type]; if (!pick) return drawGateArt(ctx, o, x, y, world); // [R2-19] cracked walls / brambles in dungeons: the same art as outdoors
  const pk = pick(o); if (!pk) return true; // nothing left to draw (a fetched seed)
  const [kind, i, flat] = pk, sh = 'w' + world + '-' + kind; if (!imgReady(sh)) return false;
  const A = ATLAS[sh], names = Object.keys(A.meta.frames), n = names[Math.min(i, names.length - 1)], b = opaqueBox(sh, n);
  const down = o.type === 'plate' && (o.down || (sys && o.c != null && sys.plates && sys.plates[o.c]));
  const w = flat ? 16 : 16, h = flat ? 16 : Math.round((16 * b.h) / b.w); // the piece's content fills one tile wide (standing ones keep their height)
  if (down) ctx.globalAlpha = 0.7;
  const lift = o.type === 'floatCrate' ? Math.min(6, (o.lvl || 0) * 2) : 0; // [W5] the pool floats the crate up
  if (lift) { ctx.fillStyle = 'rgba(42,106,208,0.6)'; ctx.fillRect(Math.round(x), Math.round(y + 10), 16, 6); }
  ctx.drawImage(A.img, b.x, b.y, b.w, b.h, Math.round(x + 8 - w / 2), Math.round(y + 16 - h + (down ? 1 : 0) - lift), w, h);
  ctx.globalAlpha = 1;
  if (world === 7 && o.type === 'vent' && o.frozen) { ctx.fillStyle = 'rgba(200,240,255,0.55)'; ctx.fillRect(Math.round(x + 1), Math.round(y + 16 - h * 0.6), 14, Math.round(h * 0.6)); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) + 4, Math.round(y + 16 - h * 0.5), 4, 1); } // [W7] crusted vent: the ice sheen
  if (world === 7 && o.type === 'mirror') { const bx = Math.round(x + 13), by = Math.round(y + 16 - h - 2); ctx.fillStyle = '#10101a'; ctx.fillRect(bx, by, 9, 9); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 7; i++) ctx.fillRect(bx + 1 + i, by + (o.dir === '/' ? 7 - i : 1 + i), 1, 1); } // [W7] the mirror's slant (the puzzle's clue)
  if (world === 7 && o.type === 'poolGauge') { const mx = o.max || 3; for (let i = 1; i <= mx; i++) { const yy = Math.round(y + 16 - 2 - (i / mx) * (h - 4)); ctx.fillStyle = '#10101a'; ctx.fillRect(Math.round(x - 4), yy - 1, 5, 3); ctx.fillStyle = i <= (o.lvl || 0) ? '#40a0f0' : '#304050'; ctx.fillRect(Math.round(x - 3), yy, 3, 1); } } // [W7] the gauge's level bars (no gauge art in w7-puzzle)
  if (o.type === 'water' && o.frozen) { ctx.fillStyle = 'rgba(220,245,255,0.7)'; ctx.fillRect(Math.round(x), Math.round(y), 16, 16); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) + 4, Math.round(y) + 4, 3, 1); } // frozen soda: the ice sheen
  if ((o.type === 'block' || o.type === 'plate') && o.c != null) { // [W3 Phase 4] crate sort (Bleachworks): each crate and its plate show their colour
    const col = ['#e04060', '#40a0f0', '#f0d040'][o.c], s = o.type === 'plate' ? 8 : 6, bx = Math.round(x + 8 - s / 2), by = o.type === 'plate' ? Math.round(y + 4) : Math.round(y + 16 - h + 3);
    ctx.fillStyle = '#10101a'; ctx.fillRect(bx - 1, by - 1, s + 2, s + 2); ctx.fillStyle = col; ctx.fillRect(bx, by, s, s); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(bx, by, 2, 1); }
  if (o.type === 'colorBar') { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x + 6), Math.round(y + 16 - h - 5), 4, 4); } // the target colour's marker (the code look's white dot)
  if (o.type === 'lantern' && world === 5) { const bx = Math.round(x + 14), by = Math.round(y + 16 - h * 0.45); ctx.fillStyle = '#10101a'; ctx.fillRect(bx, by, 8, 10); ctx.fillStyle = '#ffe070'; ctx.font = '8px monospace'; ctx.save(); ctx.textBaseline = 'top'; ctx.fillText(String(o.n || ''), bx + 2, by + 1); ctx.restore(); } // [W5] the tall hanging lantern hides a number drawn on it: a badge beside its body
  else if (o.type === 'lantern') { ctx.fillStyle = '#10101a'; ctx.font = '8px monospace'; ctx.fillText(String(o.n || ''), Math.round(x + 6), Math.round(y + 16 - h - 2)); } // [W4] the flicker order number (the puzzle's clue) the flicker order number (the puzzle's clue)
  if (o.type === 'gearSwitch' && o.latched) { ctx.fillStyle = '#10101a'; ctx.fillRect(Math.round(x + 5), Math.round(y + 16 - h - 5), 6, 5); ctx.fillStyle = '#40c060'; ctx.fillRect(Math.round(x + 6), Math.round(y + 16 - h - 4), 4, 3); } // [W5] a latched gear shows its green light
  if (o.type === 'drumValve') { const up = (o.dir || 1) > 0, ax = Math.round(x + 5), ay = Math.round(y + 16 - h - 7); ctx.fillStyle = '#10101a'; ctx.fillRect(ax - 1, ay - 1, 8, 7); ctx.fillStyle = up ? '#60e080' : '#f08040'; for (let i = 0; i < 3; i++) ctx.fillRect(ax + 3 - i, ay + (up ? i : 4 - i), 1 + 2 * i, 1); ctx.fillRect(ax + 2, ay + (up ? 3 : 0), 2, 2); } // [W5] up raises / down lowers (the clue)
  if (o.type === 'poolGauge' && o.target != null) { const mx = o.max || 3, yy = Math.round(y + 16 - 2 - (o.target / mx) * (h - 4)); ctx.fillStyle = '#10101a'; ctx.fillRect(Math.round(x + 12), yy - 2, 5, 5); ctx.fillStyle = '#ffe040'; ctx.fillRect(Math.round(x + 13), yy - 1, 3, 3); } // [W5] the target level's star
  if (o.type === 'lever' && o.latched) { ctx.fillStyle = '#10101a'; ctx.fillRect(Math.round(x + 5), Math.round(y + 16 - h - 5), 6, 5); ctx.fillStyle = '#40c060'; ctx.fillRect(Math.round(x + 6), Math.round(y + 16 - h - 4), 4, 3); } // [W4] a latched pair shows its green light
  if (o.type === 'valve') { ctx.fillStyle = '#a0e8ff'; for (let i = 0; i < (o.pitch || 1); i++) ctx.fillRect(Math.round(x + 3 + i * 3), Math.round(y + 16 - h - 4 - (i % 2) * 2), 2, 2); } // bubbles = fizz pitch (the puzzle's clue)
  return true;
}
