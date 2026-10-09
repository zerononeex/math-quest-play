// [A8b] Landing pad dressing (user landing-pad kit, shared by all worlds): the two pads become the kit's rune pads (lit),
// light posts mark the pad corners, and a little "airfield" grows around them — windsock, signpost, crates + fuel barrel
// + tool shed on one side, bench + telescope on the other, planter rings, and the vine welcome arch over the road.
// Each piece takes the nearest plain grass tile to its spot (never a road, water or anything solid); the bigger ones
// are solid where they stand. Drawn live (like the big trees) so tall pieces are never clipped by the chunk prerender.
import { ATLAS, imgReady, drawSprite, drawOpaque } from '../engine/atlas.js';
import { TILE } from './overworld.js';
import { CONFIG } from '../config.js';

const S = 'landing-pad';
const F = { pad: 1, padLit: 0, // [R3-12] in the cut sheet frame 0 is the glowing rune pad, frame 1 the quiet one
   post: 3, postLit: 4, windsock: 5, sign: 6, crates: 7, barrel: 8, shed: 9, planter: 12, bench: 13, telescope: 14, arch: 15 };

export function createPadKit(ow) {
  const m = ow.map, W = m.w, t = (x, y) => (m.inside(x, y) ? m.ground[y * W + x] : -1);
  const pads = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < W; x++) if (t(x, y) === TILE.PAD && t(x - 1, y) !== TILE.PAD && t(x, y - 1) !== TILE.PAD) {
    let w = 0, h = 0; while (t(x + w, y) === TILE.PAD) w++; while (t(x, y + h) === TILE.PAD) h++;
    pads.push({ x, y, w, h });
  }
  if (!pads.length) return null;
  const x0 = Math.min(...pads.map((p) => p.x)), x1 = Math.max(...pads.map((p) => p.x + p.w)), y0 = Math.min(...pads.map((p) => p.y)), y1 = Math.max(...pads.map((p) => p.y + p.h));
  const taken = new Set(), plain = (x, y) => (t(x, y) === TILE.GROUND || t(x, y) === TILE.GROUND2 || t(x, y) === TILE.FLOWER) && !m.solid[y * W + x] && !taken.has(y * W + x);
  const near = (x, y) => { for (let r = 0; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && plain(x + dx, y + dy)) return [x + dx, y + dy]; return null; };
  const pieces = [];
  const add = (f, x, y, solid, half = 0, depth = 1) => { // half: extra solid tiles either side of the foot (2x pieces are wide); depth: solid rows up from the foot
    const at = near(x, y); if (!at) return; taken.add(at[1] * W + at[0]); pieces.push({ f, tx: at[0], ty: at[1], solid });
    if (solid) for (let dy = 0; dy < depth; dy++) for (let dx = -half; dx <= half; dx++) { const tx = at[0] + dx, ty = at[1] - dy; if ((dx === 0 && dy === 0) || plain(tx, ty)) { m.solid[ty * W + tx] = 1; taken.add(ty * W + tx); } }
  };
  // [R1-18] the two bare dirt patches beside the rocket (the pad cells' path stubs) go back to grass: only the road between the pads stays
  const lp = pads.reduce((a, b) => (a.x < b.x ? a : b)), rp = pads.reduce((a, b) => (a.x > b.x ? a : b)), rx0 = lp.x + lp.w, rx1 = rp.x - 1;
  for (let y = y0 - 4; y < y1; y++) for (let x = x0 - 1; x <= x1; x++) if (t(x, y) === TILE.PATH && (x < rx0 || x > rx1)) m.ground[y * W + x] = TILE.GROUND;
  const rc = (rx0 + rx1) >> 1; // the road's middle column
  for (const p of pads) for (const [cx, cy] of [[p.x - 1, p.y - 1], [p.x + p.w, p.y - 1], [p.x - 1, p.y + p.h], [p.x + p.w, p.y + p.h]]) add(F.postLit, cx, cy, true); // runway lights
  add(F.planter, rc - 5, y0 - 5, true, 1, CONFIG.PADKIT.PLANTER_DEPTH); add(F.planter, rc + 5, y0 - 5, true, 1, CONFIG.PADKIT.PLANTER_DEPTH); // [R3c] the whole flower ring is solid, not just its front rim // planters framing the road in
  add(F.sign, rc - 3, y0 - 9, true); // signpost at the roadside
  add(F.crates, x1 + 2, y0 - 2, true, 1); add(F.barrel, x1 + 5, y0 - 2, true); add(F.shed, x1 + 4, y0 + 2, true, 1); // cargo corner by the ship
  add(F.postLit, x0 - 6, y1 - 1, true); add(F.bench, x0 - 3, y1 - 1, true, 1); // a bench under a lamp, facing the pads
  add(F.windsock, x0 - 4, y0 - 2, true); add(F.telescope, x0 - 3, y1 + 3, true); // windsock on the open side, telescope at the lookout
  // the welcome arch spans the road north of the pads (the road column the hero walks in on)
  const AY = y0 - 9; // [R1-18] the 2x arch stands over the road in, clear of the rocket
  let ax = null; for (let x = x0; x < x1 && ax == null; x++) if (t(x, AY) === TILE.PATH && t(x + 1, AY) === TILE.PATH && t(x + 2, AY) === TILE.PATH) ax = x + 1;
  return { pads, pieces, arch: ax != null ? { tx: ax, ty: AY } : null };
}

// Pads (flat, under everything) — call before entities.
// [R3-12] the rune rings stay dark until the world's boss is beaten, then glow and pulse (time to fly on)
export function drawPadKitFloor(ctx, kit, cam, glow = false) {
  if (!kit || !imgReady(S)) return;
  for (const p of kit.pads) drawOpaque(ctx, S, glow ? F.padLit : F.pad, p.x * 16 - cam.x, p.y * 16 - cam.y, p.w * 16, p.h * 16);
  if (!glow) return;
  const G = CONFIG.PADKIT.GLOW, t = performance.now() / 1000, a = G.ALPHA + G.PULSE * Math.sin(t * G.SPEED);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of kit.pads) {
    const cx = (p.x + p.w / 2) * 16 - cam.x, cy = (p.y + p.h / 2) * 16 - cam.y, r = (p.w * 16) / 2;
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.15);
    g.addColorStop(0, 'rgba(120,230,255,0)'); g.addColorStop(0.7, 'rgba(120,230,255,' + (a * 0.6).toFixed(3) + ')'); g.addColorStop(1, 'rgba(120,230,255,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4);
    ctx.strokeStyle = 'rgba(170,245,255,' + a.toFixed(3) + ')'; ctx.lineWidth = 2;
    for (const k of [0.82, 0.55]) { ctx.beginPath(); ctx.arc(cx, cy, r * k + Math.sin(t * G.SPEED + k * 4) * 1.5, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}

// Standing pieces, foot on their tile's bottom edge (the arch centred over its road tile).
export function drawPadKit(ctx, kit, cam) {
  if (!kit || !imgReady(S)) return;
  const names = Object.keys(ATLAS[S].meta.frames);
  const k = CONFIG.PADKIT.SCALE, put = (i, cx, footY) => { const n = names[i], f = ATLAS[S].meta.frames[n]; drawSprite(ctx, S, n, Math.round(cx - f.w * k / 2 - cam.x), Math.round(footY - (f.bb ? f.bb[3] : f.h) * k - cam.y), { scale: k }); };
  for (const p of kit.pieces) put(p.f, p.tx * 16 + 8, p.ty * 16 + 16);
  if (kit.arch) put(F.arch, kit.arch.tx * 16 + 8, kit.arch.ty * 16 + 16);
}
