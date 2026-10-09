// Tile map: ground layer + solid flags, chunked prerender (each chunk canvas well under CANVAS_MAX_PX).
import { CONFIG } from '../config.js';

const CHUNK = 256; // world px per chunk side [A3]
const MAX_CHUNKS = 24; // streamed chunk cache (≈ 24 MB at paint scale 2)

export class TileMap {
  constructor(w, h, tile = CONFIG.VIEW.TILE) {
    this.w = w; this.h = h; this.tile = tile;
    this.ground = new Uint16Array(w * h);
    this.solid = new Uint8Array(w * h);
    this.cache = null;
  }
  get pxW() { return this.w * this.tile; }
  get pxH() { return this.h * this.tile; }
  idx(tx, ty) { return ty * this.w + tx; }
  inside(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }
  isSolid(tx, ty) { return !this.inside(tx, ty) || this.solid[ty * this.w + tx] === 1; }
  set(tx, ty, g, solid = 0) { const i = this.idx(tx, ty); this.ground[i] = g; this.solid[i] = solid; this.invalidate(tx, ty); }
  // Box [x0,x1) × [y0,y1) in px overlaps no solid tile.
  boxFree(x0, y0, x1, y1) {
    const t = this.tile;
    const tx0 = Math.floor(x0 / t), ty0 = Math.floor(y0 / t), tx1 = Math.floor((x1 - 0.001) / t), ty1 = Math.floor((y1 - 0.001) / t);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (this.isSolid(tx, ty)) return false;
    return true;
  }
  // drawTile(ctx, g, px, py, tx, ty) paints one tile into a chunk canvas (or a list of passes [{ fn, margin }]).
  // [A3] Chunks are STREAMED: painted on first sight around the camera (one spare neighbour per frame ahead of time)
  // and evicted least-recently-used beyond MAX_CHUNKS, so no world is ever prerendered whole (iPad WebKit memory).
  prerender(drawTile, scale = CONFIG.VIEW.RENDER_SCALE) {
    this.painter = drawTile; this.pscale = scale; this.cache = new Map(); this.frame = 0;
    if (this.mini) { this.mini.done.clear(); this.mini.g.clearRect(0, 0, this.mini.canvas.width, this.mini.canvas.height); } // new painter: repaint the miniature too
    this.stats = this.stats || { painted: 0, peakChunks: 0, peakMB: 0 };
  }
  invalidate(tx, ty) { const k = Math.floor((tx * this.tile) / CHUNK) + ',' + Math.floor((ty * this.tile) / CHUNK); if (this.cache) this.cache.delete(k); if (this.mini) this.mini.done.delete(k); } // [R2-19] the map miniature repaints that chunk too
  paintChunk(cx, cy) {
    const scale = this.pscale, t = this.tile;
    const x0 = cx * CHUNK, y0 = cy * CHUNK, cw = Math.min(CHUNK, this.pxW - x0), ch = Math.min(CHUNK, this.pxH - y0);
    const c = document.createElement('canvas');
    c.width = Math.ceil(cw * scale); c.height = Math.ceil(ch * scale);
    const g = c.getContext('2d');
    g.setTransform(scale, 0, 0, scale, 0, 0);
    g.imageSmoothingEnabled = false;
    // a list of passes paints every tile of the chunk (plus `margin` tiles around it, clipped by the canvas) before the
    // next pass, so roads, shores and tall sprites cross tile and chunk edges
    const passes = Array.isArray(this.painter) ? this.painter : [{ fn: this.painter, margin: 0 }];
    for (const { fn, margin = 0 } of passes) {
      for (let ty = Math.floor(y0 / t) - margin; ty < Math.ceil((y0 + ch) / t) + margin; ty++) {
        for (let tx = Math.floor(x0 / t) - margin; tx < Math.ceil((x0 + cw) / t) + margin; tx++) {
          if (!this.inside(tx, ty)) continue;
          fn(g, this.ground[this.idx(tx, ty)], tx * t - x0, ty * t - y0, tx, ty);
        }
      }
    }
    this.stats.painted++;
    return { x: x0, y: y0, w: cw, h: ch, canvas: c, used: this.frame };
  }
  // [R2-19] world-map miniature: every chunk painted for play is also drawn at scale k into one small canvas, so the map
  // screen shows the real painted ground where the hero has been (no extra painting during play).
  enableMini(k) {
    const c = document.createElement('canvas'); c.width = Math.ceil(this.pxW * k); c.height = Math.ceil(this.pxH * k);
    this.mini = { canvas: c, g: c.getContext('2d'), k, done: new Set() };
  }
  toMini(cx, cy, chunk) {
    const M = this.mini, key = cx + ',' + cy; if (!M || M.done.has(key)) return;
    M.g.imageSmoothingEnabled = true; M.g.drawImage(chunk.canvas, chunk.x * M.k, chunk.y * M.k, chunk.w * M.k, chunk.h * M.k); M.done.add(key);
  }
  // paint (uncached) up to `budget` of the chunks covering world rects `rects` that the miniature still lacks; true = more left
  fillMini(rects, budget = 2) {
    if (!this.mini || !this.cache) return false;
    for (const [x0, y0, x1, y1] of rects) for (let cy = Math.floor(y0 / CHUNK); cy * CHUNK < Math.min(y1, this.pxH); cy++) for (let cx = Math.floor(x0 / CHUNK); cx * CHUNK < Math.min(x1, this.pxW); cx++) {
      if (this.mini.done.has(cx + ',' + cy)) continue;
      if (budget-- <= 0) return true;
      const cached = this.cache.get(cx + ',' + cy), c = cached || this.paintChunk(cx, cy);
      this.toMini(cx, cy, c); if (!cached) c.canvas.width = 0; // a throwaway chunk: free its canvas now (iPad canvas memory)
    }
    return false;
  }
  chunkAt(cx, cy) {
    const k = cx + ',' + cy;
    let c = this.cache.get(k);
    if (!c) { c = this.paintChunk(cx, cy); this.cache.set(k, c); this.toMini(cx, cy, c); }
    c.used = this.frame;
    return c;
  }
  // every chunk at once (tools/render_maps.js only)
  get chunks() {
    if (!this.cache) return null;
    const out = [];
    for (let cy = 0; cy * CHUNK < this.pxH; cy++) for (let cx = 0; cx * CHUNK < this.pxW; cx++) out.push(this.chunkAt(cx, cy));
    return out;
  }
  draw(ctx, cam) {
    if (!this.cache) return;
    this.frame++;
    const cx0 = Math.max(0, Math.floor(cam.x / CHUNK)), cy0 = Math.max(0, Math.floor(cam.y / CHUNK));
    const cx1 = Math.min(Math.ceil(this.pxW / CHUNK) - 1, Math.floor((cam.x + cam.w) / CHUNK)), cy1 = Math.min(Math.ceil(this.pxH / CHUNK) - 1, Math.floor((cam.y + cam.h) / CHUNK));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = this.chunkAt(cx, cy);
      ctx.drawImage(c.canvas, Math.round(c.x - cam.x), Math.round(c.y - cam.y), c.w, c.h);
    }
    // prefetch: paint at most one not-yet-painted neighbour per frame so walking into it doesn't hitch
    outer: for (let cy = cy0 - 1; cy <= cy1 + 1; cy++) for (let cx = cx0 - 1; cx <= cx1 + 1; cx++) {
      if (cx < 0 || cy < 0 || cx * CHUNK >= this.pxW || cy * CHUNK >= this.pxH || this.cache.has(cx + ',' + cy)) continue;
      this.chunkAt(cx, cy); break outer;
    }
    if (this.cache.size > MAX_CHUNKS) { // evict least recently used
      const old = [...this.cache.entries()].sort((a, b) => a[1].used - b[1].used);
      for (let i = 0; i < old.length - MAX_CHUNKS; i++) if (old[i][1].used < this.frame) this.cache.delete(old[i][0]);
    }
    let px = 0; for (const c of this.cache.values()) px += c.canvas.width * c.canvas.height;
    this.stats.peakChunks = Math.max(this.stats.peakChunks, this.cache.size);
    this.stats.peakMB = Math.max(this.stats.peakMB, Math.round((px * 4) / 1e5) / 10);
  }
}
