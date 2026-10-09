// Title (SPEC 2.11, S57 living vista; [A8c] v2 front end): a step-by-step front end on the title painting, every button and
// panel from the user's UI sheets (code boxes only while a sheet is missing):
//   title  — the logo + the three heroes walking (v2 walk sheets, one integer scale) → "Tap to start"
//   slots  — 3 save slots (parchment cards), Continue / New Game (two-tap erase on a used slot), records plaque + trophy shelf
//   hero   — pick Rowan / Milo / Wren (framed cards, the picked one walks)
//   tier   — Little Hero / Adventurer / Master [D54] with their badges and one kid-friendly line each → Let's go!
// Enter always moves on (Continue when the slot has a save); the back arrow returns one step.
import { CONFIG } from '../config.js';
import { Button, Panel, layoutBegin, record, drawCell, cellText } from '../engine/ui.js';
import { font, drawOutlined, fitTextSize } from '../engine/text.js';
import { pressed, input } from '../engine/input.js';
import { save } from '../engine/save.js';
import { drawTitleVista, drawPainting } from '../art/fallback/title.js';
import { drawSprite, imgReady, frameSize, ATLAS } from '../engine/atlas.js';

export const HEROES = [
  { id: 'rowan', name: 'Rowan', role: 'the Bladebound', body: '#2aa8a0', hair: '#a0522d', acc: '#c0c0c8' },
  { id: 'milo', name: 'Milo', role: 'the Brawler', body: '#d83a3a', hair: '#4a3020', acc: '#f0f0f0' },
  { id: 'wren', name: 'Wren', role: 'the Inkling', body: '#4a7ad8', hair: '#f08030', acc: '#40e0a0' },
];
export const TIERS = [
  { id: 'little', name: 'Little Hero', line: 'Gentle foes and extra time. Great for starting out!' },
  { id: 'adventurer', name: 'Adventurer', line: 'A fair fight. The way the quest was meant to be.' },
  { id: 'master', name: 'Master', line: 'Tougher bosses and trickier sums.' },
];

function drawHeroCode(ctx, h, cx, cy, s) {
  ctx.fillStyle = '#10101a';
  ctx.fillRect(cx - 7 * s, cy - 14 * s, 14 * s, 28 * s);
  ctx.fillStyle = h.body; ctx.fillRect(cx - 6 * s, cy - 2 * s, 12 * s, 12 * s);
  ctx.fillStyle = '#f0c8a0'; ctx.fillRect(cx - 5 * s, cy - 11 * s, 10 * s, 9 * s);
  ctx.fillStyle = h.hair; ctx.fillRect(cx - 6 * s, cy - 14 * s, 12 * s, 4 * s);
  ctx.fillStyle = '#303040'; ctx.fillRect(cx - 5 * s, cy + 10 * s, 4 * s, 4 * s); ctx.fillRect(cx + 1 * s, cy + 10 * s, 4 * s, 4 * s);
}
// A hero standing / walking on the spot, feet at (cx, footY): v2 walk sheet at scale k (2 = one art pixel per view pixel).
function drawWalker(ctx, hero, cx, footY, k, t, walking) {
  const sheet = 'hero-' + hero.id;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, footY - 2, 7 * k, 1.6 * k, 0, 0, Math.PI * 2); ctx.fill();
  if (!imgReady(sheet)) { drawHeroCode(ctx, hero, cx, footY - 14 * k / 2.2, k / 1.6); return; }
  const fr = walking ? 'down' + [0, 1, 0, 2][Math.floor(t * 7) % 4] : 'down0', f = ATLAS[sheet].meta.frames[fr] || ATLAS[sheet].meta.frames.down0;
  const [fw] = frameSize(sheet), bob = walking && Math.floor(t * 7) % 2 ? -k / 2 : 0;
  drawSprite(ctx, sheet, fr, Math.round(cx - (fw * k) / 2), Math.round(footY - (f.bb ? f.bb[3] : f.h) * k + bob), { scale: k });
}
function heading(ctx, text, x, y, size = 22) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(size, CONFIG.FONTS.DISPLAY); drawOutlined(ctx, text, x, y, '#ffe070', '#3a1a00', 3); }
function icon(ctx, sheet, i, x, y, size) { // a UI icon fitted into a size×size box
  if (!imgReady(sheet)) return false;
  const n = Object.keys(ATLAS[sheet].meta.frames)[i], f = ATLAS[sheet].meta.frames[n], k = size / Math.max(f.w, f.h);
  return drawSprite(ctx, sheet, n, Math.round(x + (size - f.w * k) / 2), Math.round(y + (size - f.h * k) / 2), { scale: k });
}

