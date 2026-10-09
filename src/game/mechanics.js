// D27 puzzle & secret mechanic library (engine-level, every world). Extends the interactable TYPES with switches,
// signals (sources → gates), plates, timers, traps, pits, wind, conveyors, ice, ledges, platforms, mirrors, water levels.
// Mutable state round-trips through saveState()/loadState() (dungeon save).
import { CONFIG } from '../config.js';
import { TYPES, createInteractables, toolHasVerb } from './interactables.js';

const T = CONFIG.VIEW.TILE;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const sig = (sys, name) => !!(name && sys.signals[name]);
const emit = (o, sys, v) => { if (o.sig) sys.signals[o.sig] = v; };

Object.assign(TYPES, {
  // red/blue toggle blocks: raised (solid) when their colour matches the crystal colour
  toggleBlock: { solid: (o, sys) => o.color === sys.colour, react: {} },
  // colour-coded switch sets: each hit cycles its colour; set solved when all match their target
  colorSwitch: { solid: () => true, react: { hit: (o, sys) => { const C = ['red', 'blue', 'green', 'yellow']; o.color = C[(C.indexOf(o.color) + 1) % C.length]; sys.checkSets(); return true; } } },
  plate: { solid: () => false, react: {} },
  timedSwitch: { solid: () => true, react: { hit: (o, sys) => { o.t = (o.window || 3) * (sys.tier === 'little' ? 1.5 : 1); emit(o, sys, true); return true; } } },
  // eye-switches: arrows / boomerangs / shots only (not melee), latch on
  eyeSwitch: { solid: () => true, react: { hit: (o, sys, src) => (src === 'melee' || o.on ? false : ((o.on = true), emit(o, sys, true), true)) } },
  door: { solid: (o, sys) => !(o.open || sig(sys, o.link)), react: { unlock: (o) => (o.open ? false : (o.open = true)) } },
  bridge: { solid: (o, sys) => !sig(sys, o.link), react: {} },
  drain: { solid: (o, sys) => !sig(sys, o.link), react: {} },
  trap: { init: (o) => { o.state = 'armed'; } },
  pit: { solid: () => false, react: {} },
  crackedRock: { solid: (o) => !o.open, react: { blast: (o, sys) => (o.open ? false : ((o.open = true), sys.reveal(o), true)) } },
  hole: { solid: () => false, react: {} },
  cave: { solid: () => false, react: {} },
  heavyBoulder: { solid: (o) => !o.lifted, react: { blast: (o) => ((o.bounced = (o.bounced || 0) + 1), false), lift: (o) => (o.lifted ? false : (o.lifted = true)) } },
  bramble: { solid: (o) => !o.burnt, react: { burn: (o) => (o.burnt ? false : (o.burnt = true)) } },
  fan: { solid: () => true, react: { blow: (o, sys) => { o.t = (o.window || 3) * (sys.tier === 'little' ? CONFIG.PUZZLE.TIMING_LITTLE_MULT : 1); emit(o, sys, true); return true; } } },
  windmill: { solid: () => true, react: { blow: (o, sys) => (o.spinning ? false : ((o.spinning = true), emit(o, sys, true), true)) } },
  pinwheel: { solid: () => true, react: { blow: (o, sys) => { o.t = 2; emit(o, sys, true); return true; } } },
  leafBoat: { solid: () => false, react: { blow: (o, sys, src) => sys.sail(o) } },
  fog: { solid: () => false, react: { clear: (o) => (o.cleared ? false : (o.cleared = true)), blow: (o) => (o.cleared ? false : (o.cleared = true)) } },
  block: { solid: () => true, react: { pull: (o) => true } },
  pot: { solid: (o) => !o.lifted && !o.smashed, react: { lift: (o) => (o.lifted ? false : (o.lifted = true)), smash: (o) => (o.smashed ? false : (o.smashed = true)) } },
  conveyor: { solid: () => false, react: {} },
  ice: { solid: () => false, react: {} },
  ledge: { solid: () => true, react: {} },
  platform: { init: (o) => { o.seg = 0; o.k = 0; o.x = o.path[0][0] * T + 8; o.y = o.path[0][1] * T + 12; } },
  fallingTile: { solid: () => false, react: {} },
  mirror: { solid: () => true, react: { hit: (o) => { o.dir = o.dir === '/' ? '\\' : '/'; return true; } } },
  beamSource: { solid: () => true, react: {} },
  beamTarget: { solid: () => true, react: {} },
  waterSwitch: { solid: () => true, react: { hit: (o, sys) => { sys.level = sys.level === 'high' ? 'low' : 'high'; sys.syncAll(); return true; } } },
  // floor that only exists at low water / platforms that float at high water
  lowFloor: { solid: (o, sys) => sys.level === 'high', react: {} },
  floatTile: { solid: (o, sys) => sys.level !== 'high', react: {} },
  torchSig: { solid: () => true, react: { burn: (o, sys) => (o.lit ? false : ((o.lit = true), emit(o, sys, true), true)), light: (o, sys) => (o.lit ? false : ((o.lit = true), emit(o, sys, true), true)) } },
});
// Torches in a set: all lit → signal.
TYPES.torch.react.burn = (o, sys) => (o.lit ? false : ((o.lit = true), sys.checkTorches(), true));

