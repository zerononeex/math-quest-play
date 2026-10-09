// Equipment screen (pause → Equipment, or P): 4 slots → owned list → stat diff preview → Confirm.
import { Button, layoutBegin } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { pressed, input } from '../engine/input.js';
import { GEAR, SLOTS, gearIcon } from '../data/gear.js';
import { drawPainting } from '../art/fallback/title.js';
import { codeArt } from '../engine/atlas.js';
import { equip, unequip, ownedFor } from '../game/gear.js';
import { damageDealt, totalDef, totalLuck } from '../game/stats.js';
import { maxHeartsOf } from '../game/progression.js';
import { apCapOf } from '../game/ap.js';
import { save } from '../engine/save.js';

const LABEL = { weapon: 'Weapon', helmet: 'Helmet', chest: 'Chest', boots: 'Boots' };

export function statLine(d) { return { str: damageDealt(d), def: totalDef(d), hearts: maxHeartsOf(d), ap: apCapOf(d), luck: totalLuck(d) }; }

export function createEquipment(view, data, onClose) {
  const e = { name: 'equipment', modal: true, slot: null, pick: null, buttons: [] };
  const cur = (slot) => (slot === 'weapon' ? data.gearEquipped.weapon[data.hero] : data.gearEquipped[slot]);
  // Preview: stats if `id` (or null = unequip) went into the selected slot.
  e.preview = (id) => {
    const copy = JSON.parse(JSON.stringify(data));
    if (e.slot === 'weapon') copy.gearEquipped.weapon[data.hero] = id; else copy.gearEquipped[e.slot] = id;
    return { now: statLine(data), next: statLine(copy) };
  };
  const build = () => {
    const b = [];
    const x0 = Math.round(view.w / 2 - 290);
    SLOTS.forEach((s, i) => {
      const id = cur(s);
      b.push(new Button({ id: 'eq-' + s, x: x0, y: 70 + i * 56, w: 220, h: 48, label: LABEL[s] + ': ' + (id ? GEAR[id].name : '—'), icon: id ? gearIcon(id) : null, color: e.slot === s ? '#8a5a1a' : '#2a4a8a', onClick: () => { e.slot = s; e.pick = null; build(); } }));
    });
    if (e.slot) {
      const list = ownedFor(data, e.slot);
      list.slice(0, 7).forEach((g, i) => b.push(new Button({ id: 'item-' + g.id, x: x0 + 240, y: 70 + i * 44, w: 200, h: 38, label: g.name, icon: gearIcon(g.id), color: e.pick === g.id ? '#1a7a3a' : '#3a3a5a', onClick: () => { e.pick = g.id; build(); } })));
      if (cur(e.slot)) b.push(new Button({ id: 'item-none', x: x0 + 240, y: 70 + Math.min(7, list.length) * 44, w: 200, h: 38, label: 'Take off', color: e.pick === 'none' ? '#1a7a3a' : '#5a3a3a', onClick: () => { e.pick = 'none'; build(); } }));
      if (e.pick) b.push(new Button({ id: 'eq-confirm', x: x0 + 460, y: 360, w: 120, h: 44, label: 'Confirm', color: '#1a7a3a', onClick: confirm }));
    }
    b.push(new Button({ id: 'eq-close', x: x0, y: 400, w: 120, h: 40, label: 'Close', color: '#3a3a5a', onClick: onClose }));
    e.buttons = b;
  };
  function confirm() {
    if (e.pick === 'none') unequip(data, e.slot); else equip(data, e.pick);
    save.auto('equip');
    e.pick = null;
    build();
  }
  build();
  e.update = () => {
    if (pressed('pause') || pressed('equip')) { onClose(); return; }
    if (input.pointer.tapped) { const b = e.buttons.find((x) => x.hit(input.pointer.x, input.pointer.y)); if (b) b.onClick(b); }
  };
  e.render = (ctx) => {
    layoutBegin();
    // [R2-19] the user's screen-inventory painting (adventurer's workbench), dimmed; code fallback: a dark veil
    if (drawPainting(ctx, 'screen-inventory', view.w, view.h)) { ctx.fillStyle = 'rgba(8,8,24,0.45)'; ctx.fillRect(0, 0, view.w, view.h); }
    else { codeArt('equipment-backdrop'); ctx.fillStyle = 'rgba(8,8,24,0.88)'; ctx.fillRect(0, 0, view.w, view.h); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font(20);
    drawOutlined(ctx, 'Equipment — ' + data.hero, view.w / 2, 40, '#ffe070');
    for (const b of e.buttons) b.draw(ctx);
    if (e.pick) {
      const p = e.preview(e.pick === 'none' ? null : e.pick);
      ctx.textAlign = 'left'; ctx.font = font(14);
      const x = Math.round(view.w / 2 + 170);
      [['STR', 'str'], ['DEF', 'def'], ['Hearts', 'hearts'], ['AP max', 'ap'], ['Luck', 'luck']].forEach(([l, k], i) => {
        const a = p.now[k], n = p.next[k];
        drawOutlined(ctx, `${l} ${a} → ${n}`, x, 90 + i * 24, n > a ? '#80ff90' : n < a ? '#ff8080' : '#ffffff');
      });
    }
  };
  return e;
}
