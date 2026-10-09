// Code-drawn enemy looks from data: shape + body/accent palette. Tell pose = yellow rim + "!"; hit = white flash.
import { codeArt, ATLAS, imgReady, drawSprite } from '../../engine/atlas.js';
import { WORLDS } from '../../data/worlds.js';

const cache = new Map();

// [S59] Atlas enemies: w<n>-enemies holds the world's roster in order, 2 walk frames each (or 1). Used only when the cut
// sheet's frame count matches that layout — otherwise the code look stays (a mis-cut sheet would show the wrong foe).
let roster = null;
function enemyArt(e) {
  if (!e.dataId) return null;
  if (e.dataId === 'sproutling' && imgReady('w1-enemy-v2')) { // [P-C] v2 pilot Sproutling (32x32 art at 0.5)
    const fr = ATLAS['w1-enemy-v2'].meta.frames, n = e.flash > 0 ? 'hurt' : e.ai && e.ai.state === 'tell' ? 'windup' : Math.floor(performance.now() / 220) % 2 ? 'walk1' : 'walk0';
    return { sheet: 'w1-enemy-v2', frame: n, f: { w: fr[n].w / 2, h: fr[n].h / 2 }, scale: 0.5 };
  }
  if (!roster) { roster = new Map(); for (const W of Object.values(WORLDS)) {
    (W.enemies || []).forEach((d, i) => { if (!roster.has(d.id)) roster.set(d.id, { w: W.id, i, n: W.enemies.length }); });
    (W.dungeonEnemies || []).forEach((d, i) => { if (!roster.has(d.id)) roster.set(d.id, { w: W.id, i, n: W.dungeonEnemies.length, dungeon: true }); }); // [DUNGEON-LIFE] #325
  } }
  const r = roster.get(e.dataId); if (!r) return null;
  const sheet = 'w' + r.w + (r.dungeon ? '-dungeon-enemies' : '-enemies');
  if (r.dungeon) { // 4 frames each: walk 0/1, wind-up, hurt
    if (!imgReady(sheet)) return null;
    const keys = Object.keys(ATLAS[sheet].meta.frames); if (keys.length !== r.n * 4) return null;
    const k = e.flash > 0 ? 3 : e.ai && e.ai.state === 'tell' ? 2 : Math.floor(performance.now() / 250) % 2;
    return { sheet, frame: keys[r.i * 4 + k], f: ATLAS[sheet].meta.frames[keys[r.i * 4 + k]] };
  }
  if (!imgReady(sheet)) return null;
  const keys = Object.keys(ATLAS[sheet].meta.frames), per = keys.length === r.n * 2 ? 2 : keys.length === r.n ? 1 : 0;
  if (!per) return null;
  const anim = per === 2 && e.ai && e.ai.state === 'move' && Math.floor(performance.now() / 250) % 2 ? 1 : 0;
  return { sheet, frame: keys[r.i * per + anim], f: ATLAS[sheet].meta.frames[keys[r.i * per + anim]] };
}

const SHAPES = {
  blob: (g, b, a) => { g.fillStyle = b; g.fillRect(2, 5, 12, 10); g.fillRect(4, 3, 8, 2); g.fillStyle = a; g.fillRect(5, 7, 2, 2); g.fillRect(9, 7, 2, 2); },
  bug: (g, b, a) => { g.fillStyle = b; g.fillRect(3, 4, 10, 9); g.fillStyle = a; g.fillRect(2, 13, 2, 2); g.fillRect(12, 13, 2, 2); g.fillRect(5, 6, 2, 2); g.fillRect(9, 6, 2, 2); },
  fish: (g, b, a) => { g.fillStyle = b; g.fillRect(2, 5, 10, 7); g.fillRect(12, 4, 3, 9); g.fillStyle = a; g.fillRect(4, 7, 2, 2); },
  bush: (g, b, a) => { g.fillStyle = b; g.fillRect(1, 4, 14, 11); g.fillRect(4, 2, 8, 2); g.fillStyle = a; g.fillRect(6, 7, 4, 4); },
  knight: (g, b, a) => { g.fillStyle = b; g.fillRect(4, 2, 8, 13); g.fillStyle = a; g.fillRect(1, 5, 4, 9); g.fillRect(6, 4, 4, 2); },
  bird: (g, b, a) => { g.fillStyle = b; g.fillRect(5, 5, 6, 6); g.fillStyle = a; g.fillRect(0, 4, 5, 3); g.fillRect(11, 4, 5, 3); g.fillRect(7, 11, 2, 2); },
  mole: (g, b, a) => { g.fillStyle = b; g.fillRect(3, 5, 10, 10); g.fillStyle = a; g.fillRect(4, 2, 8, 3); g.fillRect(7, 10, 2, 2); },
  ball: (g, b, a) => { g.fillStyle = b; g.fillRect(3, 3, 10, 10); g.fillRect(2, 5, 12, 6); g.fillStyle = a; g.fillRect(5, 5, 3, 3); },
};

