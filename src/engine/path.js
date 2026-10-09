// A* on the tile grid, 8-way without corner cutting. Returns [{tx,ty}...] excluding the start, or null.
export function findPath(map, sx, sy, gx, gy, maxNodes = 6000) {
  if (map.isSolid(gx, gy)) return null;
  const W = map.w;
  const key = (x, y) => y * W + x;
  const open = [{ x: sx, y: sy, g: 0, f: 0 }];
  const came = new Map();
  const gScore = new Map([[key(sx, sy), 0]]);
  const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  let n = 0;
  while (open.length && n++ < maxNodes) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const c = open.splice(bi, 1)[0];
    if (c.x === gx && c.y === gy) {
      const out = [];
      let k = key(c.x, c.y);
      while (k !== key(sx, sy)) { out.push({ tx: k % W, ty: Math.floor(k / W) }); k = came.get(k); }
      return out.reverse();
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = c.x + dx, ny = c.y + dy;
      if (map.isSolid(nx, ny)) continue;
      if (dx && dy && (map.isSolid(c.x + dx, c.y) || map.isSolid(c.x, c.y + dy))) continue;
      const g = c.g + (dx && dy ? 1.414 : 1);
      const k = key(nx, ny);
      if (g < (gScore.has(k) ? gScore.get(k) : Infinity)) {
        gScore.set(k, g); came.set(k, key(c.x, c.y));
        open.push({ x: nx, y: ny, g, f: g + h(nx, ny) });
      }
    }
  }
  return null;
}
