// [DUNGEON-LIFE C] Puzzles a kid can read: a picture hint banner on entering a puzzle room, an idle helper that makes
// the next thing to touch glow (never solves it), thought bubbles over the hero near a gate he cannot use yet (the
// item greyed + "?") or can use ("Tap it!", the first few times), locked-door bubbles (key icons), and a non-pausing
// how-to card when a tool is first obtained. Pure helpers + draw; the dungeon scene owns the state.
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';
import { drawCell, uiFont } from '../engine/ui.js';
import { chooseAmmo } from './autoaim.js';
import { drawDungeonPropArt } from '../art/fallback/props.js';

const P = CONFIG.PUZZLE_HELP;
// gate object → the item that opens it (icons-items frame) + kid words
const GATE = {
  torch: { tool: 'fireBloom', icon: 'fire-bloom', need: 'Need fire to light it!', ammo: true, open: (o) => o.lit },
  dreamTorch: { tool: 'fireBloom', icon: 'fire-bloom', need: 'Need fire to light it!', ammo: true, open: (o) => o.lit },
  iceBlock: { tool: 'fireBloom', icon: 'fire-bloom', need: 'Need fire to melt it!', ammo: true, open: (o) => o.melted },
  bramble: { tool: 'fireBloom', icon: 'fire-bloom', need: 'Need the Fire Bloom!', open: (o) => o.burnt },
  water: { tool: 'iceBloom', icon: 'ice-bloom', need: 'Need the Ice Bloom!', ammo: true, open: (o) => o.frozen },
  vent: { tool: 'iceBloom', icon: 'ice-bloom', need: 'Need the Ice Bloom!', ammo: true, open: (o) => o.frozen },
  crackedWall: { tool: 'bombBag', icon: 'bomb-bag', need: 'Need bombs to crack it!', open: (o) => o.open },
  crackedRock: { tool: 'bombBag', icon: 'bomb-bag', need: 'Need bombs to crack it!', open: (o) => o.open }, // [R3-10] overworld secret / relic rocks
  heavyBoulder: { tool: 'powerGlove', icon: 'power-glove', need: 'Need the Power Glove!', open: (o) => o.lifted },
  boulder: { tool: 'powerGlove', icon: 'power-glove', need: 'Need the Power Glove!', open: (o) => o.lifted },
  hookPoint: { tool: 'vineHook', icon: 'vine-hook', need: 'Need the Vine Hook!', open: (o) => o.hooked },
  pinHole: { tool: 'shrinkCap', icon: 'shrink-cap', need: 'Need the Shrink Cap!', open: (o) => o.open },
};
export const TOOL_GATES = Object.keys(GATE);
const HINT = {
  pushBlock: 'Push the blocks onto the buttons', switchOrder: 'Hit the switches in this order', valveOrder: 'Turn the valves in the right order',
  toolGates: 'Use your tools to open the way', torchOrder: 'Light the torches in order', leverPairs: 'Pull the levers in pairs',
  plateHold: 'Keep the buttons pressed', crateSort: 'Push each crate to its colour', bounceGap: 'Bounce across the gap',
};
const CARD = {
  fireBloom: 'Fire Bloom: tap a torch to light it!', iceBloom: 'Ice Bloom: tap water to freeze it!', bombBag: 'Bomb Bag: tap a cracked wall!',
  powerGlove: 'Power Glove: tap a boulder to lift it!', gustJar: 'Gust Jar: blow things away!', vineHook: 'Vine Hook: tap a hook post!', shrinkCap: 'Shrink Cap: tap a tiny hole!',
};

// Can the hero open this gate object now? (ammo by tag, or the tool)
export function canOpen(data, heroId, o) {
  const g = GATE[o.type]; if (!g) return false;
  if (g.ammo) { const c = chooseAmmo(data, heroId, o); if (c && c.ammo) return true; }
  return data.tools.includes(g.tool) || (!!data.dawnbreaker && (g.tool === 'fireBloom' || g.tool === 'iceBloom'));
}
export function gateOpen(o) { const g = GATE[o.type]; return !g || !!g.open(o); }

