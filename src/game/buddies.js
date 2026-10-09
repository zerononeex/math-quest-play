// Sproutling buddies (W6, SPEC 2.7 + G27): up to CONFIG.BUDDY.MAX follow the hero in single file. A tap on a target sends
// the nearest free one — a foe: it leaps and bonks it (one free hit, no AP) and is spent; a plate: it sits on it and holds it
// down; a switch: it bonks it (the 'hit' verb, like any swing); a seed: it fetches it back (hero.carry = 'seed').
// Spent buddies regrow at Sproutling nests. One button, never a penalty.
import { CONFIG } from '../config.js';
import { drawFoot, codeArt } from '../engine/atlas.js';

const B = CONFIG.BUDDY, T = CONFIG.VIEW.TILE;

export function createBuddies(n = B.MAX) {
  const bs = { list: [], trail: [], regrown: 0, sent: 0 };
  for (let i = 0; i < n; i++) bs.list.push({ id: i, x: 0, y: 0, state: 'follow', target: null, placed: false });
  return bs;
}
export function freeBuddies(bs) { return bs.list.filter((b) => b.state === 'follow'); }

// target: { kind: 'enemy', e } | { kind: 'plate' | 'switch' | 'seed', o }
export function sendBuddy(bs, hero, target) {
  const free = freeBuddies(bs).sort((p, q) => Math.hypot(p.x - hero.x, p.y - hero.y) - Math.hypot(q.x - hero.x, q.y - hero.y));
  if (!free.length) return false;
  const b = free[0];
  b.state = 'go'; b.target = target; bs.sent++;
  return true;
}

// Pick what a tap at world point (x, y) means for the buddies (null = not a buddy target).
export function buddyTargetAt(cx, x, y) {
  for (const e of cx.ents.list) if (e.alive && e.kind === 'enemy' && !e.hidden && Math.hypot(e.x - x, e.y - e.h / 2 - y) < B.TAP_R) return { kind: 'enemy', e };
  if (cx.inter) for (const o of cx.inter.list) {
    const c = cx.inter.center(o); if (Math.hypot(c.x - x, c.y - y) > B.TAP_R) continue;
    if (o.type === 'plate') return { kind: 'plate', o };
    if (o.type === 'seed' && !o.taken) return { kind: 'seed', o };
    if (/switch/i.test(o.type) || o.type === 'lever') return { kind: 'switch', o };
  }
  return null;
}

const where = (cx, t) => (t.kind === 'enemy' ? { x: t.e.x, y: t.e.y } : { x: t.o.tx * T + 8, y: t.o.ty * T + 12 });

