// HUD (top reserved rows): hearts, AP bar, XP/level, weapon/ammo/special slots, element badges, hero badge,
// gold, band stars, medallions, relic row, pause/SAVE/Q buttons. Every element records a layout rect.
// [A8d] Drawn from the user's v2 sheets (ui-hud-icons, ui-kit, ui-touch, ui-heart-pieces) at one pixel size; code look as fallback.
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';
import { record, drawCell, cellText, layout } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { weaponIcon } from '../data/gear.js';
import { xpToNext } from './progression.js';
import { AMMO } from './projectiles.js';

export const HUD_H = CONFIG.UI.HUD_RESERVED_H;
export const MEDALS_PER_WORLD = [2, 2, 3, 3, 3, 3, 4, 0];
const DEFAULT_SLOTS = { rowan: ['boomerang', 'spin'], milo: ['shellToss', 'spinDash'], wren: ['blaster', 'inkGatling'] };
// [HUD-ATTACK] ui-attack-icons frames (prompt #324) by ammo / special id
const ATK_ICON = { boomerang: 0, arrow: 1, fireArrow: 2, iceArrow: 3, shellToss: 4, fireFlower: 5, frostFlower: 6, blaster: 7, emberInk: 8, frostInk: 9, splatBomb: 10, spin: 11, spinDash: 12, capeSwipe: 13, inkGatling: 14, starfall: 15 };
const STARTER_ICON = { rowan: 0, milo: 1, wren: 2 }; // [R2-21] ui-attack-icons-b (prompt #327): starter sword / gloves / roller, 3 = boomerang
const ELEMENTS = [['fireBloom', 'fire-flame'], ['iceBloom', 'ice-crystal'], ['gustJar', 'wind-swirl']];

export function createHud() {
  return { lastWeapon: null, sparkle: 0, stars: 1, buttons: {}, slot: 1, ammo: null, special: null };
}

// Button rects (logical px) for the current view width.
export function hudButtons(viewW) {
  return {
    pill: { x: 252, y: 50, w: 52, h: 30 }, // [R3-5] under the hero badge, clear of the 1.5x group
    ...attackButtons(viewW), // [HUD-ATTACK] bottom-right game-pad cluster
    map: { x: viewW - 176, y: 6, w: 38, h: 38 }, // [D40] always-visible map button (scenes that have a map)
    pause: { x: viewW - 132, y: 6, w: 38, h: 38 },
    save: { x: viewW - 88, y: 6, w: 38, h: 38 },
    q: { x: viewW - 44, y: 6, w: 38, h: 38 },
  };
}

// [HUD-ATTACK] slot 1 (main weapon, biggest) in the corner, slot 2 (ammo) to its left, slot 3 (special) above it
export function attackButtons(viewW) {
  const A = CONFIG.UI.ATTACK, H = CONFIG.VIEW.H, b = A.BIG, m = A.SMALL;
  const s1 = { x: viewW - A.PAD - b, y: H - A.PAD - b, w: b, h: b };
  return { slot1: s1, slot2: { x: s1.x - A.GAP - m, y: s1.y + b - m, w: m, h: m }, slot3: { x: s1.x + b - m, y: s1.y - A.GAP - m, w: m, h: m } };
}

export function hudHit(viewW, px, py) {
  const b = hudButtons(viewW);
  for (const k of Object.keys(b)) { const r = b[k]; if (k === 'pill' && !hudHit.pillOn) continue; if (k === 'map' && !hudHit.mapOn) continue; if (k.startsWith('slot') && !hudHit.attackOn) continue; if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) return k; }
  return null;
}

// a frame of a v2 UI sheet (by index) fitted into a size×size box at (x, y); false while the sheet is missing
function icon(ctx, sheet, i, x, y, size) {
  if (!imgReady(sheet)) return false;
  const names = Object.keys(ATLAS[sheet].meta.frames), n = names[Math.min(i, names.length - 1)], f = ATLAS[sheet].meta.frames[n], k = size / Math.max(f.w, f.h);
  return drawSprite(ctx, sheet, n, Math.round(x + (size - f.w * k) / 2), Math.round(y + (size - f.h * k) / 2), { scale: k });
}
const HI = { gem: 3, gemEmpty: 4, xp: 6, level: 7, save: 13 }, KIT = { star: 4, medal: 10, relic: 11 }, TOUCH = { slot: 2, slotOn: 3, q: 8, pause: 9, map: 10 };
function iconBtn(ctx, r, id, sheet, i) { // a round v2 touch button filling its tap rect
  if (!icon(ctx, sheet, i, r.x, r.y, Math.min(r.w, r.h))) return false;
  record('button', id, r.x, r.y, r.w, r.h); return true;
}

