// [S55] Secret nooks: step onto the reward tile behind the gate → one-time reward (Star Seed on revisit secrets, else gold or a potion).
import { CONFIG } from '../config.js';
import { addStarSeed } from './progression.js';

// Which tool opens each gate type (gates themselves still check verbs only, D05/D28).
export const GATE_TOOL = { crackedWall: 'bombBag', crackedRock: 'bombBag', bramble: 'fireBloom', iceBlock: 'fireBloom', heavyBoulder: 'powerGlove', pinHole: 'shrinkCap', hookPoint: 'vineHook', water: 'iceBloom' };

export function secretKey(world, s) { return 's' + world + ':' + s.cx + ',' + s.cy; }

export function secretReward(world, s) {
  if (s.seed) return { kind: 'seed', label: 'Star Seed!' };
  if (/potion/.test(s.reward)) return { kind: 'potion', n: CONFIG.SECRET.POTIONS, label: '+' + CONFIG.SECRET.POTIONS + ' Potion' };
  const g = CONFIG.DROPS.COIN_VALUE[world - 1] * CONFIG.SECRET.GOLD_COINS;
  return { kind: 'gold', n: g, label: '+' + g + ' gold' };
}

// Returns the reward granted, or null if this nook was already emptied.
export function claimSecret(data, world, s) {
  const k = secretKey(world, s);
  if (data.secrets.includes(k)) return null;
  data.secrets.push(k);
  const r = secretReward(world, s);
  if (r.kind === 'seed') addStarSeed(data);
  else if (r.kind === 'potion') data.items.potions = Math.min(CONFIG.ITEMS.POTION.carry, data.items.potions + r.n);
  else data.gold += r.n;
  return r;
}

export function secretsFound(data, world) { return data.secrets.filter((k) => k.startsWith('s' + world + ':')).length; }