// cx: { ents, inter, hitEnemy(e), nests: [{ x, y }] }
export function updateBuddies(bs, hero, dt, cx) {
  // the hero's trail: followers walk in single file behind
  if (bs.trail[0] && Math.hypot(bs.trail[0].x - hero.x, bs.trail[0].y - hero.y) > 64) bs.trail.length = 0; // a door / warp: start a fresh file
  const last = bs.trail[0];
  if (!last || Math.hypot(last.x - hero.x, last.y - hero.y) > 2) { bs.trail.unshift({ x: hero.x, y: hero.y }); if (bs.trail.length > 80) bs.trail.pop(); }
  let k = 0;
  for (const b of bs.list) {
    if (b.state === 'spent') continue;
    if (b.state === 'follow') {
      k++; const p = bs.trail[Math.min(bs.trail.length - 1, Math.round((k * B.GAP) / 2))] || hero;
      if (!b.placed) { b.x = p.x; b.y = p.y; b.placed = true; }
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d > 120) { b.x = p.x; b.y = p.y; } else if (d > 1) { const s = Math.min(d, B.SPEED * 1.3 * dt); b.x += ((p.x - b.x) / d) * s; b.y += ((p.y - b.y) / d) * s; }
      continue;
    }
    const t = b.target;
    if (b.state === 'hold') { if (t.o && t.o.gone) b.state = 'back'; continue; }
    if (b.state === 'go') {
      if (t.kind === 'enemy' && !t.e.alive) { b.state = 'back'; continue; }
      const w = where(cx, t), d = Math.hypot(w.x - b.x, w.y - b.y);
      if (d > 6) { const s = Math.min(d, B.SPEED * dt); b.x += ((w.x - b.x) / d) * s; b.y += ((w.y - b.y) / d) * s; b.hop = (b.hop || 0) + dt; continue; }
      if (t.kind === 'enemy') { cx.hitEnemy(t.e); b.state = 'spent'; continue; } // one bonk, then it is spent (regrows at a nest)
      if (t.kind === 'plate') { b.state = 'hold'; continue; }
      if (t.kind === 'switch') { if (cx.inter) cx.inter.apply(t.o, 'hit', 'buddy'); b.state = 'back'; continue; }
      if (t.kind === 'seed') { t.o.taken = true; if (cx.inter && cx.inter.syncAll) cx.inter.syncAll(); b.carry = 'seed'; b.state = 'back'; continue; }
    }
    if (b.state === 'back') {
      const d = Math.hypot(hero.x - b.x, hero.y - b.y);
      if (d > 12) { const s = Math.min(d, B.SPEED * dt); b.x += ((hero.x - b.x) / d) * s; b.y += ((hero.y - b.y) / d) * s; continue; }
      if (b.carry) { hero.carry = b.carry; b.carry = null; }
      b.state = 'follow'; b.target = null;
    }
  }
  // nests regrow spent buddies (and call holders home)
  for (const n of cx.nests || []) if (Math.hypot(n.x - hero.x, n.y - hero.y) < B.NEST_R) for (const b of bs.list) if (b.state === 'spent') { b.state = 'follow'; b.x = n.x; b.y = n.y; bs.regrown++; }
}
// Weights for plates (mechanics ctx.buddies): only buddies sitting on something count.
export function buddyWeights(bs) { return bs.list.filter((b) => b.state === 'hold'); }
// Leaving a room/scene: holders and runners come back.
export function recallBuddies(bs) { for (const b of bs.list) if (b.state === 'hold' || b.state === 'go' || b.state === 'back') { b.state = 'follow'; b.target = null; b.placed = false; } bs.trail.length = 0; }

// [W6 Phase 2] The user's w6-sproutling sheet (0 idle, 1 happy bounce, 2 curled into a ball = leaping at a foe), fitted
// half a tile tall at the feet; a carried seed is w6-nature frame 14 (giant seeds) over its head.
const BUDDY_SIZE = 13;
export function drawBuddies(ctx, bs) {
  for (const b of bs.list) {
    if (b.state === 'spent' || !b.placed && b.state === 'follow') continue;
    const hop = b.state === 'go' ? Math.abs(Math.sin((b.hop || 0) * 14)) * 4 : 0;
    const x = Math.round(b.x), y = Math.round(b.y - hop);
    const i = b.state === 'go' && b.target && b.target.kind === 'enemy' ? 2 : b.state === 'go' || b.state === 'back' ? 1 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 4, Math.round(b.y) - 1, 8, 2);
    if (drawFoot(ctx, 'w6-sproutling', i, x, y, BUDDY_SIZE, BUDDY_SIZE)) {
      if (b.carry && !drawFoot(ctx, 'w6-nature', 14, x, y - BUDDY_SIZE, 8, 7)) { codeArt('buddy-seed'); ctx.fillStyle = '#f0d060'; ctx.fillRect(x - 2, y - 16, 4, 4); }
      continue;
    }
    codeArt('sproutling'); // [R2-19a] audit: code-drawn buddy
    const f = (c, dx, dy, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, w, h); };
    f('#10101a', -4, -10, 8, 9); f('#80c050', -3, -9, 6, 7); f('#a06a3a', -4, -12, 8, 3); f('#10101a', -2, -7, 1, 1); f('#10101a', 1, -7, 1, 1);
    f('#5aa03a', -6, -6, 2, 2); f('#5aa03a', 4, -6, 2, 2);
    if (b.carry) f('#f0d060', -2, -16, 4, 4);
  }
}
// Nest: w6-puzzle frame 22 (the twig nest with a sproutling peeking out; the -puzzle sheet's "sproutling nest" row);
// code fallback: a twig ring with a sprout.
export function drawNest(ctx, x, y) {
  if (drawFoot(ctx, 'w6-puzzle', 22, x, y + 4, 22, 16)) return;
  codeArt('sproutling-nest'); // [R2-19a] audit
  const f = (c, dx, dy, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, w, h); };
  f('#10101a', -10, -4, 20, 8); f('#8a5a2a', -9, -3, 18, 6); f('#c08a4a', -6, -2, 12, 3); f('#80c050', -1, -10, 2, 7); f('#80c050', 1, -9, 3, 2);
}
