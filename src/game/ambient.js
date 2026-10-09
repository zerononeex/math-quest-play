// [A4f] Ambient life (user: LIFE + ANIMALS IN THEIR PLACES): hens in the town yards, butterflies over flower fields,
// frogs at still shores, fish and dragonflies over open water, rabbits and squirrels at forest edges, birds perched on
// edge trees (they fly off when you come close). Placed once by habitat (deterministic), animated only near the hero,
// purely cosmetic: no collision, never in the way. Art: the user's w<n>-ambient frame pairs (prompt order).
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';
import { TILE } from './overworld.js';

const FRAME = { bird: 0, fly: 2, butterfly: 4, butterfly2: 6, fish: 8, frog: 10, rabbit: 12, squirrel: 14, hen: 16, dragonfly: 21 };
const hash = (x, y, k) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(k, 83492791)) >>> 0;

export function createAmbient(ow) {
  const A = CONFIG.AMBIENT, m = ow.map, W = m.w, out = [];
  const t = (x, y) => (m.inside(x, y) ? m.ground[y * W + x] : -1);
  const wet = (v) => v === TILE.LIQ_A || v === TILE.LIQ_B;
  const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const lists = { flower: [], shore: [], open: [], edge: [], perch: [] };
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < W - 1; x++) {
    const v = t(x, y);
    if (v === TILE.FLOWER) lists.flower.push([x, y]);
    else if (wet(v)) (n4.some(([dx, dy]) => !wet(t(x + dx, y + dy))) ? lists.shore : n4.every(([dx, dy]) => wet(t(x + 2 * dx, y + 2 * dy))) ? lists.open : []).push([x, y]);
    else if ((v === TILE.GROUND || v === TILE.GROUND2) && !m.solid[y * W + x] && n4.some(([dx, dy]) => t(x + dx, y + dy) === TILE.TREE)) lists.edge.push([x, y]);
    else if (v === TILE.TREE && t(x, y + 1) !== TILE.TREE && !m.solid[(y + 1) * W + x]) lists.perch.push([x, y]);
  }
  // evenly spread picks (stride through a hashed order) so creatures never bunch up
  const pick = (list, n, k) => { const s = [...list].sort((a, b) => hash(a[0], a[1], k) - hash(b[0], b[1], k)), got = []; for (const c of s) { if (got.length >= n) break; if (got.every((g) => Math.abs(g[0] - c[0]) + Math.abs(g[1] - c[1]) > A.SPACING)) got.push(c); } return got; };
  const add = (kind, [x, y], extra = {}) => out.push({ kind, hx: x * 16 + 8, hy: y * 16 + 14, x: x * 16 + 8, y: y * 16 + 14, t: (hash(x, y, 9) % 1000) / 100, ...extra });
  for (const c of pick(lists.flower, A.BUTTERFLIES, 1)) add(hash(c[0], c[1], 2) % 2 ? 'butterfly' : 'butterfly2', c);
  for (const c of pick(lists.shore, A.FROGS, 3)) add('frog', c);
  for (const c of pick(lists.open, A.FISH, 4)) add('fish', c);
  for (const c of pick(lists.shore, A.DRAGONFLIES, 5)) add('dragonfly', c);
  for (const c of pick(lists.edge, A.RABBITS + A.SQUIRRELS, 6)) add(out.filter((o) => o.kind === 'rabbit').length < A.RABBITS ? 'rabbit' : 'squirrel', c);
  for (const c of pick(lists.perch, A.BIRDS, 7)) add('bird', c, { hy: c[1] * 16 + 2 });
  const yard = ((ow.townInfo && ow.townInfo.yard) || []).filter((p) => !p.solid && p.sheet === 'yard');
  for (let i = 0; i < Math.min(A.HENS, yard.length); i++) add('hen', [yard[i].tx, yard[i].ty + 1]);
  return { list: out, sheet: 'w' + ow.world.id + '-ambient' };
}