// A tap on a gate you cannot open yet: the missing-item bubble at once.
export function showNeed(h, o) { const g = GATE[o.type]; if (g) h.bubble = { icon: g.icon, missing: true, text: g.need, t: P.BUBBLE_S }; }

export function createHelp() { return { banner: null, bubble: null, card: null, idleT: 0, sig: '', glow: [], near: new Set(), tapHints: 0, tools: null, doorNear: null }; }

// New room: the hint banner for a puzzle room (once per visit).
export function helpEnterRoom(h, room, solved) {
  h.banner = room.puzzle && !solved && HINT[room.puzzle.kind] ? { text: HINT[room.puzzle.kind], kind: room.puzzle.kind, t: P.BANNER_S } : null;
  h.idleT = 0; h.sig = ''; h.glow = []; h.near.clear(); h.bubble = null; h.doorNear = null;
}

// Per frame. cx: { data, hero, inter, room, solved, doors: [{x, y, side, lock}], doorLocked(side) → lock kind or null }
export function updateHelp(h, cx, dt) {
  const { data, hero, inter } = cx;
  if (h.banner && (h.banner.t -= dt) <= 0) h.banner = null;
  if (h.bubble && (h.bubble.t -= dt) <= 0) h.bubble = null;
  if (h.card && (h.card.t -= dt) <= 0) h.card = null;
  // item-get card: a tool appears in data.tools for the first time this session
  if (h.tools === null) h.tools = [...data.tools];
  for (const t of data.tools) if (!h.tools.includes(t)) { h.tools.push(t); if (CARD[t]) { h.card = { tool: t, text: CARD[t], t: P.CARD_S }; h.newTool = t; } }
  if (!inter) return;
  // bubbles near gate objects: once per approach (leave the area to re-arm)
  for (const o of inter.list) {
    if (!GATE[o.type] || gateOpen(o)) continue;
    const c = inter.center(o), d = Math.hypot(c.x - hero.x, c.y - (hero.y - 8)), id = o.type + o.tx + ',' + o.ty;
    if (d > P.REARM_PX) { h.near.delete(id); continue; }
    if (d > P.NEAR_PX || h.near.has(id)) continue;
    h.near.add(id);
    const g = GATE[o.type];
    if (!canOpen(data, hero.id, o)) h.bubble = { icon: g.icon, missing: true, text: g.need, t: P.BUBBLE_S };
    else if (h.tapHints < P.TAP_HINTS) { h.tapHints++; h.bubble = { icon: g.icon, missing: false, text: 'Tap it!', t: P.BUBBLE_S }; }
  }
  // locked doors: key icon bubble when you stand at one without the key
  for (const dr of cx.doors || []) {
    if (!dr.lock || dr.lock === 'math' || dr.lock === 'puzzle') continue;
    const lock = cx.doorLocked(dr.side); if (!lock) continue;
    const d = Math.hypot(dr.fx - hero.x, dr.fy - hero.y), id = 'door' + dr.side;
    if (d > P.REARM_PX) { h.near.delete(id); continue; }
    if (d > P.NEAR_PX || h.near.has(id)) continue;
    h.near.add(id);
    const big = lock === 'big' || lock === 'boss';
    if ((lock === 'small' && cx.keys > 0) || (lock === 'big' && cx.bigKey)) continue; // walking in will open it
    h.bubble = { icon: big ? 'big-key' : 'small-key', missing: true, text: lock === 'boss' ? 'Beat the guardian first!' : big ? 'Need the Big Key!' : 'Need a small key!', t: P.BUBBLE_S };
  }
  // idle helper: no change in the puzzle for IDLE_S → glow the next thing to touch
  if (!cx.room.puzzle || cx.solved) { h.glow = []; return; }
  // [PUSH-BLOCKS] a block pushed where it can never move again (and not on a plate): point at the reset switch at once
  const reset = inter.list.find((o) => o.type === 'resetSwitch');
  if (reset && cx.map) {
    const stuck = inter.list.some((b) => b.type === 'block' && !b.slide && !inter.allAt(b.tx, b.ty).some((p) => p.type === 'plate')
      && ![[0, 1], [1, 0]].some(([dx, dy]) => (!cx.map.isSolid(b.tx + dx, b.ty + dy) && !cx.map.isSolid(b.tx - dx, b.ty - dy))));
    if (stuck) { h.glow = [reset]; if (!h.stuckShown) { h.stuckShown = true; h.banner = { text: 'Stuck? Hit the reset switch!', t: P.BANNER_S }; } return; }
    h.stuckShown = false;
  }
  const sig = inter.list.map((o) => [o.tx, o.ty, o.on, o.lit, o.open, o.down, o.melted, o.frozen, o.lifted, o.burnt].join(':')).join('|') + (inter.progress || 0);
  if (sig !== h.sig) { h.sig = sig; h.idleT = 0; h.glow = []; return; }
  if ((h.idleT += dt) < P.IDLE_S) return;
  h.glow = nextThings(cx.room.puzzle, inter, data, hero);
}

