// Code-drawn 16×16 fallbacks for the HUD/icon sheets (used until the Gemini sheets are cut).
import { registerFallback } from '../../engine/atlas.js';

const COLORS = { fire: '#ff6a20', ice: '#80d8ff', wind: '#c0f0c0' };

function box(g, x, y, fill, edge = '#10101a') { g.fillStyle = edge; g.fillRect(x + 1, y + 1, 14, 14); g.fillStyle = fill; g.fillRect(x + 2, y + 2, 12, 12); }

function heart(g, x, y, fill) {
  g.fillStyle = '#10101a';
  g.fillRect(x + 1, y + 2, 5, 5); g.fillRect(x + 6, y + 2, 5, 5); g.fillRect(x + 2, y + 6, 8, 3); g.fillRect(x + 4, y + 9, 4, 2);
  g.fillStyle = fill;
  g.fillRect(x + 2, y + 3, 3, 3); g.fillRect(x + 7, y + 3, 3, 3); g.fillRect(x + 3, y + 5, 6, 3); g.fillRect(x + 5, y + 8, 2, 2);
}

export function registerIconFallbacks() {
  const weapon = (g, f, x, y) => {
    box(g, x, y, '#3a3a5a');
    g.fillStyle = f.includes('glove') || f.includes('fist') || f.includes('wrap') ? '#e0e0e0' : f.includes('roller') ? '#40e0a0' : '#c0c0d0';
    if (f.includes('roller')) { g.fillRect(x + 4, y + 4, 8, 4); g.fillRect(x + 7, y + 8, 2, 5); } else if (f.includes('glove') || f.includes('fist') || f.includes('wrap')) g.fillRect(x + 4, y + 5, 8, 7);
    else { g.fillRect(x + 7, y + 3, 2, 8); g.fillRect(x + 5, y + 10, 6, 2); }
  };
  registerFallback('icons-weapons-a', weapon);
  registerFallback('icons-weapons-b', weapon);
  registerFallback('ui-element-icons', (g, f, x, y) => { box(g, x, y, COLORS[f.split('-')[0]] || '#a0a0a0'); });
  registerFallback('ui-hud-icons', (g, f, x, y) => {
    if (f === 'full-heart') return heart(g, x, y, '#e83040');
    if (f === 'empty-heart') return heart(g, x, y, '#3a2a30');
    if (f === 'gold-coin') { g.fillStyle = '#10101a'; g.fillRect(x + 3, y + 3, 10, 10); g.fillStyle = '#ffd040'; g.fillRect(x + 4, y + 4, 8, 8); return; }
    box(g, x, y, f.includes('gem') ? '#40a0ff' : '#606080');
  });
  registerFallback('medals', (g, f, x, y) => { g.fillStyle = '#10101a'; g.fillRect(x + 2, y + 2, 12, 12); g.fillStyle = '#ffd040'; g.fillRect(x + 3, y + 3, 10, 10); });
  registerFallback('relics', (g, f, x, y) => { g.fillStyle = '#10101a'; g.fillRect(x + 3, y + 2, 10, 12); g.fillStyle = '#c080ff'; g.fillRect(x + 4, y + 3, 8, 10); });
}
