// The Wayfarer interior (SPEC 2.5): one cosy safe room [R1-16] with stations — EARTH MAP (the only way between worlds), trophy wall,
// medallion gallery, locker (hero switch), Starforge (stub, Smith Nova), rest bunks (full heal). Exit door → back to the pad.
import { CONFIG } from '../config.js';
import { Camera } from '../engine/camera.js';
import { TileMap } from '../engine/tilemap.js';
import { input, pressed, held } from '../engine/input.js';
import { doorAt, magnet, drawDoorArrow } from '../game/doortap.js';
import { scenes } from '../engine/scenes.js';
import { layoutBegin, Button, Panel, Toast, record, uiFont, drawCell } from '../engine/ui.js';
import { font, drawOutlined, fitTextSize } from '../engine/text.js';
import { save } from '../engine/save.js';
import { createHero, updateHero, drawHero, setTapTarget, heroArt } from '../game/hero.js';
import { createHud, updateHud, drawHud, hudHit } from '../game/hud.js';
import { currentBand, apCapOf } from '../game/ap.js';
import { createDialogue } from '../game/towns.js';
import { trophyLines } from './trophies.js';
import { HeroCard, HEROES as TITLE_HEROES } from './title.js';
import { STATIONS, SHIP_DECOR, SHIP_DOOR, SHIP_START, SHIP_ROOM, SHIP_NPCS, MAP_REGIONS, mapButtons, travelTo, restAtBunks, switchHero, medallionCollection } from '../game/ship.js';
import { ATLAS, imgReady, codeArt, drawFoot } from '../engine/atlas.js';
import { shipPainter, drawStation, drawStationText, drawShipProp, SG, drawMedalBoard, drawBoardMedal } from '../art/fallback/ship.js';
import { drawNpc } from '../art/fallback/npcs.js';
import { canForge, forgeDawnbreaker, forgeLines } from '../game/forge.js';
import { sfx, playMusic } from '../engine/audio.js';

// A modal panel: title, buttons, optional text lines; Escape / Close pops it.
function createPanel(view, title, makeButtons, lines = () => []) {
  const p = { name: 'ship-panel', modal: true, title };
  let panel = new Panel(makeButtons(p));
  p.labels = () => panel.buttons.map((b) => [b.id, b.label, !!b.disabled]);
  p.rebuild = () => { panel = new Panel(makeButtons(p)); };
  p.close = () => { if (scenes.top() === p) scenes.pop(); };
  p.update = () => { if (pressed('pause')) { p.close(); return; } panel.update({ pressed, pointer: input.pointer }); };
  p.render = (ctx) => {
    ctx.fillStyle = 'rgba(8,10,24,0.85)'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.font = font(24); ctx.textAlign = 'center'; drawOutlined(ctx, title, view.w / 2, 60, '#ffe070');
    ctx.font = font(14); lines().forEach((l, i) => drawOutlined(ctx, l, view.w / 2, 300 + i * 22, '#ffffff'));
    for (const b of panel.buttons) b.draw(ctx);
  };
  return p;
}