function sprite(look) {
  const key = look.shape + look.body + look.accent;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  (SHAPES[look.shape] || SHAPES.blob)(g, look.body || '#c04040', look.accent || '#f0d060');
  // 1 px dark outline around the silhouette
  const d = g.getImageData(0, 0, 16, 16), o = g.createImageData(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const i = (y * 16 + x) * 4;
    if (d.data[i + 3]) { o.data.set(d.data.slice(i, i + 4), i); continue; }
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < 16 && Y < 16 && d.data[(Y * 16 + X) * 4 + 3]; });
    if (n) { o.data[i] = 16; o.data[i + 1] = 16; o.data[i + 2] = 26; o.data[i + 3] = 255; }
  }
  g.putImageData(o, 0, 0);
  cache.set(key, c);
  return c;
}

// Draw with feet at (x, y) in screen px.
export function drawEnemy(ctx, e, x, y) {
  if (e.hidden) { ctx.fillStyle = 'rgba(90,70,40,0.8)'; ctx.fillRect(x - 6, y - 3, 12, 3); return; }
  const z = e.z || 0, tell = e.ai && e.ai.state === 'tell';
  // [V2] always a soft ground shadow so foes pop off the ground
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y - 1, e.fly || z ? 5 : 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const s = sprite(e.look || {});
  const lift = z + (e.fly ? 6 : 0);
  let sx = Math.round(x - 8), sy = Math.round(y - 16 - lift);
  const art = enemyArt(e);
  const tellTint = tell && Math.floor(performance.now() / 90) % 2 ? '#ffe040' : undefined;
  if (art) { sy = Math.round(y - art.f.h - lift); drawSprite(ctx, art.sheet, art.frame, Math.round(x - art.f.w / 2), sy, { flash: e.flash > 0 && !art.scale, tint: tellTint, scale: art.scale || 1 }); }
  else {
    codeArt('enemy:' + (e.def && e.def.id || e.enemyId || e.name || '?')); // [R2-19a] audit
    // code look at 1.25x (already outlined)
    sx = Math.round(x - 10); sy = Math.round(y - 20 - lift);
    ctx.drawImage(s, sx, sy, 20, 20);
    if (tellTint) { ctx.globalAlpha = 0.45; ctx.fillStyle = tellTint; ctx.fillRect(sx + 3, sy + 3, 14, 14); ctx.globalAlpha = 1; }
    if (e.flash > 0) { ctx.globalAlpha = 0.8; ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + 3, sy + 3, 14, 14); ctx.globalAlpha = 1; }
  }
  if (tell) { // "!" pop above the head
    const b = Math.round(Math.abs(Math.sin(performance.now() / 80)) * 2);
    ctx.fillStyle = '#10101a'; ctx.fillRect(x - 3, sy - 14 - b, 6, 12);
    ctx.fillStyle = '#ffe040'; ctx.fillRect(x - 2, sy - 13 - b, 4, 6); ctx.fillRect(x - 2, sy - 5 - b, 4, 2);
  }
  if (e.shield) {
    ctx.fillStyle = '#a0a0b0';
    const f = e.shieldFace;
    if (f === 'left') ctx.fillRect(sx - 2, sy + 3, 2, 10); else if (f === 'right') ctx.fillRect(sx + 16, sy + 3, 2, 10);
    else if (f === 'up') ctx.fillRect(sx + 3, sy - 2, 10, 2); else ctx.fillRect(sx + 3, sy + 16, 10, 2);
  }
  if (e.elite) { ctx.strokeStyle = '#ffd040'; ctx.lineWidth = 1; ctx.strokeRect(sx - 1.5, sy - 1.5, 19, 19); }
}

