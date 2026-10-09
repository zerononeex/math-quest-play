// Combat core: melee arcs (1 AP only on hit, G11), tap-an-enemy to attack (auto-walk ≤ 160 px), contact damage,
// hero i-frames + knockback, drops, 0 AP → question after 1 s, death hook for the math-revive flow (G14).
import { CONFIG } from '../config.js';
import { pressed, input } from '../engine/input.js';
import { box, overlap, damageEnemy, tickEntity, remove, knock, stepKnockback, get } from './entities.js';
import { rollDrops, collectPickups } from './drops.js';
import { rollDamage, rawDamage, damageTaken, totalDef, totalLuck } from './stats.js';
import { spendAp, tickApEmpty } from './ap.js';
import { floatText, confetti, hitSpark } from './fx.js';
import { starfallTarget } from './forge.js';
import { starfallFx } from './shotfx.js';
import { sfx } from '../engine/audio.js';
import { updateEnemy, blocksHit } from './enemies.js';
import { updateHazards } from './patterns.js';
import { HEROES } from '../data/heroes.js';
import { updateBoss, tryNextForm, novaHit } from './bosses.js';
import { bossHitDamage } from './stats.js';

const C = CONFIG.COMBAT;
const SWING_T = 0.15;

export function heroBox(h) { return { x: h.x - h.w / 2, y: h.y - h.h, w: h.w, h: h.h }; }

// Melee arc in front of the hero (feet-anchored), sized per hero.
export function swingBox(h) {
  const r = C.MELEE_REACH + (h.id === 'wren' ? 4 : h.id === 'milo' ? -4 : 0);
  const side = h.id === 'wren' ? 30 : 24;
  switch (h.facing) {
    case 'right': return { x: h.x + 2, y: h.y - 20, w: r, h: side };
    case 'left': return { x: h.x - 2 - r, y: h.y - 20, w: r, h: side };
    case 'up': return { x: h.x - side / 2, y: h.y - 10 - r, w: side, h: r };
    default: return { x: h.x - side / 2, y: h.y - 4, w: side, h: r };
  }
}

