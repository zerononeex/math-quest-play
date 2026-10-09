// Shop: this world's 6 gear items + consumables, "Old gear" tab (earlier tiers). OWNED / FULL labels, Buy greys out
// at the cap or without enough gold, unique items refuse duplicates, stat preview for gear.
// [SHOP MENU] themed: the keeper at 2x with a speech bubble, items as big cards on wooden shelves (the user's item /
// weapon / armour icons, coin prices, dim + red price when too dear, OWNED / FULL stamps), big coin count, blue Bye!.
import { Button, layoutBegin, record, drawCell, cellText, uiFont } from '../engine/ui.js';
import { ATLAS, imgReady, drawSprite } from '../engine/atlas.js';
import { CONFIG } from '../config.js';
import { drawNpc } from '../art/fallback/npcs.js';
import { sfx } from '../engine/audio.js';
import { font, drawOutlined } from '../engine/text.js';
import { pressed, input } from '../engine/input.js';
import { GEAR, gearIcon } from '../data/gear.js';
import { owns, grantGear } from '../game/gear.js';
import { canBuy, buy, shopPrice } from '../game/items.js';
import { statLine } from './equipment.js';
import { save } from '../engine/save.js';

const SH = CONFIG.UI.SHOP, ROWS = SH.COLS * SH.ROWS; // cards per page

// the user's icon for a stock line → [sheet, frame] (null = code fallback)
function itemIcon(it) {
  if (it.kind === 'item') return ['icons-items', it.id === 'potion' ? 'potion' : 'bomb'];
  return gearIcon(it.id);
}
function fitIcon(ctx, ic, cx, cy, size) {
  if (!ic || !imgReady(ic[0]) || !ATLAS[ic[0]].meta.frames[ic[1]]) return false;
  const f = ATLAS[ic[0]].meta.frames[ic[1]], k = size / Math.max(f.w, f.h);
  drawSprite(ctx, ic[0], ic[1], Math.round(cx - (f.w * k) / 2), Math.round(cy - (f.h * k) / 2), { scale: k });
  return true;
}
const coin = (ctx, cx, cy, size) => { if (!fitIcon(ctx, ['icons-items', 'coin'], cx, cy, size)) { ctx.fillStyle = '#ffd040'; ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2); ctx.fill(); } };

export function shopStock(world, tab) {
  const tiers = tab === 'old' ? Array.from({ length: world - 1 }, (_, i) => i + 1) : [world];
  const gear = [];
  for (const t of tiers) for (const k of ['wpn-rowan-', 'wpn-milo-', 'wpn-wren-', 'helmet-', 'chest-', 'boots-']) gear.push({ kind: 'gear', id: k + t });
  return tab === 'old' ? gear : [...gear, { kind: 'item', id: 'potion' }, { kind: 'item', id: 'bombs' }];
}

