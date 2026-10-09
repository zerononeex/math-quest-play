// Boot: engine core + title placeholder (scenes arrive in later steps).
import { CONFIG } from './config.js';
import { startLoop, loopStats } from './engine/loop.js';
import { initRender, view } from './engine/render.js';
import { initInput, endUpdate, pressed, input } from './engine/input.js';
import { createStress } from './scenes/stress.js';
import { Button, Panel, layout, layoutBegin, rectsOverlap } from './engine/ui.js';
import { fitTextSize } from './engine/text.js';
import { scenes } from './engine/scenes.js';
import { save } from './engine/save.js';
import { createTitle } from './scenes/title.js';
import { createIntro } from './scenes/intro.js';
import { createPlay } from './scenes/play.js';
import { session } from './game/ap.js';
import { createTestMap } from './scenes/testmap.js';
import { createArena } from './scenes/arena.js';
import { createWorld } from './scenes/world.js';
import { createDungeon } from './scenes/dungeon.js';
import { TEST_DUNGEON } from './game/dungeon.js';
import { WORLDS } from './data/worlds.js';
import { weaponVisual } from './game/kits/common.js';
import { atkRef } from './game/stats.js';
import { canBuy, buy } from './game/items.js';
import { TEST_BOSS, jumpToForm } from './game/bosses.js';
import { buildRelicDungeon } from './game/relics.js';
import { createShop } from './scenes/shop.js';
import { createVictory } from './scenes/victory.js';
import { createRushResults } from './scenes/trophies.js';
import { initAtlas, drawSprite, drawSpriteFoot, registerFallback, atlasStats, ATLAS } from './engine/atlas.js';
import { registerIconFallbacks } from './art/fallback/icons.js';
import { audio, initAudio, registerMusic, playMusic, resolveMusic, setMute, sfx } from './engine/audio.js';
import { embeddedAssets, pageParsed } from './engine/assets.js';

const TEST = /[?&]test=1/.test(location.search) && !/[?&]qa=1/.test(location.search);
const QA = /[?&]qa=1/.test(location.search); // QA agent: steps once per update, debug setters disabled (G22)
export const MQ = { ready: false, atlasStats, audio, fontsLoaded: false, layout: layout.rects, scenes, save, stats: loopStats, view, config: CONFIG, debug: null, scene: null };
const SCENE = TEST ? (location.search.match(/[?&]scene=(\w+)/) || [])[1] : null;

function update(dt) {
  if (QA && window.__QA) window.__QA.step(dt);
  if (MQ.debug) {
    if (MQ.debug.throwInUpdate) throw new Error(MQ.debug.throwInUpdate);
    if (pressed('attack')) MQ.debug.attackPresses++;
  }
  if (MQ.scene) MQ.scene.update(dt); else { scenes.update(dt); music(); }
  if (save.data && scenes.stack[0] && ['overworld', 'dungeon', 'ship', 'play'].includes(scenes.stack[0].name)) save.data.playTime += dt; // victory stats
  endUpdate();
}

function render() {
  const ctx = view.ctx;
  if (MQ.scene) { MQ.scene.render(ctx); return; }
  scenes.render(ctx);
  if (MQ.titleMs == null && scenes.top() && scenes.top().name === 'title') MQ.titleMs = Math.round(performance.now()); // [S60] boot-to-title
}

function uiTestScene() {
  const btns = [];
  for (let i = 0; i < 6; i++) btns.push(new Button({ id: 'b' + i, x: 40 + (i % 3) * 190, y: 120 + ((i / 3) | 0) * 60, w: 170, h: 40, label: 'Button number ' + i }));
  const panel = new Panel(btns);
  layout.enabled = true;
  return {
    update() { panel.update({ pressed, pointer: input.pointer }); },
    render(ctx) { layoutBegin(); ctx.fillStyle = '#10204a'; ctx.fillRect(0, 0, view.w, view.h); panel.draw(ctx); },
  };
}

function atlasTestScene() {
  registerFallback('missing-sheet', (ctx, f, x, y) => { ctx.fillStyle = '#ff8800'; ctx.fillRect(x, y, 16, 16); });
  return {
    update() {},
    render(ctx) {
      ctx.fillStyle = '#202040'; ctx.fillRect(0, 0, view.w, view.h);
      drawSprite(ctx, 'missing-sheet', 'any', 40, 40);
      ['red', 'green', 'blue', 'yellow'].forEach((f, i) => drawSpriteFoot(ctx, '_test', f, 100 + i * 24, 80, { flash: i === 3 }));
    },
  };
}

function loadFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve(false);
  const load = Promise.all([document.fonts.load('16px PressStart2P'), document.fonts.load('16px PixelifySans')])
    .then((r) => r.every((x) => x.length > 0)).catch(() => false);
  const timeout = new Promise((res) => setTimeout(() => res(false), CONFIG.UI.FONT_TIMEOUT_MS));
  return Promise.race([load, timeout]);
}

// Music follows the scene under any modal: title/intro → title, play → w<n>_overworld.
function music() {
  let i = scenes.stack.length - 1;
  while (i > 0 && scenes.stack[i].modal) i--;
  const s = scenes.stack[i];
  if (!s) return;
  if (s.name === 'title') playMusic('title');
  else if (s.name === 'intro') playMusic('intro'); // [A6] story intro
  else if (s.name === 'ship') playMusic('ship');
  else if (s.name === 'victory') playMusic(s.t > CONFIG.AUDIO_KEYS.CREDITS_AFTER_S ? 'credits' : 'victory'); // [A6] the fanfare, then the credits track
  else if (s.name === 'play' && save.data) playMusic('w' + save.data.location.world + '_overworld');
  else if (s.name === 'dungeon' && save.data) { // boss fights have their own tracks; Seraphel's winged form crossfades to w7_boss_final [D46]
    const b = s.boss, w = s.dg.world, W = WORLDS[w];
    if (s.dg.survival) playMusic('survival');
    else if (s.dg.rush) playMusic('bossrush'); // [A6] one Boss Rush track across the chained fights
    else if (b && b.alive && b.ai.state === 'farewell' && (b.baseDef || b.bossDef).farewell) playMusic((b.baseDef || b.bossDef).farewell.music || 'victory');
    else if (b && b.alive && b.form >= 2 && b.bossDef.music2) playMusic(b.bossDef.music2);
    else if (b && b.alive) playMusic(b.bossDef.kind === 'sub' ? 'miniboss' : 'w' + w + '_boss');
    else playMusic((W && W.music && W.music.dungeon) || 'dungeon');
  } else if ((s.name === 'overworld' || s.name === 'interior') && save.data) {
    const w = save.data.location.world, W = WORLDS[w];
    if (s.name === 'interior' && (s.id === 'shop' || s.id === 'inn')) { playMusic('shop'); return; } // [A6] shops and inns
    const r = s.name === 'interior' ? { music: 'town' } : (s.ow && s.ow.regions.find((g) => g.name === s.region)) || {};
    playMusic((W && W.music && W.music[r.music || 'overworld']) || 'w' + w + '_overworld');
  }
}

function playOpts() {
  return {
    onQuit: () => scenes.replace(titleScene()),
    onMute: () => setMute(!audio.muted),
  };
}

function titleScene() {
  return createTitle(view, {
    onStart({ slot, data, isNew }) {
      save.slot = slot;
      save.data = data;
      const play = () => scenes.replace(createWorld(view, data, { ...playOpts(), tutorial: isNew })); // [A8e] a new game starts with the pad tutorial
      if (isNew) scenes.replace(createIntro(view, play)); else play();
    },
  });
}