// [R2-19] the user's hero-portraits (frames 0 Rowan, 1 Milo, 2 Wren) in a round frame; false while the sheet is missing
function portrait(ctx, hero, cx, cy, d) {
  const i = HEROES.findIndex((h) => h.id === hero.id);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.fillStyle = '#1a2a5a'; ctx.fill(); ctx.clip();
  const ok = icon(ctx, 'hero-portraits', i, cx - d / 2, cy - d / 2, d); ctx.restore();
  if (ok) { ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.stroke(); }
  return ok;
}

export class HeroCard extends Button { // also the ship's locker [R3-14]
  constructor(opts, hero, title) { super(opts); this.hero = hero; this.title = title; }
  draw(ctx) {
    const sel = this.title.hero === this.hero.id, t = this.title.time || 0;
    drawCell(ctx, this.x, this.y, this.w, this.h, { sel, focus: this.focused }); // [R1-17] clean cell
    portrait(ctx, this.hero, this.x + this.w / 2, this.y + 40, 64);
    drawWalker(ctx, this.hero, this.x + this.w / 2, this.y + this.h - 56, 4, t, sel);
    cellText(ctx, this.hero.name, this.x + this.w / 2, this.y + this.h - 36, 20, sel ? '#fff4b0' : '#ffffff');
    cellText(ctx, this.hero.role, this.x + this.w / 2, this.y + this.h - 15, fitTextSize(ctx, this.hero.role, this.w - 16, 14, CONFIG.FONTS.UI), '#dfe8ff');
    record('button', this.id, this.x, this.y, this.w, this.h);
  }
}

class SlotCard extends Button {
  constructor(opts, n, title, data) { super(opts); this.n = n; this.title = title; this.data = data; }
  draw(ctx) {
    const sel = this.title.slot === this.n, d = this.data;
    drawCell(ctx, this.x, this.y, this.w, this.h, { sel, focus: this.focused }); // [R1-17] clean cell
    cellText(ctx, 'Slot ' + this.n, this.x + this.w / 2, this.y + 20, 20, sel ? '#fff4b0' : '#ffffff');
    if (!d) cellText(ctx, 'Empty', this.x + this.w / 2, this.y + this.h / 2 + 8, 18, '#dfe8ff');
    else {
      const h = HEROES.find((x) => x.id === d.hero) || HEROES[0], w = (d.worlds || []).filter((x) => x.unlocked).length || 1;
      if (!portrait(ctx, h, this.x + 36, this.y + 80, 52)) drawWalker(ctx, h, this.x + 40, this.y + this.h - 14, 2, this.title.time || 0, sel);
      cellText(ctx, h.name, this.x + 70, this.y + 54, 17, '#ffffff', 'left'); cellText(ctx, 'Level ' + (d.level || 1), this.x + 70, this.y + 78, 17, '#ffffff', 'left'); cellText(ctx, 'World ' + w, this.x + 70, this.y + 102, 17, '#ffffff', 'left');
    }
    record('button', this.id, this.x, this.y, this.w, this.h);
  }
}

class TierRow extends Button {
  constructor(opts, tier, i, title) { super(opts); this.tier = tier; this.i = i; this.title = title; }
  draw(ctx) {
    const sel = this.title.tier === this.tier.id;
    drawCell(ctx, this.x, this.y, this.w, this.h, { sel, focus: this.focused }); // [R1-17] clean cell
    if (!icon(ctx, 'ui-difficulty', this.i, this.x + 8, this.y + 4, this.h - 8)) { ctx.fillStyle = '#ffd040'; ctx.fillRect(this.x + 14, this.y + 12, this.h - 24, this.h - 24); }
    cellText(ctx, this.tier.name, this.x + this.h + 12, this.y + this.h / 2 - 11, 19, sel ? '#fff4b0' : '#ffffff', 'left');
    cellText(ctx, this.tier.line, this.x + this.h + 12, this.y + this.h / 2 + 12, fitTextSize(ctx, this.tier.line, this.w - this.h - 24, 15, CONFIG.FONTS.UI), '#dfe8ff', 'left');
    record('button', this.id, this.x, this.y, this.w, this.h);
  }
}

