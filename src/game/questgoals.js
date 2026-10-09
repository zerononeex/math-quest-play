// [S55] Side-quest marks: deterministic, reachable spots on a world's overworld for each quest's `goal` count.
import { CONFIG } from '../config.js';
import { TILE } from './overworld.js';
import { QUEST_DEFS } from './quests.js';

const OPEN = new Set([TILE.GROUND, TILE.GROUND2, TILE.FLOWER, TILE.PATH]);

function hash(str, a, b) { let h = 2166136261; for (const c of str + ':' + a + ',' + b) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// Tiles walkable from the landing pad without any tool (gates are solid until opened).
export function reachableFromPad(ow) {
  const { map } = ow, p = ow.feat.pad, seen = new Uint8Array(map.w * map.h), out = [];
  if (!p) return out;
  const q = [[p.tx, p.ty]]; seen[map.idx(p.tx, p.ty)] = 1;
  while (q.length) {
    const [x, y] = q.pop(); out.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!map.inside(nx, ny) || seen[map.idx(nx, ny)] || map.isSolid(nx, ny)) continue;
      const g = map.ground[map.idx(nx, ny)];
      if (g === TILE.LIQ_A || g === TILE.LIQ_B) continue;
      seen[map.idx(nx, ny)] = 1; q.push([nx, ny]);
    }
  }
  return out;
}

// { questId: [{ tx, ty, key }] } for every quest of this world.
export function questSpots(ow) {
  const w = ow.world.id, out = {}, used = [];
  const cand = reachableFromPad(ow).filter(([x, y]) => OPEN.has(ow.map.ground[ow.map.idx(x, y)]));
  const gap = CONFIG.QUEST.MARK_GAP;
  for (const [id, d] of Object.entries(QUEST_DEFS)) {
    if (d.world !== w || !d.goal) continue;
    const order = cand.slice().sort((a, b) => hash(id, a[0], a[1]) - hash(id, b[0], b[1]));
    const list = [];
    if (d.perRegion) { // [W8 Phase 4] one mark in each flagged region (its first spaced candidate inside the region's cells)
      for (const r of ow.regions.filter((q) => q[d.perRegion]).slice(0, d.goal)) {
        const inR = order.filter(([x, y]) => x >= r.x0 * 8 + 2 && x < (r.x1 + 1) * 8 - 2 && y >= r.y0 * 8 + 2 && y < (r.y1 + 1) * 8 - 2);
        const pick = inR.find(([x, y]) => !used.some((u) => Math.abs(u[0] - x) + Math.abs(u[1] - y) < gap)) || inR[0];
        if (pick) { used.push(pick); list.push({ tx: pick[0], ty: pick[1], key: pick[0] + ',' + pick[1], region: r.name, elite: d.elite ? r.elite : null }); }
      }
      out[id] = list; continue;
    }
    for (let g = gap; g >= 0 && list.length < d.goal; g -= 2) {
      for (const [x, y] of order) {
        if (list.length >= d.goal) break;
        if (used.some((u) => Math.abs(u[0] - x) + Math.abs(u[1] - y) < g)) continue;
        used.push([x, y]); list.push({ tx: x, ty: y, key: x + ',' + y });
      }
    }
    out[id] = list;
  }
  return out;
}