export function createCombat(cx) {
  // cx: { map, ents, hero, data, world, cam, openQuestion, onDeath, onKill }
  const hero = cx.hero;
  const startSwing = () => {
    if (hero.cd > 0) return false;
    // [D35] melee assist: snap facing to the nearest enemy close by
    let near = null, nd = C.MELEE_ASSIST_R;
    for (const e of cx.ents.list) if (e.alive && e.kind === 'enemy' && !e.hidden) { const d = Math.hypot(e.x - hero.x, e.y - e.h / 2 - (hero.y - 8)); if (d < nd) { nd = d; near = e; } }
    if (near) { const dx = near.x - hero.x, dy = near.y - near.h / 2 - (hero.y - 8); hero.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); hero.faceHold = C.FACE_HOLD; }
    hero.cd = (HEROES[hero.id] && HEROES[hero.id].meleeCd) || C.MELEE_CD;
    const wid = cx.data.gearEquipped && cx.data.gearEquipped.weapon && cx.data.gearEquipped.weapon[hero.id];
    hero.swing = { t: SWING_T, hit: new Set(), tier: wid ? +(/-(\d+)$/.exec(wid) || [0, 0])[1] : 0 };
    sfx(hero.id === 'milo' ? 'fists' : hero.id === 'wren' ? 'roller' : 'swing');
    return true;
  };
  const faceTo = (x, y) => {
    const dx = x - hero.x, dy = y - hero.y;
    hero.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    hero.faceHold = C.FACE_HOLD;
  };
  const hitEnemy = (e, special) => {
    const { ents, data } = cx;
    if (e.invuln || e.iframes > 0) return false;
    if (blocksHit(e, hero.x, hero.y, special)) { floatText(e.x, e.y - 20, 'Blocked!', '#c0c0c0'); knock(hero, e.x, e.y, 10); sfx('hit'); return false; }
    let dmg = rollDamage(data);
    if (e.boss) dmg = bossHitDamage(dmg, e.maxHp, e.targetHits);
    // W4 King Dundor: the Sour Star in his crown takes double damage while he is stunned (resting) and you strike from above
    if (e.boss && e.bossDef.weakCrown && e.ai && e.ai.state === 'rest' && hero.y < e.y - e.h * 0.5) { dmg *= 2; floatText(e.x, e.y - e.h - 8, 'Sour Star!', '#ffe040'); }
    damageEnemy(e, dmg, hero.x, hero.y - 6);
    hitSpark(e.x, e.y - e.h / 2, e.boss ? 3 : 2);
    sfx('hit');
    if (e.boss && e.nova) novaHit(e);
    if (e.hp <= 0 && e.boss && tryNextForm(e, { ents, time: pcx.time, skipTransform: cx.skipTransform && cx.skipTransform(), onTransform: cx.onTransform, onFarewell: cx.onFarewell })) return true; // [D46] kneel → second form
    if (e.hp <= 0) { remove(ents, e); rollDrops(ents, e, cx.world, totalLuck(data)); if (cx.onKill) cx.onKill(e); }
    return true;
  };
  const pcx = { hero, map: cx.map, ents: cx.ents, tier: cx.data.tier, time: 0, hurt: (raw, x, y) => api.hurt(raw, x, y), summon: cx.summon };
  const api = {
    startSwing,
    // [W6] a Sproutling buddy's bonk: one free hit (no AP), same damage as a swing
    buddyHit: (e) => (e.alive && !e.invuln && !(e.iframes > 0) ? (hitEnemy(e, false), true) : false),
    // Projectile hit: AP was charged when fired; shields still block frontal shots.
    hitProjectile(e, p) { return hitEnemy(e, false); },
    hitEnemy,
    // Area hit (special): damages every enemy whose centre is within radius of (x, y); optional extra knockback.
    area(x, y, radius, kb = 0, special = true) {
      let n = 0;
      for (const e of cx.ents.list) {
        if (!e.alive || e.kind !== 'enemy' || Math.hypot(e.x - x, e.y - e.h / 2 - y) >= radius) continue;
        if (hitEnemy(e, special)) { n++; if (kb) knock(e, hero.x, hero.y, kb); }
      }
      if (cx.inter) cx.inter.meleeHit({ x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 }, 'smash');
      if (cx.cutArea) cx.cutArea({ x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 }); // [BUSHES]
      return n;
    },
    // Dash (Spin Dash): move dist px along facing over time s, hitting everything on the way.
    dash(dist = 80, time = 0.3) { const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[hero.facing]; hero.dash = { t: time, vx: (D[0] * dist) / time, vy: (D[1] * dist) / time, hit: new Set() }; },
    // Spin attack: 360° hit around the hero, bypasses shields (AP cost per SPECIAL_AP).
    special(kind = 'spin', radius = 34) {
      if (!spendAp(C.SPECIAL_AP[kind] || 3)) { floatText(hero.x, hero.y - 30, 'Need AP!', '#80c0ff'); return false; }
      sfx(kind === 'inkGatling' ? 'gatling' : 'spin');
      if (kind === 'starfall') { // [S56] Dawnbreaker meteor on the target zone
        const t = starfallTarget(hero, cx.ents.list.filter((e) => e.alive && e.kind === 'enemy')), D = CONFIG.GEAR.DAWNBREAKER;
        for (let i = 0; i < D.starfallHits; i++) api.area(t.x, t.y, D.starfallR);
        starfallFx(t.x, t.y); confetti(t.x, t.y, 30); floatText(t.x, t.y - 20, 'STARFALL!', '#ffe070');
        return true;
      }
      if (kind === 'capeSwipe') hero.capeFx = CONFIG.SHOT_FX.CAPE_S; // [HERO-SHOTS]
      if (cx.specials && cx.specials[kind]) return cx.specials[kind](api) !== false;
      hero.spinFx = 0.3; hero.spinR = radius;
      for (const e of cx.ents.list) if (e.alive && e.kind === 'enemy' && Math.hypot(e.x - hero.x, e.y - e.h / 2 - (hero.y - 8)) < radius) hitEnemy(e, true);
      if (cx.inter) cx.inter.meleeHit({ x: hero.x - radius, y: hero.y - 8 - radius, w: radius * 2, h: radius * 2 });
      if (cx.cutArea) cx.cutArea({ x: hero.x - radius, y: hero.y - 8 - radius, w: radius * 2, h: radius * 2 }); // [BUSHES]
      return true;
    },
    tapAt(wx, wy) {
      let best = null, bd = C.TAP_ATTACK_RADIUS;
      for (const e of cx.ents.list) {
        if (!e.alive || e.kind !== 'enemy') continue;
        const d = Math.hypot(e.x - wx, e.y - e.h / 2 - wy);
        if (d <= bd) { best = e; bd = d; }
      }
      if (best && Math.hypot(best.x - hero.x, best.y - hero.y) <= C.AUTOWALK_MAX) { hero.attackId = best.id; hero.path = null; return true; }
      return false;
    },
    update(dt) {
      const { ents, data, map } = cx;
      if (hero.cd > 0) hero.cd -= dt;
      if (hero.iframes > 0) hero.iframes -= dt;
      stepKnockback(hero, map, dt);
      if (hero.spinFx > 0) hero.spinFx -= dt;
      if (hero.capeFx > 0) hero.capeFx -= dt;
      if (hero.dash) {
        const dd = hero.dash;
        const hw = hero.w / 2, nx = hero.x + dd.vx * dt, ny = hero.y + dd.vy * dt;
        if (map.boxFree(nx - hw, ny - hero.h, nx + hw, ny)) { hero.x = nx; hero.y = ny; } else dd.t = 0;
        for (const e of cx.ents.list) if (e.alive && e.kind === 'enemy' && !dd.hit.has(e.id) && Math.hypot(e.x - hero.x, e.y - hero.y) < 18) { dd.hit.add(e.id); hitEnemy(e, true); }
        if (cx.inter) cx.inter.meleeHit({ x: hero.x - 10, y: hero.y - 18, w: 20, h: 20 }, 'smash');
        if (cx.cutArea) cx.cutArea({ x: hero.x - 10, y: hero.y - 18, w: 20, h: 20 }); // [BUSHES]
        hero.iframes = Math.max(hero.iframes, 0.05);
        if ((dd.t -= dt) <= 0) hero.dash = null;
      }
      // Tap-to-attack: walk toward the target, then swing when in range.
      const tgt = hero.attackId != null ? get(ents, hero.attackId) : null;
      if (hero.attackId != null && !tgt) hero.attackId = null;
      if (tgt) {
        const d = Math.hypot(tgt.x - hero.x, tgt.y - hero.y);
        if (d <= C.MELEE_RANGE + tgt.w / 2) { hero.path = null; faceTo(tgt.x, tgt.y); if (startSwing()) hero.attackId = null; } else hero.path = [{ x: tgt.x, y: tgt.y }];
      }
      if (hero.swing) {
        const sb = swingBox(hero);
        if (!hero.swing.props) { hero.swing.props = true; if (cx.inter) cx.inter.meleeHit(sb); if (cx.cutArea) cx.cutArea(sb); } // [BUSHES] a swing cuts bushes
        const hbx = heroBox(hero); // point-blank: a foe pressed against the hero is always in reach
        for (const e of ents.list) {
          if (!e.alive || e.kind !== 'enemy' || hero.swing.hit.has(e.id) || !(overlap(sb, box(e)) || overlap(hbx, box(e)))) continue;
          hero.swing.hit.add(e.id);
          if (e.iframes > 0 || e.invuln) continue;
          if (blocksHit(e, hero.x, hero.y, false)) { hitEnemy(e, false); continue; }
          if (!spendAp(C.MELEE_AP)) { floatText(hero.x, hero.y - 30, 'Need AP!', '#80c0ff'); continue; }
          hitEnemy(e, false);
        }
        hero.swing.t -= dt;
        if (hero.swing.t <= 0) hero.swing = null;
      }
      const hb = heroBox(hero);
      let near = false;
      pcx.time += dt;
      pcx.map = map;
      for (let i = 0; i < ents.list.length; i++) {
        const e = ents.list[i];
        if (!e.alive || e.kind !== 'enemy') continue;
        tickEntity(e, map, dt);
        if (e.boss) { updateBoss(e, pcx, dt); if (e.killNow) { e.killNow = false; e.hp = 0; remove(ents, e); if (cx.onKill) cx.onKill(e); continue; } } else if (e.ai && e.ai.state && e.pattern) updateEnemy(e, pcx, dt);
        if (Math.hypot(e.x - hero.x, e.y - hero.y) < C.COMBAT_RADIUS) near = true;
        if (e.contact && hero.iframes <= 0 && data.hearts > 0 && overlap(hb, box(e))) api.hurt(e.dmg || rawDamage(cx.world, data.tier, !!e.boss), e.x, e.y);
      }
      updateHazards(pcx, hb, dt);
      collectPickups(ents, hb, data, dt);
      tickApEmpty(dt, near, cx.openQuestion);
    },
    hurt(raw, fx, fy) {
      const { data } = cx;
      if (hero.iframes > 0 || data.hearts <= 0) return 0;
      if (hero.starShield > 0) { hero.starShield--; hero.iframes = C.HERO_IFRAMES; floatText(hero.x, hero.y - 28, 'Star shield!', '#ffe070'); return 0; } // [D47] Astronova's bonus-question reward
      const taken = damageTaken(raw, totalDef(data));
      data.hearts = Math.max(0, data.hearts - taken);
      hero.iframes = C.HERO_IFRAMES;
      knock(hero, fx, fy);
      floatText(hero.x, hero.y - 28, '-' + taken, '#ff6060');
      if (data.hearts <= 0 && cx.onDeath) cx.onDeath();
      return taken;
    },
  };
  return api;
}
