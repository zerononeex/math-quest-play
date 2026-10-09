// Interactables ask for VERBS, never tool names (D28). Tools and projectile tags map to verbs; gates check verbs only.
import { CONFIG } from '../config.js';

export const TOOL_VERBS = {
  powerGlove: ['lift', 'throw', 'pull'],
  fireBloom: ['burn', 'light', 'melt', 'fuse'],
  gustJar: ['blow', 'sail', 'clear'],
  iceBloom: ['freeze'],
  bombBag: ['blast', 'reveal'],
  vineHook: ['hook', 'climb', 'yank'],
  shrinkCap: ['shrink'],
  starCompass: ['star'],
};
export const TAG_VERBS = { FIRE: ['burn', 'light', 'melt', 'fuse'], ICE: ['freeze'], BOMB: ['blast', 'reveal'], WIND: ['blow', 'clear'] };

export function toolHasVerb(data, verb) {
  if (data.dawnbreaker && (TAG_VERBS.FIRE.includes(verb) || TAG_VERBS.ICE.includes(verb))) return true;
  return data.tools.some((t) => (TOOL_VERBS[t] || []).includes(verb));
}
export function tagVerbs(tags) { const out = ['hit']; for (const t of tags) out.push(...(TAG_VERBS[t] || [])); return out; }

// Types: { solid(o), react: { verb: (o, sys) => changed } }
export const TYPES = {
  torch: { solid: () => true, react: { burn: (o) => (o.lit ? false : (o.lit = true)), light: (o) => (o.lit ? false : (o.lit = true)) } },
  iceBlock: { solid: (o) => !o.melted, react: { melt: (o) => (o.melted ? false : (o.melted = true)), burn: (o) => (o.melted ? false : (o.melted = true)) } },
  water: { solid: (o) => !o.frozen, passProj: true, react: { freeze: (o) => (o.frozen ? false : (o.frozen = true)) } },
  crystal: { solid: () => true, react: { hit: (o, sys) => { sys.colour = sys.colour === 'red' ? 'blue' : 'red'; for (const c of sys.list) if (c.type === 'crystal') c.on = sys.colour === 'blue'; sys.syncAll(); return true; } } },
  plate: { solid: () => false, react: {} },
  crackedWall: { solid: (o) => !o.open, react: { blast: (o) => (o.open ? false : (o.open = true)) } },
  boulder: { solid: (o) => !o.lifted, react: { lift: (o) => (o.lifted ? false : (o.lifted = true)) } },
  hookPoint: { solid: (o) => !o.hooked, traverse: true, react: { hook: (o) => ((o.hooked = true), true) } }, // the Vine Hook zips to it, then the vine anchor lets you through
  pinHole: { solid: (o) => !o.open, react: { shrink: (o) => (o.open ? false : (o.open = true)) } }, // Shrink Cap: squeeze through
  chest: { solid: () => true, react: { open: (o) => (o.opened ? false : (o.opened = true)) } },
  door: { solid: (o) => !o.open, react: { unlock: (o) => (o.open ? false : (o.open = true)) } },
};
export const PROJECTILE_TARGETS = ['torch', 'iceBlock', 'water', 'crystal', 'crackedWall'];

export function createInteractables(map) {
  const sys = { list: [], map, colour: 'red', msg: null, signals: {}, base: new Map() };
  const grid = new Map();
  sys.add = (type, tx, ty, extra = {}) => {
    const o = { id: sys.list.length + 1, type, tx, ty, ...extra };
    sys.list.push(o);
    const k = map.idx(tx, ty);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(o);
    if (!sys.base.has(k)) sys.base.set(k, map.solid[k]);
    if (TYPES[o.type].init) TYPES[o.type].init(o, sys);
    sync(o);
    return o;
  };
  const sync = (o) => {
    const t = TYPES[o.type];
    if (!t.solid) return;
    const k = map.idx(o.tx, o.ty);
    const objs = grid.get(k);
    map.solid[k] = objs.some((x) => TYPES[x.type].solid && TYPES[x.type].solid(x, sys)) ? 1 : objs.every((x) => TYPES[x.type].solid) ? 0 : sys.base.get(k);
  };
  sys.sync = sync;
  // Move an object to another tile (restores the old tile's solidity).
  sys.move = (o, nx, ny) => {
    const ok = map.idx(o.tx, o.ty), old = grid.get(ok);
    old.splice(old.indexOf(o), 1);
    map.solid[ok] = old.some((x) => TYPES[x.type].solid && TYPES[x.type].solid(x, sys)) ? 1 : sys.base.get(ok);
    o.tx = nx; o.ty = ny;
    const k = map.idx(nx, ny);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(o);
    if (!sys.base.has(k)) sys.base.set(k, map.solid[k]);
    sync(o);
  };
  sys.syncAll = () => { for (const o of sys.list) sync(o); };
  sys.at = (tx, ty) => { const a = grid.get(map.idx(tx, ty)); return a ? a[a.length - 1] : null; };
  sys.allAt = (tx, ty) => grid.get(map.idx(tx, ty)) || [];
  sys.byType = (type) => sys.list.filter((o) => o.type === type);
  // Apply a verb (source: 'proj' | 'melee' | 'tool' | 'boomerang'); returns true when something changed.
  sys.apply = (o, verb, source = 'tool') => {
    const f = TYPES[o.type].react[verb];
    if (!f) return false;
    const ch = !!f(o, sys, source);
    if (ch) { sys.syncAll(); if (sys.onChange) sys.onChange(o, verb); }
    return ch;
  };
  sys.passProj = (o) => !!TYPES[o.type].passProj || !TYPES[o.type].solid || !TYPES[o.type].solid(o, sys);
  // Hero verb use (tools): only if some owned tool provides the verb.
  sys.use = (o, verb, data) => {
    if (!toolHasVerb(data, verb)) { sys.msg = 'Need a tool that can ' + verb + '!'; return false; }
    return sys.apply(o, verb);
  };
  sys.center = (o) => ({ x: o.tx * CONFIG.VIEW.TILE + 8, y: o.ty * CONFIG.VIEW.TILE + 8 });
  return sys;
}
