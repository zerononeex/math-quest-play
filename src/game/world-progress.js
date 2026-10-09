// Per-world loop (SPEC 2.6): all medallions open the main-boss arena; beating the boss → +1 heart (D03),
// bossBeaten, next world unlocked; the tool comes from the chest that appears after the boss (D17).
import { beatBoss } from './progression.js';

export const MEDALS_NEEDED = [2, 2, 3, 3, 3, 3, 4, 0];
export const WORLD_TOOLS = ['powerGlove', 'fireBloom', 'iceBloom', 'bombBag', 'vineHook', 'shrinkCap', 'starCompass', null];
export const TOOL_NAMES = { powerGlove: 'Power Glove', fireBloom: 'Fire Bloom', iceBloom: 'Ice Bloom', bombBag: 'Bomb Bag', vineHook: 'Vine Hook', shrinkCap: 'Shrink Cap', starCompass: 'Star Compass', gustJar: 'Gust Jar' };

export function bossArenaOpen(data, w) { return data.worlds[w - 1].medallions.length >= MEDALS_NEEDED[w - 1]; }

// Main boss beaten: heart, flag, unlock the next world. Returns the toast lines.
export function completeWorld(data, w) {
  const wd = data.worlds[w - 1];
  if (wd.bossBeaten) return [];
  const before = data.maxHearts;
  beatBoss(data, w);
  const out = data.maxHearts > before ? ['+1 Heart!'] : []; // W7/W8 bosses give no heart (D03)
  if (w < 8 && !data.worlds[w].unlocked) { data.worlds[w].unlocked = true; out.push('World ' + (w + 1) + ' unlocked on the Wayfarer map!'); }
  return out;
}

export function grantTool(data, tool) {
  if (!tool || data.tools.includes(tool)) return false;
  data.tools.push(tool);
  return true;
}

// [S61] Old saves: a dungeon whose medallion is taken but whose big-chest tool never was (e.g. the Gust Jar in the
// Giggle Caverns) hands the tool over, so a later world can never be blocked by a skipped chest.
export function ensureChestTools(data, worlds) {
  let got = null;
  for (const W of Object.values(worlds)) for (const dg of Object.values(W.dungeons || {})) {
    if (!dg.medallion || !data.worlds[W.id - 1] || !data.worlds[W.id - 1].medallions.includes(dg.medallion)) continue;
    for (const r of Object.values(dg.rooms || {})) if (r.type === 'bigchest' && r.chest && String(r.chest.item).startsWith('tool:') && grantTool(data, r.chest.item.slice(5))) got = r.chest.item.slice(5);
  }
  return got;
}
