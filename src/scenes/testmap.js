// Movement test map (?test=1&scene=testmap): 60×40 tiles, a wall with a 1-tile gap, blocks, hero + camera.
import { TileMap } from '../engine/tilemap.js';
import { Camera } from '../engine/camera.js';
import { input } from '../engine/input.js';
import { createHero, updateHero, drawHero, setTapTarget } from '../game/hero.js';

export function createTestMap(view) {
  const map = new TileMap(60, 40);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const edge = x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1;
    const wall = y === 20 && x >= 5 && x <= 50 && x !== 30;
    const block = (x % 12 === 6 && y % 9 === 4);
    map.set(x, y, edge || wall ? 1 : block ? 2 : 0, edge || wall || block ? 1 : 0);
  }
  map.prerender((g, v, px, py, tx, ty) => {
    g.fillStyle = v === 1 ? '#5a4a3a' : v === 2 ? '#3a6a8a' : (tx + ty) % 2 ? '#4a9a4a' : '#52a852';
    g.fillRect(px, py, 16, 16);
    if (v === 1) { g.fillStyle = '#3a2a1a'; g.fillRect(px, py + 12, 16, 4); }
  });
  const hero = createHero('rowan', 30 * 16 + 8, 30 * 16);
  const cam = new Camera(view);
  const s = {
    name: 'testmap', map, hero, cam,
    update(dt) {
      if (input.pointer.tapped) { const w = cam.toWorld(input.pointer.x, input.pointer.y); setTapTarget(hero, map, w.x, w.y); }
      updateHero(hero, map, dt);
      cam.follow(hero.x, hero.y - 12, map.pxW, map.pxH);
    },
    render(ctx) {
      cam.follow(hero.x, hero.y - 12, map.pxW, map.pxH);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, view.w, view.h);
      map.draw(ctx, cam);
      drawHero(ctx, hero, cam);
    },
  };
  return s;
}