async function boot() {
  initRender(document.getElementById('game'));
  initInput();
  initAtlas();
  registerIconFallbacks();
  MQ.fontsLoaded = await loadFonts();
  if (TEST) {
    MQ.debug = {
      throwInUpdate: null, attackPresses: 0, ATLAS, input, session, fitTextSize, rectsOverlap, ctx: view.ctx, resolveMusic, playMusic, setMute, sfx, weaponVisual, atkRef, TEST_BOSS, items: { canBuy, buy },
      newGame(opts = {}) { const data = save.store.newGame(opts.slot || 1, opts); save.slot = opts.slot || 1; save.data = data; scenes.replace(createPlay(view, data, playOpts())); return data; },
      gainXp(n) { return scenes.stack.find((x) => x.name === 'play').gainXp(n); },
      setWorld(n) { save.data.location.world = n; save.data.worlds[n - 1].unlocked = true; },
      // [S58] ACC(layout): open scenes that are otherwise deep in play (shop counter, victory, rush results)
      open(kind) {
        const d = save.data, pop = () => scenes.pop();
        if (kind === 'shop') return scenes.push(createShop(view, d, d.location.world, 'Pippa', pop));
        if (kind === 'victory') return scenes.push(createVictory(view, d, { onDone: pop }));
        if (kind === 'rush') return scenes.push(createRushResults(view, 'boss', { won: true, bosses: 8, count: 8, time: 754, best: 754, newBest: true, trophy: true }, pop));
        return null;
      },
    };
  }
  window.__MQ = MQ;
  if (SCENE === 'stress') MQ.scene = createStress(view);
  if (SCENE === 'ui') MQ.scene = uiTestScene();
  if (SCENE === 'testmap') MQ.scene = createTestMap(view);
  if (SCENE === 'atlas') MQ.scene = atlasTestScene();
  save.init();
  initAudio(embeddedAssets(), save.store.loadSettings().mute);
  audio.onMuteChange = (m) => { const st = save.store.loadSettings(); st.mute = m; save.store.writeSettings(st); };
  layout.enabled = true;
  scenes.push(titleScene());
  if (SCENE === 'dungeon') {
    const qh = new URLSearchParams(location.search).get('hero'); // test scenes: ?hero= starts that hero
    save.slot = 1; save.data = (!qh && save.store.load(1)) || save.store.newGame(1, ['rowan', 'milo', 'wren'].includes(qh) ? { hero: qh } : {});
    const id = new URLSearchParams(location.search).get('id');
    const dg = (id && Object.values(WORLDS).map((w) => (w.dungeons || {})[id] || (w.throne && w.throne.id === id ? w.throne : null) || (w.relicDungeon && w.relicDungeon.id === id ? buildRelicDungeon(w) : null)).find(Boolean)) || TEST_DUNGEON;
    const dsc = scenes.replace(createDungeon(view, save.data, dg));
    const room = new URLSearchParams(location.search).get('room');
    if (room && dg.rooms[room]) dsc.enterRoom(room, 'start');
    // PERF(boss <id> form N) [D47]: start the fight in a later phase (test scenes only)
    const formN = Number(new URLSearchParams(location.search).get('form')); if (formN > 1 && dsc.boss) { jumpToForm(dsc.boss, formN); setInterval(() => { dsc.data.hearts = 20; dsc.data.maxHearts = 20; }, 200); }
    // PERF(survival wave N) [S54]: jump straight to wave N
    const waveN = Number(new URLSearchParams(location.search).get('wave')); if (waveN > 1 && dsc.sv) { dsc.sv.wave = waveN - 1; dsc.sv.gap = 0; setInterval(() => { dsc.data.hearts = 20; dsc.data.maxHearts = 20; }, 200); }
    // PERF(dungeon w7 nightfall): keep Nocturne's darkness up with telegraph glows (test scenes only)
    if (new URLSearchParams(location.search).get('nightfall') === '1') setInterval(() => { const b = dsc.boss; if (!b) return; b.darkT = 3; dsc.data.hearts = 20; dsc.data.maxHearts = 20; }, 200);
    // PERF(boss <id> phase2): keep the boss in its phase-2 pattern forever (test scenes only)
    if (new URLSearchParams(location.search).get('bossphase') === '2') setInterval(() => { const b = dsc.boss; if (!b) return; b.phase = 2; if (b.bossDef.phase2) b.bossDef = { ...b.bossDef, patterns: b.bossDef.phase2 }; dsc.data.hearts = 20; dsc.data.maxHearts = 20; dsc.hero.iframes = 9; }, 100);
  }
  if (SCENE === 'arena' || SCENE === 'overworld') {
    const q = new URLSearchParams(location.search);
    save.slot = 1; save.data = save.store.newGame(1, ['rowan', 'milo', 'wren'].includes(q.get('hero')) ? { hero: q.get('hero') } : {}); // test scenes: ?hero=
    scenes.replace(createArena(view, save.data, { enemy: q.get('enemy'), count: Number(q.get('count')) || 1, props: q.get('props') === '1', mech: q.get('mech'), boss: q.get('boss'), world: SCENE === 'overworld' ? Number(q.get('world')) || 1 : 0 }));
  }
  // [S58] iPad: leaving the app autosaves, silences audio and opens the pause menu outdoors; coming back resumes audio
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (save.data && save.slot) save.auto('hidden');
      if (audio.ac && audio.ac.state === 'running') audio.ac.suspend();
      const b = scenes.stack[0];
      if (b && scenes.top() === b && b.openPause && b.name === 'overworld') b.openPause();
    } else if (audio.ac && audio.ac.state === 'suspended' && !audio.muted) audio.ac.resume();
  });
  startLoop(update, render);
  // [S60] the title is up; atlases + music tags follow the script in the page — pick them up once it is parsed
  await pageParsed();
  initAtlas(); registerMusic();
  MQ.ready = true;
}

boot();