export function updateAmbient(amb, hero, dt) {
  const A = CONFIG.AMBIENT;
  for (const c of amb.list) {
    const dx = c.hx - hero.x, dy = c.hy - hero.y, d = Math.hypot(dx, dy);
    if (d > A.ACTIVE_R) continue; // far away: frozen (and not drawn)
    c.t += dt;
    if (c.kind === 'hen') { c.x = c.hx + Math.sin(c.t * 0.6) * 18; c.y = c.hy + Math.sin(c.t * 0.37) * 6; }
    else if (c.kind === 'butterfly' || c.kind === 'butterfly2') { c.x = c.hx + Math.sin(c.t * 1.3) * 12; c.y = c.hy - 8 + Math.cos(c.t * 1.9) * 6; }
    else if (c.kind === 'dragonfly') { c.x = c.hx + Math.sin(c.t * 2.1) * 20; c.y = c.hy - 6 + Math.sin(c.t * 3.3) * 4; }
    else if (c.kind === 'rabbit' || c.kind === 'squirrel') { // hop away from the hero, then calm down near home
      const hd = Math.hypot(c.x - hero.x, c.y - hero.y);
      if (hd < A.FLEE_R) { c.x += ((c.x - hero.x) / hd) * A.HOP_SPEED * dt; c.y += ((c.y - hero.y) / hd) * A.HOP_SPEED * dt; c.hop = 0.3; }
      else if ((c.hop = Math.max(0, (c.hop || 0) - dt)) === 0 && Math.hypot(c.x - c.hx, c.y - c.hy) > 2) { c.x += (c.hx - c.x) * dt * 0.5; c.y += (c.hy - c.y) * dt * 0.5; }
    } else if (c.kind === 'bird') { // perched; flies off up and away when the hero comes close, returns later
      if (!c.flying && d < A.FLEE_R) c.flying = 0.001;
      if (c.flying) { c.flying += dt; c.x = c.hx + c.flying * 70; c.y = c.hy - c.flying * 90; if (c.flying > A.BIRD_AWAY_S && d > A.FLEE_R * 2) { c.flying = 0; c.x = c.hx; c.y = c.hy; } }
    }
  }
}

export function drawAmbient(ctx, amb, cam, hero) {
  if (!imgReady(amb.sheet)) return;
  const A = CONFIG.AMBIENT, names = Object.keys(ATLAS[amb.sheet].meta.frames);
  for (const c of amb.list) {
    if (Math.hypot(c.hx - hero.x, c.hy - hero.y) > A.ACTIVE_R) continue;
    const flap = Math.floor(c.t * (c.kind.startsWith('butterfly') || c.kind === 'dragonfly' ? 8 : 2)) % 2;
    let i = FRAME[c.kind] + flap;
    if (c.kind === 'fish') { const p = c.t % A.FISH_EVERY_S; if (p > 0.7) continue; i = FRAME.fish + (p > 0.35 ? 1 : 0); }
    if (c.kind === 'frog') i = FRAME.frog + (c.t % 4 < 0.3 ? 1 : 0);
    if (c.kind === 'bird') { if (c.flying > A.BIRD_AWAY_S) continue; i = c.flying ? FRAME.fly + flap : FRAME.bird + (c.t % 3 < 0.4 ? 1 : 0); }
    if (c.kind === 'rabbit' || c.kind === 'squirrel') i = FRAME[c.kind] + (c.hop > 0 ? 1 : 0);
    const n = names[Math.min(i, names.length - 1)], f = ATLAS[amb.sheet].meta.frames[n];
    const lift = c.kind === 'fish' ? Math.sin(((c.t % A.FISH_EVERY_S) / 0.7) * Math.PI) * 8 : 0;
    drawSprite(ctx, amb.sheet, n, Math.round(c.x - f.w / 2 - cam.x), Math.round(c.y - (f.bb ? f.bb[3] : f.h) - lift - cam.y));
  }
}
