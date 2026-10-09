// Dungeon scene: one 40×30-tile room at a time; doors change rooms both ways; locked doors block + nudge;
// wave rooms seal until clear; math doors; stairs/pits between floors; treasure room; per-floor mini-map; autosave.
import { CONFIG } from '../config.js';
import { ATLAS, imgReady, codeArt, drawFoot, drawRect } from '../engine/atlas.js';
import { drawPickup } from '../game/drops.js';
import { bossHits } from '../game/stats.js';
import { Camera } from '../engine/camera.js';
import { input, pressed, held } from '../engine/input.js';
import { doorAt, magnet, drawDoorArrow } from '../game/doortap.js';
import { desaturate } from '../engine/render.js';
import { createDungeonMap } from './map.js';
import { scenes } from '../engine/scenes.js';
import { layoutBegin } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { save } from '../engine/save.js';
import { createStatPicker } from './statpicker.js';
import { createHero, updateHero, drawHero, setTapTarget, heroArt } from '../game/hero.js';
import { createEntities, resetRoom, spawn } from '../game/entities.js';
import { createCombat } from '../game/combat.js';
import { bindSession, session, currentBand, apCapOf, spendAp } from '../game/ap.js';
import { createProjectiles, fire as fireProj, updateProjectiles, ammoUnlocked, AMMO } from '../game/projectiles.js';
import { coneAim, findTapTarget, chooseAmmo } from '../game/autoaim.js';
import { usePotion, cycleItem, takeBomb, startHook, updateHook, useToolsAhead } from '../game/items.js';
import { MILO_SPECIALS } from '../game/kits/milo.js';
import { inkGatling } from '../game/kits/wren.js';
import { drawShot, drawSpecialFx } from '../game/shotfx.js';
import { createMathPopup } from '../game/math-popup.js';
import { createHud, updateHud, drawHud, hudHit, drawAttackGlyph } from '../game/hud.js';
import { updateFx, drawFx, floatText, confetti, shake } from '../game/fx.js';
import { sfx } from '../engine/audio.js';
import { jumpToForm } from '../game/bosses.js';
import { createVictory } from './victory.js';
import { takeRelic } from '../game/relics.js';
import { buildRushDungeon, createRun, rushKill, rushDeath, finishRun, fmtTime } from '../game/rush.js';
import { createRushResults, createSurvivalResults } from './trophies.js';
import { buildSurvivalDungeon, createSurvival, survivalRoster, waveDefs, survivalDeath, recordWaves } from '../game/survival.js';
import { createBuddies, sendBuddy, buddyTargetAt, updateBuddies, buddyWeights, drawBuddies, freeBuddies, recallBuddies } from '../game/buddies.js';
import { enemyDef, TEST_ENEMIES } from '../game/enemies.js';
import { drawEnemy, drawHazard } from '../art/fallback/enemies.js';
import { createKit } from '../game/kits/common.js';
import { DT, OPP, RW, RH, dungeonState, doorOpen, tryUnlock, openDoor, buildRoom, leavingSide, doorAhead, entryPoint, compactDungeon, roomSpots } from '../game/dungeon.js';
import { dungeonPainter, dungeonArtPainter, drawDoor, drawRoyalDoor } from '../art/fallback/dungeon.js';
import { createMechanics } from '../game/mechanics.js';
import { setupRoomPuzzle } from '../game/puzzles.js';
import { spawnBoss } from '../game/bosses.js';
import { drawBoss, drawBossBar } from '../art/fallback/bosses.js';
import { TYPES } from '../game/interactables.js';
import { createLife, stampLife, updateLife, drawLife } from '../game/dungeonlife.js';
import { createHelp, helpEnterRoom, updateHelp, drawHelpWorld, drawHelpScreen, canOpen, gateOpen, showNeed, TOOL_GATES } from '../game/puzzlehelp.js';
import { drawProp, drawDungeonPropArt } from '../art/fallback/props.js';
import { grantGear } from '../game/gear.js';
import { gainXp, refreshHearts } from '../game/progression.js';
import { WORLDS } from '../data/worlds.js';
import { drawTreasureFloor, drawTreasureRoom, drawVaultRoom, medalIndex, treasureReward, startItemGet, drawItemGet } from '../game/treasure.js';
import { completeWorld, grantTool, WORLD_TOOLS, TOOL_NAMES } from '../game/world-progress.js';

