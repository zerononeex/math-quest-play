// Side-quest log (D29): per-world quests with step text; finishing one gives a Star Seed (+1 stat point, D28).
// [S55] `goal` = quest marks to find on that world's overworld (src/game/questgoals.js places them); the last one completes the quest.
// [W8 Phase 4] perRegion: 'echo' = one mark inside each region flagged `echo` (in region order); elite: true = each mark is a star
// elite (the region's `elite` id, ×2 HP, gold outline) to beat instead of a spot to walk onto.
import { addStarSeed } from './progression.js';

export const QUEST_DEFS = {
  'w1-lost-lamb': { world: 1, goal: 1, name: 'Lost Lamb Luma', giver: 'Wrenley', steps: ['Talk to Wrenley in Sunnyvale', 'Follow the bleats into Firefly Hollow', 'Free the gate', 'Walk Luma home'] },
  'w2-giggle-delivery': { world: 2, goal: 3, name: 'Giggle Delivery', giver: 'Mayor Bop', steps: ['Talk to Mayor Bop in Plip Village', 'Collect 3 jars of giggles in the Giggle Caverns', 'Spin the three windmills around the ring with the Gust Jar'] },
  'w2-bounce-race': { world: 2, goal: 4, name: 'Bounce Race', giver: 'Pip', steps: ['Talk to Pip', 'Beat Pip around the ring\'s bounce pads in 60 seconds'] },
  'w3-colour-town': { world: 3, goal: 4, name: 'Colour the Town', giver: 'Marina', steps: ['Talk to Marina on Neon Pier', 'Find the 4 grey signs around the bay', 'Repaint them with your shots'] },
  'w3-lost-tune': { world: 3, goal: 3, name: 'Lost Tune', giver: 'DJ Ripple', steps: ['Talk to DJ Ripple', 'Collect 3 record shards (one per island)', 'Play them in order on the speaker stack'] },
  'w4-missing-sprinkles': { world: 4, goal: 5, name: 'The Missing Sprinkles', giver: 'Baker Poppy', steps: ['Talk to Baker Poppy in Pudding Port', 'Collect 5 sprinkle jars across all four levels', 'One hides behind a candle wall — light it with FIRE'] },
  'w4-frosting-slalom': { world: 4, goal: 6, name: 'Frosting Slalom', giver: 'Puff', steps: ['Talk to Puff', 'Slide down the frosting run touching all 6 flags'] },
  'w5-drum-messages': { world: 5, goal: 3, name: 'Drum Messages', giver: 'Elder Drum', steps: ['Talk to Elder Drum in Drumroot', 'Repeat the 3 drum rhythms at the drum stones across the canopy'] },
  'w5-banana-delivery': { world: 5, goal: 1, name: 'Banana Delivery', giver: 'Tumba', steps: ['Talk to Tumba', 'Carry a Sunbanana across the quicksand to the far hut without stopping'] },
  'w6-sproutling-homecoming': { world: 6, goal: 3, name: 'Sproutling Homecoming', giver: 'Sprout', steps: ['Talk to Sprout in Dewdrop Hollow', 'Escort 3 lost Sproutlings to the nest past the sap flats'] },
  'w6-console-riddle': { world: 6, goal: 3, name: 'The Console Riddle', giver: 'Dewey', steps: ['Talk to Dewey', 'Press the lost console\'s giant buttons in the order of 3 fraction riddles'] },
  'w7-four-beacons': { world: 7, goal: 4, name: 'Four Beacons', giver: 'Dockmaster Gale', steps: ['Talk to Dockmaster Gale', 'Light the four beacon braziers on the four isles'] },
  'w7-stowaway-map': { world: 7, goal: 3, name: 'Stowaway\'s Map', giver: 'Pip', steps: ['Talk to Pip', 'Follow the torn map across the isles to Pip\'s hidden kite'] },
  'w8-constellation-cartographer': { world: 8, goal: 7, perRegion: 'echo', name: 'Constellation Cartographer', giver: 'Stargazer Lumi', steps: ['Talk to Lumi', 'Find the 7 lost star-charts, one in each echo region'] },
  'w8-comet-courier': { world: 8, goal: 3, name: 'Comet Courier', giver: 'Postmaster Nova', steps: ['Talk to Nova', 'Deliver 3 comet letters across the plaza before they fade'] },
  'w8-elite-hunt': { world: 8, goal: 7, perRegion: 'echo', elite: true, name: 'Elite Hunt', giver: 'Captain Orion', steps: ['Talk to Orion', 'Beat the 7 optional star elites, one per echo region'] },
  'w1-stone-circle': { world: 1, goal: 3, name: 'Light the Stone Circle', giver: 'Elder Mossbeard', steps: ['Talk to Elder Mossbeard', 'Answer the 3 riddle stones', 'Stand in the circle at dusk'] },
};

export function registerQuests(defs) { Object.assign(QUEST_DEFS, defs); }

export function questState(data, id) { return data.quests[id] && typeof data.quests[id] === 'object' ? data.quests[id] : null; }

export function startQuest(data, id) { if (!QUEST_DEFS[id] || questState(data, id)) return false; data.quests[id] = { step: 0, done: false }; return true; }

export function advanceQuest(data, id) {
  const q = questState(data, id);
  if (!q || q.done) return false;
  q.step++;
  if (q.step >= QUEST_DEFS[id].steps.length) { q.done = true; addStarSeed(data); }
  return true;
}

// Quest log lines for a world: [{ name, step text, done }]
export function questLog(data, world) {
  return Object.entries(QUEST_DEFS).filter(([id, d]) => d.world === world && questState(data, id)).map(([id, d]) => {
    const q = questState(data, id);
    const n = q.got ? ' (' + q.got + '/' + d.goal + ')' : '';
    return { id, name: d.name, text: q.done ? 'Done!' : d.steps[Math.min(Math.max(q.step, 1), d.steps.length - 1)] + n, done: q.done };
  });
}

// [S55] One quest mark found; the last one finishes the quest (Star Seed). Returns 'got' | 'done' | null.
export function questMark(data, id, key) {
  const q = questState(data, id), d = QUEST_DEFS[id];
  if (!q || q.done || !d) return null;
  q.marks = Array.isArray(q.marks) ? q.marks : [];
  if (q.marks.includes(key)) return null;
  q.marks.push(key); q.got = q.marks.length;
  q.step = Math.min(d.steps.length - 1, Math.max(1, Math.ceil((q.got / d.goal) * (d.steps.length - 1))));
  if (q.got >= d.goal) { q.done = true; q.step = d.steps.length; addStarSeed(data); return 'done'; }
  return 'got';
}
