// Boss art: the user's w<n>-boss poses (idle/windup/attack/phase2/hurt) and w<n>-subs (id = idle, id-b = attack) [V6];
// else the code-drawn big boss sprite: body block + eyes + optional crown; wind-up rim, hurt flash, phase-2 tint.
import { ATLAS, imgReady, drawSprite } from '../../engine/atlas.js';
import { WORLDS } from '../../data/worlds.js';

let roster = null;
const FAREWELL = [[0.12, 'rise'], [0.28, 'blaze'], [0.48, 'laugh'], [0.62, 'lower'], [0.8, 'bow'], [1.01, 'gift']]; // farewell progress → w<n>-boss-finale frame
function bossArt(e) {
  if (!roster) { roster = new Map(); for (const W of Object.values(WORLDS)) for (const [id, d] of Object.entries(W.bosses || {})) roster.set(id, { w: W.id, kind: d.kind }); }
  const id = (e.baseDef || e.bossDef || {}).id, r = id && roster.get(id);
  if (!r) return null;
  const st = e.ai && e.ai.state;
  if (r.kind === 'sub') {
    const sheet = 'w' + r.w + '-subs'; if (!imgReady(sheet)) return null;
    const fr = ATLAS[sheet].meta.frames, n = (st === 'tell' || st === 'act') && fr[id + '-b'] ? id + '-b' : id;
    return fr[n] ? { sheet, frame: n, f: fr[n] } : null;
  }
  const fin = 'w' + r.w + '-boss-finale', fw = (e.baseDef || e.bossDef).farewell; // [W8 Phase 0] Astronova's false fourth form: rise → blaze → laugh → lower → bow → gift
  if (e.pose === 'farewell' && fw && imgReady(fin)) {
    const p = 1 - Math.max(0, e.farewellT || 0) / (fw.s || 8), fr = ATLAS[fin].meta.frames;
    const n = FAREWELL.find(([at]) => p < at)?.[1] || 'gift';
    return fr[n] ? { sheet: fin, frame: n, f: fr[n] } : null;
  }
  const form = e.form || 1, phaseSheet = 'w' + r.w + '-boss-phase' + form, winged = 'w' + r.w + '-boss-winged'; // [W7 Phase 0] Seraphel's second form (and its kneel/transformation) from its own sheet
  const sheet = form >= 2 && imgReady(phaseSheet) ? phaseSheet : form >= 2 && imgReady(winged) ? winged : 'w' + r.w + '-boss'; if (!imgReady(sheet)) return null; // [W8 Phase 0] w8-boss-phase2/-phase3 per form
  const fr = ATLAS[sheet].meta.frames;
  const pose = e.pose === 'kneel' && fr.kneel ? 'kneel' : e.flash > 0 ? 'hurt' : st === 'tell' ? 'windup' : st === 'act' ? 'attack' : e.phase === 2 ? 'phase2' : 'idle';
  const n = fr[pose] ? pose : fr.idle ? 'idle' : null;
  return n ? { sheet, frame: n, f: fr[n] } : null;
}

export function drawBoss(ctx, e, x, y) {
  const art = bossArt(e);
  if (art) {
    const lift = e.flying ? 10 + Math.sin(performance.now() / 300) * 3 : 0;
    const k = e.artScale || 1, fw = art.f.w * k, fh = art.f.h * k; // [A5] big bosses: the art at a whole-number scale
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y - 2, Math.max(e.w * 0.7, 14), 5 * Math.sqrt(k), 0, 0, Math.PI * 2); ctx.fill();
    if (e.pose === 'kneel') { ctx.fillStyle = 'rgba(255,240,180,' + (0.3 + 0.3 * Math.sin(performance.now() / 90)) + ')'; ctx.beginPath(); ctx.ellipse(x, y - fh / 2, fw / 2, fh / 2, 0, 0, Math.PI * 2); ctx.fill(); }
    const tellTint = e.ai && e.ai.state === 'tell' && Math.floor(performance.now() / 90) % 2 ? '#ffe040' : undefined;
    drawSprite(ctx, art.sheet, art.frame, Math.round(x - fw / 2), Math.round(y - fh - lift + (e.pose === 'kneel' ? 8 : 0)), { flash: e.flash > 0 && Math.floor(e.flash * 20) % 2 === 0, tint: tellTint, scale: k });
    return;
  }
  const w = e.w + 8, h = e.h + 8, L = e.look || {};
  const sx = Math.round(x - w / 2), sy = Math.round(y - h - (e.flying ? 10 + Math.sin(performance.now() / 300) * 3 : 0) + (e.pose === 'kneel' ? 8 : 0));
  // [D46] code-drawn winged form (until w7-boss-winged art lands): one black wing, a star-silver one
  if (L.wing) { ctx.fillStyle = '#10101a'; ctx.fillRect(sx - 18, sy + 2, 18, h * 0.7); ctx.fillStyle = '#2a2a3a'; ctx.fillRect(sx - 16, sy + 4, 14, h * 0.6); ctx.fillStyle = '#e0e8ff'; ctx.fillRect(sx + w, sy + 4, 12, h * 0.5); }
  if (e.pose === 'kneel') { ctx.fillStyle = 'rgba(255,240,180,' + (0.3 + 0.3 * Math.sin(performance.now() / 90)) + ')'; ctx.fillRect(sx - 6, sy - 6, w + 12, h + 12); }
  if (e.pose === 'windup') { ctx.fillStyle = '#ffe040'; ctx.fillRect(sx - 3, sy - 3, w + 6, h + 6); }
  ctx.fillStyle = '#10101a'; ctx.fillRect(sx - 1, sy - 1, w + 2, h + 2);
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : e.phase === 2 ? '#a03030' : L.body || '#7a4a8a'; ctx.fillRect(sx, sy, w, h);
  ctx.fillStyle = L.accent || '#f0d060'; ctx.fillRect(sx + 4, sy + h - 8, w - 8, 4);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + w * 0.25, sy + h * 0.3, 6, 6); ctx.fillRect(sx + w * 0.65 - 3, sy + h * 0.3, 6, 6);
  ctx.fillStyle = '#10101a'; ctx.fillRect(sx + w * 0.25 + 2, sy + h * 0.3 + 2, 3, 3); ctx.fillRect(sx + w * 0.65 - 1, sy + h * 0.3 + 2, 3, 3);
  if (L.crown) { ctx.fillStyle = '#ffd040'; ctx.fillRect(sx + 6, sy - 6, w - 12, 6); ctx.fillRect(sx + 6, sy - 10, 4, 4); ctx.fillRect(sx + w / 2 - 2, sy - 10, 4, 4); ctx.fillRect(sx + w - 10, sy - 10, 4, 4); }
}

// Named HP bar under the HUD rows.
export function drawBossBar(ctx, e, viewW, font, drawOutlined) {
  const w = Math.min(360, viewW - 80), x = (viewW - w) / 2, y = 60;
  ctx.fillStyle = '#10101a'; ctx.fillRect(x - 2, y - 2, w + 4, 12);
  ctx.fillStyle = '#3a1a1a'; ctx.fillRect(x, y, w, 8);
  ctx.fillStyle = e.phase === 2 ? '#ff6030' : '#e03040'; ctx.fillRect(x, y, Math.max(0, (w * e.hp) / e.maxHp), 8);
  ctx.font = font(12); ctx.textAlign = 'center'; drawOutlined(ctx, e.name, viewW / 2, y + 20, '#ffffff', '#10101a', 1);
}
