// [BUSHES] Every overworld bush (road-verge, flower-bed corners, scatter) can be cut by any melee hit, spin, dash,
// bomb blast or the boomerang: a leaf burst + rustle, the tile turns to grass, and sometimes a coin or a heart pops out
// (CONFIG.BUSH). Cut bushes grow back once the hero is well off that screen. Bushes that wall a tool gate (the
// hedged cellar garden) are listed in map.uncut and stay solid.
import { CONFIG } from '../config.js';
import { spawn } from './entities.js';
import { confetti } from './fx.js';
import { sfx } from '../engine/audio.js';

const B = CONFIG.BUSH, LEAVES = ['#4a9a3a', '#6ac04a', '#3a7a2a', '#a0d060'];

export function createBushes(ow, TILE) { return { ow, TILE, cut: new Map(), t: 0 }; }

function repaint(map, tx, ty) { for (const [dx, dy] of [[0, 0], [-4, -4], [4, -4], [-4, 4], [4, 4], [0, -4], [0, 4], [-4, 0], [4, 0]]) if (map.inside(tx + dx, ty + dy)) map.invalidate(tx + dx, ty + dy); } // the deco pass draws a bush into neighbouring chunks too

// Cut the bush at (tx, ty) if there is one. Returns true when cut.
export function cutBushAt(bs, tx, ty, cx) {
  const map = bs.ow.map;
  if (!map.inside(tx, ty) || map.ground[map.idx(tx, ty)] !== bs.TILE.BUSH) return false;
  const i = map.idx(tx, ty);
  if (map.uncut && map.uncut.has(i)) return false;
  map.ground[i] = bs.TILE.GROUND; map.solid[i] = 0; repaint(map, tx, ty);
  bs.cut.set(i, bs.t);
  const x = tx * 16 + 8, y = ty * 16 + 8;
  confetti(x, y, 14, LEAVES); sfx('rustle');
  const { data, ents } = cx, hurt = data.hearts <= data.maxHearts / 2, r = Math.random();
  const heart = B.HEART * (hurt ? B.HURT_HEART_MULT : 1);
  if (r < heart) spawn(ents, { kind: 'pickup', type: 'heart', value: 1, x: x - 4, y: y + 4, w: 8, h: 8, contact: false, life: CONFIG.DROPS.PICKUP_LIFE });
  else if (r < heart + B.COIN) spawn(ents, { kind: 'pickup', type: 'coin', value: CONFIG.DROPS.COIN_VALUE[(cx.world || 1) - 1], x: x - 4, y: y + 4, w: 8, h: 8, contact: false, life: CONFIG.DROPS.PICKUP_LIFE });
  return true;
}

// Cut every bush in a world rect (a swing box, a spin ring, a blast).
export function cutBushesIn(bs, r, cx) {
  let n = 0;
  for (let ty = Math.floor(r.y / 16); ty <= Math.floor((r.y + r.h - 1) / 16); ty++) for (let tx = Math.floor(r.x / 16); tx <= Math.floor((r.x + r.w - 1) / 16); tx++) if (cutBushAt(bs, tx, ty, cx)) n++;
  return n;
}

// Grow cut bushes back when the hero is far away (never on screen, never under anyone's feet).
export function updateBushes(bs, hero, dt) {
  bs.t += dt;
  const map = bs.ow.map;
  for (const [i, t] of bs.cut) {
    if (bs.t - t < B.REGROW_MIN_S) continue;
    const tx = i % map.w, ty = Math.floor(i / map.w);
    if (Math.hypot(tx * 16 + 8 - hero.x, ty * 16 + 8 - hero.y) < B.REGROW_TILES * 16) continue;
    map.ground[i] = bs.TILE.BUSH; map.solid[i] = 1; repaint(map, tx, ty); bs.cut.delete(i);
  }
}

// The bush tile under a tap point, if any (for tap-to-cut).
export function bushAt(bs, wx, wy) {
  const map = bs.ow.map, tx = Math.floor(wx / 16), ty = Math.floor(wy / 16);
  return map.inside(tx, ty) && map.ground[map.idx(tx, ty)] === bs.TILE.BUSH && !(map.uncut && map.uncut.has(map.idx(tx, ty))) ? { tx, ty } : null;
}
