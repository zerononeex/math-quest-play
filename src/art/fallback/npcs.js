// Code-drawn townsfolk: 16×24 body with hair/clothes colours from data (look: [hair, clothes]).
import { ATLAS, imgReady, drawSprite, opaqueBox, drawOpaque, codeArt } from '../../engine/atlas.js';

// [S59] Named NPC art: a w<n>-npcs frame whose name is the NPC's id (or ends with it, e.g. elder-mossbeard ↔ mossbeard).
const npcArtCache = new Map();
function npcArt(id) {
  if (npcArtCache.has(id)) return npcArtCache.get(id);
  let hit = null, pending = false;
  for (let w = 0; w <= 8 && !hit; w++) {
    const sheet = w ? 'w' + w + '-npcs' : 'ship-npcs'; // [R1-15] the Wayfarer crew first
    if (!ATLAS[sheet]) continue;
    if (!imgReady(sheet)) { pending = true; continue; }
    const k = Object.keys(ATLAS[sheet].meta.frames).find((n) => n === id || n.endsWith('-' + id));
    if (k) hit = { sheet, frame: k, f: ATLAS[sheet].meta.frames[k] };
  }
  // retry while sheets are still loading or not registered yet (asset tags register after boot) — a cached miss was v1.0's code-drawn townsfolk
  if (hit || (!pending && ATLAS['w1-npcs'])) npcArtCache.set(id, hit);
  return hit;
}

// [A5] user 2026-10-06: townsfolk the same height as the hero (the hero's art is 49 art px tall): each figure's opaque
// height is measured once and scaled to it.
const HERO_H = 24.5; // world px (49 art px at the v2 0.5 display scale)
const HERO_W = 17.5; // world px: the hero's body width ([R3-6] castle folk carry spears / crowns, so they match his width, not his height)
function drawPerson(ctx, sheet, frame, x, y, byWidth = false) {
  const A = ATLAS[sheet], f = A.meta.frames[frame], b = opaqueBox(sheet, frame), k = f.w / f.src.w, h = b.h * k;
  const s = byWidth ? Math.min(HERO_W / (b.w * k), (HERO_H * 1.5) / h) : HERO_H / h, w = b.w * k * s, H = h * s;
  drawOpaque(ctx, sheet, Object.keys(A.meta.frames).indexOf(frame), x - w / 2, y - H, w, H);
}

export function drawNpc(ctx, e, x, y) {
  if (e.npc && e.npc.sheet && imgReady(e.npc.sheet)) { // [V5] background villager: one of the user's villager figures
    const k = Object.keys(ATLAS[e.npc.sheet].meta.frames), n = e.npc.frame && ATLAS[e.npc.sheet].meta.frames[e.npc.frame] ? e.npc.frame : k[(e.npc.villager * 2) % k.length]; // [R2-19] a named frame (castle folk, w1-npcs-b)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
    drawPerson(ctx, e.npc.sheet, n, x, y, !!e.npc.frame); return;
  }
  const art = e.npc && e.npc.id ? npcArt(e.npc.id) : null;
  if (art) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 6, 2, 0, 0, Math.PI * 2); ctx.fill(); drawPerson(ctx, art.sheet, art.frame, x, y); if (e.npc.hint) { ctx.fillStyle = '#ffe070'; ctx.fillRect(Math.round(x - 1), Math.round(y - art.f.h - 4), 2, 3); } return; }
  codeArt('npc:' + ((e.npc && e.npc.id) || '?')); // [R2-19a] audit: a code-drawn person
  const [hair, clothes] = (e.npc && e.npc.look) || ['#6a4a2a', '#3a6aa0'];
  const sx = Math.round(x - 8), sy = Math.round(y - 24);
  const f = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(sx + a, sy + b, w, h); };
  f('#10101a', 3, 1, 10, 22); f('#f0c8a0', 4, 3, 8, 7); f(hair, 4, 1, 8, 3); f(clothes, 4, 10, 8, 9); f('#303040', 4, 19, 3, 3); f('#303040', 9, 19, 3, 3);
  f('#10101a', 6, 6, 1, 1); f('#10101a', 9, 6, 1, 1);
  if (e.npc && e.npc.hint) f('#ffe070', 7, -4, 2, 3);
}