function btn(ctx, r, id, label, color) {
  ctx.fillStyle = color; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#10101a'; ctx.lineWidth = 2; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.font = font(14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  drawOutlined(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  record('button', id, r.x, r.y, r.w, r.h);
}

export function updateHud(hud, data, dt) {
  hudHit.pillOn = data.statPoints > 0;
  const w = data.gearEquipped.weapon[data.hero];
  if (w !== hud.lastWeapon) { if (hud.lastWeapon !== null || w) hud.sparkle = 0.8; hud.lastWeapon = w; }
  if (hud.sparkle > 0) hud.sparkle -= dt;
  if (hud.ammoSparkle > 0) hud.ammoSparkle -= dt; // [DUNGEON-LIFE C] a new fire / ice ammo
}

export function drawHud(ctx, hud, data, view, { ap, apCap, band, map = false, attack = false }) {
  hudHit.mapOn = map; hudHit.attackOn = attack;
  ctx.fillStyle = 'rgba(8,8,24,0.72)';
  ctx.fillRect(0, 0, view.w, HUD_H - 4);
  const K = CONFIG.UI.HUD_SCALE; ctx.save(); ctx.scale(K, K); layout.k = K; // [R3-5] hearts, AP, XP, badges, hero, gold, stars at 1.5x
  // Hearts: 10 per row, 2 rows.
  for (let i = 0; i < data.maxHearts; i++) {
    drawSprite(ctx, 'ui-hud-icons', i < data.hearts ? 'full-heart' : 'empty-heart', 4 + (i % 10) * 10, 2 + Math.floor(i / 10) * 11, { scale: 0.75 });
  }
  const pc = (data.heartPieces || 0) % CONFIG.HEARTS.PIECES_PER_HEART; // [D52] collected pieces of the next heart (¼…¾) after the last heart
  if (pc && data.maxHearts < CONFIG.HEARTS.CAP && imgReady('ui-heart-pieces')) {
    const k = Object.keys(ATLAS['ui-heart-pieces'].meta.frames)[pc], i = data.maxHearts;
    drawSprite(ctx, 'ui-heart-pieces', k, 4 + (i % 10) * 10, 2 + Math.floor(i / 10) * 11, { scale: 0.6 });
  }
  record('hud', 'hearts', 4, 2, 100, 22);
  // AP gems: one per 10 AP (cap-aware), the last one filled partway; the code bar while ui-hud-icons is missing.
  const bw = 100, gems = Math.ceil(apCap / 10), gw = Math.min(12, Math.floor(bw / gems));
  if (imgReady('ui-hud-icons')) {
    for (let g = 0; g < gems; g++) {
      const x = 4 + g * gw, fill = Math.max(0, Math.min(1, (ap - g * 10) / 10));
      icon(ctx, 'ui-hud-icons', HI.gemEmpty, x, 25, gw);
      if (fill > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x, 25 + gw * (1 - fill), gw, gw * fill); ctx.clip(); icon(ctx, 'ui-hud-icons', HI.gem, x, 25, gw); ctx.restore(); }
    }
  } else {
    ctx.fillStyle = '#10101a'; ctx.fillRect(4, 27, bw + 2, 8);
    ctx.fillStyle = '#2060c0'; ctx.fillRect(5, 28, Math.round((bw * ap) / apCap), 6);
    ctx.fillStyle = '#10101a';
    for (let t = 10; t < apCap; t += 10) ctx.fillRect(5 + Math.round((bw * t) / apCap), 28, 1, 6);
  }
  record('hud', 'ap', 4, 25, bw + 2, 12);
  // XP bar + level badge.
  const need = xpToNext(data.level);
  ctx.fillStyle = '#10101a'; ctx.fillRect(40, 41, 66, 6);
  ctx.fillStyle = '#e0c040'; ctx.fillRect(41, 42, Math.round((64 * Math.min(data.xp, need)) / need), 4);
  ctx.font = font(11); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  if (icon(ctx, 'ui-hud-icons', HI.level, 3, 38, 13)) drawOutlined(ctx, String(data.level), 18, 45, '#ffffff', '#10101a', 1);
  else drawOutlined(ctx, 'Lv ' + data.level, 4, 43, '#ffffff', '#10101a', 1);
  record('hud', 'xp', 3, 38, 103, 12);
  // Element badges once owned.
  ELEMENTS.forEach(([tool, frame], i) => {
    if (data.tools.includes(tool)) { drawSprite(ctx, 'ui-element-icons', frame, 112 + i * 18, 38, { scale: 0.75 }); record('hud', 'elem-' + tool, 112 + i * 18, 38, 12, 12); }
  });
  // Hero badge, gold, band stars.
  const hs = 'hero-' + data.hero, hf = imgReady(hs) && ATLAS[hs].meta.frames.down0;
  if (hf) { const k = 24 / hf.h; drawSprite(ctx, hs, 'down0', Math.round(220 - (hf.w * k) / 2), 4, { scale: k }); } // [A8d] the hero's own v2 sprite
  else {
    ctx.fillStyle = { rowan: '#2aa8a0', milo: '#d83a3a', wren: '#4a7ad8' }[data.hero];
    ctx.fillRect(208, 4, 24, 24);
    ctx.font = font(14); ctx.textAlign = 'center'; drawOutlined(ctx, data.hero[0].toUpperCase(), 220, 17);
  }
  record('hud', 'hero', 208, 4, 24, 24);
  drawSprite(ctx, 'ui-hud-icons', 'gold-coin', 238, 4);
  ctx.textAlign = 'left'; ctx.font = font(13); drawOutlined(ctx, String(data.gold), 256, 13, '#ffe070');
  record('hud', 'gold', 238, 4, 60, 16);
  hud.stars = band + 1;
  if (imgReady('ui-kit')) for (let i = 0; i < hud.stars; i++) icon(ctx, 'ui-kit', KIT.star, 238 + i * 13, 27, 12);
  else { ctx.font = font(12); drawOutlined(ctx, '★'.repeat(hud.stars), 238, 34, '#ffe070'); }
  record('hud', 'stars', 238, 26, 70, 16);
  ctx.restore(); layout.k = 1;
  if (attack) drawAttackButtons(ctx, hud, data, view, ap);
  // [R3-5] Medallions (big) in a second row under the right-hand buttons + relic row to their left (hidden until the first hint).
  const wi = data.location.world - 1;
  const n = MEDALS_PER_WORLD[wi], MS = 26, MP = 30, my = 50;
  const mx = view.w - 8 - n * MP;
  for (let i = 0; i < n; i++) {
    const got = i < data.worlds[wi].medallions.length, mi = MEDALS_PER_WORLD.slice(0, wi).reduce((a, b) => a + b, 0) + i;
    if (icon(ctx, 'ui-kit', KIT.medal, mx + i * MP, my, MS)) { if (got) icon(ctx, 'medals', mi, mx + i * MP + 3, my + 3, MS - 6); continue; } // [A8d] empty medallion frames, filled as you win them
    ctx.fillStyle = '#10101a'; ctx.fillRect(mx + i * MP, my, MS, MS);
    ctx.fillStyle = got ? '#ffd040' : '#3a3a4a'; ctx.fillRect(mx + i * MP + 3, my + 3, MS - 6, MS - 6);
  }
  if (n) record('hud', 'medals', mx, my, n * MP, MS);
  if (data.quests && data.quests.relicHint) {
    const rx = (n ? mx : view.w - 8) - 8 - 6 * 12, ry = my + 18; // low in the bar, under the stars' row
    for (let i = 0; i < 6; i++) { ctx.fillStyle = i < data.relics.length ? '#c080ff' : '#2a2a3a'; ctx.fillRect(rx + i * 12, ry, 10, 10); }
    ctx.font = font(11); ctx.textAlign = 'right'; drawOutlined(ctx, data.relics.length + '/6', rx - 3, ry + 5, '#e0c0ff', '#10101a', 1);
    record('hud', 'relics', rx - 26, ry, 26 + 6 * 12, 10);
  }
  const b = hudButtons(view.w);
  if (data.statPoints > 0) {
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 150);
    ctx.globalAlpha = pulse;
    drawCell(ctx, b.pill.x, b.pill.y, b.pill.w, b.pill.h, { fill: '#b04a9a' }); cellText(ctx, '+' + data.statPoints + ' ▲', b.pill.x + b.pill.w / 2, b.pill.y + b.pill.h / 2 + 1, 14);
    record('button', 'statpill', b.pill.x, b.pill.y, b.pill.w, b.pill.h);
    ctx.globalAlpha = 1;
  }
  if (map && !iconBtn(ctx, b.map, 'mapbtn', 'ui-touch', TOUCH.map)) { btn(ctx, b.map, 'mapbtn', '', '#6a4a2a'); const m = b.map; ctx.fillStyle = '#f0e0b0'; ctx.fillRect(m.x + 9, m.y + 10, 20, 18); ctx.fillStyle = '#c04030'; ctx.fillRect(m.x + 17, m.y + 16, 5, 5); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(m.x + 7, m.y + 8, 4, 22); ctx.fillRect(m.x + 27, m.y + 8, 4, 22); }
  if (!iconBtn(ctx, b.pause, 'pausebtn', 'ui-touch', TOUCH.pause)) btn(ctx, b.pause, 'pausebtn', '||', '#3a3a6a');
  if (!iconBtn(ctx, b.save, 'savebtn', 'ui-hud-icons', HI.save)) btn(ctx, b.save, 'savebtn', 'SAVE', '#1a6a3a');
  if (!iconBtn(ctx, b.q, 'qbtn', 'ui-touch', TOUCH.q)) btn(ctx, b.q, 'qbtn', 'Q', '#8a5a1a');
}