function nextThings(pz, inter, data, hero) {
  const L = inter.list;
  if (pz.kind === 'switchOrder' || pz.kind === 'valveOrder') {
    const type = pz.kind === 'switchOrder' ? 'orderSwitch' : 'valve', want = (pz.order || [])[inter.progress || 0];
    return L.filter((o) => o.type === type && o.n === want);
  }
  if (pz.kind === 'pushBlock' || pz.kind === 'crateSort') return L.filter((o) => o.type === 'block' && !L.some((p) => p.type === 'plate' && p.tx === o.tx && p.ty === o.ty));
  const gates = L.filter((o) => GATE[o.type] && !gateOpen(o));
  if (gates.length) return gates.slice(0, 1);
  return L.filter((o) => /switch|lever|valve|plate|torch|block/i.test(o.type)).slice(0, 2);
}

// World layer: pulsing rings on the glow targets.
export function drawHelpWorld(ctx, h, inter, cam, time) {
  if (!inter || !h.glow.length) return;
  const a = 0.45 + 0.35 * Math.sin(time * 6);
  for (const o of h.glow) {
    const c = inter.center(o), x = c.x - cam.x, y = c.y - cam.y;
    ctx.strokeStyle = 'rgba(255,224,96,' + a.toFixed(2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 12 + 2 * Math.sin(time * 6), 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,150,' + (a * 0.35).toFixed(2) + ')'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
  }
}

function itemIcon(ctx, name, x, y, size, grey) {
  if (imgReady('icons-items') && ATLAS['icons-items'].meta.frames[name]) {
    const f = ATLAS['icons-items'].meta.frames[name], k = size / Math.max(f.w, f.h);
    if (grey) ctx.filter = 'grayscale(1) opacity(0.6)';
    drawSprite(ctx, 'icons-items', name, Math.round(x - (f.w * k) / 2), Math.round(y - (f.h * k) / 2), { scale: k });
    ctx.filter = 'none'; return;
  }
  ctx.fillStyle = grey ? '#8a8a9a' : '#e0b040'; ctx.beginPath(); ctx.arc(x, y, size / 2.5, 0, Math.PI * 2); ctx.fill();
}

// [DUNGEON-LIFE C] a little picture of the puzzle at the left of the entry banner, from the room's own prop art
// (e.g. block → button). Returns the width used, 0 when no art (the banner keeps its star).
const PIC = { pushBlock: ['block', 'plate'], plateHold: ['block', 'plate'], crateSort: ['block', 'plate'], switchOrder: ['orderSwitch', 'orderSwitch', 'orderSwitch'], torchOrder: ['torch', 'torch'] };
function hintPic(ctx, kind, x, y, world) {
  const parts = PIC[kind]; if (!parts) return 0;
  ctx.save(); ctx.translate(x, y); ctx.scale(1.5, 1.5);
  let ok = true; const step = parts[0] === 'block' ? 24 : 18;
  parts.forEach((t, i) => { if (ok) ok = drawDungeonPropArt(ctx, { type: t, tx: 0, ty: 0, n: i + 1, on: false }, i * step, 0, world); });
  ctx.restore();
  if (!ok) return 0;
  if (parts[0] === 'block') { ctx.fillStyle = '#ffe070'; ctx.font = uiFont(14); ctx.fillText('➜', x + 30, y + 13); }
  return (parts.length - 1) * step * 1.5 + 28;
}