// [EARTH MAP] the World Maps painting (ship-map) at its own aspect ratio, each world a tappable island: unlocked islands in
// full colour, locked ones in grayscale with a small lock, every island labelled "N Name" in white with a dark edge; gold ring =
// where the ship is, pulsing cyan ring = the next world to play. Arrow keys move the focus (white ring), Enter flies.
const MAP_NAMES = { 1: 'Verdania', 2: 'Tumbletop', 3: 'Chroma Bay', 4: 'Pufftop', 5: 'Wildvine', 6: 'Sproutlands', 7: 'Aetheria', 8: 'Starhaven' };
let grayMap = null; // grayscale copies of the painting, made once: all = every pixel; land = the open sea left clear
function mapGray(A) {
  if (grayMap) return grayMap;
  const f = A.meta.frames.image.src, mk = () => { const c = document.createElement('canvas'); c.width = f.w; c.height = f.h; const g = c.getContext('2d'); g.drawImage(A.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h); return [c, g]; };
  const [all, ga] = mk(), [land, gl] = mk();
  try {
    const d = ga.getImageData(0, 0, f.w, f.h), e = gl.getImageData(0, 0, f.w, f.h), px = d.data, q = e.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2], l = Math.round(r * 0.3 + g * 0.59 + b * 0.11), sea = b > 90 && b > r * 1.6 && b > g * 1.2;
      px[i] = px[i + 1] = px[i + 2] = l; q[i] = q[i + 1] = q[i + 2] = l; if (sea) q[i + 3] = 0;
    }
    ga.putImageData(d, 0, 0); gl.putImageData(e, 0, 0);
  } catch (err) { for (const g of [ga, gl]) { g.fillStyle = 'rgba(90,90,100,0.7)'; g.fillRect(0, 0, f.w, f.h); } }
  return (grayMap = { all, land });
}
const grayPatches = {}; // grayscale copies of island patches (a locked island the painting never had, e.g. Starhaven)
function patchGray(P) {
  const id = P.id; if (grayPatches[id]) return grayPatches[id];
  const f = Object.values(P.meta.frames)[0].src, c = document.createElement('canvas'); c.width = f.w; c.height = f.h;
  const g = c.getContext('2d'); g.drawImage(P.img, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  try { const d = g.getImageData(0, 0, f.w, f.h), px = d.data; for (let i = 0; i < px.length; i += 4) { const l = Math.round(px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11); px[i] = px[i + 1] = px[i + 2] = l; } g.putImageData(d, 0, 0); } catch (err) { /* keep colour */ }
  return (grayPatches[id] = c);
}
function drawLock(ctx, x, y) { // a small padlock (UI glyph, no art sheet for it)
  codeArt('map-lock');
  ctx.fillStyle = '#10101a'; ctx.fillRect(x - 1, y + 3, 12, 10); ctx.strokeStyle = '#10101a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x + 5, y + 4, 3.5, Math.PI, 0); ctx.stroke();
  ctx.strokeStyle = '#e8e8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 5, y + 4, 3.5, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#ffd040'; ctx.fillRect(x, y + 4, 10, 8); ctx.fillStyle = '#10101a'; ctx.fillRect(x + 4, y + 6, 2, 4);
}
export function createWorldMap(view, data, onFly) {
  const p = { name: 'ship-panel', modal: true, title: 'World Maps' };
  const A = () => (imgReady('ship-map') ? ATLAS['ship-map'] : null);
  const ART = { w: 1672, h: 941 }; // the painting's aspect ratio (16:9)
  const k = Math.min((view.w - 16) / ART.w, (view.h - 34 - 64) / ART.h), mw = Math.round(ART.w * k), mh = Math.round(ART.h * k);
  const mx = Math.round((view.w - mw) / 2), my = 34, min = CONFIG.VIEW.TAP_MIN_LOGICAL_PX / 2;
  const bs = mapButtons(data), here = data.location.world;
  const next = (bs.filter((b) => b.enabled && b.w !== here && !(data.worlds[b.w - 1] || {}).bossBeaten).pop() || {}).w || 0;
  const regs = bs.map((b) => {
    const R = MAP_REGIONS[b.w], cx = mx + R.cx * mw, cy = my + R.cy * mh, rx = Math.max(min, R.rx * mw), ry = Math.max(min, R.ry * mh);
    return { id: 'fly-' + b.w, w: b.w, b, R, cx, cy, rx, ry, ly: my + R.ly * mh, label: b.w + ' ' + MAP_NAMES[b.w] + (b.enabled ? '' : b.unlocked ? ' (on its way!)' : ' (locked)'), disabled: !b.enabled, focused: false };
  });
  const dist = (r, x, y) => ((x - r.cx) / r.rx) ** 2 + ((y - r.cy) / r.ry) ** 2;
  const owner = (x, y) => regs.reduce((best, r) => { const d = dist(r, x, y); return d <= 1 && (!best || d < best.d) ? { r, d } : best; }, null); // overlaps go to the nearest island
  for (const r of regs) {
    r.hit = (x, y) => { const o = owner(x, y); return !r.disabled && !!o && o.r === r; };
    r.onClick = () => { if (!travelTo(data, r.w)) return; p.close(); save.auto('travel'); if (onFly) onFly(r.w); };
  }
  const close = new Button({ id: 'ship-close', x: view.w / 2 - 80, y: my + mh + 10, w: 160, h: 44, label: 'Close', onClick: () => p.close() });
  const panel = new Panel([...regs, close]);
  panel.focus = Math.max(0, regs.findIndex((r) => r.w === here));
  p.labels = () => panel.buttons.map((b) => [b.id, b.label, !!b.disabled]);
  p.regions = regs; // island hit ellipses in logical px (tests)
  p.rebuild = () => {};
  p.close = () => { if (scenes.top() === p) scenes.pop(); };
  p.update = () => { if (pressed('pause')) { p.close(); return; } panel.update({ pressed, pointer: input.pointer }); };
  const ring = (ctx, r, color, width, dash = null) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.ellipse(r.cx, r.cy, r.rx, r.ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
  p.render = (ctx) => {
    const t = performance.now() / 1000, a = A();
    ctx.fillStyle = 'rgba(8,10,24,0.92)'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.font = font(20); ctx.textAlign = 'center'; drawOutlined(ctx, 'World Maps — where to?', view.w / 2, 24, '#ffe070');
    if (a) {
      const f = a.meta.frames.image.src; ctx.imageSmoothingEnabled = true; ctx.drawImage(a.img, f.x, f.y, f.w, f.h, mx, my, mw, mh);
      const g = mapGray(a);
      // island patches: Aetheria #376 covers the painting's gray island once unlocked; Starhaven #375 (an island the painting
      // never had, R.own) always shows — gray while locked, in colour once unlocked
      for (const r of regs) if (r.R.patch && imgReady(r.R.patch) && (!r.disabled || r.R.own)) {
        const P = ATLAS[r.R.patch], f2 = Object.values(P.meta.frames)[0].src, [bx, by, bw, bh] = r.R.box, W2 = bw * mw, H2 = bh * mh, kk = Math.min(W2 / f2.w, H2 / f2.h);
        const dx = Math.round(mx + bx * mw + (W2 - f2.w * kk) / 2), dy = Math.round(my + by * mh + (H2 - f2.h * kk) / 2), dw = Math.round(f2.w * kk), dh = Math.round(f2.h * kk);
        if (r.disabled) { const c = patchGray(P); ctx.drawImage(c, 0, 0, c.width, c.height, dx, dy, dw, dh); } else ctx.drawImage(P.img, f2.x, f2.y, f2.w, f2.h, dx, dy, dw, dh);
      }
      for (const r of regs) if (r.disabled && !r.R.text && !r.R.own) { // locked: the island's heart all gray, its rim gray on land only (the sea stays blue)
        for (const [c, kk] of [[g.land, 1], [g.all, 0.72]]) { ctx.save(); ctx.beginPath(); ctx.ellipse(r.cx, r.cy, r.rx * kk, r.ry * kk, 0, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(c, 0, 0, c.width, c.height, mx, my, mw, mh); ctx.restore(); }
      }
      ctx.imageSmoothingEnabled = false;
    } else { codeArt('ship-map'); ctx.fillStyle = '#1a3a7a'; ctx.fillRect(mx, my, mw, mh); for (const r of regs) if (!r.R.text) { ctx.fillStyle = r.disabled ? '#6a6a72' : '#3a8a4a'; ctx.beginPath(); ctx.ellipse(r.cx, r.cy, r.rx * 0.8, r.ry * 0.8, 0, 0, Math.PI * 2); ctx.fill(); } }
    for (const r of regs) {
      if (r.w === here) ring(ctx, r, '#ffd040', 3);
      else if (r.w === next) ring(ctx, r, 'rgba(110,240,255,' + (0.6 + 0.4 * Math.sin(t * 4)).toFixed(2) + ')', 3, [8, 5]);
      if (r.focused) ring(ctx, r, '#ffffff', 2);
      ctx.font = uiFont(14); ctx.textAlign = 'center';
      const txt = r.w + ' ' + MAP_NAMES[r.w], tw = ctx.measureText(txt).width;
      drawOutlined(ctx, txt, r.cx + (r.disabled ? 8 : 0), r.ly + 5, '#ffffff', '#10101a', 3);
      if (r.disabled) drawLock(ctx, r.cx - tw / 2 - 8, r.ly - 8);
      ctx.font = uiFont(11);
      if (r.w === here) drawOutlined(ctx, '★ You are here', r.cx, r.ly + 19, '#ffe070', '#10101a', 3);
      else if (r.w === next) drawOutlined(ctx, 'Next!', r.cx, r.ly + 19, '#8ff4ff', '#10101a', 3);
      record('button', r.id, r.cx - r.rx * 0.6, r.cy - r.ry * 0.6, r.rx * 1.2, r.ry * 1.2); // centred on the island (tests and the QA agent tap the centre)
    }
    close.focused = panel.buttons[panel.focus] === close; close.draw(ctx);
  };
  return p;
}

// [MEDAL BOARD] The close-up of the medallion board: every slot of the collection (game/ship.js medallionCollection, read
// live from the save), worlds 1-4 on the left and 5-8 on the right, a heading + count per world, each slot a ui-kit socket
// with the medallion's own art (crisp 2x) in full colour when earned or a dark silhouette when not, its name and a
// Collected / Not yet line in white with a thin dark outline. Tap or arrow keys focus a slot (its line shows at the bottom);
// Close (tap, Enter on it, or Escape) returns to the ship. Modal: the ship is paused beneath it.
export function createMedalBoard(view, data) {
  const p = { name: 'ship-panel', modal: true, title: 'Medallion Board', kind: 'medal-board' };
  const L = { TOP: 50, BLOCK: 92, SOCK: 48, MEDAL: 32, PITCH: 80, HEAD: 18 };
  const colW = Math.floor((view.w - 24) / 2), colX = [12, 12 + colW];
  L.PITCH = Math.min(L.PITCH, Math.floor((colW - 14) / 4)); // W7's four slots fit the narrowest (640) view
  const coll = () => medallionCollection(data);
  const where = (w) => ({ x: colX[w <= 4 ? 0 : 1], y: L.TOP + ((w - 1) % 4) * L.BLOCK });
  const slotBtns = coll().slots.map((sl) => {
    const g = where(sl.world), k = coll().worlds[sl.world - 1].slots.findIndex((q) => q.id === sl.id);
    const x = g.x + 4 + k * L.PITCH, y = g.y + L.HEAD;
    return { id: 'medal-' + sl.id, medal: sl.id, x, y, w: L.PITCH - 4, h: L.SOCK + 26, focused: false, disabled: false,
      hit(px, py) { return px >= this.x && px < this.x + this.w && py >= this.y && py < this.y + this.h; }, onClick() { panel.focus = panel.buttons.indexOf(this); }, draw() {} };
  });
  const close = new Button({ id: 'ship-close', x: view.w / 2 - 90, y: view.h - 50, w: 180, h: 44, label: 'Close', onClick: () => p.close() });
  const panel = new Panel([...slotBtns, close]);
  panel.focus = slotBtns.length; // Close first: Enter closes, arrows walk the slots
  p.labels = () => panel.buttons.map((b) => [b.id, b.label || b.medal, false]);
  p.collection = coll; // tests
  p.rebuild = () => {};
  p.close = () => { if (scenes.top() === p) scenes.pop(); };
  p.update = () => {
    if (pressed('pause')) { p.close(); return; }
    panel.update({ pressed, pointer: input.pointer }); // arrows walk the slots + Close; a tap focuses a slot or closes
    panel.buttons.forEach((b, i) => { b.focused = i === panel.focus; });
  };
  p.focusId = () => (panel.buttons[panel.focus] || {}).id; // tests
  const text = (ctx, t, x, y, size, col = '#ffffff') => { ctx.font = uiFont(size); drawOutlined(ctx, t, x, y, col, '#10101a', 2); };
  p.render = (ctx) => {
    const C = coll();
    ctx.fillStyle = 'rgba(8,10,24,0.94)'; ctx.fillRect(0, 0, view.w, view.h);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    text(ctx, 'Medallion Board', view.w / 2, 22, 20, '#ffe070');
    text(ctx, C.got + ' / ' + C.total + ' collected', view.w / 2, 40, 13);
    for (const g of C.worlds) {
      const o = where(g.w);
      drawCell(ctx, o.x, o.y, colW - 6, L.BLOCK - 4, { fill: 'rgba(30,40,80,0.55)' });
      ctx.textAlign = 'left'; text(ctx, 'World ' + g.w + ' · ' + g.name, o.x + 8, o.y + 14, 13, '#ffffff');
      ctx.textAlign = 'right'; text(ctx, g.slots.length ? g.got + ' / ' + g.slots.length : '', o.x + colW - 14, o.y + 14, 13, g.slots.length && g.got === g.slots.length ? '#ffe070' : '#ffffff');
      ctx.textAlign = 'center';
      if (!g.slots.length) { text(ctx, 'No medallions in this world', o.x + colW / 2 - 3, o.y + 52, 12, '#d0d0e0'); continue; }
      g.slots.forEach((sl) => {
        const b = slotBtns.find((q) => q.medal === sl.id), cx = b.x + b.w / 2, sy = b.y;
        if (!drawFoot(ctx, 'ui-kit', 10, cx, sy + L.SOCK, L.SOCK, L.SOCK)) { codeArt('medal-socket'); ctx.fillStyle = '#10101a'; ctx.beginPath(); ctx.arc(cx, sy + L.SOCK / 2, L.SOCK / 2, 0, Math.PI * 2); ctx.fill(); }
        drawBoardMedal(ctx, sl, cx, sy + L.SOCK - 8, L.MEDAL);
        const nm = sl.name, size = fitTextSize(ctx, nm, b.w - 2, 11, CONFIG.FONTS.UI);
        text(ctx, nm, cx, sy + L.SOCK + 10, size, sl.got ? '#ffffff' : '#c8c8d8');
        text(ctx, sl.got ? 'Collected!' : 'Not yet', cx, sy + L.SOCK + 21, 10, sl.got ? '#ffe070' : '#a8a8bc');
        if (b.focused) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y - 2, b.w - 2, b.h + 2); }
        record('button', b.id, b.x, b.y, b.w, b.h);
      });
    }
    const f = panel.buttons[panel.focus], sel = f && f.medal && C.slots.find((q) => q.id === f.medal);
    ctx.textAlign = 'center';
    if (sel) text(ctx, sel.name + ' — World ' + sel.world + ' ' + C.worlds[sel.world - 1].name + ' (' + sel.dungeon + ') · ' + (sel.got ? 'Collected' : 'Not collected yet'), view.w / 2, view.h - 58, 11, sel.got ? '#ffe070' : '#ffffff');
    close.focused = f === close; close.draw(ctx);
  };
  return p;
}

export function createShip(view, data, opts = {}) {
  const map = new TileMap(SHIP_ROOM.W, SHIP_ROOM.H);
  const D0 = SHIP_DOOR.tx, walk = new Set([SG.FLOOR, SG.STAR, SG.STRIP, SG.DOOR]);
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) { // [R1-24] SG: wall top/face, sides, bottom; floor, star floor under the globe, light strips to the hatch
    const v = y === 0 ? SG.TOP : y < 3 ? SG.FACE : y === map.h - 1 ? (x === D0 || x === D0 + 1 ? SG.DOOR : SG.BOTTOM) : x === 0 || x === map.w - 1 ? SG.SIDE
      : x >= 9 && x <= 13 && y >= 7 && y <= 10 ? SG.STAR : (x === D0 || x === D0 + 1) && y >= 11 ? SG.STRIP : SG.FLOOR;
    map.set(x, y, v, walk.has(v) ? 0 : 1);
  }
  for (const st of STATIONS) for (let y = 0; y < st.h; y++) for (let x = 0; x < st.w; x++) map.solid[map.idx(st.tx + x, st.ty + y)] = 1;
  for (const [, , , foot, fp] of SHIP_DECOR) if (fp) for (let y = foot - fp[2]; y < foot; y++) for (let x = fp[0]; x <= fp[1]; x++) map.solid[map.idx(x, y)] = 1;
  map.prerender(shipPainter, 2);
  const hero = createHero(data.hero, SHIP_START.x, SHIP_START.y);
  hero.facing = 'up';
  const npcs = SHIP_NPCS.map((n) => ({ npc: n, x: n.tx * 16 + 8, y: n.ty * 16 + 12, facing: 'down' }));
  const cam = new Camera(view, 'world'); // [P-A][A2]
  const hud = createHud();
  const toast = new Toast();
  const s = { name: 'ship', map, hero, stations: STATIONS, npcs, left: false, toast };
  const near = () => STATIONS.find((st) => hero.x > st.tx * 16 - 20 && hero.x < (st.tx + st.w) * 16 + 20 && hero.y > st.ty * 16 - 8 && hero.y < (st.ty + st.h) * 16 + (st.nearBelow ?? 30));
  const say = (t) => toast.show(t);
  s.doors = [{ x: (SHIP_DOOR.tx + 1) * 16, y: SHIP_DOOR.ty * 16 + 8, w: 2, dir: 'down' }]; // [D35]
  const nearNpc = () => npcs.find((q) => Math.hypot(hero.x - q.x, hero.y - q.y) < 26);
  s.doorArrow = null;

  s.use = (st) => {
    if (st.kind === 'bunks') { restAtBunks(data); save.auto('rest'); say('You feel rested! Hearts full.'); return; }
    if (st.kind === 'map') {
      scenes.push(createWorldMap(view, data, opts.onFly)); // [EARTH MAP] the illustrated world map
      return;
    }
    if (st.kind === 'locker') {
      const pick = { get hero() { return data.hero; }, get time() { return performance.now() / 1000; } }; // [R3-14] the title screen's hero cards
      scenes.push(createPanel(view, 'Locker Room', (p) => [
        ...TITLE_HEROES.map((h, i) => new HeroCard({ id: 'hero-' + h.id, x: view.w / 2 - 275 + i * 190, y: 84, w: 160, h: 236, label: h.name, onClick: () => {
          if (data.hero === h.id) return;
          switchHero(data, h.id); hero.id = h.id; if (opts.onHeroSwitch) opts.onHeroSwitch(h.id); save.auto('hero'); p.rebuild();
        } }, h, pick)),
        new Button({ id: 'ship-close', x: view.w / 2 - 80, y: 380, w: 160, h: 44, label: 'Close', onClick: () => p.close() }),
      ]));
      return;
    }
    if (st.kind === 'gallery') { scenes.push(createMedalBoard(view, data)); return; } // [MEDAL BOARD] the close-up, not a text list
    if (st.kind === 'trophies') {
      const lines = () => {
        const bossed = data.worlds.filter((w) => w.bossBeaten).length;
        const rec = save.store && save.slot ? save.store.loadRecords(save.slot) : {};
        return ['Bosses beaten: ' + bossed, 'Relics: ' + data.worlds.filter((w) => w.relicFound).length + ' / 6', ...trophyLines(rec)];
      };
      scenes.push(createPanel(view, st.name, (p) => [new Button({ id: 'ship-close', x: view.w / 2 - 80, y: 380, w: 160, h: 44, label: 'Close', onClick: () => p.close() })], lines));
      return;
    }
    if (st.kind === 'forge') { // [S56] Smith Nova forges Dawnbreaker from all six relics
      const n = SHIP_NPCS[0], lines = forgeLines(data);
      if (canForge(data)) { forgeDawnbreaker(data); sfx('forge'); playMusic('forge'); save.auto('forge'); }
      scenes.push(createDialogue(view, n.name, lines, () => scenes.pop()));
    }
  };

  s.update = (dt) => {
    updateHud(hud, data, dt);
    toast.update(dt);
    if (pressed('pause') && opts.pause) { opts.pause(); return; } // [D38]
    if (input.pointer.tapped && opts.pause && hudHit(view.w, input.pointer.x, input.pointer.y) === 'pause') { opts.pause(); return; }
    if (s.doorArrow && (s.doorArrow.t -= dt) <= 0) s.doorArrow = null;
    magnet(hero, s.doors, held);
    updateHero(hero, map, dt);
    cam.follow(hero.x, hero.y - 12, map.pxW, map.pxH);
    if (input.pointer.tapped) { // tap a station (nearby) to use it, else tap-to-move
      const w = cam.toWorld(input.pointer.x, input.pointer.y);
      const st = STATIONS.find((q) => w.x >= q.tx * 16 && w.x < (q.tx + q.w) * 16 && w.y >= q.ty * 16 && w.y < (q.ty + q.h) * 16);
      if (st && near() === st) { s.use(st); return; }
      const door = doorAt(s.doors, w.x, w.y);
      if (door) { s.doorArrow = { x: door.x, y: door.y - 8, t: 2 }; setTapTarget(hero, map, door.x, door.y + 4); return; }
      setTapTarget(hero, map, w.x, w.y);
    }
    if (pressed('interact')) {
      const st = near(); if (st) { s.use(st); return; }
      const q = nearNpc(); if (q) { scenes.push(createDialogue(view, q.npc.name, q.npc.lines, () => scenes.pop())); return; }
    }
    const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
    if (ty >= SHIP_DOOR.ty && (tx === SHIP_DOOR.tx || tx === SHIP_DOOR.tx + 1) && !s.left) { s.left = true; save.auto('area'); if (opts.onExit) opts.onExit(); }
  };
  s.render = (ctx) => {
    heroArt.v2 = false; // [P-C] v2 pilot hero art in World 1 only
    layoutBegin();
    cam.follow(hero.x, hero.y - 12, map.pxW, map.pxH);
    ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, view.w, view.h);
    cam.begin(ctx);
    map.draw(ctx, cam);
    const n = near();
    // [R1-15] the user's ship props + crew, y-sorted with the hero (foot = bottom of the 2×2 footprint)
    const items = [
      { y: -1e4, draw: () => drawShipProp(ctx, 'ship-room-2x', 13, (SHIP_DOOR.tx + 1) * 16 - cam.x, map.h * 16 - cam.y, false, 2) }, // the round exit hatch (floor level)
      ...SHIP_DECOR.map(([sh, f, cx, foot, fp]) => ({ y: foot * 16 - (fp ? 0 : 999), draw: () => drawShipProp(ctx, sh, f, cx * 16 - cam.x, foot * 16 - cam.y, !!fp) })),
      ...STATIONS.map((st) => ({ y: (st.ty + st.h) * 16, draw: () => (st.board ? drawMedalBoard(ctx, st, st.tx * 16 - cam.x, st.ty * 16 - cam.y, medallionCollection(data), st === n) : drawStation(ctx, st, st.tx * 16 - cam.x, st.ty * 16 - cam.y, st === n)) })), // [MEDAL BOARD] read live from the save
      ...npcs.map((q) => ({ y: q.y, draw: () => drawNpc(ctx, q, q.x - cam.x, q.y - cam.y) })),
      { y: hero.y, draw: () => drawHero(ctx, hero, cam) },
    ];
    // [R3-13] no plaques or captions in the ship; [R3e] the stations' names come back as plain white text (no blue bar)
    items.push({ y: -500, draw: () => { for (const st of STATIONS) drawStationText(ctx, st, st.tx * 16 - cam.x, st.ty * 16 - cam.y, st === n); } });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    drawDoorArrow(ctx, s.doorArrow, cam.x, cam.y);
    cam.end(ctx);
    drawHud(ctx, hud, data, view, { ap: data.ap, apCap: apCapOf(), band: currentBand() });
    toast.draw(ctx, view.w);
  };
  data.location = { ...data.location, area: 'ship' };
  save.auto('area');
  return s;
}