// [HUD-ATTACK] Three big opaque buttons in the clean blue style: the equipped weapon, the current ammo and the current
// special. No words — icons only (ui-attack-icons once uploaded, else code-drawn shapes); the key number sits in a
// corner; a gold ring fills while the AP for that move is still short (and the button dims).
function drawAttackButtons(ctx, hud, data, view, ap) {
  const B = attackButtons(view.w), A = CONFIG.UI.ATTACK, slots = DEFAULT_SLOTS[data.hero];
  for (let s = 1; s <= 3; s++) {
    const r = B['slot' + s], sel = hud.slot === s, cx = r.x + r.w / 2, cy = r.y + r.h / 2, size = Math.round(r.w * A.ICON);
    drawCell(ctx, r.x, r.y, r.w, r.h, { sel, fill: sel ? CONFIG.CELL.SEL_FILL : CONFIG.CELL.FILL });
    let cost = 0;
    if (s === 1) {
      const ic = weaponIcon(data.hero, data.gearEquipped.weapon[data.hero]);
      if (ic && imgReady(ic.sheet)) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2); ctx.fill(); } // gear art is dark: a light disc behind it
      if (!(ic && fitSprite(ctx, ic.sheet, ic.frame, cx, cy, size)) && !artIcon(ctx, r, cx, cy, 'ui-attack-icons-b', STARTER_ICON[data.hero] ?? 0)) drawAttackGlyph(ctx, { rowan: 'sword', milo: 'fists', wren: 'roller' }[data.hero], cx, cy, size); // the starter weapon (no gear icon): #327 art, else the code glyph
      if (hud.sparkle > 0) { ctx.fillStyle = '#ffffff'; const k = Math.floor(hud.sparkle * 10) % 3; ctx.fillRect(r.x + 8 + k * 16, r.y + 8 + k * 12, 4, 4); }
    } else {
      const id = s === 2 ? hud.ammo || slots[0] : hud.special || slots[1], next = s === 2 ? hud.ammoNext : hud.specialNext;
      if (next && next !== id) { // [R3-16] the next choice peeks out behind (faded, up-right) and a swap badge: tap again to switch
        const G = CONFIG.UI.ATTACK.GHOST, box = (k, dx, dy) => { const w = r.w * k, h = r.h * k; return { x: cx + r.w * dx - w / 2, y: cy + r.h * dy - h / 2, w, h }; };
        const gb = box(G.SCALE, G.DX, -G.DY), mb = box(G.MAIN, -G.DX / 2, G.DY / 2);
        ctx.save(); ctx.globalAlpha = G.ALPHA; attackIcon(ctx, gb, next, false); ctx.restore();
        attackIcon(ctx, mb, id, true);
        ctx.save(); const bx = r.x + r.w - 9, by = r.y + r.h - 9; ctx.fillStyle = '#ffe070'; ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = 2; // the swap badge
        ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx, by, 3.5, -2.6, 1.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - 0.2, by + 5.6); ctx.lineTo(bx - 2.6, by + 3.4); ctx.lineTo(bx + 0.6, by + 2.2); ctx.closePath(); ctx.fillStyle = '#3a2a00'; ctx.fill(); ctx.restore();
      } else attackIcon(ctx, r, id, true);
      cost = s === 2 ? (AMMO[id] ? AMMO[id].ap : 0) : CONFIG.COMBAT.SPECIAL_AP[id] || 0;
    }
    if (s === 2 && hud.ammoSparkle > 0) { ctx.fillStyle = '#fff6a0'; const k = Math.floor(hud.ammoSparkle * 12) % 4; for (let j = 0; j < 3; j++) ctx.fillRect(r.x + 6 + ((k + j * 5) % 9) * 5, r.y + 6 + ((k * 3 + j * 7) % 9) * 5, 3, 3); }
    if (cost && ap < cost) { // not enough AP yet: dim + a gold ring that fills as AP comes back
      ctx.fillStyle = 'rgba(10,16,40,0.5)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(r.x, r.y, r.w, r.h, CONFIG.CELL.R) : ctx.rect(r.x, r.y, r.w, r.h); ctx.fill();
      ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r.w / 2 - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, ap / cost)); ctx.stroke();
    }
    ctx.font = 'bold 11px ' + CONFIG.FONTS.UI; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#ffffff'; ctx.fillText(String(s), r.x + 6, r.y + 4);
    record('button', 'slot' + s, r.x, r.y, r.w, r.h);
  }
}
// one ammo / special icon filling its box r: the user's art (the better #327 boomerang first), else the code glyph; disc = light backing
function attackIcon(ctx, r, id, disc) {
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (id === 'boomerang' && artIcon(ctx, r, cx, cy, 'ui-attack-icons-b', 3, disc)) return;
  if (!artIcon(ctx, r, cx, cy, 'ui-attack-icons', ATK_ICON[id] ?? 0, disc)) drawAttackGlyph(ctx, id, cx, cy, Math.round(r.w * CONFIG.UI.ATTACK.ICON));
}
// [#324/#327] the user's icon art, big, on a light disc so it reads on the blue; false while the sheet is missing
function artIcon(ctx, r, cx, cy, sheet, i, disc = true) {
  if (!imgReady(sheet)) return false;
  const big = Math.round(r.w * CONFIG.UI.ATTACK.ART); if (disc) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(cx, cy, r.w / 2 - 5, 0, Math.PI * 2); ctx.fill(); }
  return icon(ctx, sheet, i, cx - big / 2, cy - big / 2, big);
}
function fitSprite(ctx, sheet, frame, cx, cy, size) {
  if (!imgReady(sheet) || !ATLAS[sheet].meta.frames[frame]) return false;
  const f = ATLAS[sheet].meta.frames[frame], k = size / Math.max(f.w, f.h);
  return drawSprite(ctx, sheet, frame, Math.round(cx - (f.w * k) / 2), Math.round(cy - (f.h * k) / 2), { scale: k });
}
// Code fallback icons (simple bold shapes, white-outlined so they read on the blue button)
export function drawAttackGlyph(ctx, id, cx, cy, size) {
  const u = size / 20; ctx.save(); ctx.translate(cx, cy); ctx.scale(u, u); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = (fill, stroke = '#10101a', lw = 1.6) => { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); };
  const arrow = (head) => { ctx.strokeStyle = '#10101a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(6, -6); ctx.stroke(); ctx.strokeStyle = '#d8c090'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(1, -6); ctx.lineTo(6, -1); ctx.closePath(); path(head); ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-9, 3); ctx.lineTo(-6, 5); ctx.closePath(); path('#e8e8f0'); };
  const flower = (petal) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 5, Math.sin(a) * 5 - 1, 4, 0, Math.PI * 2); path(petal); } ctx.beginPath(); ctx.arc(0, -1, 3, 0, Math.PI * 2); path('#ffe070'); };
  const blob = (c) => { ctx.beginPath(); ctx.moveTo(-7, 2); ctx.quadraticCurveTo(-8, -8, 0, -8); ctx.quadraticCurveTo(9, -8, 7, 1); ctx.quadraticCurveTo(8, 8, 0, 7); ctx.quadraticCurveTo(-9, 9, -7, 2); path(c); ctx.beginPath(); ctx.arc(-2, -3, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill(); };
  const swirl = (c) => { ctx.strokeStyle = '#10101a'; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.arc(0, 0, 7, 0.3, Math.PI * 1.7); ctx.stroke(); ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.stroke(); ctx.beginPath(); ctx.moveTo(6.5, -6); ctx.lineTo(9, -1); ctx.lineTo(3, -2); ctx.closePath(); path(c); };
  switch (id) {
    case 'sword': ctx.beginPath(); ctx.moveTo(-1.5, 6); ctx.lineTo(-1.5, -8); ctx.lineTo(0, -10); ctx.lineTo(1.5, -8); ctx.lineTo(1.5, 6); ctx.closePath(); path('#e8eef8'); ctx.beginPath(); ctx.rect(-6, 5, 12, 2.5); path('#c09030'); ctx.beginPath(); ctx.rect(-1.2, 7.5, 2.4, 4); path('#7a4a20'); break;
    case 'fists': for (const x of [-5, 5]) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 4.5, -5, 9, 10, 3) : ctx.rect(x - 4.5, -5, 9, 10); path('#e05040'); ctx.beginPath(); ctx.rect(x - 4.5, 4, 9, 3); path('#f0e0c0'); } break;
    case 'roller': ctx.beginPath(); ctx.rect(-9, -8, 18, 7); path('#ff60c0'); ctx.beginPath(); ctx.rect(-1, -1, 2, 6); path('#c0c8d8'); ctx.beginPath(); ctx.rect(-2, 5, 4, 6); path('#3a4a8a'); break;
    case 'boomerang': ctx.beginPath(); ctx.moveTo(-9, -3); ctx.quadraticCurveTo(0, -11, 9, -3); ctx.lineTo(6, 0); ctx.quadraticCurveTo(0, -6, -6, 0); ctx.closePath(); ctx.rotate(0.3); path('#c08040'); break;
    case 'arrow': arrow('#c0c8d8'); break;
    case 'fireArrow': arrow('#ff7020'); ctx.beginPath(); ctx.arc(7, -7, 3, 0, Math.PI * 2); path('#ffc030', '#c03010', 1); break;
    case 'iceArrow': arrow('#80e0ff'); ctx.beginPath(); ctx.arc(7, -7, 3, 0, Math.PI * 2); path('#e0f8ff', '#3080c0', 1); break;
    case 'shellToss': ctx.beginPath(); ctx.arc(0, 2, 8, Math.PI, 0); ctx.closePath(); path('#40a040'); ctx.beginPath(); ctx.rect(-9, 2, 18, 3); path('#f0e0a0'); ctx.beginPath(); ctx.moveTo(-3, -5); ctx.lineTo(3, -5); ctx.lineTo(4, 0); ctx.lineTo(-4, 0); ctx.closePath(); path('#80d060', '#205020', 1); break;
    case 'fireFlower': flower('#ff5030'); break;
    case 'frostFlower': flower('#60b0ff'); break;
    case 'blaster': ctx.beginPath(); ctx.rect(-9, -5, 14, 7); path('#40c0d0'); ctx.beginPath(); ctx.rect(5, -3, 5, 3); path('#e0e0e0'); ctx.beginPath(); ctx.rect(-6, 2, 5, 7); path('#2a4a8a'); break;
    case 'emberInk': blob('#ff7030'); break;
    case 'frostInk': blob('#80d0ff'); break;
    case 'splatBomb': ctx.beginPath(); ctx.arc(-1, 2, 7, 0, Math.PI * 2); path('#3a3a5a'); ctx.strokeStyle = '#c09040'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(3, -4); ctx.quadraticCurveTo(6, -9, 9, -8); ctx.stroke(); ctx.beginPath(); ctx.arc(9, -8, 2, 0, Math.PI * 2); path('#ffd040', '#ff6020', 1); break;
    case 'spin': swirl('#e8eef8'); break;
    case 'spinDash': swirl('#ff6060'); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; for (const y of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(-5, y); ctx.stroke(); } break;
    case 'capeSwipe': ctx.beginPath(); ctx.moveTo(-8, -7); ctx.quadraticCurveTo(10, -6, 7, 9); ctx.quadraticCurveTo(0, 2, -8, -1); ctx.closePath(); path('#e03a3a'); break;
    case 'inkGatling': for (const [x, c] of [[-6, '#ff60c0'], [0, '#60d0ff'], [6, '#ffe040']]) { ctx.beginPath(); ctx.arc(x, 0, 3.4, 0, Math.PI * 2); path(c); } break;
    case 'starfall': { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 4 : 9; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); path('#ffe040'); break; }
    default: ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); path('#c0c8d8');
  }
  ctx.restore();
}