// ctx: { hero, tier, data, onFall(o), enemiesLeft() }
export function createMechanics(map, ctx = {}) {
  const sys = createInteractables(map);
  Object.assign(sys, { level: 'high', tier: ctx.tier || 'adventurer', ctx, beam: [], sets: {} });
  const H = () => ctx.hero;
  const heroTile = () => ({ tx: Math.floor(H().x / T), ty: Math.floor((H().y - 2) / T) });

  sys.checkSets = () => {
    const sets = {};
    for (const o of sys.byType('colorSwitch')) (sets[o.set] = sets[o.set] || []).push(o);
    for (const [k, list] of Object.entries(sets)) sys.signals['set:' + k] = list.every((o) => o.color === o.target);
    sys.syncAll();
  };
  sys.checkTorches = () => {
    const sets = {};
    for (const o of sys.byType('torch')) if (o.set) (sets[o.set] = sets[o.set] || []).push(o);
    for (const [k, list] of Object.entries(sets)) sys.signals['torches:' + k] = list.every((o) => o.lit);
    sys.syncAll();
  };
  sys.reveal = (o) => { if (o.reveals) sys.add(o.reveals, o.tx, o.ty, { secret: o.secret }); };
  sys.sail = (o) => {
    const [dx, dy] = DIRS[o.dir || 'right'];
    let moved = false;
    while (sys.allAt(o.tx + dx, o.ty + dy).some((x) => x.type === 'water' && !x.frozen)) { o.tx += dx; o.ty += dy; moved = true; }
    return moved;
  };
  // Push a block one tile (Power Glove not needed to push; heavy blocks need 'pull').
  sys.push = (o, dx, dy) => {
    // a block resting on a block-weight plate locks in place (until the puzzle's reset lever)
    if (sys.allAt(o.tx, o.ty).some((x) => x.type === 'plate' && x.weight === 'block')) return false;
    const nx = o.tx + dx, ny = o.ty + dy;
    if (map.isSolid(nx, ny) || sys.allAt(nx, ny).some((x) => x.type === 'pit' && !sig(sys, x.cover))) return false;
    sys.move(o, nx, ny);
    o.slide = { dx, dy, t: CONFIG.PUZZLE_HELP.SLIDE_S }; // [PUSH-BLOCKS] drawn sliding into place
    return true;
  };
  // [PUSH-BLOCKS] push away from the hero (tap or hit): the side he stands on decides the direction
  sys.pushFrom = (o, hx, hy) => {
    const c = sys.center(o), dx = c.x - hx, dy = c.y - hy;
    const d = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy) || 1];
    return sys.push(o, d[0], d[1]);
  };
  sys.meleeHit = (r, verb = 'hit') => {
    let n = 0;
    for (let ty = Math.floor(r.y / T); ty <= Math.floor((r.y + r.h - 1) / T); ty++) for (let tx = Math.floor(r.x / T); tx <= Math.floor((r.x + r.w - 1) / T); tx++)
      for (const o of sys.allAt(tx, ty)) {
        if (o.type === 'block' && ctx.hero) { if (sys.pushFrom(o, ctx.hero.x, ctx.hero.y - 8)) n++; continue; } // [PUSH-BLOCKS] hit a block = push it
        if (sys.apply(o, verb, 'melee') || (verb !== 'hit' && sys.apply(o, 'hit', 'melee'))) n++;
      }
    return n;
  };
  // Hero uses a tool verb on the object in front of it.
  sys.useVerb = (verb, data) => {
    const h = H(); const [dx, dy] = DIRS[h.facing]; const { tx, ty } = heroTile();
    for (const o of [...sys.allAt(tx + dx, ty + dy), ...sys.allAt(tx, ty)]) {
      if (!TYPES[o.type].react[verb]) continue;
      if (!toolHasVerb(data, verb)) { sys.msg = 'Need a tool that can ' + verb + '!'; return false; }
      return sys.apply(o, verb, 'tool');
    }
    return false;
  };

  function traceBeam() {
    sys.beam.length = 0;
    for (const s of sys.byType('beamTarget')) { s.lit = false; if (s.sig) sys.signals[s.sig] = false; }
    for (const src of sys.byType('beamSource')) {
      let [dx, dy] = DIRS[src.dir]; let x = src.tx, y = src.ty;
      for (let i = 0; i < 64; i++) {
        x += dx; y += dy;
        sys.beam.push(x, y);
        const objs = sys.allAt(x, y);
        const m = objs.find((o) => o.type === 'mirror');
        if (m) { [dx, dy] = m.dir === '/' ? [-dy, -dx] : [dy, dx]; continue; }
        const t = objs.find((o) => o.type === 'beamTarget');
        if (t) { t.lit = true; if (t.sig) sys.signals[t.sig] = true; break; }
        if (map.isSolid(x, y)) break;
      }
    }
  }

  sys.update = (dt) => {
    const h = H();
    const { tx, ty } = heroTile();
    // timers
    for (const o of sys.list) {
      if ((o.type === 'timedSwitch' || o.type === 'fan' || o.type === 'pinwheel') && o.t > 0 && (o.t -= dt) <= 0) emit(o, sys, false);
    }
    // plates: hero / block / pot / buddy weights
    for (const p of sys.byType('plate')) {
      const heavy = sys.allAt(p.tx, p.ty).some((x) => x.type === 'block' || (x.type === 'pot' && !x.lifted)) || (ctx.buddies || []).some((b) => Math.floor(b.x / T) === p.tx && Math.floor((b.y - 2) / T) === p.ty);
      p.down = heavy || (p.weight !== 'block' && tx === p.tx && ty === p.ty);
      emit(p, sys, p.down || (p.latch && p.was));
      p.was = p.was || p.down;
    }
    // trap rooms: seal when the hero walks in, release when enemies are gone or the escape switch fires
    for (const o of sys.byType('trap')) {
      if (o.state === 'armed' && tx >= o.x0 && tx <= o.x1 && ty >= o.y0 && ty <= o.y1) { o.state = 'sealed'; sys.signals[o.sig] = false; if (o.spawn) o.spawn(); }
      else if (o.state === 'sealed' && ((ctx.enemiesLeft && ctx.enemiesLeft() === 0 && o.t0 !== undefined) || sig(sys, o.escape))) { o.state = 'done'; sys.signals[o.sig] = true; }
      if (o.state === 'sealed' && o.t0 === undefined) o.t0 = 0; else if (o.t0 !== undefined) o.t0 += dt;
    }
    traceBeam();
    sys.syncAll();
    if (!h) return;
    // floor effects under the hero
    const under = sys.allAt(tx, ty);
    const plat = sys.byType('platform').find((p) => Math.abs(p.x - h.x) < 12 && Math.abs(p.y - h.y) < 10);
    for (const p of sys.byType('platform')) {
      const path = p.path; const a = path[p.seg], b = path[(p.seg + 1) % path.length];
      const ax = a[0] * T + 8, ay = a[1] * T + 12, bx = b[0] * T + 8, by = b[1] * T + 12;
      const d = Math.hypot(bx - ax, by - ay) || 1;
      p.k += ((p.speed || 30) * dt) / d;
      if (p.k >= 1) { p.k = 0; p.seg = (p.seg + 1) % path.length; }
      const nx = ax + (bx - ax) * p.k, ny = ay + (by - ay) * p.k;
      if (p === plat) { h.x += nx - p.x; h.y += ny - p.y; }
      p.x = nx; p.y = ny;
    }
    for (const o of under) {
      if (o.type === 'conveyor') { const [dx, dy] = DIRS[o.dir]; move(h, dx * (o.speed || 50) * dt, dy * (o.speed || 50) * dt); }
      if (o.type === 'fallingTile' && !o.gone && (o.t = (o.t || 0) + dt) > 0.5) { o.gone = true; o.back = 3; }
    }
    for (const o of sys.byType('fallingTile')) { if (o.gone && (o.back -= dt) <= 0) { o.gone = false; o.t = 0; } if (!(o.tx === tx && o.ty === ty) && !o.gone) o.t = 0; }
    // ice: keep sliding in the last direction until something solid
    const onIce = under.some((o) => o.type === 'ice');
    if (onIce) {
      if (!h.slide && h.moving) h.slide = DIRS[h.facing];
      if (h.slide && !move(h, h.slide[0] * 110 * dt, h.slide[1] * 110 * dt)) h.slide = null;
    } else h.slide = null;
    // pushing a block: keep walking into it for 0.25 s
    if (h.moving) {
      const [dx, dy] = DIRS[h.facing];
      const b = sys.allAt(tx + dx, ty + dy).find((o) => o.type === 'block');
      if (b && (h.pushT = (h.pushT || 0) + dt) > 0.25) { sys.push(b, dx, dy); h.pushT = 0; }
      else if (!b) h.pushT = 0;
    }
    // one-way ledges: walking into a ledge in its direction hops over it
    if (h.moving) {
      const [dx, dy] = DIRS[h.facing];
      const l = sys.allAt(tx + dx, ty + dy).find((o) => o.type === 'ledge' && o.dir === h.facing);
      if (l && !map.isSolid(tx + 2 * dx, ty + 2 * dy)) { h.x = (tx + 2 * dx) * T + 8; h.y = (ty + 2 * dy) * T + 12; }
    }
    // pits (and fallen tiles): fall unless standing on a platform or the pit is covered
    const pit = under.find((o) => (o.type === 'pit' && !sig(sys, o.cover)) || (o.type === 'fallingTile' && o.gone));
    if (pit && !plat && ctx.onFall) ctx.onFall(pit);
  };
  function move(h, dx, dy) {
    const hw = h.w / 2; let ok = true;
    if (map.boxFree(h.x + dx - hw, h.y - h.h, h.x + dx + hw, h.y)) h.x += dx; else ok = false;
    if (map.boxFree(h.x - hw, h.y + dy - h.h, h.x + hw, h.y + dy)) h.y += dy; else ok = false;
    return ok;
  }

  // ---- persistence (dungeon save) ----
  const KEEP = ['on', 'open', 'lit', 'melted', 'frozen', 'lifted', 'burnt', 'spinning', 'cleared', 'color', 'dir', 'state', 'tx', 'ty', 'opened', 'was'];
  sys.saveState = () => ({
    colour: sys.colour, level: sys.level,
    signals: Object.fromEntries(Object.entries(sys.signals).filter(([k, v]) => v && !/^(plate|timed|fan)/.test(k))),
    objs: Object.fromEntries(sys.list.map((o) => [o.id, Object.fromEntries(KEEP.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]))])),
  });
  sys.loadState = (st) => {
    if (!st) return;
    sys.colour = st.colour || 'red'; sys.level = st.level || 'high';
    Object.assign(sys.signals, st.signals || {});
    for (const o of sys.list) {
      const s = st.objs && st.objs[o.id];
      if (!s) continue;
      const moved = s.tx !== undefined && (s.tx !== o.tx || s.ty !== o.ty);
      const { tx: ntx, ty: nty, ...rest } = s;
      Object.assign(o, rest);
      if (moved) sys.move(o, ntx, nty);
    }
    sys.syncAll();
  };
  return sys;
}