export function createShop(view, data, world, keeper, onClose, keeperEnt = null) {
  const s = { name: 'shop', modal: true, tab: 'new', scroll: 0, sel: null, msg: '' };
  const status = (it) => {
    if (it.kind === 'gear') { const g = GEAR[it.id]; return owns(data, it.id) ? 'owned' : data.gold >= g.price ? 'ok' : 'gold'; }
    return canBuy(data, it.id, world);
  };
  const price = (it) => (it.kind === 'gear' ? GEAR[it.id].price : shopPrice(it.id, world));
  const name = (it) => (it.kind === 'gear' ? GEAR[it.id].name : it.id === 'potion' ? 'Potion (' + data.items.potions + '/5)' : 'Bombs ×5 (' + data.items.bombs + '/20)');
  function purchase(it) {
    const st = status(it);
    if (st !== 'ok') { s.msg = st === 'owned' ? 'You already own that!' : st === 'cap' ? 'Your bag is full!' : st === 'locked' ? 'You need a Bomb Bag first.' : 'Not enough gold.'; return false; }
    if (it.kind === 'gear') { data.gold -= GEAR[it.id].price; grantGear(data, it.id); } else buy(data, it.id, world);
    s.msg = 'Thank you!'; sfx('coin'); s.hop = { it, t: 0.5 }; // a soft clink + the item hops into the bag
    save.auto('shop');
    build();
    return true;
  }
  function build() {
    const list = shopStock(world, s.tab);
    s.scroll = Math.max(0, Math.min(s.scroll, Math.ceil((list.length - ROWS) / SH.COLS) * SH.COLS));
    const gx = SH.LEFT + 12, gw = view.w - gx - 12, cw = Math.floor((gw - (SH.COLS - 1) * SH.GAP - 44) / SH.COLS), ch = SH.CARD_H;
    s.grid = { x: gx, w: gw, y: SH.TOP };
    const b = [];
    if (world > 1) { // tabs only when there are old tiers to show
      b.push(new Button({ id: 'tab-new', x: gx, y: 60, w: 140, h: 34, label: 'This world', color: s.tab === 'new' ? '#8a5a1a' : '#3a3a5a', onClick: () => { s.tab = 'new'; s.scroll = 0; build(); } }));
      b.push(new Button({ id: 'tab-old', x: gx + 150, y: 60, w: 140, h: 34, label: 'Old gear', color: s.tab === 'old' ? '#8a5a1a' : '#3a3a5a', onClick: () => { s.tab = 'old'; s.scroll = 0; build(); } }));
    }
    b.push(new Button({ id: 'shop-up', x: view.w - 12 - 40, y: SH.TOP, w: 40, h: 40, label: '▲', onClick: () => { s.scroll -= SH.COLS; build(); } }));
    b.push(new Button({ id: 'shop-down', x: view.w - 12 - 40, y: SH.TOP + SH.ROWS * (ch + SH.GAP) - SH.GAP - 40, w: 40, h: 40, label: '▼', onClick: () => { s.scroll += SH.COLS; build(); } }));
    b.push(new Button({ id: 'shop-close', x: view.w - 12 - 140, y: view.h - 58, w: 140, h: 46, label: 'Bye!', fontSize: 22, onClick: onClose })); // the one blue button style
    list.slice(s.scroll, s.scroll + ROWS).forEach((it, i) => {
      const st = status(it);
      const lbl = name(it) + '  ' + (st === 'owned' ? 'OWNED' : st === 'cap' ? 'FULL' : price(it) + 'g');
      const btn = new Button({ id: 'buy-' + it.id, x: gx + (i % SH.COLS) * (cw + SH.GAP), y: SH.TOP + Math.floor(i / SH.COLS) * (ch + SH.GAP), w: cw, h: ch, label: lbl, onClick: () => { s.sel = it; purchase(it); } });
      btn.disabled = st !== 'ok';
      btn.item = it; btn.st = st;
      btn.draw = (ctx) => drawCard(ctx, btn);
      b.push(btn);
    });
    s.buttons = b;
  }
  build();
  s.update = () => {
    if (pressed('pause') || pressed('interact')) { onClose(); return; }
    if (input.wheel) { s.scroll += input.wheel; build(); }
    if (input.pointer.tapped) {
      const b = s.buttons.find((x) => input.pointer.x >= x.x && input.pointer.x < x.x + x.w && input.pointer.y >= x.y && input.pointer.y < x.y + x.h);
      if (b) { if (b.item) s.sel = b.item; if (!b.disabled) b.onClick(b); else if (b.item) purchase(b.item); }
    }
  };
  function drawCard(ctx, b) {
    const it = b.item, st = b.st, sel = s.sel === it, dim = st !== 'ok' && st !== 'owned';
    ctx.fillStyle = '#10101a'; ctx.fillRect(b.x - 1, b.y + b.h - 4, b.w + 2, 8); // the shelf board under the card
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(b.x - 1, b.y + b.h - 3, b.w + 2, 5); ctx.fillStyle = '#b07a3a'; ctx.fillRect(b.x - 1, b.y + b.h - 3, b.w + 2, 1);
    ctx.globalAlpha = dim ? 0.55 : 1;
    drawCell(ctx, b.x, b.y, b.w, b.h - 4, { fill: '#f0e2c0', edge: '#5a3a1a', sel });
    const hop = s.hop && s.hop.it === it ? Math.sin((s.hop.t / 0.5) * Math.PI) * 10 : 0;
    if (!fitIcon(ctx, itemIcon(it), b.x + b.w / 2, b.y + 40 - hop, SH.ICON)) { ctx.fillStyle = '#8a8a9a'; ctx.fillRect(b.x + b.w / 2 - 14, b.y + 20 - hop, 28, 28); }
    cellText(ctx, name(it), b.x + b.w / 2, b.y + 82, Math.min(15, (b.w - 8) / Math.max(6, name(it).length) * 1.8), '#3a2410');
    ctx.globalAlpha = 1;
    if (st === 'owned' || st === 'cap') { // a stamp across the card
      ctx.save(); ctx.translate(b.x + b.w / 2, b.y + 42); ctx.rotate(-0.25); ctx.strokeStyle = '#c03030'; ctx.lineWidth = 2; ctx.strokeRect(-36, -11, 72, 22);
      ctx.font = uiFont(14); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#c03030'; ctx.fillText(st === 'owned' ? 'OWNED' : 'FULL', 0, 1); ctx.restore();
    } else {
      coin(ctx, b.x + b.w / 2 - 16, b.y + 106, 18);
      ctx.font = uiFont(16); ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = st === 'ok' ? '#3a2410' : '#d02020'; ctx.fillText(String(price(it)), b.x + b.w / 2 - 4, b.y + 107);
    }
    record('button', b.id, b.x, b.y, b.w, b.h);
  }
  s.render = (ctx) => {
    layoutBegin();
    if (s.hop && (s.hop.t -= 1 / 60) <= 0) s.hop = null;
    ctx.fillStyle = '#141424'; ctx.fillRect(0, 0, view.w, 44); // a solid title strip (the HUD stays hidden under it)
    ctx.fillStyle = '#4a2e16'; ctx.fillRect(0, 44, view.w, view.h - 44); // shop wall boards
    ctx.fillStyle = '#3a2410'; for (let x = 0; x < view.w; x += 24) ctx.fillRect(x, 44, 1, view.h - 44);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(20);
    drawOutlined(ctx, keeper + "'s Shop", view.w / 2, 24, '#ffe070');
    coin(ctx, view.w - 120, 24, 28); ctx.textAlign = 'left'; ctx.font = uiFont(24); ctx.fillStyle = '#ffd040'; ctx.fillText(String(data.gold), view.w - 100, 25);
    // the keeper at 2x on the left + a speech bubble
    const kx = SH.LEFT / 2, ky = SH.TOP + 170;
    ctx.fillStyle = '#6a4222'; ctx.fillRect(8, ky - 6, SH.LEFT - 10, 14); // counter top
    if (keeperEnt) { ctx.save(); ctx.translate(kx, ky); ctx.scale(2, 2); drawNpc(ctx, keeperEnt, 0, 0); ctx.restore(); }
    const bw = SH.LEFT - 12, bx = 6, by = SH.TOP - 4, line = s.msg || 'Welcome, hero! Need anything?';
    const lines = line.split(/(?<=[,!?.]) /), bh = 16 + lines.length * 20;
    drawCell(ctx, bx, by, bw, bh, { fill: '#ffffff', edge: '#10101a' });
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(kx - 6, by + bh - 1); ctx.lineTo(kx + 6, by + bh - 1); ctx.lineTo(kx, by + bh + 10); ctx.fill();
    lines.forEach((l, i) => cellText(ctx, l, bx + bw / 2, by + 18 + i * 20, Math.min(16, ((bw - 10) / l.length) * 1.9), '#10101a'));
    for (const b of s.buttons) b.draw(ctx);
    if (s.sel && s.sel.kind === 'gear') { // what the gear changes, under the keeper
      const g = GEAR[s.sel.id];
      const copy = JSON.parse(JSON.stringify(data));
      if (g.slot === 'weapon') copy.gearEquipped.weapon[g.hero] = g.id; else copy.gearEquipped[g.slot] = g.id;
      copy.hero = g.hero || data.hero;
      const now = statLine({ ...data, hero: copy.hero }), next = statLine(copy);
      ctx.textAlign = 'left'; ctx.font = font(14);
      [['STR', 'str'], ['DEF', 'def'], ['Hearts', 'hearts'], ['AP max', 'ap'], ['Luck', 'luck']].filter(([, k]) => next[k] !== now[k]).forEach(([l, k], i) => drawOutlined(ctx, `${l} ${now[k]} → ${next[k]}`, 12, ky + 28 + i * 22, next[k] > now[k] ? '#80ff90' : '#ffffff'));
    }
  };
  return s;
}
