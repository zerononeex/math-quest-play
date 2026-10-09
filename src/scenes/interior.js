// Building interior: small room, exit rug (step on it to leave), NPCs who live inside, HUD. Autosaves on transitions.
import { CONFIG } from '../config.js';
import { Camera } from '../engine/camera.js';
import { input, pressed, held } from '../engine/input.js';
import { doorAt, magnet, drawDoorArrow } from '../game/doortap.js';
import { scenes } from '../engine/scenes.js';
import { layoutBegin } from '../engine/ui.js';
import { font, drawOutlined } from '../engine/text.js';
import { createHero, updateHero, drawHero, setTapTarget, heroArt } from '../game/hero.js';
import { createEntities } from '../game/entities.js';
import { buildInterior, interiorPainter, spawnNpcs, updateNpc, createDialogue } from '../game/towns.js';
import { drawNpc } from '../art/fallback/npcs.js';
import { interiorPasses, interiorArtReady, interiorSolids, drawInteriorFront } from '../game/interiorpaint.js';
import { createHud, updateHud, drawHud, hudHit } from '../game/hud.js';
import { currentBand, apCapOf } from '../game/ap.js';
import { save } from '../engine/save.js';
import { createShop } from './shop.js';

export function createInterior(view, data, door, town, onExit, opts = {}) {
  const room = buildInterior(door.b);
  const wid = data.location.world; // [V5] the user's interior/furniture/shop art when loaded
  room.map.prerender(interiorArtReady(wid) ? interiorPasses(door.b, town, wid, room.map) : interiorPainter(door.b));
  const art = interiorArtReady(wid); if (art) interiorSolids(door.b, town, wid, room.map); // [SOLID FURNITURE]
  const hero = createHero(data.hero, room.start.x, room.start.y);
  hero.facing = 'up';
  const ents = createEntities();
  const npcs = spawnNpcs(ents, town, { tx: 0, ty: 0 }, door.id);
  // [V5] rooms are drawn at 2× (a 14×10 room otherwise sits tiny in a black screen); taps are mapped back through Z
  const cam = new Camera(view, 'world');
  const hud = createHud();
  const s = { name: 'interior', id: door.id, map: room.map, hero, ents, rug: room.rug, left: false };
  const talkTo = (n) => scenes.push(n.npc.shop ? createShop(view, data, data.location.world, n.npc.name, () => scenes.pop(), n) : createDialogue(view, n.npc.name, n.npc.lines, () => scenes.pop()));
  s.talkTo = talkTo; s.npcs = npcs; s.cam = cam;
  s.doors = [{ x: (s.rug.tx + 1) * 16, y: s.rug.ty * 16 + 8, w: 2, dir: 'down' }]; // [D35] exit rug
  s.doorArrow = null;
  s.update = (dt) => {
    updateHud(hud, data, dt);
    if (pressed('pause') && opts.pause) { opts.pause(); return; } // [D38]
    if (s.doorArrow && (s.doorArrow.t -= dt) <= 0) s.doorArrow = null;
    magnet(hero, s.doors, held);
    updateHero(hero, room.map, dt);
    for (const n of npcs) updateNpc(n, room.map, dt);
    cam.follow(hero.x, hero.y - 12, room.map.pxW, room.map.pxH);
    if (input.pointer.tapped) { // touch: HUD pause, tap a nearby NPC to talk, else tap-to-move
      if (opts.pause && hudHit(view.w, input.pointer.x, input.pointer.y) === 'pause') { opts.pause(); return; }
      const w = cam.toWorld(input.pointer.x, input.pointer.y);
      const n = npcs.find((e) => Math.hypot(e.x - w.x, e.y - 12 - w.y) < 20 && Math.hypot(e.x - hero.x, e.y - hero.y) < 64);
      if (n) { talkTo(n); return; }
      const door = doorAt(s.doors, w.x, w.y);
      if (door) { s.doorArrow = { x: door.x, y: door.y - 8, t: 2 }; setTapTarget(hero, room.map, door.x, door.y + 4); return; }
      setTapTarget(hero, room.map, w.x, w.y);
    }
    if (pressed('interact')) { const n = npcs.find((e) => Math.hypot(e.x - hero.x, e.y - hero.y) < (e.npc.shop ? CONFIG.UI.SHOP_TALK : 28)); /* across the counter */ if (n) { talkTo(n); return; } }
    const tx = Math.floor(hero.x / 16), ty = Math.floor((hero.y - 2) / 16);
    if (tx >= s.rug.tx && tx <= s.rug.tx + 1 && ty === s.rug.ty && !s.left) { s.left = true; save.auto('area'); onExit(); }
  };
  s.render = (ctx) => {
    heroArt.v2 = heroArt.worlds.includes(data.location.world); // [P-C] v2 hero art in the true-pixel worlds
    layoutBegin();
    cam.follow(hero.x, hero.y - 12, room.map.pxW, room.map.pxH);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, view.w, view.h);
    cam.begin(ctx);
    room.map.draw(ctx, cam);
    for (const n of npcs) drawNpc(ctx, n, n.x - cam.x, n.y - cam.y);
    drawHero(ctx, hero, cam);
    if (art) drawInteriorFront(ctx, door.b, town, wid, cam, hero.y); // tall furniture in front of the hero
    drawDoorArrow(ctx, s.doorArrow, cam.x, cam.y);
    cam.end(ctx);
    drawHud(ctx, hud, data, view, { ap: data.ap, apCap: apCapOf(), band: currentBand() });
    ctx.font = font(12); ctx.textAlign = 'left'; drawOutlined(ctx, door.name, 8, view.h - 12, '#ffffff');
  };
  save.auto('area');
  return s;
}
