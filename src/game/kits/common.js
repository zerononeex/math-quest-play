// Slot system shared by every hero: 1 melee · 2 ranged (press again cycles ammo) · 3 special (press again cycles) (G12).
import { pressed } from '../../engine/input.js';
import { codeArt } from '../../engine/atlas.js';
import { HEROES, TIER_TINT } from '../../data/heroes.js';
import { heroAmmo } from '../projectiles.js';
import { gearTier } from '../../data/gear.js';

export function weaponTier(data, hero) { const t = gearTier(data.gearEquipped.weapon[hero]); return data.dawnbreaker && t >= 9 ? 9 : Math.max(1, t); }

// Visual: blade/fist/roller size grows per tier, tint per tier, badge from tier 3 (star count = tier over 2).
export function weaponVisual(tier) {
  return { len: 8 + tier * 2, thick: tier >= 5 ? 3 : 2, color: TIER_TINT[Math.min(8, tier - 1)], badge: Math.floor(tier / 2), glow: tier >= 6 };
}

export function createKit(heroId, data, act) {
  // act: { swing(), fire(ammo), special(kind, tier) }
  const kit = { hero: heroId, slot: 1, ammoIdx: 0, specIdx: 0 };
  kit.ammoList = () => heroAmmo(data, heroId);
  kit.ammo = () => { const l = kit.ammoList(); return l[kit.ammoIdx % l.length]; };
  kit.specials = () => (data.dawnbreaker ? [...HEROES[heroId].specials, 'starfall'] : HEROES[heroId].specials); // [S56] Dawnbreaker adds STARFALL
  kit.special = () => { const s = kit.specials(); return s[kit.specIdx % s.length]; };
  // [R3-16] what a second tap on slot 2 / 3 switches to (null when there is only one)
  kit.nextAmmo = () => { const l = kit.ammoList(); return l.length > 1 ? l[(kit.ammoIdx + 1) % l.length] : null; };
  kit.nextSpecial = () => { const l = kit.specials(); return l.length > 1 ? l[(kit.specIdx + 1) % l.length] : null; };
  kit.select = (k) => {
    if (k === kit.slot && k === 2) kit.ammoIdx = (kit.ammoIdx + 1) % kit.ammoList().length;
    else if (k === kit.slot && k === 3) kit.specIdx = (kit.specIdx + 1) % kit.specials().length;
    kit.slot = k;
  };
  kit.use = () => {
    if (kit.slot === 1) return act.swing();
    if (kit.slot === 2) return act.fire(kit.ammo());
    return act.special(kit.special(), weaponTier(data, heroId));
  };
  // [D35] touch: fire the selected ranged ammo along an exact angle (tap a point).
  kit.fireAt = (dx, dy) => (kit.slot === 2 ? act.fire(kit.ammo(), dx, dy) : false);
  kit.update = () => {
    for (const k of [1, 2, 3]) if (pressed('k' + k)) kit.select(k);
    if (pressed('attack')) kit.use();
  };
  return kit;
}

// Draw the held weapon during a swing (tier look).
export function drawWeapon(ctx, hero, tier, cam) {
  if (!hero.swing || hero.drawnAttack) return;
  const v = weaponVisual(tier); codeArt('weapon-bar'); // [R2-19a] audit: the attack art did not draw
  const k = 1 - hero.swing.t / 0.15;
  const base = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[hero.facing];
  const ang = base - 0.9 + 1.8 * k;
  const cx = hero.x - cam.x, cy = hero.y - 12 - cam.y;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate(ang);
  if (v.glow) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(4, -v.thick - 1, v.len + 4, v.thick * 2 + 2); }
  ctx.fillStyle = '#10101a'; ctx.fillRect(5, -v.thick / 2 - 1, v.len + 2, v.thick + 2);
  ctx.fillStyle = v.color; ctx.fillRect(6, -v.thick / 2, v.len, v.thick);
  ctx.restore();
  for (let i = 0; i < v.badge; i++) { ctx.fillStyle = '#ffe070'; ctx.fillRect(Math.round(cx) - 6 + i * 3, Math.round(cy) - 20, 2, 2); }
}
