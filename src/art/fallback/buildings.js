// Buildings: the user's w<n>-town / -town-b / -town-c art (80×80, 5 tiles wide, door centred on the stored door column),
// else the code-drawn fallback over the wall footprint: roof, walls, window, door on the stored door column.
import { ATLAS, imgReady, drawSprite } from '../../engine/atlas.js';

const KEYS = [[/shop|store|bakery|market/, /shop|store|bakery|market/], [/inn|lodge|mooring|harbor|ferry|post/, /inn|lodge|harbor|dock|ferry/], [/elder|hall|trophy|chief/, /elder|iconic|hall|chief/]];
const artCache = new Map();
// [V5] one distinct user building per town building: keyword match on the prompt name first, then houses in sheet order.
export function buildingArt(worldId, town, metaOnly = false) {
  const key = worldId + '|' + town.name;
  if (artCache.has(key)) return artCache.get(key);
  const sheets = ['town', 'town-b', 'town-c'].map((k) => 'w' + worldId + '-' + k);
  // still loading (sheets register late, after the page's asset tags parse): never cache a miss before w<n>-town exists
  // [A4] metaOnly: the frame sizes are known as soon as the sheets register (collision), before the images decode
  if (!ATLAS[sheets[0]] || (!metaOnly && !sheets.every((s) => !ATLAS[s] || imgReady(s)))) return null;
  const frames = [];
  for (const s of sheets) if (ATLAS[s]) for (const n of Object.keys(ATLAS[s].meta.frames)) frames.push({ sheet: s, frame: n });
  const used = new Set(), out = {};
  const take = (f) => { used.add(f.sheet + f.frame); return f; };
  for (const b of town.buildings) {
    const k = KEYS.find(([re]) => re.test(b.id + ' ' + b.name.toLowerCase()));
    const hit = k && frames.find((f) => !used.has(f.sheet + f.frame) && k[1].test(f.frame));
    if (hit) out[b.id] = take(hit);
  }
  const plain = frames.filter((f) => !/gazebo|tower|landmark|spring|fountain|statue/.test(f.frame));
  for (const b of town.buildings) if (!out[b.id]) { const f = plain.find((x) => !used.has(x.sheet + x.frame)) || frames.find((x) => !used.has(x.sheet + x.frame)); if (f) out[b.id] = take(f); }
  if (sheets.every((s) => !ATLAS[s] || imgReady(s))) artCache.set(key, out);
  return out;
}
// Wall columns a building blocks: [x0, x1, rows]. [A4] With the art's frame (f.bb = its opaque bounds, world px): the
// columns the drawn art covers, centred on the door, and the rows its walls stand on (the roof top may overhang).
// Without art: the 5 tiles a code-drawn building covers (door column ± 2), clamped to the footprint, every row.
export function wallSpan(b, f = null) {
  if (f && f.bb) {
    const k = b.scale || 1; // [A4f] buildings may be drawn at a whole-number scale (data: b.scale)
    const n = Math.max(2, Math.min(b.w, Math.round(((f.bb[2] - f.bb[0]) * k) / 16))), x0 = Math.max(0, Math.min(b.door - Math.floor(n / 2), b.w - n));
    return [x0, x0 + n, Math.max(1, Math.min(b.h, Math.ceil(((f.bb[3] - f.bb[1]) * k - 12 * k) / 16)))];
  }
  const x0 = Math.max(0, Math.min(b.door - 2, b.w - 5));
  return [x0, Math.min(b.w, x0 + 5), b.h];
}
export function buildingFrame(worldId, town, b, metaOnly = false) { // the atlas frame a building is drawn with (or null)
  const art = worldId && town ? buildingArt(worldId, town, metaOnly) : null, a = art && art[b.id];
  return a ? ATLAS[a.sheet].meta.frames[a.frame] : null;
}

// [DOOR-ARROWS] where the door really is in each house picture: a fraction across the picture's opaque box (measured
// once per house frame from the art; most doors sit in the middle). Returns the door's world x for a building drawn at ox.
const DOOR_FRAC = { 'shop-with-a-leaf': 0.59, 'an-inn-with-a': 0.57, 'a-shop-in-this': 0.47 };
export function doorArtX(d, ox, worldId, town) {
  const b = d.b, T = 16, art = worldId && town ? buildingArt(worldId, town) : null, a = art && art[b.id];
  if (!a || (worldId === 1 && imgReady('w1-cottage-v2'))) { const [x0, x1] = wallSpan(b); return a ? ox + ((x0 + x1) / 2) * T : ox + b.door * T + T / 2; }
  const f = ATLAS[a.sheet].meta.frames[a.frame], [x0, x1] = wallSpan(b, f), k = b.scale || 1, cx = ox + ((x0 + x1) / 2) * T;
  const bb = f.bb || [0, 0, f.w, f.h], fr = DOOR_FRAC[Object.keys(DOOR_FRAC).find((n) => a.frame.startsWith(n))] ?? 0.5;
  return Math.round(cx - (f.w * k) / 2 + (bb[0] + fr * (bb[2] - bb[0])) * k);
}

export function drawBuilding(ctx, d, ox, oy, worldId, town) {
  const b = d.b, T = 16;
  if (worldId === 1 && imgReady('w1-cottage-v2')) { // [P-C] v2 pilot cottage (128x128 art at 0.5), a roof colour per building
    const i = town.buildings.indexOf(b), [x0, x1] = wallSpan(b), cx = ox + ((x0 + x1) / 2) * T, by = oy + b.h * T;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 2, by - 2, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
    drawSprite(ctx, 'w1-cottage-v2', 'v' + (i % 4), Math.round(cx - 32), Math.round(by - 62), { scale: 0.5 });
    return;
  }
  const art = worldId && town ? buildingArt(worldId, town) : null, a = art && art[b.id];
  if (a) {
    const f = ATLAS[a.sheet].meta.frames[a.frame], [x0, x1] = wallSpan(b, f), k = b.scale || 1;
    const cx = ox + ((x0 + x1) / 2) * T, by = oy + b.h * T;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(cx + 3 * k, by - 3, (f.w * k) / 2 + 2, 6 * k, 0, 0, Math.PI * 2); ctx.fill();
    drawSprite(ctx, a.sheet, a.frame, Math.round(cx - (f.w * k) / 2), Math.round(by - f.h * k + 2 * k), k === 1 ? {} : { scale: k });
    return;
  }
  const x = ox, y = oy, w = b.w * T, h = b.h * T;
  ctx.fillStyle = '#10101a'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = b.roof || '#7a3a2a'; ctx.fillRect(x, y, w, h * 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < w; i += 6) ctx.fillRect(x + i, y, 1, h * 0.5);
  ctx.fillStyle = '#d8c8a0'; ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
  ctx.fillStyle = '#6ab0e0'; ctx.fillRect(x + 6, y + h * 0.5 + 6, 10, 8);
  ctx.fillStyle = '#6a4020'; ctx.fillRect(x + b.door * T + 2, y + h - T, T - 4, T);
  ctx.fillStyle = '#ffd040'; ctx.fillRect(x + b.door * T + T - 6, y + h - T / 2, 2, 2);
}
