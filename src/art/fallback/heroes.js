// Code-drawn hero sprites: 16×24, 4 directions × 3 walk frames, feet on the bottom row; white-flash variant.
const PAL = {
  rowan: { skin: '#f0c8a0', hair: '#a0522d', body: '#2aa8a0', belt: '#6a4a2a', legs: '#3a5a3a', acc: '#c0c0c8' },
  milo: { skin: '#f0c8a0', hair: '#4a3020', body: '#e0e0e0', belt: '#d83a3a', legs: '#2a3a8a', acc: '#d83a3a' },
  wren: { skin: '#f0c8a0', hair: '#f08030', body: '#4a7ad8', belt: '#40e0a0', legs: '#3a3a6a', acc: '#40e0a0' },
};
export const DIRS = ['down', 'up', 'left', 'right'];
const cache = {};

function px(g, c, x, y, w = 1, h = 1) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function drawFrame(g, hero, dir, f) {
  const p = PAL[hero];
  const step = f === 0 ? -1 : f === 2 ? 1 : 0;
  // outline + head
  px(g, '#10101a', 3, 1, 10, 10);
  px(g, p.skin, 4, 2, 8, 8);
  px(g, p.hair, 4, 1, 8, dir === 'up' ? 8 : 3);
  if (hero === 'milo') px(g, p.acc, 3, 1, 10, 2);
  if (hero === 'wren') px(g, p.acc, 4, 3, 8, 1);
  if (dir === 'down') { px(g, '#10101a', 6, 6); px(g, '#10101a', 9, 6); }
  if (dir === 'left') px(g, '#10101a', 5, 6);
  if (dir === 'right') px(g, '#10101a', 10, 6);
  // body
  px(g, '#10101a', 3, 10, 10, 9);
  px(g, p.body, 4, 11, 8, 7);
  px(g, p.belt, 4, 16, 8, 1);
  if (hero === 'milo') { px(g, p.acc, 4, 11, 8, 2); px(g, '#f0f0f0', 2, 13 + step, 2, 3); px(g, '#f0f0f0', 12, 13 - step, 2, 3); }
  if (hero === 'rowan' && dir !== 'up') px(g, p.acc, 12, 11, 2, 5);
  if (hero === 'rowan' && dir === 'up') px(g, p.acc, 5, 11, 6, 5);
  // legs (walk)
  px(g, '#10101a', 4, 19, 8, 5);
  px(g, p.legs, 5 + (dir === 'left' || dir === 'right' ? step : 0), 19, 3, 4 + (step < 0 ? 0 : 1) - (step > 0 ? 1 : 0));
  px(g, p.legs, 9 - (dir === 'left' || dir === 'right' ? step : 0), 19, 3, 4 + (step > 0 ? 0 : 1) - (step < 0 ? 1 : 0));
  px(g, '#10101a', 4, 23, 8, 1);
}

// Returns { frames: {dir: [c0,c1,c2]}, flash: {dir: [...]} } of 16×24 canvases.
export function heroSprites(hero) {
  if (cache[hero]) return cache[hero];
  const frames = {}, flash = {};
  for (const d of DIRS) {
    frames[d] = []; flash[d] = [];
    for (let f = 0; f < 3; f++) {
      const c = document.createElement('canvas'); c.width = 16; c.height = 24;
      const g = c.getContext('2d');
      drawFrame(g, hero, d, f);
      frames[d].push(c);
      const w = document.createElement('canvas'); w.width = 16; w.height = 24;
      const wg = w.getContext('2d');
      wg.drawImage(c, 0, 0);
      wg.globalCompositeOperation = 'source-in';
      wg.fillStyle = '#ffffff'; wg.fillRect(0, 0, 16, 24);
      flash[d].push(w);
    }
  }
  return (cache[hero] = { frames, flash });
}
