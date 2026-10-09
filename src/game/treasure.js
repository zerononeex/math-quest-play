// [D53] Treasure room (ends every dungeon, after its sub-boss): a royal runner from the south door to a polished dais, the
// medallion on a stone pedestal in the centre, guardian statues and torch stands in mirrored pairs, gold and gems at the
// pedestal's feet. Taking the medallion also fills the hearts and pays gold, and the hero shows it off over his head.
// Art: the user's treasure-room sheet (frames in prompt order); the code look stays as the fallback (dungeon painter).
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite, drawOpaque, opaqueBox, codeArt } from '../engine/atlas.js';
import { MEDALS_PER_WORLD } from './hud.js';

const S = 'treasure-room';
const TF = { carpet: 0, floor: 3, pedestal: 4, pedestalLit: 5, torch: 8, guardian: 10, gold: 12, gems: 13, sparkle: 15 };
const PED = [20, 12];
// mirrored pairs around the dais (tile coords in the 40x30 room): statues at the back, torches either side, the prize piles
const GUARDS = [[16, 10], [24, 10]], TORCHES = [[17, 13], [23, 13], [17, 16], [23, 16]], PILES = [[18, 13, TF.gold], [22, 13, TF.gems]];
export const TREASURE_SOLIDS = [...GUARDS, ...TORCHES];

const fname = (i) => Object.keys(ATLAS[S].meta.frames)[i];
const put = (ctx, i, tx, ty, cam, dy = 0) => { // foot on the tile's bottom edge, centred on the tile
  const n = fname(i), f = ATLAS[S].meta.frames[n];
  drawSprite(ctx, S, n, Math.round(tx * 16 + 8 - f.w / 2 - cam.x), Math.round((ty + 1) * 16 - (f.bb ? f.bb[3] : f.h) + dy - cam.y));
};

// Floor layer (before props/entities): runner + polished dais.
export function drawTreasureFloor(ctx, cam) {
  if (!imgReady(S)) return false;
  const sheet = ATLAS[S], tile = (i, tx, ty) => { // the tile's inner crop (the cut frames carry a border) stretched over one 16-px tile
    const f = sheet.meta.frames[fname(i)], r = f.src, k = f.w / r.w, b = f.bb || [0, 0, f.w, f.h];
    const x0 = b[0] / k, y0 = b[1] / k, w = (b[2] - b[0]) / k, h = (b[3] - b[1]) / k, ix = w * 0.12, iy = h * 0.12;
    ctx.drawImage(sheet.img, r.x + x0 + ix, r.y + y0 + iy, w - 2 * ix, h - 2 * iy, Math.round(tx * 16 - cam.x), Math.round(ty * 16 - cam.y), 16, 16);
  };
  for (let ty = 9; ty <= 15; ty++) for (let tx = 16; tx <= 24; tx++) tile(TF.floor, tx, ty);
  for (let ty = 17; ty <= 27; ty++) for (const tx of [19, 20, 21]) tile(TF.carpet, tx, ty); // centred under the pedestal and the portal
  return true;
}

// Set pieces (after the floor): statues, torches, pedestal (+ the medallion while it is there), the prize piles.
export function drawTreasureRoom(ctx, cam, done, medalIdx) {
  if (!imgReady(S)) return false;
  for (const [x, y] of GUARDS) put(ctx, TF.guardian, x, y, cam);
  for (const [x, y] of TORCHES) put(ctx, TF.torch, x, y, cam);
  if (!done) for (const [x, y, i] of PILES) put(ctx, i, x, y, cam);
  put(ctx, done ? TF.pedestal : TF.pedestalLit, PED[0], PED[1], cam);
  if (!done) { const pf = ATLAS[S].meta.frames[fname(TF.pedestal)], top = (PED[1] + 1) * 16 - (pf.bb ? pf.bb[3] - pf.bb[1] : 12); // resting just on the pedestal's top
    drawMedal(ctx, medalIdx, PED[0] * 16 + 8 - cam.x, top + 5 + Math.sin(performance.now() / 300) * 1.5 - cam.y); }
  return true;
}

