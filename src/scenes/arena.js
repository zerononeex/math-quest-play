// Combat arena (?test=1&scene=arena): open field + enemies; exercises combat, drops, revive flow. Base for overworld rooms.
import { CONFIG } from '../config.js';
import { sfx } from '../engine/audio.js';
import { TileMap } from '../engine/tilemap.js';
import { Camera } from '../engine/camera.js';
import { input, pressed, held } from '../engine/input.js';
import { scenes } from '../engine/scenes.js';
import { layoutBegin } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { createHero, updateHero, drawHero, setTapTarget, heroArt } from '../game/hero.js';
import { createEntities, spawn } from '../game/entities.js';
import { createCombat } from '../game/combat.js';
import { bindSession, session, currentBand, apCapOf } from '../game/ap.js';
import { createMathPopup } from '../game/math-popup.js';
import { createHud, updateHud, drawHud, hudHit } from '../game/hud.js';
import { updateFx, drawFx, shake } from '../game/fx.js';
import { enemyHp } from '../game/stats.js';
import { enemyDef, TEST_ENEMIES } from '../game/enemies.js';
import { drawEnemy, drawHazard } from '../art/fallback/enemies.js';
import { createMechanics } from '../game/mechanics.js';
import { buildRelicDungeon } from '../game/relics.js';
import { claimSecret } from '../game/secrets.js';
import { questSpots } from '../game/questgoals.js';
import { createBuddies, sendBuddy, buddyTargetAt, updateBuddies, buddyWeights, drawBuddies, drawNest, freeBuddies } from '../game/buddies.js';
import { createProjectiles, fire, updateProjectiles, ammoUnlocked, AMMO } from '../game/projectiles.js';
import { findTapTarget, chooseAmmo, coneAim } from '../game/autoaim.js';
import { doorAt, magnet, drawDoorArrow } from '../game/doortap.js';
import { spendAp } from '../game/ap.js';
import { floatText } from '../game/fx.js';
import { drawProp, drawGateArt } from '../art/fallback/props.js';
import { drawWaterGlints } from '../game/owpaint.js';
import { ATLAS, imgReady, drawSprite, codeArt } from '../engine/atlas.js';
import { buildOverworld, tilePainter, worldArtReady, drawLandmarks, drawBigTrees, drawEntrances, liquidAt, regionAt, TILE, CELL } from '../game/overworld.js';
import { WORLDS } from '../data/worlds.js';
import { placeTown, spawnNpcs, spawnVillagers, spawnCastleFolk, spawnPilot, updateNpc, createDialogue } from '../game/towns.js';
import { createInterior } from './interior.js';
import { createDungeon } from './dungeon.js';
import { bossArenaOpen, ensureChestTools } from '../game/world-progress.js';
import { createMap, markSeen } from './map.js';
import { createPause } from './pause.js';
import { drawNpc } from '../art/fallback/npcs.js';
import { TEST_BOSS, spawnBoss } from '../game/bosses.js';
import { drawBoss, drawBossBar } from '../art/fallback/bosses.js';
import { beatBoss } from '../game/progression.js';
import { drawBuilding, doorArtX } from '../art/fallback/buildings.js';
import { createAmbient, updateAmbient, drawAmbient } from '../game/ambient.js';
import { startItemGet, drawItemGet } from '../game/treasure.js';
import { createPadKit, drawPadKitFloor, drawPadKit } from '../game/padkit.js';
import { createBushes, cutBushesIn, cutBushAt, updateBushes, bushAt } from '../game/bushes.js';
import { drawShot, drawSpecialFx } from '../game/shotfx.js';
import { treeAnchors, drawTrees2x } from '../game/trees2x.js';
import { createHelp, updateHelp, drawHelpScreen } from '../game/puzzlehelp.js';
import { drawPickup } from '../game/drops.js';
import { drawCastleFloor, drawCastle } from '../game/castle.js';
import { createTutorial, updateTutorial, tutEvent, drawDummy, drawTutorial, skipRect, finish as finishTutorial } from '../game/tutorial.js';
import { createMaze, mazeKeeper, mazeLines, startMaze, updateMaze, drawMazeDecor, drawMazeHud } from '../game/maze.js';
import { confetti } from '../game/fx.js';
import { save } from '../engine/save.js';
import { createStatPicker } from './statpicker.js';
import { createShip } from './ship.js';
import { BOARD } from '../game/ship.js';
import { drawRocket } from '../art/fallback/ship.js';
import { gainXp, refreshHearts } from '../game/progression.js';
import { startQuest, questState, questMark } from '../game/quests.js';
import { createKit, drawWeapon, weaponTier } from '../game/kits/common.js';
import { spinRadius } from '../game/kits/rowan.js';
import { MILO_SPECIALS } from '../game/kits/milo.js';
import { inkGatling } from '../game/kits/wren.js';
import { pressed as keyPressed } from '../engine/input.js';
import { createEquipment } from './equipment.js';
import { usePotion, cycleItem, takeBomb, startHook, updateHook, useToolsAhead } from '../game/items.js';