export function createTitle(view, { onStart }) {
  const store = save.store;
  const settings = store.loadSettings();
  const t = { name: 'title', step: 'title', slot: settings.lastSlot, hero: 'rowan', tier: 'adventurer', confirmErase: false, panel: null, ox: 0 };
  const go = (step) => { t.step = step; t.confirmErase = false; t.panel = null; build(); };
  t.go = go; // tools/vshot.js + tests jump straight to a step
  const selectSlot = (n) => { t.slot = n; t.confirmErase = false; const d = store.load(n); if (d) { t.hero = d.hero; t.tier = d.tier; } build(); };
  const newGame = () => { // on a used slot the first tap asks (Erase & start?), the second goes on to hero select
    if (store.exists(t.slot) && !t.confirmErase) { t.confirmErase = true; build(); return; }
    go('hero');
  };
  const startNew = () => {
    const data = store.newGame(t.slot, { hero: t.hero, tier: t.tier });
    store.writeSettings({ ...store.loadSettings(), lastSlot: t.slot });
    onStart({ slot: t.slot, data, isNew: true });
  };
  const cont = () => {
    const data = store.load(t.slot);
    if (!data) return;
    store.writeSettings({ ...store.loadSettings(), lastSlot: t.slot });
    onStart({ slot: t.slot, data, isNew: false });
  };
  const back = { title: null, slots: 'title', hero: 'slots', tier: 'hero' };
  function build() {
    const ox = (t.ox = Math.round((view.w - CONFIG.VIEW.ROOM_W) / 2)), b = [];
    let def = null;
    if (back[t.step]) b.push(new Button({ id: 'back', x: ox + 8, y: 12, w: 64, h: 44, label: '◀', onClick: () => go(back[t.step]) }));
    if (t.step === 'title') {
      b.push(new Button({ id: 'start', x: ox + 210, y: 392, w: 220, h: 56, label: 'Tap to start', fontSize: 20, onClick: () => go('slots') })); def = 'start';
    } else if (t.step === 'slots') {
      for (let n = 1; n <= 3; n++) b.push(new SlotCard({ id: 'slot' + n, x: ox + 30 + (n - 1) * 200, y: 76, w: 180, h: 140, label: 'Slot ' + n, onClick: () => selectSlot(n) }, n, t, store.load(n)));
      const has = store.exists(t.slot);
      if (has) {
        b.push(new Button({ id: 'continue', x: ox + 130, y: 238, w: 180, h: 54, label: 'Continue', fontSize: 20, onClick: cont }));
        b.push(new Button({ id: 'new', x: ox + 330, y: 238, w: 180, h: 54, label: t.confirmErase ? 'Erase & start?' : 'New Game', color: t.confirmErase ? '#a82a2a' : '#2a4a8a', fontSize: 18, onClick: newGame }));
      } else b.push(new Button({ id: 'new', x: ox + 230, y: 238, w: 180, h: 54, label: 'New Game', fontSize: 20, onClick: newGame }));
      def = has ? 'continue' : 'new';
    } else if (t.step === 'hero') {
      HEROES.forEach((h, i) => b.push(new HeroCard({ id: 'hero-' + h.id, x: ox + 50 + i * 190, y: 84, w: 160, h: 236, label: h.name, onClick: () => { t.hero = h.id; } }, h, t)));
      b.push(new Button({ id: 'hero-ok', x: ox + 210, y: 350, w: 220, h: 56, label: 'Next ▶', fontSize: 20, onClick: () => go('tier') })); def = 'hero-ok';
    } else {
      TIERS.forEach((tr, i) => b.push(new TierRow({ id: 'tier-' + tr.id, x: ox + 60, y: 96 + i * 80, w: 520, h: 62, label: tr.name, onClick: () => { t.tier = tr.id; } }, tr, i, t)));
      b.push(new Button({ id: 'play', x: ox + 210, y: 380, w: 220, h: 56, label: "Let's go!", fontSize: 20, onClick: startNew })); def = 'play';
    }
    const focus = t.panel ? t.panel.buttons[t.panel.focus] : null;
    t.panel = new Panel(b);
    const fi = focus ? b.findIndex((x) => x.id === focus.id) : -1;
    t.panel.focus = fi >= 0 ? fi : b.findIndex((x) => x.id === def);
  }
  build();
  // Tap/click activates a button; arrows move focus, Space/E activates the focused one; Enter moves on.
  t.time = 0;
  t.update = (dt = 1 / 60) => {
    t.time += dt;
    if (t.ox !== Math.round((view.w - CONFIG.VIEW.ROOM_W) / 2)) build();
    if (pressed('confirm')) {
      if (t.step === 'title') go('slots');
      else if (t.step === 'slots') { if (store.exists(t.slot)) cont(); else go('hero'); }
      else if (t.step === 'hero') go('tier');
      else startNew();
      return;
    }
    const hit = t.panel.update({ pressed: (a) => (a === 'confirm' ? pressed('attack') || pressed('interact') : pressed(a)), pointer: input.pointer });
    if (hit && (hit.id.startsWith('hero') || hit.id.startsWith('tier'))) build();
  };
  t.render = (ctx) => {
    layoutBegin();
    if (t.step !== 'slots' || !drawPainting(ctx, 'screen-save', view.w, view.h)) drawTitleVista(ctx, view.w, view.h, t.time); // [S57] living title painting; [R2-19] save slots on the user's screen-save lanterns
    const ox = t.ox, cx = view.w / 2;
    if (t.step === 'title') {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(34, CONFIG.FONTS.DISPLAY);
      drawOutlined(ctx, 'Math Quest', cx, 62, '#ffe070', '#3a1a00', 4);
      ctx.font = font(26, CONFIG.FONTS.DISPLAY); drawOutlined(ctx, '8 Worlds', cx, 104, '#ffffff', '#3a1a00', 4);
      HEROES.forEach((h, i) => drawWalker(ctx, h, cx + (i - 1) * 120, 352, 4, t.time + i * 0.21, true)); // the three heroes on parade
    } else heading(ctx, { slots: 'Choose a save', hero: 'Pick your hero', tier: 'How tough?' }[t.step], cx, 36);
    t.panel.draw(ctx);
    if (t.step !== 'slots') return;
    // Records plaque + trophy shelf for the highlighted slot.
    const r = store.loadRecords(t.slot);
    drawCell(ctx, ox + 30, 316, 380, 120, { fill: CONFIG.CELL.DARK });
    const rt = r.bestRushTime == null ? '--:--' : Math.floor(r.bestRushTime / 60) + ':' + String(Math.floor(r.bestRushTime % 60)).padStart(2, '0');
    cellText(ctx, 'Slot ' + t.slot + '  Best rush ' + rt, ox + 56, 360, 16, '#ffffff', 'left');
    cellText(ctx, 'Best waves ' + r.bestWaves + '   Best streak ' + r.bestStreak, ox + 56, 392, 16, '#ffffff', 'left');
    record('plaque', 'plaque', ox + 30, 316, 380, 120);
    drawCell(ctx, ox + 430, 316, 180, 120, { fill: CONFIG.CELL.DARK });
    for (let i = 0; i < 6; i++) {
      const got = r.trophies.length > i, x = ox + 446 + (i % 3) * 50, y = 360 + Math.floor(i / 3) * 34;
      if (!icon(ctx, 'ui-kit', got ? 4 : 5, x, y, 30)) { ctx.fillStyle = got ? '#ffd040' : '#4a3a2a'; ctx.fillRect(x + 7, y + 3, 16, 24); }
    }
    record('shelf', 'shelf', ox + 430, 316, 180, 120);
  };
  return t;
}
