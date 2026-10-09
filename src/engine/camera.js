// [V2] shake = { t, amp } (set by game fx on hits); follow() jitters by it.
import { worldZoom } from './render.js';

// Camera: follows a point, clamps to the map; variable view width [D08]. Maps smaller than the view are centred.
export class Camera {
  // [P-A] zoom: the world layer is drawn at an integer zoom (nearest-neighbour); HUD/UI stay in screen space.
  // zoom: a number, 'world' (exploration, integer device px per world px) or 'fight' (whole arena) — see worldZoom()
  constructor(view, zoom = 1) { this.view = view; this.zoomMode = zoom; this.x = 0; this.y = 0; this.w = view.w / this.zoom; this.h = view.h / this.zoom; }
  get zoom() { const z = this.zoomMode; return z === 'world' ? worldZoom(false) : z === 'fight' ? worldZoom(true) : z; }
  set zoom(z) { this.zoomMode = z; }
  follow(px, py, mapW, mapH, shake = null) {
    this.w = this.view.w / this.zoom; this.h = this.view.h / this.zoom;
    this.x = mapW <= this.w ? (mapW - this.w) / 2 : Math.min(mapW - this.w, Math.max(0, px - this.w / 2));
    this.y = mapH <= this.h ? (mapH - this.h) / 2 : Math.min(mapH - this.h, Math.max(0, py - this.h / 2));
    if (shake && shake.t > 0) { this.x += (Math.random() * 2 - 1) * shake.amp; this.y += (Math.random() * 2 - 1) * shake.amp; }
    this.x = Math.round(this.x); this.y = Math.round(this.y);
  }
  toWorld(sx, sy) { return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y }; }
  toScreen(wx, wy) { return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom }; }
  begin(ctx) { ctx.save(); ctx.scale(this.zoom, this.zoom); }
  end(ctx) { ctx.restore(); }
}
