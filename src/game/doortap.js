// [D35] Kid-friendly doors: a generous tap zone (door tile + DOOR_TAP_MARGIN tiles each side), a bouncing arrow marker,
// walk straight through, and a keyboard/D-pad magnet that lines the hero up with a door it walks into.
// A door: { x, y } = centre of the door tile in world px, w = width in tiles, dir = the way you walk in ('up'|'down'|'left'|'right').
import { CONFIG } from '../config.js';

const T = 16;

export function doorAt(doors, wx, wy) {
  const m = CONFIG.COMBAT.DOOR_TAP_MARGIN * T;
  for (const d of doors) {
    const hw = (d.w || 1) * T / 2;
    if (wx >= d.x - hw - m && wx <= d.x + hw + m && wy >= d.y - T / 2 - m && wy <= d.y + T / 2 + m) return d;
  }
  return null;
}

// Nudge the hero sideways toward a door centre when walking into it and within DOOR_MAGNET_PX. held(dir) → bool.
export function magnet(hero, doors, held) {
  const M = CONFIG.COMBAT.DOOR_MAGNET_PX;
  for (const d of doors) {
    const vertical = d.dir === 'up' || d.dir === 'down';
    if (!held(d.dir)) continue;
    const along = vertical ? d.y - (hero.y - 4) : d.x - hero.x;       // distance still to walk toward the door
    const off = vertical ? d.x - hero.x : d.y - (hero.y - 4);         // sideways offset from the door centre
    const ahead = d.dir === 'up' || d.dir === 'left' ? -along : along;
    if (ahead < -2 || ahead > 28 || Math.abs(off) > M || Math.abs(off) < 0.5) continue;
    const step = Math.sign(off) * Math.min(Math.abs(off), 1.5);
    if (vertical) hero.x += step; else hero.y += step;
    return d;
  }
  return null;
}

// Bouncing yellow arrow over a doorway (screen px), pointing the way in.
export function drawDoorArrow(ctx, arrow, camX, camY) {
  if (!arrow || arrow.t <= 0) return;
  const bob = Math.sin(performance.now() / 120) * 4;
  const x = Math.round(arrow.x - camX), y = Math.round(arrow.y - camY - 22 + bob);
  ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.moveTo(x - 9, y - 2); ctx.lineTo(x + 9, y - 2); ctx.lineTo(x, y + 10); ctx.fill();
  ctx.fillStyle = '#ffe040'; ctx.beginPath(); ctx.moveTo(x - 7, y - 1); ctx.lineTo(x + 7, y - 1); ctx.lineTo(x, y + 8); ctx.fill();
  ctx.fillRect(x - 3, y - 9, 6, 8);
}