export function createArena(view, data, opts = {}) {
  bindSession(data);
  refreshHearts(data); // max hearts always follow progress (levels, bosses, gear) — e.g. after loading a save
  ensureChestTools(data, WORLDS); // [S61] a skipped big-chest tool is never missing for good
  session.revivesUsed = 0;
  let map, START, ow = null;
  if (opts.world) {
    data.location = { ...data.location, world: opts.world }; // you are in the world this overworld shows
    ow = buildOverworld(WORLDS[opts.world]);
    if (ow.world.town) ow.townInfo = placeTown(ow, ow.world.town);
    if (ow.world.lush) ow.ambient = createAmbient(ow); // [A4f] critters in their places (cosmetic)
    if (ow.world.lush) ow.padKit = createPadKit(ow); // [A8b] the landing-pad kit around the pads
    map = ow.map;
    map.prerender(tilePainter(ow), ow.paintScale || 1);
    START = { x: ow.feat.pad.tx * 16 + 8, y: ow.feat.pad.ty * 16 + 12 };
    // The Wayfarer stands on the pad: body tiles solid, its door tile boards the ship (walk in or tap).
    ow.rocket = { tx: ow.feat.pad.tx, ty: ow.feat.pad.ty + BOARD.DOOR_DY };
    for (let y = ow.rocket.ty - 3; y < ow.rocket.ty; y++) for (let x = ow.rocket.tx - 1; x <= ow.rocket.tx + 1; x++) if (map.inside(x, y)) map.solid[map.idx(x, y)] = 1;
  } else {
    map = new TileMap(44, 30);
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const edge = x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1;
      map.set(x, y, edge ? 1 : 0, edge ? 1 : 0);
    }
    map.prerender((g, v, px, py, tx, ty) => { g.fillStyle = v ? '#4a3a2a' : (tx + ty) % 2 ? '#4a9a4a' : '#52a852'; g.fillRect(px, py, 16, 16); });
    START = { x: 22 * 16, y: 16 * 16 };
  }
  // [D42] Continue resumes where the hero saved: the overworld spot (or, from a dungeon, its entrance room); a save made on the
  // ship resumes just outside the rocket — never on the ship or the pad itself.
  const L = data.location || {};
  let spawnAt = START;
  if (ow && (L.area === 'overworld' || L.area === 'dungeon') && L.x > 0 && L.y > 0 && map.boxFree(L.x - 5, L.y - 7, L.x + 5, L.y - 1)) spawnAt = { x: L.x, y: L.y };
  else if (ow && L.area === 'ship') spawnAt = { x: START.x, y: START.y + 3 * 16 };
  let resumeDungeon = ow && L.area === 'dungeon' && L.dungeon ? Object.values(ow.world.dungeons || {}).find((q) => q.id === L.dungeon) : null;
  const hero = createHero(data.hero, spawnAt.x, spawnAt.y);
  const ents = createEntities();
  const cam = new Camera(view, ow ? 'world' : 'fight'); // [P-A] overworld zoomed; fight arenas show the whole arena
  const hud = createHud();
  const a = { name: ow ? 'overworld' : 'arena', map, hero, ents, cam, data, notice: null, deaths: 0, ow, region: null };
  const openQuestion = () => { if (scenes.top() === a) scenes.push(createMathPopup(view, { onClose: () => { scenes.pop(); if (a.tut) tutEvent(a.tut, data, 'q'); } })); };
  const onDeath = () => {
    a.deaths++;
    // Boss arena: each death uses one of 3 tries (still offers a math-revive); the 3rd ejects the hero, tries refresh (G14).
    if (a.bossFight) {
      a.bossFight.tries++;
      if (a.bossFight.tries >= CONFIG.BOSS.TRIES) { a.ejectBoss(); return; }
    }
    session.revivesUsed = (session.revivesUsed || 0) + 1;
    if (session.revivesUsed <= CONFIG.LIVES.REVIVES_PER_VISIT) {
      scenes.push(createMathPopup(view, {
        title: 'Answer to get back up!',
        onCorrect: () => { scenes.pop(); data.revives = (data.revives || 0) + 1; data.hearts = CONFIG.LIVES.REVIVE_HEARTS; hero.iframes = CONFIG.LIVES.REVIVE_IFRAMES; },
      }));
    } else {
      Object.assign(hero, { x: START.x, y: START.y, path: null, attackId: null, kbt: 0, kbx: 0, kby: 0, iframes: CONFIG.LIVES.REVIVE_IFRAMES }); // no leftover knockback after a respawn
      data.hearts = data.maxHearts;
      session.revivesUsed = 0;
      a.notice = { text: 'Back to the landing pad!', t: 3 };
    }
  };
  a.fell = 0;
  // Boss fight: lock the arena, spawn, and on defeat unlock + drops + autosave.
  a.bossFight = null;
  a.startBoss = (def, x, y) => {
    const e = spawnBoss(ents, def, data.location.world, data.tier, x, y);
    a.bossFight = { def, e, tries: 0, locked: true, x, y };
    return e;
  };
  a.ejectBoss = () => {
    const bf = a.bossFight;
    if (bf.e.alive) { bf.e.alive = false; ents.byId.delete(bf.e.id); }
    for (const h of ents.list) if (h.kind === 'hazard' || h.kind === 'eproj') h.alive = false;
    Object.assign(hero, { x: START.x, y: START.y + 40, path: null, attackId: null, kbt: 0, kbx: 0, kby: 0, iframes: CONFIG.LIVES.REVIVE_IFRAMES }); // no leftover knockback after a respawn
    data.hearts = data.maxHearts;
    a.bossFight = null; a.bossEjected = (a.bossEjected || 0) + 1;
    a.notice = { text: 'Take a breath and try again!', t: 3 };
  };
  a.bossDefeated = () => {
    const bf = a.bossFight;
    bf.locked = false; a.bossFight = null;
    if (bf.def.kind === 'main') beatBoss(data, data.location.world);
    a.lastBoss = bf.def.id;
    for (let i = 0; i < 3; i++) spawn(ents, { kind: 'pickup', type: i ? 'coin' : 'heart', value: i ? 10 * data.location.world : 1, x: bf.e.x - 12 + i * 12, y: bf.e.y, w: 8, h: 8, contact: false, life: 30 });
    save.auto('boss');
  };
  a.help = createHelp(); // [R3-10/11]
  const inter = createMechanics(map, {
    hero, tier: data.tier, get buddies() { return a.buddies ? buddyWeights(a.buddies) : []; },
    enemiesLeft: () => ents.list.filter((e) => e.alive && e.kind === 'enemy').length,
    onFall: () => { a.fell++; Object.assign(hero, { x: START.x, y: START.y, slide: null }); combat.hurt(1, hero.x, hero.y - 20); },
  });
  const projs = createProjectiles();
  a.inter = inter; a.projs = projs; a.msg = null;
  const say = (text) => { a.msg = text; floatText(hero.x, hero.y - 34, text, '#80c0ff'); };
  // Fire ranged ammo toward (dx, dy): AP charged when fired (G11); element ammo locked until its Bloom (D05).
  a.fire = (ammo, dx, dy, free = false) => {
    if (!ammoUnlocked(data, ammo)) { say('Need ' + AMMO[ammo].tags[0] + '!'); return false; }
    if (!free && !spendAp(AMMO[ammo].ap)) { say('Need AP!'); return false; }
    if (Math.abs(dx) > Math.abs(dy)) hero.facing = dx > 0 ? 'right' : 'left'; else hero.facing = dy > 0 ? 'down' : 'up'; hero.faceHold = CONFIG.COMBAT.FACE_HOLD;
    return !!fire(projs, hero, ammo, dx, dy);
  };
  a.tapTarget = (wx, wy) => {
    const o = findTapTarget(inter, wx, wy);
    if (!o) return false;
    const c = chooseAmmo(data, hero.id, o);
    if (!c) return true;
    if (c.need) { say('Need ' + c.need + '!'); return true; }
    const t = inter.center(o);
    a.fire(c.ammo, t.x - hero.x, t.y - (hero.y - 10));
    return true;
  };
  // [D37] aim for specials: a tapped angle wins; else the keyboard cone auto-aim around the facing; else null (facing).
  a.aim = null;
  a.aimAngle = () => { if (a.aim != null) return a.aim; const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[hero.facing]; const c = coneAim(hero.x, hero.y - 10, dx, dy, ents, inter); return c ? Math.atan2(c.dy, c.dx) : null; };
  const specials = {
    ...MILO_SPECIALS,
    inkGatling: () => inkGatling(a.fire, hero.facing, a.aimAngle()),
  };
  const onKill = (e) => {
    if (e.boss && a.bossFight && a.bossFight.e === e) a.bossDefeated();
    const xp = e.xp || 0;
    if (!xp) return;
    const ev = gainXp(data, xp, save.store ? save.store.loadSettings() : {});
    for (const l of ev) { confetti(hero.x, hero.y - 16); floatText(hero.x, hero.y - 36, 'Level ' + l.level + '! +1 point' + (l.heart ? ' +1 Heart' : '')); }
    if (ev.length) save.auto('levelup');
  };
  // [W6] Sproutling buddies follow in worlds with nests; nests sit on the nearest open spot to their cell centre
  a.buddies = ow && ow.world.nests ? createBuddies() : null;
  a.nests = (ow && ow.world.nests || []).map(([cx, cy]) => { for (let r = 0; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const tx = cx * 8 + 4 + dx, ty = cy * 8 + 4 + dy; if (map.boxFree(tx * 16, ty * 16 - 8, tx * 16 + 15, ty * 16 + 15)) return { x: tx * 16 + 8, y: ty * 16 + 12 }; } return { x: cx * 128 + 64, y: cy * 128 + 76 }; });
  const bushes = ow ? createBushes(ow, TILE) : null; // [BUSHES]
  const bushCx = { data, ents, world: data.location.world };
  const combat = createCombat({ map, ents, hero, data, world: data.location.world, openQuestion, onDeath, inter, specials, onKill, cutArea: (r) => bushes && cutBushesIn(bushes, r, bushCx) });
  combat.heroX = () => hero.x; combat.heroY = () => hero.y - 8;
  a.combat = combat;
  const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const act = {
    swing: () => { hero.attackId = null; return combat.startSwing(); },
    // keyboard fires along the facing, auto-aimed at the nearest enemy/switch inside the cone; a tap passes an exact angle
    fire: (ammo, tdx, tdy) => { if (tdx != null) return a.fire(ammo, tdx, tdy); const [dx, dy] = DIR[hero.facing]; const c = coneAim(hero.x, hero.y - 10, dx, dy, ents, inter); return c ? a.fire(ammo, c.dx, c.dy) : a.fire(ammo, dx, dy); },
    special: (kind, tier) => combat.special(kind, kind === 'spin' ? spinRadius(tier) : 34),
  };
  const swingAt = (bt) => { const dx = bt.tx * 16 + 8 - hero.x, dy = bt.ty * 16 + 8 - (hero.y - 8); hero.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; hero.path = null; hero.cd = 0; combat.startSwing(); };
  let kit = createKit(hero.id, data, act);
  a.kit = kit; a.hud = hud;
  // Debug hero switch (test builds only; the real switch is the Wayfarer locker). Level, hearts, gold, items are shared.
  a.switchHero = (id) => { data.hero = id; hero.id = id; kit = a.kit = createKit(id, data, act); };
  // Data enemy (archetype + pattern + look) at x, y.
  a.spawnData = (ed, x, y, elite = false) => spawn(ents, { ...enemyDef(ed, data.location.world, data.tier, elite), x, y, log: [] });
  // Region spawn slots (overworld): 3 per region from its spawn table; dead slots respawn when the hero re-enters the region.
  a.slots = [];
  if (ow) {
    let seed = ow.world.id * 104729;
    const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
    for (const r of ow.regions) {
      if (!r.spawns || !r.spawns.length) continue;
      let placed = 0;
      for (let tries = 0; tries < 400 && placed < CONFIG.OVERWORLD.SLOTS_PER_REGION; tries++) {
        const tx = (r.x0 * 8) + Math.floor(rnd() * (r.x1 - r.x0 + 1) * 8), ty = (r.y0 * 8) + Math.floor(rnd() * (r.y1 - r.y0 + 1) * 8);
        if (map.isSolid(tx, ty) || map.isSolid(tx, ty - 1) || liquidAt(ow, tx, ty) || Math.hypot(tx * 16 - START.x, ty * 16 - START.y) < 160) continue;
        const K = ow.feat.castleKit; if (K && tx >= K.x0 - 1 && tx <= K.x1 + 1 && ty <= K.fy + 3) continue; // [A8a] no foes in the castle or on its drawbridge
        const Z = ow.feat.maze; if (Z && tx >= Z.x0 - 4 && tx < Z.x0 + Z.w + 2 && ty >= Z.y0 - 2 && ty < Z.y0 + Z.h + 2) continue; // [D52] no foes in or at the maze
        a.slots.push({ region: r.name, id: r.spawns[placed % r.spawns.length], x: tx * 16 + 8, y: ty * 16 + 12, ent: null });
        placed++;
      }
    }
  }
  a.spawnRegion = (name) => {
    for (const sl of a.slots) {
      if (sl.region !== name || (sl.ent && sl.ent.alive)) continue;
      const ed = ow.world.enemies.find((e) => e.id === sl.id);
      if (ed) sl.ent = a.spawnData(ed, sl.x, sl.y);
    }
  };
  a.spawnEnemy = (def = {}) => {
    const w = data.location.world;
    const hp = def.hp || enemyHp(w, def.archetype || 'melee');
    return spawn(ents, { archetype: 'melee', ...def, hp, maxHp: hp });
  };
  if (ow) for (const g of ow.feat.gates) if (!g.passive) inter.add(g.type, g.tx, g.ty, { role: g.role });
  const npcs = ow && ow.townInfo ? [...spawnNpcs(ents, ow.world.town, ow.townInfo.origin), ...spawnVillagers(ents, ow), ...spawnCastleFolk(ents, ow)] : [];
  const maze = ow ? createMaze(ow) : null; // [D52] the world's timed maze mini-game
  if (maze) npcs.push(spawn(ents, mazeKeeper(maze, ow.world)));
  a.maze = maze;
  a.npcs = npcs;
  a.talkTo = (n) => {
    const lines = n.npc.maze && maze ? mazeLines(maze, data, ow.world) : n.npc.lines; // [R1-14] after the win: race again for a best time
    scenes.push(createDialogue(view, n.npc.name, lines, () => {
      scenes.pop();
      if (n.npc.quest && startQuest(data, n.npc.quest)) floatText(hero.x, hero.y - 34, 'New quest!', '#80ff90');
      if (n.npc.maze && maze) { startMaze(maze, data); a.msg = 'Go! Reach the prize before the clock runs out!'; floatText(hero.x, hero.y - 34, 'GO!', '#ffe070'); }
      if (n.npc.hint) { data.quests.relicHint = true; data.mapMarks = [...new Set([...(data.mapMarks || []), 'relic-w' + data.location.world])]; save.auto('hint'); }
    }));
  };
  a.openMap = () => { if (a.tut) tutEvent(a.tut, data, 'map'); scenes.push(createMap(view, data, ow, hero, () => scenes.pop(), { drawStatic: a.drawMapStatic })); };
  // [A8e] the pad tutorial: a new game in World 1 (or replayed from the pause menu)
  a.startTutorial = () => { if (ow && ow.world.id === 1) { a.tut = createTutorial(START); data.tutorialDone = false; } };
  if (opts.tutorial && !data.tutorialDone) a.startTutorial();
  a.tutEvent = (k) => a.tut && tutEvent(a.tut, data, k); // tests
  a.openPause = () => scenes.push(createPause(view, { onResume: () => scenes.pop(), onQuit: () => { save.auto('quit'); if (opts.onQuit) opts.onQuit(); else scenes.pop(); }, onMute: () => (opts.onMute ? opts.onMute() : false), onEquip: () => scenes.push(createEquipment(view, data, () => scenes.pop())), onMap: ow ? () => { scenes.pop(); a.openMap(); } : null, onTutorial: ow && ow.world.id === 1 ? () => { scenes.pop(); a.startTutorial(); } : null }));
  // Overworld entrances: dungeons 1–4 in world-data order, B = main-boss arena (needs every medallion).
  // Board the Wayfarer: the ship room replaces nothing — it sits on top; leaving puts the hero back on the pad.
  // [D35] doors & exits the hero walks into (tap zones, arrow, magnet)
  a.doors = [];
  if (ow) treeAnchors(ow, TILE.TREE, TILE); // [TREES 2x] big canopies (before the first chunk paint)
  if (ow && ow.world.lush) map.enableMini(CONFIG.UI.MAP_MINI); // [R2-19] the map screen's painted miniature
  if (ow) {
    if (ow.townInfo) for (const d of ow.townInfo.doors) a.doors.push({ x: d.tx * 16 + 8, y: d.ty * 16 + 8, w: 1, dir: 'up', ref: d });
    const f = ow.feat;
    for (const e of [...Object.values(f.dungeons), f.boss]) if (e) a.doors.push({ x: e.tx * 16 + 16, y: e.ty * 16 + 8, w: 2, dir: 'up' });
    if (f.relic) a.doors.push({ x: f.relic.tx * 16 + 8, y: f.relic.ty * 16 + 8, w: 1, dir: 'up', ax: f.relic.tx * 16 + 16 }); // the relic mouth is one tile wide (its gate tile); [R2-23] its art is centred on the 2-tile mouth, so is the arrow
    if (ow.rocket) a.doors.push({ x: ow.rocket.tx * 16 + 8, y: ow.rocket.ty * 16 + 8, w: 1, dir: 'up' });
  }
  a.questSpots = ow ? questSpots(ow) : {}; // [S55] side-quest marks
  a.activeMarks = () => Object.entries(a.questSpots).flatMap(([id, l]) => { const q = questState(data, id); return q && !q.done ? l.filter((m) => !(q.marks || []).includes(m.key)).map((m) => ({ id, ...m })) : []; });
  a.doorArrow = null;
  // [D38] one pause for every scene: extra = { limited }. Esc / the HUD pause button open it. [D42] no Return to Wayfarer: the ship is boarded only at the pad.
  a.pauseFor = (extra = {}) => createPause(view, {
    onResume: () => scenes.pop(),
    onQuit: () => { if (!extra.limited) save.auto('quit'); if (opts.onQuit) opts.onQuit(); else { while (scenes.stack.length > 1) scenes.pop(); } },
    onMute: () => (opts.onMute ? opts.onMute() : false),
    onEquip: extra.limited ? null : () => scenes.push(createEquipment(view, data, () => scenes.pop())),
    limited: !!extra.limited,
    onLeave: extra.onLeave || null,
  });
  a.board = () => {
    hero.path = null;
    scenes.push(createShip(view, data, {
      pause: () => scenes.push(a.pauseFor({})),
      onExit: () => { scenes.pop(); data.location = { ...data.location, area: 'overworld' }; Object.assign(hero, { x: START.x, y: START.y, facing: 'down', path: null }); save.auto('area'); },
      onFly: (w) => scenes.replace(createArena(view, data, { ...opts, world: w })),
      onHeroSwitch: (id) => a.switchHero(id),
    }));
  };
  a.enterEntrance = (dg, e, fromStart = false) => {
    const ox = e.tx * 16 + 16, oy = (e.ty + 2) * 16 + 12;
    data.location = { ...data.location, area: 'dungeon', dungeon: dg.id, x: ox, y: oy };
    const out = () => { scenes.pop(); data.location = { ...data.location, area: 'overworld', dungeon: '' }; Object.assign(hero, { x: ox, y: oy, facing: 'down', path: null }); save.auto('area'); };
    scenes.push(createDungeon(view, data, dg, { resume: !fromStart, onExit: out,
      // pause inside: boss fights are Resume/Quit only
      pause: (bossFight, leave) => scenes.push(a.pauseFor(bossFight ? { limited: true, onLeave: leave } : { onLeave: leave })) }));
  };
  a.entranceAt = (tx, ty) => {
    if (!ow) return null;
    const f = ow.feat;
    const hit = (e) => e && ty === e.ty && (tx === e.tx || tx === e.tx + 1);
    const list = Object.values(ow.world.dungeons || {});
    for (const [k, e] of Object.entries(f.dungeons)) if (hit(e)) return { dg: list[Number(k) - 1], e };
    if (hit(f.boss)) return { dg: ow.world.throne, e: f.boss, boss: true };
    if (hit(f.relic) && ow.world.relicDungeon) return { dg: buildRelicDungeon(ow.world), e: f.relic }; // [S55] behind its tool gate
    return null;
  };
  a.enterDoor = (d) => {
    data.location = { ...data.location, area: 'overworld', x: d.tx * 16 + 8, y: (d.ty + 1) * 16 + 14 }; // a save inside resumes at the door
    const out = () => { scenes.pop(); Object.assign(hero, { x: d.tx * 16 + 8, y: (d.ty + 1) * 16 + 14, facing: 'down', path: null }); save.auto('area'); };
    scenes.push(createInterior(view, data, d, ow.world.town, out, { pause: () => scenes.push(a.pauseFor({})) }));
  };
  if (opts.props) {
    const r = 16;
    inter.add('torch', 22 + 12, 15); inter.add('iceBlock', 22 - 6, 15); inter.add('crystal', 22, 15 - 6);
    for (let x = 0; x < 3; x++) inter.add('water', 22 + 3 + x, 15 + 5);
    inter.add('crackedWall', 22 - 6, 15 + 5);
    a.props = { torch: inter.list[0], ice: inter.list[1], crystal: inter.list[2], water: inter.list[3], wall: inter.list[6], r };
  }
  if (opts.mech === 'perf') {
    for (let i = 0; i < 40; i++) inter.add('toggleBlock', 4 + (i % 20) * 2, 4 + Math.floor(i / 20) * 20, { color: i % 2 ? 'blue' : 'red' });
    let t = 0;
    const cr = inter.add('crystal', 2, 2);
    a.perfTick = (dt) => { if ((t += dt) > 0.5) { t = 0; inter.apply(cr, 'hit', 'proj'); } };
  }
  if (opts.mech === 'gatling') { // perf: Wren gatling spam into a crowd
    let t = 0;
    a.perfTick = (dt) => { data.ap = 99; if ((t += dt) > 0.25) { t = 0; hero.facing = 'right'; inkGatling(a.fire, 'right'); } };
  }
  if (opts.enemy) {
    const all = [...TEST_ENEMIES, ...Object.values(WORLDS).flatMap((w) => w.enemies || [])];
    const ed = all.find((x) => x.id === opts.enemy) || all.find((x) => x.archetype === opts.enemy) || TEST_ENEMIES[0];
    for (let i = 0; i < (opts.count || 1); i++) a.spawnData(ed, START.x + 90 + (i % 4) * 40, START.y - 60 + Math.floor(i / 4) * 40);
  }
  if (ow) for (const r of ow.regions) a.spawnRegion(r.name);
  if (opts.boss) a.startBoss(TEST_BOSS, START.x + 120, START.y - 20);
  // [R2-19] everything drawn live that the map miniature should show (buildings, castle, landmarks, big trees), at world coords
  a.drawMapStatic = (g) => {
    if (!ow) return; const c0 = { x: 0, y: 0, w: 1e6, h: 1e6 };
    drawLandmarks(g, ow, c0); drawCastleFloor(g, ow.feat.castleKit, c0); drawCastle(g, ow.feat.castleKit, c0, 1e9, 'back'); // heroY far below: every piece
    if (ow.townInfo) for (const d of ow.townInfo.doors) drawBuilding(g, d, (ow.townInfo.origin.tx + d.b.x) * 16, (ow.townInfo.origin.ty + d.b.y) * 16, ow.world.id, ow.world.town);
    drawPadKitFloor(g, ow.padKit, c0); drawPadKit(g, ow.padKit, c0); drawBigTrees(g, ow, c0); drawEntrances(g, ow, c0); drawTrees2x(g, ow, c0, 1e9, 'back');
  };
  a.drawLandmarksTo = (g) => { if (ow) { drawLandmarks(g, ow, { x: 0, y: 0 }); drawCastleFloor(g, ow.feat.castleKit, { x: 0, y: 0 }); drawCastle(g, ow.feat.castleKit, { x: 0, y: 0 }, 1e9, 'back'); drawBigTrees(g, ow, { x: 0, y: 0 }); drawEntrances(g, ow, { x: 0, y: 0 }); } }; // tools/render_maps.js
  a.update = (dt) => {
    if (ow && !a.artDone && worldArtReady(ow)) { a.artDone = true; map.prerender(tilePainter(ow), ow.paintScale || 1); } // [S59] repaint once the world's sheets load
    if (resumeDungeon) { const k = Object.values(ow.world.dungeons).indexOf(resumeDungeon) + 1, e = ow.feat.dungeons[String(k)]; const dg = resumeDungeon; resumeDungeon = null; if (e) { a.enterEntrance(dg, e, true); return; } }
    updateHud(hud, data, dt);
    if (a.tut && !a.tut.done) { updateTutorial(a.tut, data, hero, dt); if (a.tut.done) save.auto('tutorial'); } // [A8e]
    updateFx(dt);
    if (a.notice && (a.notice.t -= dt) <= 0) a.notice = null;
    if (ow && !a.pilotOut) { const p = spawnPilot(ents, ow, data); if (p.length) { a.pilotOut = p[0]; npcs.push(p[0]); } } // [R3-12] Juno steps out once the boss is beaten
    if (a.pilotOut && !a.pilotTold && Math.hypot(a.pilotOut.x - hero.x, a.pilotOut.y - hero.y) < CONFIG.PADKIT.PILOT_TALK_R) { a.pilotTold = true; a.talkTo(a.pilotOut); return; } // she greets you once per visit
    if (pressed('question')) { openQuestion(); return; }
    if (pressed('pause')) { a.openPause(); return; }
    if (a.tut && !a.tut.done && input.pointer.tapped) { const r = skipRect(view), p = input.pointer; if (p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) { finishTutorial(a.tut, data); save.auto('tutorial'); return; } }
    if (input.pointer.tapped) {
      const b = hudHit(view.w, input.pointer.x, input.pointer.y);
      if (b === 'q') { openQuestion(); return; }
      if (b && b.startsWith('slot')) kit.select(Number(b[4]));
      if (b === 'pause') { a.openPause(); return; }
      if (b === 'map' && ow) { a.openMap(); return; }
      if (b === 'pill') { if (data.statPoints > 0) scenes.push(createStatPicker(view, data, () => scenes.pop())); return; }
      if (b === 'save') { floatText(hero.x, hero.y - 34, save.auto('manual') ? 'Saved!' : 'Could not save', '#80ff90'); if (a.tut) tutEvent(a.tut, data, 'save'); return; }
      if (!b) {
        const w = cam.toWorld(input.pointer.x, input.pointer.y);
        if (ow && ow.rocket && Math.abs(w.x - (ow.rocket.tx * 16 + 8)) < 24 && w.y > (ow.rocket.ty - 4) * 16 && w.y < (ow.rocket.ty + 1) * 16) {
          if (Math.hypot(hero.x - (ow.rocket.tx * 16 + 8), hero.y - ow.rocket.ty * 16) < 96) { a.board(); return; }
          setTapTarget(hero, map, ow.rocket.tx * 16 + 8, ow.rocket.ty * 16 + 8); return;
        }
        if (a.tut && !a.tut.done && Math.hypot(w.x - a.tut.dummy.x, w.y + 12 - a.tut.dummy.y) < 22) a.tut.tapDummy = true; // [A8e] walks over and swings
        const door = doorAt(a.doors, w.x, w.y); // [A7] a tap in a door's zone always means the door (a villager loitering by it must not steal the tap)
        const n = !door && npcs.find((e) => Math.hypot(e.x - w.x, e.y - 12 - w.y) < 20 && Math.hypot(e.x - hero.x, e.y - hero.y) < 64);
        if (n) { a.talkTo(n); return; }
        if (door) { a.doorArrow = { x: door.ref ? doorArtX(door.ref, (ow.townInfo.origin.tx + door.ref.b.x) * 16, ow.world.id, ow.world.town) : door.ax ?? door.x, y: door.y - 8, t: 2 }; // [DOOR-ARROWS] centred on the door in the picture
          hero.attackId = null; setTapTarget(hero, map, door.x, door.y + 4); return; }
        // [W6] a tap on a foe / plate / switch / seed sends a free Sproutling buddy
        if (a.buddies && freeBuddies(a.buddies).length) { const t = buddyTargetAt({ ents, inter }, w.x, w.y); if (t && Math.hypot(w.x - hero.x, w.y - hero.y) < CONFIG.BUDDY.SEND_R && sendBuddy(a.buddies, hero, t)) return; }
        // ranged slot: tapping an enemy fires along the exact angle
        // [D37] slot 3 (specials) aims at the tapped point; arcing ammo (Splat Bomb) lands on the tapped point
        if (kit.slot === 3) { a.aim = Math.atan2(w.y - (hero.y - 10), w.x - hero.x); kit.use(); a.aim = null; return; }
        if (kit.slot === 2 && AMMO[kit.ammo()] && AMMO[kit.ammo()].kind === 'arc') { kit.fireAt(w.x - hero.x, w.y - (hero.y - 10)); return; }
        if (kit.slot === 2) { const e = ents.list.find((q) => q.alive && q.kind === 'enemy' && Math.hypot(q.x - w.x, q.y - q.h / 2 - w.y) < CONFIG.COMBAT.TAP_ATTACK_RADIUS); if (e) { kit.fireAt(e.x - hero.x, e.y - e.h / 2 - (hero.y - 10)); return; } }
        const bt = bushes && !ents.list.some((q) => q.alive && q.kind === 'enemy' && Math.hypot(q.x - w.x, q.y - q.h / 2 - w.y) < CONFIG.COMBAT.TAP_ATTACK_RADIUS) && bushAt(bushes, w.x, w.y);
        if (bt) { // [BUSHES] a tap on a bush: swing at it (walk next to it first)
          if (Math.hypot(bt.tx * 16 + 8 - hero.x, bt.ty * 16 + 8 - (hero.y - 8)) < CONFIG.BUSH.TAP_REACH) swingAt(bt);
          else { hero.attackId = null; const side = [[0, 1], [0, -1], [-1, 0], [1, 0]].map(([dx, dy]) => [bt.tx + dx, bt.ty + dy]).filter(([x, y]) => !map.isSolid(x, y)).sort((p, q) => Math.hypot(p[0] * 16 - hero.x, p[1] * 16 - hero.y) - Math.hypot(q[0] * 16 - hero.x, q[1] * 16 - hero.y))[0];
            if (side && setTapTarget(hero, map, side[0] * 16 + 8, side[1] * 16 + 12)) a.bushTap = { ...bt, t: 5 }; }
          return;
        }
        if (!a.tapTarget(w.x, w.y) && !combat.tapAt(w.x, w.y)) { hero.attackId = null; setTapTarget(hero, map, w.x, w.y); }
      }
    }
    if (keyPressed('debugHero') && /[?&]test=1/.test(location.search)) { const H = ['rowan', 'milo', 'wren']; a.switchHero(H[(H.indexOf(hero.id) + 1) % 3]); }
    if (keyPressed('equip')) { scenes.push(createEquipment(view, data, () => scenes.pop())); return; }
    if (keyPressed('cycle')) a.item = cycleItem(data, a.item);
    if (keyPressed('item') && a.item === 'potion') usePotion(data);
    if (keyPressed('item') && ['shrinkCap', 'powerGlove'].includes(a.item)) { if (useToolsAhead(data, inter, a.item)) sfx('door'); else say('Nothing to use it on here.'); }
    if (keyPressed('item') && a.item === 'gustJar') { const [dx, dy] = DIR[hero.facing]; fire(projs, hero, 'gust', dx, dy); }
    if (keyPressed('item') && a.item === 'vineHook' && !startHook(data, hero, inter, map)) say('No hook post ahead!');
    if (keyPressed('item') && a.item === 'bomb') { if (takeBomb(data)) { const [dx, dy] = DIR[hero.facing]; const c = coneAim(hero.x, hero.y - 10, dx, dy, ents, inter); fire(projs, hero, 'bomb', c ? c.dx : dx, c ? c.dy : dy); } else say(data.tools.includes('bombBag') ? 'No bombs left!' : 'Need the Bomb Bag!'); }
    kit.update();
    Object.assign(hud, { slot: kit.slot, ammo: kit.ammo(), special: kit.special(), ammoNext: kit.nextAmmo(), specialNext: kit.nextSpecial() });
    if (a.doorArrow && (a.doorArrow.t -= dt) <= 0) a.doorArrow = null;
    magnet(hero, a.doors, held);
    if (!updateHook(hero, dt)) updateHero(hero, map, dt);
    if (a.buddies) {
      if (keyPressed('buddy')) { const e = ents.list.filter((q) => q.alive && q.kind === 'enemy' && !q.hidden).sort((p, q) => Math.hypot(p.x - hero.x, p.y - hero.y) - Math.hypot(q.x - hero.x, q.y - hero.y))[0]; if (e && Math.hypot(e.x - hero.x, e.y - hero.y) < CONFIG.BUDDY.SEND_R) sendBuddy(a.buddies, hero, { kind: 'enemy', e }); }
      updateBuddies(a.buddies, hero, dt, { ents, inter, nests: a.nests, hitEnemy: (e) => combat.buddyHit(e) });
    }
    if (ow && !hero.zip) { const loc = data.location; loc.area = 'overworld'; loc.x = hero.x; loc.y = hero.y; } // [D42] Continue resumes here
    combat.update(dt);
    inter.update(dt);
    if (a.perfTick) a.perfTick(dt);
    if (ow) {
      const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
      for (const n of npcs) updateNpc(n, map, dt);
      if (ow.ambient) updateAmbient(ow.ambient, hero, dt);
      if (maze) { // [D52]
        const ev = updateMaze(maze, data, hero, dt);
        if (ev && ev.kind === 'win') { sfx('relic'); startItemGet(hero, 0, ['ui-heart-pieces', 5]); confetti(hero.x, hero.y - 16, 40); floatText(hero.x, hero.y - 34, ev.piece.whole ? 'A whole new heart!' : 'Heart piece! ' + ev.piece.count + '/4', '#ff8090'); a.msg = 'You got a Heart Piece! (' + ev.secs + 's)'; save.auto('maze'); }
        else if (ev && (ev.kind === 'best' || ev.kind === 'done')) { sfx('coin'); floatText(hero.x, hero.y - 34, ev.secs + 's' + (ev.kind === 'best' ? ' - new best!' : ''), '#fff080'); save.auto('maze'); }
        else if (ev && ev.kind === 'lose') { floatText(hero.x, hero.y - 34, "Time's up!", '#ffb0b0'); a.msg = 'So close! Talk to ' + ow.world.maze.keeper.name + ' to try again.'; }
        else if (ev && ev.kind === 'idle-pen') a.msg = 'Talk to ' + ow.world.maze.keeper.name + ' to start the clock!';
      }
      markSeen(data, ow.world.id, Math.floor(tx / CELL), Math.floor(ty / CELL), ow.world.sketch[0].length);
      if (keyPressed('map')) { a.openMap(); return; }
      const ti = ow.townInfo;
      if (ti) {
        const d = ti.doors.find((x) => x.tx === tx && x.ty === ty);
        if (d) { a.enterDoor(d); return; }
        if (ti.heal && tx === ti.heal.tx && ty === ti.heal.ty && data.hearts < data.maxHearts) { data.hearts = data.maxHearts; confetti(hero.x, hero.y - 16, 20); a.msg = ti.heal.name; }
      }
      for (const m of a.activeMarks()) if (Math.hypot(m.tx * 16 + 8 - hero.x, m.ty * 16 + 8 - hero.y) < CONFIG.QUEST.PICK_R) {
        const r = questMark(data, m.id, m.key);
        if (r === 'done') { sfx('relic'); confetti(hero.x, hero.y - 16, 40); floatText(hero.x, hero.y - 34, 'Quest done! Star Seed!', '#80ff90'); a.msg = 'Quest complete! +1 Star Seed'; save.auto('quest'); }
        else if (r) { sfx('coin'); const q = questState(data, m.id); floatText(hero.x, hero.y - 34, q.got + ' found!', '#80ff90'); save.auto('quest'); }
      }
      const nook = ow.feat.secrets.find((s) => s.tx === tx && s.ty === ty);
      if (nook) { const r = claimSecret(data, ow.world.id, nook); if (r) { sfx(r.kind === 'seed' ? 'relic' : 'coin'); confetti(hero.x, hero.y - 16, 30); floatText(hero.x, hero.y - 34, r.label, '#fff080'); a.msg = 'Secret found! ' + r.label; save.auto('secret'); } }
      if (ow.rocket && tx === ow.rocket.tx && ty === ow.rocket.ty && hero.facing === 'up' && hero.dirY < -0.9) { a.board(); return; } // walk straight INTO the door (passing by sideways or diagonally doesn't board)
      const ent = a.entranceAt(tx, ty);
      if (ent && ent.dg) {
        if (ent.boss && !bossArenaOpen(data, ow.world.id)) {
          if (!a.sealedT || a.sealedT < performance.now()) { a.msg = ow.world.throne.name + ' is sealed. Bring every medallion!'; floatText(hero.x, hero.y - 34, 'Sealed!', '#ffb0b0'); a.sealedT = performance.now() + 800; }
          hero.y += 16; hero.path = null;
        } else { a.enterEntrance(ent.dg, ent.e); return; }
      }
      if (keyPressed('interact')) { const n = npcs.find((e) => Math.hypot(e.x - hero.x, e.y - hero.y) < 28); if (n) { a.talkTo(n); return; } if (useToolsAhead(data, inter)) sfx('door'); }
      const lq = liquidAt(ow, tx, ty);
      if (lq && lq.slow) hero.slow = Math.max(hero.slow || 0, lq.slow);
      const reg = regionAt(ow, tx, ty);
      if (reg !== a.region) { a.region = reg; a.spawnRegion(reg); }
    }
    updateProjectiles(projs, { map, inter, ents, hero, hitEnemy: (e, p) => combat.hitProjectile(e, p), area: (x, y, r) => combat.area(x, y, r, 0, false), cutAt: (tx, ty) => bushes && cutBushAt(bushes, tx, ty, bushCx) }, dt);
    if (bushes) updateBushes(bushes, hero, dt);
    if (ow) updateHelp(a.help, { data, hero, inter, room: {}, solved: true }, dt); // [R3-10/11] the missing-item bubble at secret gates (hollow tree, brambles, rocks)
    if (a.bushTap && ((a.bushTap.t -= dt) <= 0 || !(hero.path && hero.path.length))) { const bt = a.bushTap; a.bushTap = null; if (Math.hypot(bt.tx * 16 + 8 - hero.x, bt.ty * 16 + 8 - (hero.y - 8)) < CONFIG.BUSH.TAP_REACH) { swingAt(bt); } } // [BUSHES] walked up to the tapped bush → cut it
    cam.follow(hero.x, hero.y - 12, map.pxW, map.pxH, shake);
  };
  a.render = (ctx) => {
    heroArt.v2 = !!ow && heroArt.worlds.includes(ow.world.id); // [P-C] v2 hero art in the true-pixel worlds
    layoutBegin();
    cam.follow(hero.x, hero.y - 12, map.pxW, map.pxH, shake);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, view.w, view.h);
    cam.begin(ctx); // [P-A] world layer at WORLD_ZOOM
    map.draw(ctx, cam);
    if (ow) { drawWaterGlints(ctx, ow, cam, performance.now() / 1000); drawLandmarks(ctx, ow, cam); drawEntrances(ctx, ow, cam); drawCastleFloor(ctx, ow.feat.castleKit, cam); } // [S59] [V4] water shimmer
    if (ow) { // liquid shimmer (3-frame animation) on visible tiles only
      const f = Math.floor(performance.now() / 400) % 3;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let ty = Math.floor(cam.y / 16); ty <= Math.floor((cam.y + cam.h) / 16); ty++) for (let tx = Math.floor(cam.x / 16); tx <= Math.floor((cam.x + cam.w) / 16); tx++) {
        const t = map.inside(tx, ty) ? map.ground[map.idx(tx, ty)] : -1;
        if ((t === TILE.LIQ_A || t === TILE.LIQ_B) && (tx + ty + f) % 3 === 0) ctx.fillRect(tx * 16 - cam.x + 3 + f * 3, ty * 16 - cam.y + 6, 5, 1);
      }
    }
    for (const e of ents.list) {
      if (!e.alive) continue;
      if (e.kind === 'npc') continue;
      if (e.kind === 'hazard' || e.kind === 'eproj') { drawHazard(ctx, e, cam.x, cam.y, ow ? ow.world.id : data.location.world); continue; }
      const x = Math.round(e.x - e.w / 2 - cam.x), y = Math.round(e.y - e.h - cam.y);
      if (e.kind === 'pickup') { drawPickup(ctx, e, cam); continue; } // [R1-2] coin/heart art
      if (e.boss) { drawBoss(ctx, e, e.x - cam.x, e.y - cam.y); continue; }
      if (e.look) { drawEnemy(ctx, e, e.x - cam.x, e.y - cam.y); continue; }
      codeArt('entity:' + e.kind); ctx.fillStyle = '#10101a'; ctx.fillRect(x - 1, y - 1, e.w + 2, e.h + 2); // [R2-19a] audit
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#c04040'; ctx.fillRect(x, y, e.w, e.h);
    }
    if (ow && ow.townInfo) {
      for (const d of ow.townInfo.doors) drawBuilding(ctx, d, (ow.townInfo.origin.tx + d.b.x) * 16 - cam.x, (ow.townInfo.origin.ty + d.b.y) * 16 - cam.y, ow.world.id, ow.world.town);
      const hs = ow.townInfo.heal;
      const wellSheet = 'w' + ow.world.id + '-town-props', wellN = hs && imgReady(wellSheet) && Object.keys(ATLAS[wellSheet].meta.frames)[8];
      if (wellN) { // [V5] heal spot = the user's well/fountain prop + a twinkle
        { const wf = ATLAS[wellSheet].meta.frames[wellN], k = ow.world.lush ? 2 : 1; drawSprite(ctx, wellSheet, wellN, hs.tx * 16 + 8 - (wf.w * k) / 2 - cam.x, hs.ty * 16 + 16 - (wf.bb ? wf.bb[3] : wf.h) * k - cam.y, { scale: k }); } // [A5] 2x in lush towns
        const tw = Math.floor(performance.now() / 200) % 4; ctx.fillStyle = '#ffffff'; ctx.fillRect(hs.tx * 16 + 4 + tw * 3 - cam.x, hs.ty * 16 - 12 + (tw % 2) * 3 - cam.y, 2, 2);
      } else if (hs) { codeArt('heal-well'); ctx.fillStyle = '#10101a'; ctx.fillRect(hs.tx * 16 - cam.x, hs.ty * 16 - cam.y, 16, 16); ctx.fillStyle = '#80e0ff'; ctx.fillRect(hs.tx * 16 - cam.x + 2, hs.ty * 16 - cam.y + 2, 12, 12); ctx.fillStyle = '#ffffff'; ctx.fillRect(hs.tx * 16 - cam.x + 7, hs.ty * 16 - cam.y + 4, 2, 2); }
    }
    if (ow) { drawPadKitFloor(ctx, ow.padKit, cam, !!data.worlds[ow.world.id - 1].bossBeaten); drawPadKit(ctx, ow.padKit, cam); } // [A8b][R3-12] rings glow after the boss
    drawDummy(ctx, a.tut, cam); // [A8e]
    if (ow) drawBigTrees(ctx, ow, cam); // [A4g]
    if (ow) drawTrees2x(ctx, ow, cam, hero.y, 'back'); // [TREES 2x]
    if (ow) drawCastle(ctx, ow.feat.castleKit, cam, hero.y, 'back'); // [A8a] castle pieces behind the hero
    if (maze) drawMazeDecor(ctx, maze, data, cam);
    if (ow && ow.rocket) drawRocket(ctx, ow.rocket.tx * 16 + 8 - cam.x, (ow.rocket.ty + 1) * 16 - cam.y);
    for (const n of npcs) drawNpc(ctx, n, n.x - cam.x, n.y - cam.y);
    if (ow && ow.ambient) drawAmbient(ctx, ow.ambient, cam, hero);
    for (const o of inter.list) { const gx = o.role === 'relic' ? 8 : 0; if (!(ow && o.role && drawGateArt(ctx, o, o.tx * 16 + gx - cam.x, o.ty * 16 - cam.y, ow.world.id))) drawProp(ctx, o, o.tx * 16 - cam.x, o.ty * 16 - cam.y, inter); } // [R3-7] the relic cave's rock sits centred on its 2-tile mouth (like the cave art)
    for (let i = 0; i < inter.beam.length; i += 2) { ctx.fillStyle = 'rgba(255,250,160,0.7)'; ctx.fillRect(inter.beam[i] * 16 - cam.x + 6, inter.beam[i + 1] * 16 - cam.y + 6, 4, 4); }
    projs.forEach((p) => { // [D35] sprites rotate to the travel angle
      if (drawShot(ctx, p, p.x - cam.x, p.y - cam.y)) return; // [HERO-SHOTS] user art; the code shape below is the fallback
      ctx.save(); ctx.translate(Math.round(p.x - cam.x), Math.round(p.y - cam.y)); ctx.rotate(Math.atan2(p.vy, p.vx));
      codeArt('hero-shot:' + (p.ammo || p.kind || '?')); ctx.fillStyle = '#10101a'; ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = p.tags.includes('FIRE') ? '#ff7020' : p.tags.includes('ICE') ? '#a0e8ff' : '#e0e0e0'; ctx.fillRect(-4, -2, 8, 4); ctx.fillRect(3, -1, 3, 2);
      ctx.restore();
    });
    for (const m of a.activeMarks()) { const x = m.tx * 16 + 8 - cam.x, y = m.ty * 16 + 8 - cam.y + Math.sin(performance.now() / 250 + m.tx) * 2; ctx.fillStyle = '#80ff90'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 3 : 7, t = (i * Math.PI) / 5 - Math.PI / 2; ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } ctx.fill(); ctx.strokeStyle = '#205020'; ctx.stroke(); } // quest mark (code-drawn star)
    for (const n of a.nests) drawNest(ctx, Math.round(n.x - cam.x), Math.round(n.y - cam.y));
    if (a.buddies) { ctx.save(); ctx.translate(-Math.round(cam.x), -Math.round(cam.y)); drawBuddies(ctx, a.buddies); ctx.restore(); }
    drawHero(ctx, hero, cam);
    if (ow) drawTrees2x(ctx, ow, cam, hero.y, 'front'); // canopies in front of the hero
    drawItemGet(ctx, hero, cam, 1 / 60); // [A8] the prize over the raised hands
    if (ow) drawCastle(ctx, ow.feat.castleKit, cam, hero.y, 'front'); // [A8a] ...and the ones in front of him
    drawWeapon(ctx, hero, weaponTier(data, hero.id), cam);
    drawSpecialFx(ctx, hero, cam); // [HERO-SHOTS] spin ring, Spin Dash, Cape Swipe, bursts, Starfall
    drawFx(ctx, cam.x, cam.y);
    drawDoorArrow(ctx, a.doorArrow, cam.x, cam.y);
    // [R1-1] no on-screen pointer to the next goal (user review 2026-10-06): the map button shows where to go
    cam.end(ctx);
    if (ow) { const hs = cam.toScreen(hero.x, hero.y - 26); drawHelpScreen(ctx, a.help, view, hs, ow.world.id); }
    drawHud(ctx, hud, data, view, { ap: data.ap, apCap: apCapOf(), band: currentBand(), map: !!ow, attack: scenes.top() === a }); // [HUD-ATTACK] hidden under dialogs, math and menus
    drawTutorial(ctx, a.tut, view, cam); // [A8e]
    drawMazeHud(ctx, maze, view, font, drawOutlined);
    if (ow && a.region) { ctx.font = font(12); ctx.textAlign = 'left'; drawOutlined(ctx, a.region, 8, view.h - 12, '#ffffff'); }
    if (a.bossFight && a.bossFight.e.alive) drawBossBar(ctx, a.bossFight.e, view.w, font, drawOutlined);
    if (a.notice) { ctx.font = font(18); ctx.textAlign = 'center'; drawOutlined(ctx, a.notice.text, view.w / 2, 90, '#ffe070'); }
  };
  return a;
}