// Screen layer: banner (top), bubble over the hero's head, item card (centre-top). heroScreen = the hero's head on screen.
export function drawHelpScreen(ctx, h, view, heroScreen, world = 1) {
  if (h.banner) {
    const w = Math.min(view.w - 120, h.banner.kind && PIC[h.banner.kind] ? 470 : 420), x = (view.w - w) / 2, y = CONFIG.UI.HUD_RESERVED_H + 8, a = Math.min(1, h.banner.t / 0.4);
    ctx.globalAlpha = a; drawCell(ctx, x, y, w, 40, { fill: CONFIG.CELL.DARK });
    ctx.font = uiFont(18); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const pw = hintPic(ctx, h.banner.kind, x + 10, y + 8, world);
    if (!pw) { ctx.fillStyle = '#ffe070'; ctx.fillText('★', x + 22, y + 21); }
    ctx.fillStyle = '#ffffff'; ctx.fillText(h.banner.text, x + w / 2 + (pw ? pw / 2 : 10), y + 21); ctx.globalAlpha = 1;
  }
  if (h.bubble && heroScreen) {
    const b = h.bubble, bw = 66, bh = 50, x = Math.round(heroScreen.x - bw / 2), y = Math.round(heroScreen.y - bh - 18), a = Math.min(1, b.t / 0.3);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#10101a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, bw, bh, 14) : ctx.rect(x, y, bw, bh); ctx.fill(); ctx.stroke();
    for (const [dx, dy, r] of [[-6, bh + 6, 5], [-12, bh + 14, 3]]) { ctx.beginPath(); ctx.arc(x + bw / 2 + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    itemIcon(ctx, b.icon, x + (b.missing ? 22 : 24), y + bh / 2, 32, b.missing);
    ctx.font = uiFont(b.missing ? 30 : 22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = b.missing ? '#d03030' : '#2a8a3a';
    ctx.fillText(b.missing ? '?' : '☝', x + 50, y + bh / 2 + 1);
    ctx.font = uiFont(14); const tw = ctx.measureText(b.text).width + 16;
    drawCell(ctx, Math.round(heroScreen.x - tw / 2), y - 26, tw, 22, { fill: CONFIG.CELL.DARK });
    ctx.fillStyle = '#ffffff'; ctx.fillText(b.text, heroScreen.x, y - 14);
    ctx.globalAlpha = 1;
  }
  if (h.card) {
    const w = 380, x = Math.min((view.w - w) / 2, view.w - w - 150), y = view.h - 86, a = Math.min(1, h.card.t / 0.4, (P.CARD_S - h.card.t) / 0.3); // bottom, clear of the bubble and the attack buttons
    ctx.globalAlpha = Math.max(0, a); drawCell(ctx, x, y, w, 70, { sel: true });
    itemIcon(ctx, ({ fireBloom: 'fire-bloom', iceBloom: 'ice-bloom', bombBag: 'bomb-bag', powerGlove: 'power-glove', gustJar: 'gust-jar', vineHook: 'vine-hook', shrinkCap: 'shrink-cap' })[h.card.tool], x + 40, y + 35, 48, false);
    ctx.font = uiFont(17); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
    const [a1, a2] = h.card.text.split(': '); ctx.fillText(a1 + ':', x + 74, y + 24); ctx.font = uiFont(16); ctx.fillText(a2 || '', x + 74, y + 47);
    ctx.globalAlpha = 1;
  }
}