// [R3-15] The royal vault (the W1 keep, after the boss): the same statues, torches and gold piles, and in place of the
// pedestal a big royal chest (prompt #330 royal-vault frames 0 closed / 1 open; a code chest until that art exists).
export const VAULT_CHEST = PED;
export function drawVaultRoom(ctx, cam, opened, t, world = 1) {
  if (imgReady(S)) {
    for (const [x, y] of GUARDS) put(ctx, TF.guardian, x, y, cam);
    for (const [x, y] of TORCHES) put(ctx, TF.torch, x, y, cam);
    if (!opened) for (const [x, y, i] of PILES) put(ctx, i, x, y, cam);
  }
  drawRoyalChest(ctx, PED[0] * 16 + 8 - cam.x, (PED[1] + 1) * 16 - cam.y, opened, t, world);
}
// [W2 Phase 5] the world's own vault sheet (w<n>-royal-vault: W2 #367, W3-W7 #368-#372; same 4 frames as #330) when
// it is in, else the shared royal-vault #330
export function vaultSheet(world) { const s = 'w' + world + '-royal-vault'; return imgReady(s) ? s : 'royal-vault'; }
// the royal chest, foot centred at (cx, foot) in screen px, about 2.5 tiles wide
export function drawRoyalChest(ctx, cx, foot, opened, t, world = 1) {
  const W = CONFIG.TREASURE.ROYAL_CHEST_W, glow = 0.35 + 0.15 * Math.sin(t * 3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(cx, foot - 14, 4, cx, foot - 14, W);
  g.addColorStop(0, 'rgba(255,220,120,' + (opened ? glow + 0.2 : glow).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; ctx.fillRect(cx - W, foot - 14 - W, W * 2, W * 2); ctx.restore();
  const S = vaultSheet(world);
  if (imgReady(S)) { const k = Object.keys(ATLAS[S].meta.frames), n = k[opened ? 1 : 0], b = opaqueBox(S, n), h = Math.round((W * b.h) / b.w);
    drawOpaque(ctx, S, opened ? 1 : 0, Math.round(cx - W / 2), Math.round(foot - h), W, h); return; }
  codeArt('royal-chest');
  const x = Math.round(cx - W / 2), w = W, bodyH = 18, y = Math.round(foot - bodyH - 2);
  const f = (c, a, b, ww, hh) => { ctx.fillStyle = c; ctx.fillRect(a, b, ww, hh); };
  f('rgba(0,0,0,0.3)', x + 2, foot - 2, w - 4, 3); // shadow
  f('#2a0e18', x - 1, y - 1, w + 2, bodyH + 2); f('#8a1e3a', x, y, w, bodyH); f('#a83050', x, y, w, 3); // body
  for (const bx of [x + 3, x + w - 7]) f('#ffd040', bx, y, 4, bodyH); f('#ffd040', x, y + bodyH - 3, w, 3); // gold bands
  for (const fx of [x + 1, x + w - 5]) f('#c08a10', fx, foot - 2, 4, 2); // gold feet
  if (!opened) {
    f('#2a0e18', x - 1, y - 12, w + 2, 12); f('#9a2444', x, y - 11, w, 10); f('#c04060', x + 2, y - 11, w - 4, 2); // the domed lid
    f('#ffd040', x, y - 3, w, 3); for (const bx of [x + 3, x + w - 7]) f('#ffd040', bx, y - 11, 4, 9);
    f('#ffd040', cx - 6, y - 9, 12, 2); f('#ffd040', cx - 6, y - 12, 2, 4); f('#ffd040', cx - 1, y - 13, 2, 5); f('#ffd040', cx + 4, y - 12, 2, 4); // crown emblem
    f('#3a2a00', cx - 4, y + 1, 8, 8); f('#40e080', cx - 3, y + 2, 6, 6); f('#c0ffd8', cx - 2, y + 3, 2, 2); // the gem lock
  } else {
    f('#2a0e18', x - 1, y - 16, w + 2, 14); f('#6a1830', x, y - 15, w, 12); f('#ffd040', x, y - 15, w, 2); // lid thrown back
    f('#ffe890', x + 4, y - 2, w - 8, 4); // gold light inside
    ctx.fillStyle = 'rgba(255,240,170,0.6)'; for (let i = 0; i < 4; i++) { const sx = cx - 10 + i * 7, sy = y - 8 - ((t * 20 + i * 9) % 22); ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2); }
  }
  ctx.fillStyle = '#ffffff'; const k2 = Math.floor(t * 4) % 3; ctx.fillRect(x + 4 + k2 * 10, y + 4, 2, 2); // a glint
}

export function medalIndex(world, order) { return MEDALS_PER_WORLD.slice(0, world - 1).reduce((a, b) => a + b, 0) + order; }

function drawMedal(ctx, idx, cx, cy) {
  if (imgReady('medals')) { const k = Object.keys(ATLAS.medals.meta.frames), n = k[Math.min(idx, k.length - 1)], f = ATLAS.medals.meta.frames[n]; drawSprite(ctx, 'medals', n, Math.round(cx - f.w / 2), Math.round(cy - f.h)); return; }
  ctx.fillStyle = '#10101a'; ctx.fillRect(cx - 6, cy - 12, 12, 12); ctx.fillStyle = '#ffd040'; ctx.fillRect(cx - 5, cy - 11, 10, 10);
}

// The reward on taking the medallion: full hearts + gold (per world). Returns the gold paid.
export function treasureReward(data, world) {
  const gold = CONFIG.TREASURE.GOLD_PER_WORLD * world;
  data.hearts = data.maxHearts; data.gold += gold;
  return gold;
}

// Item-get moment: the hero holds the prize up for SHOW_S seconds (the -hold pose with the prize above, or the -extra chest pose).
export function startItemGet(hero, medalIdx, icon = null, chest = false) { hero.itemGet = { idx: medalIdx, icon, chest, t: CONFIG.TREASURE.SHOW_S }; hero.facing = 'down'; } // icon: [sheet, frame] for heart pieces / tools; chest: the *-extra chest-overhead pose
export function drawItemGet(ctx, hero, cam, dt) {
  const g = hero.itemGet; if (!g) return;
  g.t -= dt; if (g.t <= 0) { hero.itemGet = null; return; }
  if (g.chest) { hero.holdTop = null; return; } // the chest is in the hero's hands (hero.js)
  const x = hero.x - cam.x, y = (hero.holdTop != null ? hero.holdTop + 2 : hero.y - 44 - cam.y); // above the raised hands (hold pose), else over the head
  ctx.globalAlpha = 0.5 + 0.5 * Math.min(1, g.t); ctx.fillStyle = 'rgba(255,240,160,0.3)'; ctx.beginPath(); ctx.arc(x, y - 7, 8, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  if (g.icon) { if (imgReady(g.icon[0])) { const k = Object.keys(ATLAS[g.icon[0]].meta.frames), n = k[Math.min(g.icon[1], k.length - 1)], f = ATLAS[g.icon[0]].meta.frames[n]; drawSprite(ctx, g.icon[0], n, Math.round(x - f.w * 0.3), Math.round(y - f.h * 0.6), { scale: 0.6 }); } }
  else drawMedal(ctx, g.idx, x, y);
  hero.holdTop = null;
}