// [R3-3] The exit portal, drawn live so it reads as a portal: a stone ring until it opens, then a glowing purple swirl with
// turning rings, rising sparkles, the yellow door arrow bobbing over it and an "Exit" label.
function drawPortal(ctx, [tx, ty], lit, cam, t) {
  const x = Math.round((tx + 0.5) * 16 - cam.x), y = Math.round((ty + 0.5) * 16 - cam.y);
  ctx.save();
  ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.ellipse(x, y, 19, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lit ? '#5a3a9a' : '#4a4a58'; ctx.beginPath(); ctx.ellipse(x, y, 17, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = lit ? '#1a0a3a' : '#2a2a34'; ctx.beginPath(); ctx.ellipse(x, y, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (!lit) { ctx.restore(); return; }
  const g = ctx.createRadialGradient(x, y, 2, x, y, 30); g.addColorStop(0, 'rgba(200,170,255,0.55)'); g.addColorStop(1, 'rgba(120,80,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 30, 20, 0, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { // three swirl arcs turning at different speeds
    const a = t * (2.4 + k * 0.8) * (k % 2 ? -1 : 1) + k * 2.1, r = 4 + k * 3.5;
    ctx.strokeStyle = ['#ffffff', '#e0d0ff', '#a080ff'][k]; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, 0, a, a + Math.PI * 1.2); ctx.stroke();
  }
  for (let k = 0; k < 6; k++) { // sparkles rising out of it
    const p = (t * 0.8 + k / 6) % 1, sx = x + Math.sin(k * 2.7 + t * 2) * 12, sy = y - p * 26;
    ctx.globalAlpha = 1 - p; ctx.fillStyle = k % 2 ? '#ffffff' : '#d0b8ff'; ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
  }
  ctx.globalAlpha = 1; ctx.restore();
  drawDoorArrow(ctx, { x: x + cam.x, y: y + cam.y - 6, t: 1 }, cam.x, cam.y); // the same yellow arrow as every door
  ctx.font = font(10); ctx.textAlign = 'center'; drawOutlined(ctx, 'Exit', x, y + 18, '#ffe070', '#10101a', 2);
}

// [R2-19] w<n>-puzzle-b frames [switch lit, switch dark, clue tablet]: W1 #328 frames 2-4 (after the dummy), W2+ frames 0-2
const PUZZLE_B = { 1: [2, 3, 4], 2: [0, 1, 2], 3: [0, 1, 2], 4: [0, 1, 2], 5: [0, 1, 2], 6: [0, 1, 2], 7: [0, 1, 2] };
export function createDungeon(view, data, dg, opts = {}) {
  bindSession(data);
  refreshHearts(data);
  if (dg.rush && !dg.rooms.r1) dg = buildRushDungeon(WORLDS, dg.rush);
  if (dg.survival && !dg.rooms.arena) dg = buildSurvivalDungeon(); // [S54] // [S53] rush gates build their boss chain from every world
  dg = compactDungeon(dg); // [R1-5/22] normal rooms ≈ one screen
  // a rush keeps its own throw-away state (nothing is saved into the world's dungeon progress)
  const st = dg.rush || dg.survival ? { keys: 0, bigKey: false, visited: [], opened: [], cleared: [], chests: [], puzzles: {}, subBoss: false, medallion: false, done: false } : dungeonState(data, dg);
  const hero = createHero(data.hero, 0, 0);
  const ents = createEntities();
  const cam = new Camera(view, 'world'); // [P-A][A2]
  const hud = createHud();
  const d = { name: 'dungeon', dg, st, hero, ents, cam, data, room: null, roomId: null, map: null, msg: null, msgT: 0, sealed: false, wave: 0, bumpT: 0, buddies: dg.world === 6 ? createBuddies() : null }; // [W6] Sproutlings follow into the Sproutlands' dungeons
  const painter = dungeonPainter(dg.theme);
  const say = (t) => { d.msg = t; d.msgT = 2; };
  const openQuestion = () => { if (scenes.top() === d) scenes.push(createMathPopup(view, { onClose: () => scenes.pop() })); };
  const W = WORLDS[dg.world] || {};
  d.help = createHelp(); // [DUNGEON-LIFE C]
  const combat = createCombat({
    get map() { return d.map; }, get inter() { return d.inter; }, ents, hero, data, world: dg.world, openQuestion,
    // [D46] Seraphel: the transformation plays in full once, then skips; reaching form 2 sets a checkpoint
    skipTransform: () => !!st.seenTransform, onTransform: (e, f) => {
      st.seenTransform = true; st.formCheckpoint = e.form; save.auto('boss');
      if (f && f.lines) { d.bossLine = { name: (e.baseDef || e.bossDef).name.split(',')[0], lines: f.lines, t: 4 }; } // [D47] wise words between phases
      if (f && f.question) scenes.push(createMathPopup(view, { title: f.question, once: true, // [D47] one bonus question: right = +AP and a star shield
        onCorrect: () => { scenes.pop(); data.ap = Math.min(apCapOf(), data.ap + CONFIG.BOSS.BONUS_AP); hero.starShield = CONFIG.BOSS.STAR_SHIELD; say('A star shield!'); },
        onWrong: () => { scenes.pop(); say('Well tried. Onward!'); } }));
    },
    onFarewell: (e) => { const fw = (e.baseDef || e.bossDef).farewell; d.bossLine = { name: (e.baseDef || e.bossDef).name.split(',')[0], lines: fw.lines, t: fw.s || 8 }; },
    specials: { ...MILO_SPECIALS, inkGatling: () => inkGatling(d.fire, hero.facing, d.aimAngle()) }, // same specials as outdoors
    summon: (boss) => {
      const ed = (W.enemies || []).find((e) => e.id === boss.bossDef.summons) || TEST_ENEMIES[0];
      // [W6 Phase 7] a free floor spot near the boss (a boss by the wall used to drop its minion inside the wall, out of reach:
      // the room could never be cleared); the old random left/right spot first, then around, else on the boss itself
      const sd = Math.random() < 0.5 ? -1 : 1, free = (x, y) => d.map.boxFree(x - 7, y - 12, x + 7, y - 1);
      const spot = [[sd * 40, 20], [-sd * 40, 20], [0, 40], [0, -36], [sd * 28, 0], [-sd * 28, 0]].map(([dx, dy]) => [boss.x + dx, boss.y + dy]).find(([x, y]) => free(x, y)) || [boss.x, boss.y];
      spawn(ents, { ...enemyDef(ed, dg.world, data.tier), x: spot[0], y: spot[1], log: [] });
    },
    onKill: (e) => {
      if (e.xp) for (const l of gainXp(data, e.xp, save.store ? save.store.loadSettings() : {})) { confetti(hero.x, hero.y - 16); floatText(hero.x, hero.y - 36, 'Level ' + l.level + '! +1 point' + (l.heart ? ' +1 Heart' : '')); save.auto('levelup'); }
      if (e.boss && d.run) { rushBossDown(); return; }
      if (e.boss && (e.bossDef.kind === 'main' || e.bossDef.kind === 'final')) {
        st.subBoss = true; st.phase2Checkpoint = false; st.formCheckpoint = 0; d.sealed = false; d.boss = null;
        const lines = completeWorld(data, dg.world);
        rebuild(); confetti(hero.x, hero.y - 20, 60); say(e.bossDef.name.split(',')[0] + ' is beaten! ' + lines.join(' ')); d.toasts = lines; save.auto('boss');
        if (dg.world === 8) scenes.push(createVictory(view, data, { onDone: () => { scenes.pop(); if (opts.onExit) opts.onExit(); } })); // [D47] the end: stats, tunic, credits
      } else if (e.boss) {
        st.subBoss = true; d.sealed = false; d.boss = null;
        if (!data.worlds[dg.world - 1].subBossesBeaten.includes(e.bossDef.id)) data.worlds[dg.world - 1].subBossesBeaten.push(e.bossDef.id);
        rebuild(); confetti(hero.x, hero.y - 20); say(e.bossDef.name + ' is beaten!'); save.auto('subboss');
      }
    },
    onDeath: () => d.sv ? survivalFell() : d.run ? rushFell() : scenes.push(createMathPopup(view, { title: 'Answer to get back up!', onCorrect: () => { scenes.pop(); data.revives = (data.revives || 0) + 1; data.hearts = CONFIG.LIVES.REVIVE_HEARTS; hero.iframes = CONFIG.LIVES.REVIVE_IFRAMES; } })),
  });
  // Ranged ammo works in dungeons too (torches, switches, eyes): AP charged when fired (G11), element ammo locked until its Bloom (D05).
  const projs = createProjectiles();
  combat.heroX = () => hero.x; combat.heroY = () => hero.y - 8; // [W6 Phase 7] Milo's Cape Swipe reads these (set outdoors in arena.js; dungeons threw '[loop] c.heroX is not a function')
  d.projs = projs; d.combat = combat;
  d.fire = (ammo, dx, dy) => {
    if (!ammoUnlocked(data, ammo)) { say('Need ' + AMMO[ammo].tags[0] + '!'); return false; }
    if (!spendAp(AMMO[ammo].ap)) { say('Need AP!'); return false; }
    if (Math.abs(dx) > Math.abs(dy)) hero.facing = dx > 0 ? 'right' : 'left'; else hero.facing = dy > 0 ? 'down' : 'up'; hero.faceHold = CONFIG.COMBAT.FACE_HOLD;
    return !!fireProj(projs, hero, ammo, dx, dy);
  };
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  d.aim = null; // [D37] tapped angle for specials; else keyboard cone auto-aim
  d.aimAngle = () => { if (d.aim != null) return d.aim; const [dx, dy] = DIRV[hero.facing]; const c = coneAim(hero.x, hero.y - 10, dx, dy, ents, d.inter); return c ? Math.atan2(c.dy, c.dx) : null; };
  const kit = createKit(hero.id, data, { swing: () => combat.startSwing(), special: (k) => combat.special(k, 34),
    fire: (ammo, tdx, tdy) => { if (tdx != null) return d.fire(ammo, tdx, tdy); const [dx, dy] = DIRV[hero.facing]; const c = coneAim(hero.x, hero.y - 10, dx, dy, ents, d.inter); return c ? d.fire(ammo, c.dx, c.dy) : d.fire(ammo, dx, dy); } });
  d.kit = kit;

  // Rebuild the room tiles in place (keeps the mechanics system and its objects bound to the same map).
  function rebuild() {
    const nm = buildRoom(dg, st, d.roomId, d.sealed);
    stampLife(d.life, nm); // [DUNGEON-LIFE] pots, barrels, statues stay solid through rebuilds
    if (!d.map || d.map.w !== nm.w) d.map = nm;
    else { d.map.ground.set(nm.ground); d.map.solid.set(nm.solid); }
    if (d.inter) { for (const k of d.inter.base.keys()) d.inter.base.set(k, nm.solid[k]); d.inter.syncAll(); }
    const art = dungeonArtPainter(dg.world, dg.theme, () => d.map); // [V6] user dungeon colours when loaded
    d.artPainted = !!art;
    d.map.prerender(art || painter, art ? 2 : 1); // [A3] v2 dungeon colours/sprites at 2x (streamed)
    // a chest / pedestal that appears where the hero stands (e.g. the boss dies on that spot) nudges the hero out
    const hw = (hero.w || 12) / 2, hh = hero.h || 8, clear = (x, y) => d.map.boxFree(x - hw + 1, y - hh + 1, x + hw - 1, y - 1);
    if (hero.x && !clear(hero.x, hero.y)) for (const [ox, oy] of [[0, 16], [0, 32], [16, 0], [-16, 0], [0, -16], [0, 48], [16, 16], [-16, 16]]) if (clear(hero.x + ox, hero.y + oy)) { hero.x += ox; hero.y += oy; hero.path = null; break; }
  }
  // [D35] this room's doorways: centre of the outermost door tiles (walk target), the tile in front (fx, fy), way in.
  const doorSpots = () => { const w = d.room.w || RW, h = d.room.h || RH, cx = (w >> 1) * 16, cy = (h >> 1) * 16;
    return { n: { x: cx, y: 2 * 16 + 8, dir: 'up', fx: cx, fy: 5 * 16 + 8 }, s: { x: cx, y: (h - 1) * 16 + 8, dir: 'down', fx: cx, fy: (h - 3) * 16 + 8 },
      w: { x: 8, y: cy, dir: 'left', fx: 2 * 16 + 8, fy: cy }, e: { x: (w - 1) * 16 + 8, y: cy, dir: 'right', fx: (w - 3) * 16 + 8, fy: cy } }; };
  d.doors = () => { const D = doorSpots(); return [...Object.keys(d.room.doors).map((side) => ({ ...D[side], w: 2, side, lock: d.room.doors[side].lock })), ...(d.roomId === dg.start && !d.room.doors.s ? [{ ...D.s, w: CONFIG.DUNGEON.EXIT_TAP_W, side: 'exit' }] : [])]; }; // [R1-20] the way out has a big tap zone
  function spawnWave() {
    const w = d.room.waves[d.wave];
    let i = 0;
    for (const [arch, n] of w) for (let k = 0; k < n; k++, i++) {
      const ed = [...(W.enemies || []), ...(W.dungeonEnemies || [])].find((e) => e.id === arch) || (W.enemies || []).find((e) => e.archetype === arch) || // [R3-15] a wave names a creature id or an archetype
        (() => { const L = (W.enemies || []).filter((e) => !['shielded', 'turret', 'burrower', 'flyer'].includes(e.archetype)), M = L.length ? L : W.enemies || []; return M.length ? M[i % M.length] : null; })() || TEST_ENEMIES.find((e) => e.archetype === arch) || TEST_ENEMIES[0]; // [R2-19] no foe of that kind here: one of the world's own (never the red test look)
      const R = d.room, X = R.X || ((x) => x), Y = R.Y || ((y) => y);
      spawn(ents, { ...enemyDef(ed, dg.world, data.tier), x: X(8 + (i % 4) * 8) * 16, y: Y(10 + Math.floor(i / 4) * 8) * 16, log: [] });
    }
  }
  // [PUSH-BLOCKS] tap a block: stand on the side away from where it should go (the side nearest the tap point / the hero),
  // walk there, then push once. Already standing there → push at once.
  function tapPush(o, wx, wy) {
    const c = d.inter.center(o), ox = wx - c.x, oy = wy - c.y, off = Math.hypot(ox, oy) > 2; // tap off-centre: that side is where you stand
    const tapSide = Math.abs(ox) > Math.abs(oy) ? [Math.sign(ox), 0] : [0, Math.sign(oy)];
    const score = (a) => (off && a[0] === tapSide[0] && a[1] === tapSide[1] ? -1000 : 0) + Math.hypot(c.x + a[0] * 16 - hero.x, c.y + a[1] * 16 - hero.y + 8);
    const sides = [[0, -1], [0, 1], [-1, 0], [1, 0]] // stand tile offsets from the block
      .filter(([sx, sy]) => !d.map.isSolid(o.tx + sx, o.ty + sy) && !d.map.isSolid(o.tx - sx, o.ty - sy))
      .sort((a, b) => score(a) - score(b));
    if (!sides.length) { say('This block is stuck — use the reset switch!'); return; }
    const [sx, sy] = sides[0], stand = { x: (o.tx + sx) * 16 + 8, y: (o.ty + sy) * 16 + 12 };
    d.useOnArrive = { o, t: CONFIG.PUZZLE_HELP.USE_TIMEOUT_S, push: [-sx, -sy], stand };
    if (Math.hypot(hero.x - stand.x, hero.y - stand.y) > 6) setTapTarget(hero, d.map, stand.x, stand.y);
  }
  // walking (or a door tap) into a closed door: unlock, ask, or block with a message + nudge back (never freeze)
  function bumpDoor(ahead) {
    d.bumpT = 0.5;
    const r = d.sealed ? 'sealed' : doorOpen(dg, st, d.roomId, ahead) ? 'open' : tryUnlock(dg, st, d.roomId, ahead);
    if (r === 'opened') { rebuild(); say('Unlocked!'); save.auto('door'); }
    else if (r === 'puzzle') say('Solve the puzzle to open it!');
    else if (r === 'boss') say('Defeat the guardian first!');
    else if (r === 'math') scenes.push(createMathPopup(view, { title: 'Answer to open the door!', onCorrect: () => { scenes.pop(); openDoor(st, d.roomId, ahead); rebuild(); save.auto('door'); } }));
    else if (r !== 'open') {
      if (r !== 'puzzle' && r !== 'boss') say(r === 'needBig' ? 'Locked — find the Big Key!' : r === 'sealed' ? 'Defeat the monsters first!' : 'Locked — find the key!');
      const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[hero.facing];
      hero.x += back[0] * 16; hero.y += back[1] * 16; hero.path = null;
    }
    return r;
  }
  // [DUNGEON-LIFE D] tap-to-hit: stand on the free side nearest the hero, face the object and swing.
  function tapHit(o) {
    const sides = [[0, 1], [0, -1], [-1, 0], [1, 0]].filter(([sx, sy]) => !d.map.isSolid(o.tx + sx, o.ty + sy))
      .sort((a, b) => Math.hypot((o.tx + a[0]) * 16 + 8 - hero.x, (o.ty + a[1]) * 16 + 12 - hero.y) - Math.hypot((o.tx + b[0]) * 16 + 8 - hero.x, (o.ty + b[1]) * 16 + 12 - hero.y));
    if (!sides.length) return;
    const [sx, sy] = sides[0], stand = { x: (o.tx + sx) * 16 + 8, y: (o.ty + sy) * 16 + 12 };
    d.useOnArrive = { o, t: CONFIG.PUZZLE_HELP.USE_TIMEOUT_S, hit: [-sx, -sy], stand };
    if (Math.hypot(hero.x - stand.x, hero.y - stand.y) > 6) setTapTarget(hero, d.map, stand.x, stand.y);
  }
  // [DUNGEON-LIFE] roaming foes placed by hand (room.foes: [id, x, y], already in this room's tiles); they come back on
  // every visit. A spot inside a wall/solid moves to the nearest free tile.
  function spawnFoes() {
    const all = [...(W.enemies || []), ...(W.dungeonEnemies || [])];
    for (const [id, x, y] of d.room.foes || []) {
      const ed = all.find((e) => e.id === id); if (!ed) continue;
      let tx = x, ty = y;
      const L = CONFIG.DUNGEON_LIFE, hx = hero.x / 16, hy = hero.y / 16, dd = Math.hypot(tx - hx, ty - hy);
      if (dd < L.FOE_MIN_TILES) { // never right next to where you walk in: slide it away along the line from the hero (kept on the floor)
        const k = L.FOE_MIN_TILES / Math.max(0.5, dd), w = d.map.w, h = d.map.h;
        tx = Math.max(3, Math.min(w - 4, Math.round(hx + (tx - hx) * k))); ty = Math.max(5, Math.min(h - 4, Math.round(hy + (ty - hy) * k)));
      }
      const bx = tx, by = ty;
      for (let r = 0; r < 4 && d.map.isSolid(tx, ty); r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (!d.map.isSolid(bx + dx, by + dy)) { tx = bx + dx; ty = by + dy; break; }
      const e = spawn(ents, { ...enemyDef(ed, dg.world, data.tier), x: tx * 16 + 8, y: ty * 16 + 12, log: [] });
      e.ai.state = 'rest'; e.ai.t = L.FOE_WAKE_S + Math.random() * 0.6; // a moment to look around before anything moves (W1 kids)
    }
  }
  // Enter a room. via: a door side of the PREVIOUS room ('n'…), 'stairs', 'pit' or 'start'.
  d.enterRoom = (id, via = 'start') => {
    if (d.buddies) { recallBuddies(d.buddies); for (const b of d.buddies.list) if (b.state === 'spent') b.state = 'follow'; } // [W6] a new room: the team regrows and regroups
    if (typeof projs !== 'undefined') projs.forEach((p) => projs.kill(p));
    d.roomId = id; d.room = dg.rooms[id]; d.solvedNow = !!st.puzzles[id]; st.lastRoom = id; d.life = null; d.foesUp = false;
    resetRoom(ents); // NO STALE INDEXES: entity registry is rebuilt per room
    if (!st.visited.includes(id)) st.visited.push(id);
    d.sealed = (d.room.type === 'wave' && !st.cleared.includes(id) && !(dg.throne && st.subBoss)) || (d.room.type === 'sub' && !st.subBoss); // [R3-15] the keep's hall stays quiet once its boss is down
    d.wave = 0;
    d.map = null; d.inter = null;
    rebuild();
    d.inter = createMechanics(d.map, { hero, tier: data.tier, get buddies() { return d.buddies ? buddyWeights(d.buddies) : []; }, enemiesLeft: () => ents.list.filter((e) => e.alive && e.kind === 'enemy').length });
    d.puzzle = setupRoomPuzzle(d.inter, d.room, st, id, hero);
    d.life = !d.run && !d.sv ? createLife(dg, d.room, d.map, id, st, d.inter) : null; // [DUNGEON-LIFE]
    helpEnterRoom(d.help, d.room, !!st.puzzles[id]);
    d.useOnArrive = null;
    d.inter.syncAll();
    d.boss = null;
    let p;
    if (via === 'stairs' && d.room.stairs) p = { x: (d.room.stairs.x + 1) * 16, y: (d.room.stairs.y + 2) * 16 + 12 };
    else if (via === 'pit') p = { x: ((d.room.w || RW) >> 1) * 16, y: (d.room.Y ? d.room.Y(20) : 20) * 16 };
    else if (via === 'start') p = { x: ((d.room.w || RW) >> 1) * 16, y: ((d.room.h || RH) - 4) * 16 + 12 };
    else p = entryPoint(OPP[via], d.room);
    Object.assign(hero, { x: p.x, y: p.y, path: null, attackId: null, slide: null });
    if (d.room.type === 'vault' && !st.chests.includes(id)) { floatText(hero.x, hero.y - 40, 'The Royal Vault!', '#ffe070'); confetti(hero.x, hero.y - 30, 20); } // [R3-15] you know you made it
    if (d.sealed && d.room.type === 'wave') { say('The doors slam shut!'); spawnWave(); }
    else if (d.room.foes && !d.run && !d.sv) { spawnFoes(); d.foesUp = true; }
    if (d.sealed && d.room.type === 'sub') {
      const bw = d.room.bossWorld || dg.world; // a rush room fights another world's boss at that world's strength
      const bdef = (WORLDS[bw] || W).bosses[d.room.boss]; d.boss = spawnBoss(ents, bdef, bw, data.tier, 20 * 16, (bdef.artScale > 1 ? CONFIG.BOSS.BIG_MIN_Y : 12) * 16); say(d.boss.name + '!');
      if (d.run) { const cap = Math.round(bossHits(d.boss.bossDef.kind, 'adventurer') * CONFIG.RUSH.HITS_CAP); if (d.boss.targetHits > cap) { const k = cap / d.boss.targetHits; d.boss.targetHits = cap; d.boss.maxHp = d.boss.hp = Math.round(d.boss.hp * k); } } // [S62] rush fights stay brisk on Legend
      if (d.run) d.run.started = true;
      const cp = st.formCheckpoint || (st.phase2Checkpoint ? 2 : 0);
      if (cp > 1 && !d.run) { jumpToForm(d.boss, cp); say('Back where you left off!'); } // [D46][D47] phase checkpoint
    }
    save.auto('area');
  };

  // ---- [S53] rush runs: one revive (no math-revive), heal + AP refill + breather between bosses, timer, results ----
  d.run = dg.rush ? createRun(dg.rush, dg.count) : null;
  // ---- [S54] survival: endless waves from every world's roster; one revive; record = waves beaten ----
  d.sv = dg.survival ? createSurvival() : null;
  if (d.run || d.sv) { data.hearts = data.maxHearts; data.ap = Math.max(data.ap, apCapOf()); } // [S61] every run starts fresh (full hearts + AP)
  const roster = d.sv ? survivalRoster(WORLDS) : null;
  d.svDefs = (n, rng) => waveDefs(roster, n, data.tier, rng); // tests: the defs of wave n (injectable rng)
  const survivalWave = () => {
    const sv = d.sv; sv.wave++;
    const defs = waveDefs(roster, sv.wave, data.tier);
    defs.forEach((e, i) => { const a = (i / defs.length) * Math.PI * 2; spawn(ents, { ...e, x: 20 * 16 + Math.cos(a) * 180, y: 15 * 16 + Math.sin(a) * 130, log: [] }); });
    say('Wave ' + sv.wave + '!');
  };
  const survivalFell = () => {
    if (survivalDeath(d.sv) === 'revive') { data.hearts = CONFIG.LIVES.REVIVE_HEARTS; hero.iframes = CONFIG.LIVES.REVIVE_IFRAMES; say('Your one revive! Careful now.'); return; }
    for (const e of ents.list) if (e.kind === 'enemy') e.alive = false;
    const rec = save.store && save.slot ? save.store.loadRecords(save.slot) : { bestWaves: 0 };
    const res = recordWaves(d.sv, rec);
    if (save.store && save.slot) save.store.writeRecords(save.slot, rec);
    save.auto('survival');
    scenes.push(createSurvivalResults(view, res, () => { scenes.pop(); if (opts.onExit) opts.onExit(); }));
  };
  const rushEnd = () => {
    const rec = save.store && save.slot ? save.store.loadRecords(save.slot) : { trophies: [], bestRushTime: null };
    const res = finishRun(d.run, rec);
    if (save.store && save.slot) save.store.writeRecords(save.slot, rec);
    save.auto('rush');
    scenes.push(createRushResults(view, d.run.kind, { won: d.run.won, time: d.run.time, bosses: d.run.i, count: d.run.count, ...res }, () => { scenes.pop(); if (opts.onExit) opts.onExit(); }));
  };
  const rushFell = () => {
    if (rushDeath(d.run) === 'revive') { data.hearts = CONFIG.LIVES.REVIVE_HEARTS; hero.iframes = CONFIG.LIVES.REVIVE_IFRAMES; say('Your one revive! Careful now.'); return; }
    d.boss = null; rushEnd();
  };
  // [S61] Pause → Leave Run: a Rush ends as lost (results, no trophy), Survival ends with the waves beaten so far
  d.leaveRun = dg.rush || dg.survival ? () => {
    if (scenes.top() && scenes.top().name === 'pause') scenes.pop();
    if (d.run && !d.run.over) { d.run.over = true; d.boss = null; rushEnd(); } else if (d.sv && !d.sv.over) { d.sv.revives = 0; survivalFell(); }
  } : null;
  const rushBossDown = () => {
    st.subBoss = true; d.sealed = false; d.boss = null;
    confetti(hero.x, hero.y - 20, 30);
    if (rushKill(d.run, data, apCapOf())) { say('Rush cleared!'); rushEnd(); } else say('+' + CONFIG.RUSH.HEAL_HEARTS + ' hearts! Next boss in ' + CONFIG.RUSH.BREATHER + '…');
  };
  d.update = (dt) => {
    d.tapUse = false; // [DUNGEON-LIFE D] set for one frame by a tap-to-open
    if (!d.artPainted && d.map) { const art = dungeonArtPainter(dg.world, dg.theme, () => d.map); if (art) { d.artPainted = true; d.map.prerender(art, 2); } }
    updateHud(hud, data, dt);
    updateFx(dt);
    if (d.msgT > 0) d.msgT -= dt;
    if (d.bumpT > 0) d.bumpT -= dt;
    if (pressed('question')) { openQuestion(); return; }
    if (d.sv && !d.sv.over && !ents.list.some((e) => e.alive && e.kind === 'enemy') && (d.sv.gap -= dt) <= 0) { d.sv.gap = CONFIG.SURVIVAL.GAP; survivalWave(); }
    if (d.run && !d.run.over) {
      if (d.run.started && d.run.breather <= 0) d.run.time += dt;
      if (d.run.breather > 0 && (d.run.breather -= dt) <= 0) { st.subBoss = false; d.enterRoom('r' + (d.run.i + 1), 'start'); }
    }
    if (pressed('map')) { scenes.push(createDungeonMap(view, d, () => scenes.pop())); return; } // [D40]
    if (pressed('pause') && opts.pause) { opts.pause(!!(d.sealed && d.boss), d.leaveRun); return; } // [D38] boss fights: Resume/Quit only
    if (input.pointer.tapped) { // touch: HUD buttons, tap an enemy to attack, else tap-to-move
      const b = hudHit(view.w, input.pointer.x, input.pointer.y);
      if (b === 'q') { openQuestion(); return; }
      if (b === 'map') { scenes.push(createDungeonMap(view, d, () => scenes.pop())); return; }
      if (b === 'pause' && opts.pause) { opts.pause(!!(d.sealed && d.boss), d.leaveRun); return; }
      if (b === 'pill') { if (data.statPoints > 0) scenes.push(createStatPicker(view, data, () => scenes.pop())); return; }
      if (b === 'save') { floatText(hero.x, hero.y - 34, save.auto('manual') ? 'Saved!' : 'Could not save', '#80ff90'); return; } // [R3-8] confirm over the hero's head
      if (b && b.startsWith('slot')) kit.select(Number(b[4]));
      else if (!b) {
        const w = cam.toWorld(input.pointer.x, input.pointer.y);
        const bt = d.buddies && freeBuddies(d.buddies).length ? buddyTargetAt({ ents, inter: d.inter }, w.x, w.y) : null; // [W6] tap → send a Sproutling
        if (bt && sendBuddy(d.buddies, hero, bt)) return;
        const blk = d.inter && d.inter.list.find((o) => o.type === 'block' && Math.abs(o.tx * 16 + 8 - w.x) <= 10 && Math.abs(o.ty * 16 + 8 - w.y) <= 10);
        { const [ccx, ccy] = roomSpots(d.room).chest, tile = d.map.inside(ccx, ccy) ? d.map.ground[d.map.idx(ccx, ccy)] : -1; // [DUNGEON-LIFE D] tap a chest / pedestal = walk up and open it
          if ((tile === DT.CHEST || tile === DT.MEDAL) && Math.hypot(ccx * 16 + 8 - w.x, ccy * 16 + 8 - w.y) < 16) { const stand = { x: ccx * 16 + 8, y: (ccy + 1) * 16 + 12 }; d.useOnArrive = { chest: true, t: CONFIG.PUZZLE_HELP.USE_TIMEOUT_S, stand }; setTapTarget(hero, d.map, stand.x, stand.y); return; } }
        if (blk) { tapPush(blk, w.x, w.y); return; } // [PUSH-BLOCKS] tap a block = walk to its side and push it one tile
        const hitObj = d.inter && d.inter.list.find((o) => o.type !== 'block' && TYPES[o.type] && TYPES[o.type].react && TYPES[o.type].react.hit && TYPES[o.type].solid(o) && Math.hypot(o.tx * 16 + 8 - w.x, o.ty * 16 + 8 - w.y) < 14);
        if (hitObj) { tapHit(hitObj); return; } // [DUNGEON-LIFE D] tap a switch / lever / valve = walk up and hit it
        const gate = d.inter && d.inter.list.find((o) => TOOL_GATES.includes(o.type) && !gateOpen(o) && Math.hypot(d.inter.center(o).x - w.x, d.inter.center(o).y - w.y) < 18);
        const tgt = d.inter && findTapTarget(d.inter, w.x, w.y); // tap a torch / switch: fire the ammo that works on it
        const c = tgt ? chooseAmmo(data, hero.id, tgt) : null;
        if (tgt && c && c.ammo) { // [DUNGEON-LIFE C] fire it, and show that ammo on the slot-2 button
          const t = d.inter.center(tgt), i = kit.ammoList().indexOf(c.ammo); if (i >= 0) { kit.slot = 2; kit.ammoIdx = i; }
          d.fire(c.ammo, t.x - hero.x, t.y - (hero.y - 10)); return;
        }
        if (gate || (tgt && c && c.need)) { // a gate you open with a tool (or still can't): walk up and use it, or say what's missing
          const o = gate || tgt;
          if (canOpen(data, hero.id, o)) { d.useOnArrive = { o, t: CONFIG.PUZZLE_HELP.USE_TIMEOUT_S }; setTapTarget(hero, d.map, o.tx * 16 + 8, (o.ty + 1) * 16 + 12); }
          else showNeed(d.help, o); // the thought bubble right away: which item is missing
          return;
        }
        if (tgt) return;
        const door = doorAt(d.doors(), w.x, w.y);
        if (door) { // [D35] generous door tap: arrow + walk straight through (closed doors: walk up to them and say why)
          d.doorArrow = { x: door.x, y: door.y - 8, t: 2 }; hero.attackId = null;
          if (door.side === 'exit' || doorOpen(dg, st, d.roomId, door.side)) setTapTarget(hero, d.map, door.x, door.y + 4);
          else { setTapTarget(hero, d.map, door.fx, door.fy); d.useOnArrive = { door, t: CONFIG.PUZZLE_HELP.USE_TIMEOUT_S, stand: { x: door.fx, y: door.fy + 8 } }; } // [DUNGEON-LIFE D] arrive → try the door (key, math, message)
        } else if (kit.slot === 3) { d.aim = Math.atan2(w.y - (hero.y - 10), w.x - hero.x); kit.use(); d.aim = null;
        } else if (kit.slot === 2 && AMMO[kit.ammo()] && AMMO[kit.ammo()].kind === 'arc') { kit.fireAt(w.x - hero.x, w.y - (hero.y - 10));
        } else if (kit.slot === 2 && ents.list.some((q) => q.alive && q.kind === 'enemy' && Math.hypot(q.x - w.x, q.y - q.h / 2 - w.y) < CONFIG.COMBAT.TAP_ATTACK_RADIUS)) {
          const e = ents.list.find((q) => q.alive && q.kind === 'enemy' && Math.hypot(q.x - w.x, q.y - q.h / 2 - w.y) < CONFIG.COMBAT.TAP_ATTACK_RADIUS); kit.fireAt(e.x - hero.x, e.y - e.h / 2 - (hero.y - 10));
        } else if (!combat.tapAt(w.x, w.y)) setTapTarget(hero, d.map, w.x, w.y);
      }
    }
    // items in dungeons too: V cycles, B uses (potion heals, bomb is thrown)
    if (pressed('cycle')) d.item = cycleItem(data, d.item);
    if (pressed('item') && d.item === 'potion') usePotion(data);
    if (pressed('item') && ['shrinkCap', 'powerGlove'].includes(d.item)) { if (!useToolsAhead(data, d.inter, d.item)) say('Nothing to use it on here.'); }
    if (pressed('interact') && d.inter) useToolsAhead(data, d.inter);
    if (pressed('item') && d.item === 'gustJar') { const [dx, dy] = DIRV[hero.facing]; fireProj(projs, hero, 'gust', dx, dy); }
    if (pressed('item') && d.item === 'vineHook' && !startHook(data, hero, d.inter, d.map)) say('No hook post ahead!');
    if (pressed('item') && d.item === 'bomb') { if (takeBomb(data)) { const [dx, dy] = DIRV[hero.facing]; const c = coneAim(hero.x, hero.y - 10, dx, dy, ents, d.inter); fireProj(projs, hero, 'bomb', c ? c.dx : dx, c ? c.dy : dy); } else say('No bombs left!'); }
    kit.update();
    if (d.inter) for (const o of d.inter.list) if (o.type === 'block' && o.slide) { // [PUSH-BLOCKS] scrape while sliding; click + sparkle on a plate
      if (!o.slide.snd) { o.slide.snd = true; sfx('scrape'); }
      if ((o.slide.t -= dt) <= 0) { o.slide = null; if (d.inter.allAt(o.tx, o.ty).some((p) => p.type === 'plate')) { sfx('click'); confetti(o.tx * 16 + 8, o.ty * 16 + 4, 14); } }
    }
    updateLife(d.life, { hero, map: d.map, ents, inter: d.inter, world: dg.world, projs }, dt); // [DUNGEON-LIFE]
    updateHelp(d.help, { data, hero, inter: d.inter, map: d.map, room: d.room, solved: !!st.puzzles[d.roomId], doors: d.doors(), keys: st.keys, bigKey: st.bigKey,
      doorLocked: (side) => (d.room.doors[side] && !doorOpen(dg, st, d.roomId, side) ? d.room.doors[side].lock : null) }, dt);
    if (d.help.newTool) { hud.ammoSparkle = 2; d.help.newTool = null; }
    if (d.useOnArrive) { // [DUNGEON-LIFE D] tap-to-use: walked up to a gate object → face it and use the tool
      const U = d.useOnArrive, o = U.o, c = o ? d.inter.center(o) : null, dx = c ? c.x - hero.x : 0, dy = c ? c.y - (hero.y - 8) : 0;
      if (U.chest) { // at the chest: face it and open (same as pressing E)
        if ((U.t -= dt) <= 0) d.useOnArrive = null;
        else if (Math.hypot(hero.x - U.stand.x, hero.y - U.stand.y) < 10 && !(hero.path && hero.path.length)) { hero.facing = 'up'; d.tapUse = true; d.useOnArrive = null; }
      } else if (U.door) { // a closed door: at its front tile, face it and try it
        if ((U.t -= dt) <= 0) d.useOnArrive = null;
        else if (Math.hypot(hero.x - U.stand.x, hero.y - U.stand.y) < 14 && !(hero.path && hero.path.length)) {
          hero.facing = U.door.dir; d.useOnArrive = null;
          const shut = d.map.isSolid(...doorTile(U.door.side)), r = shut ? bumpDoor(U.door.side) : 'open'; // (walking up may already have unlocked it)
          if (r === 'opened' || r === 'open') setTapTarget(hero, d.map, U.door.x, U.door.y + 4); // open → walk on through
        }
      } else if (U.hit) { // a switch / lever: swing once we stand next to it
        if ((U.t -= dt) <= 0) d.useOnArrive = null;
        else if (Math.hypot(hero.x - U.stand.x, hero.y - U.stand.y) < 8 && !(hero.path && hero.path.length)) {
          hero.facing = U.hit[0] ? (U.hit[0] > 0 ? 'right' : 'left') : U.hit[1] > 0 ? 'down' : 'up';
          hero.cd = 0; combat.startSwing(); d.useOnArrive = null;
        }
      } else if (U.push) { // a block: push once we stand on the chosen side
        if ((U.t -= dt) <= 0) d.useOnArrive = null;
        else if (Math.hypot(hero.x - U.stand.x, hero.y - U.stand.y) < 8 && !(hero.path && hero.path.length)) {
          hero.facing = U.push[0] ? (U.push[0] > 0 ? 'right' : 'left') : U.push[1] > 0 ? 'down' : 'up';
          if (!d.inter.push(o, U.push[0], U.push[1])) say('It won\'t budge that way!');
          d.useOnArrive = null;
        }
      } else if ((d.useOnArrive.t -= dt) <= 0 || gateOpen(o)) d.useOnArrive = null;
      else if (Math.hypot(dx, dy) < CONFIG.PUZZLE_HELP.USE_REACH && !(hero.path && hero.path.length)) {
        hero.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        if (o.type === 'hookPoint') startHook(data, hero, d.inter, d.map); else useToolsAhead(data, d.inter);
        d.useOnArrive = null;
      }
    }
    Object.assign(hud, { slot: kit.slot, ammo: kit.ammo(), special: kit.special(), ammoNext: kit.nextAmmo(), specialNext: kit.nextSpecial() });
    if (d.doorArrow && (d.doorArrow.t -= dt) <= 0) d.doorArrow = null;
    magnet(hero, d.doors(), held);
    if (!updateHook(hero, dt)) updateHero(hero, d.map, dt);
    if (d.buddies) updateBuddies(d.buddies, hero, dt, { ents, inter: d.inter, nests: [], hitEnemy: (e) => combat.buddyHit(e) });
    combat.update(dt);
    updateProjectiles(projs, { map: d.map, inter: d.inter, ents, hero, hitEnemy: (e, p) => combat.hitProjectile(e, p), area: (x, y, r) => combat.area(x, y, r, 0, false) }, dt);
    const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
    if (d.inter) {
      d.inter.update(dt);
      if (d.room.puzzle && !d.solvedNow && d.puzzle.solved()) { d.solvedNow = true; rebuild(); confetti(hero.x, hero.y - 20, 30); say('Solved!'); save.auto('puzzle'); }
    }
    // [MONSTERS FIRST] a room with roaming foes is beaten once they are all down: its chest appears (first time only)
    if (d.room.foes && d.room.foes.length && d.room.type !== 'wave' && !d.run && !d.sv && !st.cleared.includes(d.roomId) && d.foesUp && !ents.list.some((e) => e.alive && e.kind === 'enemy')) {
      st.cleared.push(d.roomId);
      if (d.room.chest && !st.chests.includes(d.roomId)) { rebuild(); const S = roomSpots(d.room); confetti(S.chest[0] * 16 + 8, S.chest[1] * 16, 24); sfx('chest'); say('A treasure chest appears!'); }
      save.auto('wave');
    }
    // wave room: next wave / unseal
    if (d.sealed && d.room.type === 'wave' && !ents.list.some((e) => e.alive && e.kind === 'enemy')) {
      if (++d.wave < d.room.waves.length) spawnWave();
      else { d.sealed = false; st.cleared.push(d.roomId); rebuild(); say('The doors open!'); save.auto('wave'); }
    }
    // leaving through an open doorway
    const side = leavingSide(tx, ty, d.room);
    if (side && d.room.doors[side] && doorOpen(dg, st, d.roomId, side) && !d.sealed) { d.enterRoom(d.room.doors[side].to, side); return; }
    if (side === 's' && d.roomId === dg.start && !d.room.doors.s && !d.sealed && !d.left && opts.onExit) { d.left = true; save.auto('area'); opts.onExit(); return; } // back outside
    // walking into a closed door: unlock, ask, or block with a message + nudge back (never freeze)
    const ahead = hero.moving ? doorAhead(d.room, tx, ty, hero.facing) : null;
    if (ahead && d.map.isSolid(...doorTile(ahead)) && d.bumpT <= 0) bumpDoor(ahead);
    // chest (bump or E), stairs, pit, portal
    const onT = d.map.inside(tx, ty) ? d.map.ground[d.map.idx(tx, ty)] : -1;
    if (dg.throne && !dg.vault && st.subBoss && !st.chests.includes(d.roomId) && nearChest() && (hero.moving || pressed('interact') || d.tapUse)) {
      st.chests.push(d.roomId);
      const tool = WORLD_TOOLS[dg.world - 1];
      if (grantTool(data, tool)) say('You got the ' + TOOL_NAMES[tool] + '!');
      confetti(hero.x, hero.y - 20, 40); startItemGet(hero, 0, null, true); rebuild(); save.auto('tool'); // [A8] chest held overhead
      portalLit();
    }
    if (d.room.chest && !st.chests.includes(d.roomId) && nearChest() && (hero.moving || pressed('interact') || d.tapUse)) {
      st.chests.push(d.roomId);
      const it = d.room.chest.item;
      if (it === 'key') { st.keys++; say('A small key!'); } else if (it === 'bigKey') { st.bigKey = true; say('The Big Key!'); }
      else if (it.startsWith('gear:')) { grantGear(data, it.slice(5)); say('New gear!'); }
      else if (it.startsWith('tool:')) { grantTool(data, it.slice(5)); say('You got the ' + (TOOL_NAMES[it.slice(5)] || it.slice(5)) + '!'); }
      else if (it.startsWith('gold:')) { data.gold += Number(it.slice(5)); say('+' + it.slice(5) + ' gold!'); }
      else say('You found ' + it + '!');
      confetti(hero.x, hero.y - 20, d.room.chest.royal ? 60 : 24); startItemGet(hero, 0, null, true); rebuild(); save.auto('chest'); // [A8] chest held overhead
      if (d.room.type === 'vault') { data.hearts = data.maxHearts; sfx('relic'); portalLit(); } // [R3-15] the royal chest: hearts full, the way home lights up
    }
    if (onT === DT.STAIRS && d.room.stairs) { d.enterRoom(d.room.stairs.to, 'stairs'); return; }
    if (onT === DT.PIT && d.room.pit) { floatText(hero.x, hero.y - 30, 'Whoa!', '#ffffff'); d.enterRoom(d.room.pit.to, 'pit'); return; }
    // [D43] the medallion sits on its pedestal (walk into it or E); taking it lights the exit portal
    if (d.room.type === 'relic' && !st.done && nearChest() && (hero.moving || pressed('interact') || d.tapUse)) { // [S55] the relic
      st.done = true; const first = takeRelic(data, dg);
      confetti(hero.x, hero.y - 20, 50); sfx('relic'); say((first ? 'You found the ' : 'The ') + (dg.relicName || 'relic') + '! (' + data.relics.length + '/6)'); rebuild(); save.auto('relic');
      portalLit();
    }
    if (d.room.type === 'treasure' && !st.done && nearChest() && (hero.moving || pressed('interact') || d.tapUse)) {
      st.medallion = true; st.done = true;
      const wd = data.worlds[dg.world - 1];
      if (!wd.medallions.includes(dg.medallion || dg.id)) wd.medallions.push(dg.medallion || dg.id);
      if (!wd.dungeonsCleared.includes(dg.id)) wd.dungeonsCleared.push(dg.id);
      // [S61] a tool from this dungeon's big chest is never missable: skipped the chest? the medallion brings it along
      const skipped = Object.entries(dg.rooms).map(([rid, r]) => r.type === 'bigchest' && r.chest && String(r.chest.item).startsWith('tool:') && !st.chests.includes(rid) && r.chest.item.slice(5)).find((t) => t && !data.tools.includes(t));
      if (skipped) grantTool(data, skipped);
      const gold = treasureReward(data, dg.world); startItemGet(hero, medalIdx()); sfx('relic');
      confetti(hero.x, hero.y - 20); say(skipped ? 'Medallion get! The ' + (TOOL_NAMES[skipped] || skipped) + ' came along too!' : 'You got the ' + (dg.medallion ? dg.medallion[0].toUpperCase() + dg.medallion.slice(1) + ' ' : '') + 'Medallion! Hearts full, +' + gold + ' gold!'); rebuild(); save.auto('medallion');
      portalLit();
    }
    // a lit portal takes the hero back outside, in front of this dungeon's entrance (autosave on the way out)
    if (onT === DT.PORTAL && opts.onExit && !d.left) { d.left = true; sfx('portal'); save.auto('area'); opts.onExit(); return; }
    if (d.boss && d.boss.alive && d.boss.artScale > 1) d.boss.y = Math.max(d.boss.y, (CONFIG.BOSS.BIG_MIN_Y - 2) * 16); // [A5] a big boss keeps his head below the HUD
    cam.zoom = (d.boss && d.boss.alive) || (d.room && d.room.puzzle && !d.room.compact) ? 'fight' : 'world'; // [P-A][A2] boss fights + big puzzle rooms show the whole room; compact rooms are one screen
    cam.follow(hero.x, hero.y - 12, d.map.pxW, d.map.pxH, shake);
  };
  function medalIdx() { const ids = Object.keys((WORLDS[dg.world] || {}).dungeons || {}); return medalIndex(dg.world, Math.max(0, ids.indexOf(dg.id))); }
  function nearChest() { const [cx, cy] = roomSpots(d.room).chest; return Math.hypot(hero.x - (cx + 0.5) * 16, hero.y - (cy + 1) * 16) < 22; }
  function portalLit() { const [px, py] = roomSpots(d.room).portal; sfx('portal'); confetti((px + 0.5) * 16, (py + 0.5) * 16, 30); floatText((px + 0.5) * 16, (py - 1) * 16, 'The portal is open!', '#e0d0ff'); d.portalT = (d.portalT || 0) + 1; }
  function doorTile(side) { const w = d.room.w || RW, h = d.room.h || RH, cx = w >> 1, cy = h >> 1; return { n: [cx - 1, 3], s: [cx - 1, h - 2], w: [1, cy - 1], e: [w - 2, cy - 1] }[side]; }

  d.render = (ctx) => {
    heroArt.v2 = heroArt.worlds.includes(dg.world); // [P-C] v2 hero art in the true-pixel worlds
    layoutBegin();
    cam.zoom = (d.boss && d.boss.alive) || (d.room && d.room.puzzle && !d.room.compact) ? 'fight' : 'world'; // [P-A][A2] boss fights + big puzzle rooms show the whole room; compact rooms are one screen
    cam.follow(hero.x, hero.y - 12, d.map.pxW, d.map.pxH, shake);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, view.w, view.h);
    cam.begin(ctx); // [P-A] world layer at WORLD_ZOOM
    d.map.draw(ctx, cam);
    if (d.room.arena === 'pillars') { // [A5] arena pillars in the user's w<n>-dungeon mossy stone (the frame's inner crop over the 2x2 block)
      const sh = 'w' + dg.world + '-dungeon';
      if (imgReady(sh)) { const A = ATLAS[sh], f = A.meta.frames[Object.keys(A.meta.frames)[8]], r = f.src, k = f.w / r.w, b = f.bb || [0, 0, f.w, f.h];
        for (const [px, py] of [[8, 7], [30, 7], [8, 21], [30, 21]]) ctx.drawImage(A.img, r.x + b[0] / k, r.y + b[1] / k, (b[2] - b[0]) / k, (b[3] - b[1]) / k, Math.round(px * 16 - cam.x), Math.round(py * 16 - 4 - cam.y), 32, 36); }
    }
    if (d.room.type === 'treasure' && drawTreasureFloor(ctx, cam)) drawTreasureRoom(ctx, cam, st.done, medalIdx()); // [D53]
    if (d.room.type === 'vault') { drawTreasureFloor(ctx, cam); drawVaultRoom(ctx, cam, st.chests.includes(d.roomId), performance.now() / 1000, dg.world); } // [R3-15]
    for (const side of ['n', 's', 'w', 'e']) {
      const door = d.room.doors[side];
      if (!door) continue;
      if (d.sealed) drawDoor(ctx, side, 'sealed', cam, dg.world, d.room);
      else if (!doorOpen(dg, st, d.roomId, side)) drawDoor(ctx, side, door.lock, cam, dg.world, d.room);
      else drawDoor(ctx, side, 'open', cam, dg.world, d.room); // [R1-21] open doorways stand upright too
      if (door.royal) drawRoyalDoor(ctx, side, !d.sealed && doorOpen(dg, st, d.roomId, side), cam, d.room, performance.now() / 1000, dg.world); // [R3-15] the vault's doors
    }
    if (d.roomId === dg.start && !d.room.doors.s) drawDoor(ctx, 's', d.sealed ? 'sealed' : 'exit', cam, dg.world, d.room); // [R1-20] the clear way out
    if (d.portalRoom !== d.roomId) { d.portalRoom = d.roomId; d.portalSpot = null; for (let ty = 0; ty < d.map.h; ty++) for (let tx = 0; tx < d.map.w; tx++) { const g = d.map.ground[d.map.idx(tx, ty)]; if (g === DT.PORTAL || g === DT.PORTAL_OFF) d.portalSpot = [tx, ty]; } }
    if (d.portalSpot) drawPortal(ctx, d.portalSpot, d.map.ground[d.map.idx(d.portalSpot[0], d.portalSpot[1])] === DT.PORTAL, cam, performance.now() / 1000);
    const tnow = performance.now() / 1000, blocks = d.inter ? d.inter.byType('block') : [];
    if (d.inter) for (const o of d.inter.list) {
      if (o.type === 'plate' && blocks.length) { // [PUSH-BLOCKS] plates glow; a free one pulses so you see where a block should go
        const busy = blocks.some((b) => b.tx === o.tx && b.ty === o.ty), a = busy ? 0.35 : 0.25 + 0.2 * Math.sin(tnow * 4);
        ctx.fillStyle = busy ? 'rgba(255,230,120,' + a + ')' : 'rgba(120,220,255,' + a.toFixed(2) + ')'; ctx.fillRect(o.tx * 16 - cam.x - 2, o.ty * 16 - cam.y - 2, 20, 20);
        if (!busy) { ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(o.tx * 16 - cam.x + 0.5, o.ty * 16 - cam.y + 0.5, 15, 15); ctx.setLineDash([]); }
      }
      const sl = o.slide, sk = sl ? sl.t / CONFIG.PUZZLE_HELP.SLIDE_S : 0, ox = sl ? -sl.dx * 16 * sk : 0, oy = sl ? -sl.dy * 16 * sk : 0; // [PUSH-BLOCKS] smooth slide
      if (o.type === 'resetSwitch') { // [PUSH-BLOCKS] a clear rune with a circular arrow (it puts the blocks back)
        const x = o.tx * 16 - cam.x, y = o.ty * 16 - cam.y;
        const done = !!st.puzzles[d.roomId]; // goes dark once the puzzle is solved
        if (PUZZLE_B[dg.world] && drawFoot(ctx, 'w' + dg.world + '-puzzle-b', PUZZLE_B[dg.world][done ? 1 : 0], x + 8, y + 16, 16, 16)) continue; // [R2-19] #328 rune switch, dark once solved
        codeArt('reset-switch'); // [R2-19a] audit: code-drawn
        ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = done ? '#3a3a44' : '#8c8c98'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = done ? '#2a2a32' : '#b4b4c0'; ctx.beginPath(); ctx.arc(x + 7, y + 7, 5, 0, Math.PI * 2); ctx.fill(); // stone top
        if (done) ctx.globalAlpha = 0.35; drawAttackGlyph(ctx, 'spin', x + 8, y + 8, 12); ctx.globalAlpha = 1;
        continue;
      }
      if (drawDungeonPropArt(ctx, o, o.tx * 16 - cam.x + ox, o.ty * 16 - cam.y + oy, dg.world, d.inter)) { // [A5] user art first; the shrine stones keep their number
        if (o.type === 'orderSwitch') { ctx.font = font(10); ctx.textAlign = 'center'; drawOutlined(ctx, String(o.n), o.tx * 16 + 8 - cam.x, o.ty * 16 - 6 - cam.y, o.on ? '#ffe070' : '#ffffff', '#10101a', 1); }
        continue;
      }
      codeArt('prop:' + o.type); // [R2-19a] audit: no prop art drew
      if (o.type === 'plate' || o.type === 'lily') { ctx.fillStyle = o.type === 'lily' ? '#4aa04a' : '#10101a'; ctx.fillRect(o.tx * 16 - cam.x + 1, o.ty * 16 - cam.y + 1, 14, 14); if (o.type === 'plate') { ctx.fillStyle = o.down ? '#606060' : '#a0a0a0'; ctx.fillRect(o.tx * 16 - cam.x + 2, o.ty * 16 - cam.y + 2, 12, 12); } continue; }
      if (o.type === 'orderSwitch' || o.type === 'resetSwitch') {
        const x = o.tx * 16 - cam.x, y = o.ty * 16 - cam.y;
        ctx.fillStyle = '#10101a'; ctx.fillRect(x + 1, y, 14, 16); ctx.fillStyle = o.type === 'resetSwitch' ? '#c08030' : o.on ? '#60e0ff' : '#3a6aa0'; ctx.fillRect(x + 2, y + 1, 12, 14);
        ctx.font = font(10); ctx.textAlign = 'center'; drawOutlined(ctx, o.type === 'resetSwitch' ? 'R' : String(o.n), x + 8, y + 9, '#ffffff', '#10101a', 1);
        continue;
      }
      drawProp(ctx, o, o.tx * 16 - cam.x + ox, o.ty * 16 - cam.y + oy, d.inter);
    }
    for (const b of blocks) { // [PUSH-BLOCKS] near a block: faint arrows on the sides it can move to
      if (b.slide || Math.hypot(b.tx * 16 + 8 - hero.x, b.ty * 16 + 8 - (hero.y - 8)) > CONFIG.PUZZLE_HELP.BLOCK_NEAR_PX) continue;
      const a = 0.45 + 0.25 * Math.sin(tnow * 5);
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        if (d.map.isSolid(b.tx + dx, b.ty + dy) || d.map.isSolid(b.tx - dx, b.ty - dy)) continue; // needs room ahead and a spot to stand behind
        const x = b.tx * 16 + 8 + dx * 13 - cam.x, y = b.ty * 16 + 8 + dy * 13 - cam.y;
        ctx.fillStyle = 'rgba(255,240,150,' + a.toFixed(2) + ')'; ctx.beginPath();
        ctx.moveTo(x + dx * 4, y + dy * 4); ctx.lineTo(x - dy * 4 - dx * 2, y + dx * 4 - dy * 2); ctx.lineTo(x + dy * 4 - dx * 2, y - dx * 4 - dy * 2); ctx.closePath(); ctx.fill();
      }
    }
    drawLife(ctx, d.life, cam); // [DUNGEON-LIFE] decor, light pools, drips, mouse, fireflies
    drawHelpWorld(ctx, d.help, d.inter, cam, performance.now() / 1000); // [DUNGEON-LIFE C] idle helper glow
    if (d.room.puzzle && d.room.puzzle.order && !st.puzzles[d.roomId]) { // [DUNGEON-LIFE C] the order clue on a stone tablet: dot groups with arrows (2 → 1 → 3)
      const ord = d.room.puzzle.order, tw = ord.length * 22 + 6, tx = 3 * 16 - cam.x, ty = 4 * 16 + 2 - cam.y;
      if (PUZZLE_B[dg.world] && imgReady('w' + dg.world + '-puzzle-b')) drawRect(ctx, 'w' + dg.world + '-puzzle-b', PUZZLE_B[dg.world][2], tx - 6, ty - 6, tw + 12, 32); // [R2-19] #328 the stone tablet; the clue is drawn on it
      else { codeArt('order-tablet'); ctx.fillStyle = '#10101a'; ctx.fillRect(tx - 1, ty - 1, tw + 2, 22); ctx.fillStyle = '#8a8a7a'; ctx.fillRect(tx, ty, tw, 20); ctx.fillStyle = '#a8a898'; ctx.fillRect(tx, ty, tw, 2); }
      ord.forEach((n, i) => {
        const gx = tx + 6 + i * 22;
        for (let k = 0; k < n; k++) { ctx.fillStyle = '#ffe070'; ctx.fillRect(gx + (k % 2) * 5, ty + 5 + Math.floor(k / 2) * 5, 3, 3); }
        if (i < ord.length - 1) { ctx.fillStyle = '#3a3a30'; ctx.beginPath(); ctx.moveTo(gx + 13, ty + 7); ctx.lineTo(gx + 17, ty + 10); ctx.lineTo(gx + 13, ty + 13); ctx.fill(); }
      });
    }
    if (d.inter) for (let i = 0; i < d.inter.beam.length; i += 2) { ctx.fillStyle = 'rgba(255,250,160,0.75)'; ctx.fillRect(d.inter.beam[i] * 16 - cam.x + 6, d.inter.beam[i + 1] * 16 - cam.y + 6, 4, 4); } // light beams
    for (const e of ents.list) {
      if (!e.alive) continue;
      if (e.kind === 'hazard' || e.kind === 'eproj') drawHazard(ctx, e, cam.x, cam.y, dg.world);
      else if (e.boss) drawBoss(ctx, e, e.x - cam.x, e.y - cam.y);
      else if (e.kind === 'enemy') drawEnemy(ctx, e, e.x - cam.x, e.y - cam.y);
      else if (e.kind === 'pickup') drawPickup(ctx, e, cam); // [R1-2] dungeon drops were invisible
    }
    projs.forEach((p) => {
      if (drawShot(ctx, p, p.x - cam.x, p.y - cam.y)) return; // [HERO-SHOTS] user art; the code shape below is the fallback
      codeArt('hero-shot:' + (p.ammo || p.kind || '?')); ctx.save(); ctx.translate(Math.round(p.x - cam.x), Math.round(p.y - cam.y)); ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = '#10101a'; ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = p.tags.includes('FIRE') ? '#ff7020' : p.tags.includes('ICE') ? '#a0e8ff' : '#e0e0e0'; ctx.fillRect(-4, -2, 8, 4); ctx.fillRect(3, -1, 3, 2);
      ctx.restore();
    });
    if (d.buddies) { ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y)); drawBuddies(ctx, d.buddies); ctx.restore(); }
    drawHero(ctx, hero, cam);
    drawItemGet(ctx, hero, cam, 1 / 60);
    drawSpecialFx(ctx, hero, cam); // [HERO-SHOTS]
    drawFx(ctx, cam.x, cam.y);
    drawDoorArrow(ctx, d.doorArrow, cam.x, cam.y);
    if (d.boss && d.boss.darkT > 0) { // [W7] nightfall: darkness with a halo round the hero; telegraph glows drawn on top
      const hx = hero.x - cam.x, hy = hero.y - 10 - cam.y, g = ctx.createRadialGradient(hx, hy, 18, hx, hy, 70);
      g.addColorStop(0, 'rgba(4,4,16,0)'); g.addColorStop(1, 'rgba(4,4,16,' + (0.88 * Math.min(1, d.boss.darkT * 2)) + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
      for (const e of ents.list) if (e.alive && (e.kind === 'hazard' || e.kind === 'eproj')) drawHazard(ctx, e, cam.x, cam.y, dg.world);
    }
    cam.end(ctx);
    if (d.boss && d.boss.grayT > 0) desaturate(ctx, view.w, view.h, Math.min(1, d.boss.grayT * 2)); // [S39] Vex's grayscale wave
    drawHud(ctx, hud, data, view, { ap: data.ap, apCap: apCapOf(), band: currentBand(), map: true, attack: scenes.top() === d && !(d.bossLine && d.bossLine.t > 0) }); // [HUD-ATTACK] hidden under dialogs, math and menus
    { const hs = cam.toScreen(hero.x, hero.y - 26); drawHelpScreen(ctx, d.help, view, hs, dg.world); } // [DUNGEON-LIFE C] banner, bubbles, item card
    // per-floor mini-map (under the HUD, right side)
    const fl = d.room.floor, mx = view.w - 70, my = CONFIG.UI.HUD_RESERVED_H + 6; // [R3-5] under the (taller) HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(mx - 4, my - 4, 64, 44);
    for (const [id, r] of Object.entries(dg.rooms)) {
      if (r.floor !== fl) continue;
      ctx.fillStyle = id === d.roomId ? '#ffe070' : st.visited.includes(id) ? '#a0a0c0' : '#3a3a4a';
      ctx.fillRect(mx + r.gx * 14, my + r.gy * 10, 12, 8);
    }
    ctx.font = font(10); ctx.textAlign = 'left'; drawOutlined(ctx, fl + '  🔑' + st.keys + (st.bigKey ? ' ★' : ''), mx - 2, my + 34, '#ffffff', '#10101a', 1);
    if (d.boss && d.boss.alive) drawBossBar(ctx, d.boss, view.w, font, drawOutlined);
    if (d.sv) { ctx.font = font(12); ctx.textAlign = 'left'; drawOutlined(ctx, 'SURVIVAL  wave ' + d.sv.wave + (d.sv.revives ? '  ♥ revive left' : ''), 12, view.h - 14, '#a0e0ff'); }
    if (d.run) { ctx.font = font(12); ctx.textAlign = 'left'; drawOutlined(ctx, (d.run.kind === 'boss' ? 'BOSS RUSH ' + fmtTime(d.run.time) + '  ' : 'SUB-BOSS RUSH  ') + (d.run.i + (d.run.over ? 0 : 1)) + '/' + d.run.count + (d.run.revives ? '  ♥ revive left' : ''), 12, view.h - 14, '#ffe070');
      if (d.run.breather > 0) { ctx.font = font(22); ctx.textAlign = 'center'; drawOutlined(ctx, 'Next boss in ' + Math.ceil(d.run.breather), view.w / 2, 150, '#ffffff'); } }
    if (d.boss && d.boss.alive && d.boss.nova) { // [D46] Supernova Countdown: the clock + stagger stars
      const n = d.boss.nova; ctx.font = font(20); ctx.textAlign = 'center';
      drawOutlined(ctx, 'SUPERNOVA ' + Math.ceil(n.t), view.w / 2, 104, n.t < 10 ? '#ff6040' : '#ffe070');
      ctx.font = font(16); drawOutlined(ctx, '★'.repeat(n.staggers) + '☆'.repeat(Math.max(0, CONFIG.BOSS.NOVA_STAGGERS - n.staggers)), view.w / 2, 126, '#ffe070');
    }
    if (d.bossLine && d.bossLine.t > 0) { // [D47] a boss speaks between phases (1–2 short boxes)
      d.bossLine.t -= 1 / 60; const bx = 40, by = view.h - 110, bw = view.w - 80;
      ctx.fillStyle = 'rgba(10,10,30,0.88)'; ctx.fillRect(bx, by, bw, 70); ctx.strokeStyle = '#e0d0ff'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, 69);
      ctx.font = font(14); ctx.textAlign = 'left'; drawOutlined(ctx, d.bossLine.name + ':', bx + 12, by + 20, '#ffe070');
      d.bossLine.lines.slice(0, 2).forEach((l, i) => drawOutlined(ctx, l, bx + 12, by + 42 + i * 18, '#ffffff'));
    }
    if (d.boss && d.boss.alive && d.boss.ai.state === 'transform') { ctx.font = font(14); ctx.textAlign = 'center'; drawOutlined(ctx, 'The Fallen Star rises…', view.w / 2, 150, '#e0e8ff'); }
    if (d.msgT > 0) { ctx.font = font(16); ctx.textAlign = 'center'; drawOutlined(ctx, d.msg, view.w / 2, 90, '#ffe070'); }
  };
  if (st.lastRoom && dg.rooms[st.lastRoom] && opts.resume) d.enterRoom(st.lastRoom, 'start'); else d.enterRoom(dg.start, 'start');
  return d;
}
