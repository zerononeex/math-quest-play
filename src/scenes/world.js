// The playable world scene: an overworld (hand-designed map, town, enemies, gates) for world n.
import { createArena } from './arena.js';
import { bindSession } from '../game/ap.js';

export function createWorld(view, data, opts = {}) {
  const s = createArena(view, data, { world: data.location.world, ...opts });
  bindSession(data);
  s.onQuit = opts.onQuit;
  return s;
}