// [R2-19] World attack art (w<n>-fx by frame index; W1: 0-1 thorn, 2-3 leaf swoosh, 5-6 dew splash, 8-9 dust burst,
// 10-11 vine wall, 12-13 root snare). The telegraph shapes stay under it: they are the warning a kid reads.
// W2 (true-pixel cut, 12 frames): 0-1 bouncing seed, 2-3 shell-spin blur, 4-5 dive shadow, 6 cannon bomb, 7 its burst,
// 8-9 potion puddle, 10-11 fire-breath cone.
const FX = { 1: { thorn: [0, 1], swoosh: [2, 3], dew: [5, 6], dust: [8, 9], vine: [10, 11], snare: [12, 13] },
  2: { thorn: [0, 1], swoosh: [10, 11], dew: [8, 9], dust: [7], vine: [10, 11], snare: [8, 9] },
  // W3 (15 blobs): 0-1 ink glob, 2-3 slowing ink puddle, 4/6/8 water crescents, 5 bubble, 9-10 vinyl, 11-12 bass ring, 13-14 hypno pool
  3: { thorn: [0, 1], swoosh: [4, 6, 8], dew: [2, 3], dust: [11, 12], vine: [4, 6, 8], snare: [2, 3] },
  // W4 (16 blobs): 0 spat seed, 1 seed pop, 2-3 sleepy spore puff, 4 cream swoosh, 5 dust burst, 6 landing shockwave ring,
  // 7-8 sticky food splat, 9-13 wind gust curls, 14-15 spat star + its burst
  4: { thorn: [0], swoosh: [4], dew: [7, 8], dust: [6], vine: [9, 10, 11], snare: [2, 3] },
  // W5 (18 blobs): 0 coconut, 1 coconut thud, 2-4 / 6-7 thorn quills, 5 quill burst, 8-9 mud splat, 10-11 rolling barrel,
  // 12-13 lit barrel bomb, 14-15 swooping bat-hawk, 16-17 vine crescents
  5: { thorn: [0], swoosh: [16, 17], dew: [8, 9], dust: [5], vine: [16, 17], snare: [8, 9] },
  // W6 (12 blobs): 0 sticky pea, 1 its splat, 2-3 gas cloud, 4-5 flung dew drop + splash, 6-7 honey pool, 8-9 zap bolt,
  // 10-11 drifting spore cloud
  6: { thorn: [0], swoosh: [8, 9], dew: [4, 5], dust: [10, 11], vine: [8, 9], snare: [6, 7] },
  // W7 (13 blobs): 0 / 2 crystal shard bursts, 1 flying crystal shard, 3-4 laser beam segment, 5-6 delayed meteor mark,
  // 7-8 burning flame trail, 9-10 whirlpool, 11-12 homing eclipse orb
  7: { thorn: [1], swoosh: [3, 4], dew: [9, 10], dust: [0, 2], vine: [7, 8], snare: [5, 6] } };
function fx(ctx, world, kind, t, x, y, size, rot = 0) {
  const map = FX[world] && FX[world][kind], sheet = 'w' + world + '-fx';
  if (!map || !imgReady(sheet)) return false;
  const names = Object.keys(ATLAS[sheet].meta.frames), n = names[map[Math.floor(t * 8) % map.length]], f = n && ATLAS[sheet].meta.frames[n];
  if (!f) return false;
  const k = size / Math.max(f.w, f.h);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot);
  drawSprite(ctx, sheet, n, -(f.w * k) / 2, -(f.h * k) / 2, { scale: k }); ctx.restore();
  return true;
}
export function drawHazard(ctx, h, camX, camY, world = 0) {
  const x = h.x - camX, y = h.y - camY, t = performance.now() / 1000 + (h.id || 0) * 0.37;
  if (h.kind === 'eproj') {
    if (fx(ctx, world, 'thorn', t, x, y, 16, Math.atan2(h.vy || 0, h.vx || 1))) return;
    codeArt('enemy-shot'); ctx.fillStyle = '#10101a'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#ffa040'; ctx.fillRect(x - 2, y - 2, 4, 4); return;
  }
  const warn = h.delay > 0;
  if (!warn && FX[world]) { // the art for the live attack, over its (lighter) telegraph
    if (h.slow >= 0.9 && fx(ctx, world, 'snare', t, x, y, h.r * 2.4)) return;
    if (h.slow > 0 && fx(ctx, world, 'dew', t, x, y, h.r * 2.4)) return;
    if (h.shape === 'ring' && fx(ctx, world, 'dust', t, x, y - 4, Math.max(28, h.r * 1.6))) { ctx.strokeStyle = 'rgba(255,200,120,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, Math.max(1, h.r), 0, Math.PI * 2); ctx.stroke(); return; }
    if (h.shape === 'line' && imgReady('w' + world + '-fx')) {
      ctx.strokeStyle = 'rgba(255,80,60,0.55)'; ctx.lineWidth = (h.wide || 5) * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(h.a) * h.len, y + Math.sin(h.a) * h.len); ctx.stroke(); // the danger line stays readable
      const vine = h.spin && h.len >= 100, step = vine ? 22 : 26, kind = vine ? 'vine' : 'swoosh';
      for (let d = step / 2; d < h.len; d += step) fx(ctx, world, kind, t + d * 0.01, x + Math.cos(h.a) * d, y + Math.sin(h.a) * d, vine ? 26 : 24, h.a + (vine ? Math.PI / 2 : 0));
      return;
    }
  }
  if (h.safe) { ctx.fillStyle = 'rgba(255,250,180,0.45)'; ctx.strokeStyle = 'rgba(255,255,220,0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, h.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); return; } // lit pool: stand here
  ctx.strokeStyle = warn ? 'rgba(255,230,64,0.9)' : h.slow ? 'rgba(80,140,255,0.8)' : 'rgba(255,80,60,0.9)';
  ctx.fillStyle = warn ? 'rgba(255,230,64,0.25)' : h.slow ? 'rgba(80,140,255,0.3)' : 'rgba(255,80,60,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (h.shape === 'line') { ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(h.a) * h.len, y + Math.sin(h.a) * h.len); ctx.lineWidth = (h.wide || 5) * 2; ctx.stroke(); return; }
  ctx.arc(x, y, Math.max(1, h.r), 0, Math.PI * 2);
  if (h.shape === 'ring') ctx.stroke(); else { ctx.fill(); ctx.stroke(); }
}
