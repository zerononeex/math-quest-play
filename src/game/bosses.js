// Boss framework: named HP bar, fixed-hit HP (G07 × ATK_ref, clamped per D25), tier scaling (G02), telegraph + per-boss
// sting on every wind-up (G28), phase 2 at 50 %, arena lock, 3 tries (G14), poses for atlases.
import { CONFIG } from '../config.js';
import { PRIMS, tellTime } from './patterns.js';
import { bossHp, bossHits, rawDamage } from './stats.js';
import { spawn } from './entities.js';
import { sfx } from '../engine/audio.js';

// Pose names the atlas uses (w<n>-boss / w<n>-subs frames) for each AI state.
export const POSES = { idle: 'idle', tell: 'windup', act: 'attack', rest: 'idle', phase2: 'phase2', hurt: 'hurt' };

// Boss data: { id, name, kind: 'sub'|'main'|'final', sting, size: [w, h], look, patterns: [{ name, prims: [...] }], phase2: [...] }
export const TEST_BOSS = {
  id: 'test-boss', name: 'Grumblestump', kind: 'main', sting: 'malachar', size: [32, 32], look: { body: '#7a4a8a', accent: '#f0d060', crown: true },
  patterns: [
    { name: 'slam', prims: [{ type: 'slamRing', r: 90 }] },
    { name: 'thorn fan', prims: [{ type: 'fanShot', n: 5, spread: 1.2 }] },
    { name: 'charge', prims: [{ type: 'charge', speed: 160 }] },
  ],
  phase2: [{ name: 'storm', prims: [{ type: 'fanShot', n: 7, spread: 2.2 }, { type: 'slamRing', r: 110 }] }],
};

export function spawnBoss(ents, def, world, tier, x, y) {
  const hits = bossHits(def.kind, tier);
  const hp = bossHp(def.kind, world, tier);
  const [w, h] = def.size || [32, 32];
  return spawn(ents, {
    kind: 'enemy', boss: true, bossDef: def, name: def.name, x, y, w, h, hp, maxHp: hp, targetHits: hits, tier, xp: (def.kind === 'sub' ? CONFIG.XP.BOSS_SUB : CONFIG.XP.BOSS_MAIN)[world - 1] || 0,
    dmg: rawDamage(world, tier, true), look: def.look, pose: 'idle', phase: 1, log: [], artScale: def.artScale || 1, // [A5] whole-number art scale (big bosses)
    ai: { state: 'idle', t: 1.0, step: 0, prim: 0 },
  });
}

// [D46][D47] multi-form bosses: def.forms = [{ name, size, look, hpMult, patterns, finale: { at, patterns }, lines, question }]
// (def.form2 = one extra form). At 0 HP the boss kneels → transformation (non-interactive, e.transformT) → the next form with a
// NEW full bar (hpMult × form 1). def.farewell = a false last phase: non-interactive, then the boss is beaten (e.killNow).
const formsOf = (def) => def.forms || (def.form2 ? [def.form2] : []);
export function tryNextForm(e, cx = {}) {
  const base = e.baseDef || (e.baseDef = e.bossDef), forms = formsOf(base), i = (e.form || 1) - 1;
  if (e.ai.state === 'farewell' || e.ai.state === 'transform') { e.hp = Math.max(e.hp, 1); return true; } // never dies mid-cutscene
  const clear = () => { for (const x of (cx.ents && cx.ents.list) || []) if (x.kind === 'hazard' || x.kind === 'eproj') x.alive = false; };
  if (i < forms.length) {
    const f = forms[i];
    e.form = (e.form || 1) + 1; e.hp = 1; e.invuln = true; e.nova = null; e.darkT = 0; e.nextForm = f;
    e.ai.state = 'transform'; e.transformT = cx.skipTransform ? 0.3 : (f.transformS || CONFIG.BOSS.TRANSFORM_S); e.pose = 'kneel';
    e.log.push({ ev: 'transform', form: e.form, t: cx.time || 0 }); clear();
    if (cx.onTransform) cx.onTransform(e, f);
    return true;
  }
  if (base.farewell && !e.farewellDone && !e.farewellT) {
    e.hp = 1; e.invuln = true; e.nova = null; e.ai.state = 'farewell'; e.farewellT = base.farewell.s || 8; e.pose = 'farewell';
    e.log.push({ ev: 'farewell', t: cx.time || 0 }); clear();
    if (cx.onFarewell) cx.onFarewell(e);
    return true;
  }
  return false;
}
function becomeForm(e) {
  const base = e.baseDef, f = e.nextForm, mult = f.hpMult || CONFIG.BOSS.FORM2_HP_MULT;
  if (!e.form1MaxHp) e.form1MaxHp = e.maxHp;
  if (!e.form1Hits) e.form1Hits = e.targetHits || 20;
  e.bossDef = { ...base, name: f.name || base.name, patterns: f.patterns, phase2: f.finale ? f.finale.patterns : null, phase2At: f.finale ? f.finale.at : null, echoes: null, music2: f.music || base.music2 };
  e.name = e.bossDef.name; e.look = f.look || e.look; if (f.size) { e.w = f.size[0]; e.h = f.size[1]; }
  e.maxHp = Math.round(e.form1MaxHp * mult); e.hp = e.maxHp; e.targetHits = e.form1Hits * mult;
  e.phase = 1; e.invuln = false; e.pose = 'phase2'; e.flying = f.flying !== false; e.nextForm = null;
  e.ai = { state: 'rest', t: 1.0, step: 0, prim: 0 };
  e.log.push({ ev: 'form' + e.form, t: 0 });
}
// Checkpoints: jump straight to form n (no transformation).
export function jumpToForm(e, n) { while ((e.form || 1) < n && tryNextForm(e, { skipTransform: true })) becomeForm(e); }
// Supernova Countdown: every hit counts toward a stagger; NOVA_STAGGERS staggers shatter the clock.
export function novaHit(e) {
  if (!e.nova) return;
  if (++e.nova.hits >= CONFIG.BOSS.NOVA_HITS) { e.nova.hits = 0; e.nova.staggers++; e.stagger = 0.6; }
  if (e.nova.staggers >= CONFIG.BOSS.NOVA_STAGGERS) { e.nova = null; e.novaShattered = (e.novaShattered || 0) + 1; e.ai.state = 'rest'; e.ai.t = 3; e.log.push({ ev: 'nova-shattered', t: 0 }); }
}

function patternsOf(e) { return e.phase === 2 && e.bossDef.phase2 ? [...e.bossDef.patterns, ...e.bossDef.phase2] : e.bossDef.patterns; }

export function updateBoss(e, cx, dt) {
  const ai = e.ai;
  if (ai.state === 'transform') { e.pose = 'kneel'; if ((e.transformT -= dt) <= 0) becomeForm(e); return; }
  if (ai.state === 'farewell') { e.pose = 'farewell'; if ((e.farewellT -= dt) <= 0) { e.farewellDone = true; e.killNow = true; } return; }
  if (e.form !== 2 && !e.form1MaxHp) e.form1MaxHp = e.maxHp;
  // Lamentation echoes (form 1): summons at each ECHOES_AT threshold
  if (e.bossDef.echoes && cx.summon) for (const [i, at] of CONFIG.BOSS.ECHOES_AT.entries()) if (!(e.echoed || []).includes(i) && e.hp <= e.maxHp * at) { (e.echoed = e.echoed || []).push(i); for (let k = 0; k < e.bossDef.echoes; k++) cx.summon(e, k); e.log.push({ ev: 'echoes', t: cx.time }); }
  if (e.nova) { e.nova.t -= dt; if (e.nova.t <= 0) { e.nova = null; e.log.push({ ev: 'nova-blast', t: cx.time }); if (cx.hurt) cx.hurt(99, e.x, e.y); ai.state = 'rest'; ai.t = 2; } }
  if (e.phase === 1 && e.hp <= e.maxHp * (e.bossDef.phase2At || CONFIG.BOSS.PHASE2_AT) && e.bossDef.phase2) { e.phase = 2; e.pose = 'phase2'; ai.state = 'rest'; ai.t = 0.8; e.log.push({ ev: 'phase2', t: cx.time }); }
  if (e.kbt > 0) e.kbt = 0; // bosses do not get knocked around
  ai.t -= dt;
  const finalSlow = cx.tier === 'little' && e.bossDef.kind === 'final' ? CONFIG.TIER_MODS.little.finalSpeed : 1;
  if (ai.state === 'idle' || ai.state === 'rest') {
    e.pose = e.phase === 2 && ai.state === 'rest' ? 'phase2' : 'idle';
    if (ai.t <= 0) {
      ai.state = 'tell'; ai.t = tellTime(cx.tier || e.tier, 0.8);
      e.pose = 'windup';
      sfx('sting-' + (e.bossDef.sting || 'malachar'));
      e.log.push({ ev: 'tell', t: cx.time, sting: e.bossDef.sting || 'malachar' });
    }
  } else if (ai.state === 'tell') {
    if (ai.t <= 0) {
      const P = patternsOf(e);
      ai.pat = P[ai.step % P.length]; ai.prim = 0;
      ai.cur = ai.pat.prims[0]; ai.st = PRIMS[ai.cur.type].start(e, cx, ai.cur) || {};
      ai.state = 'act'; e.pose = 'attack' + ((ai.step % 4) + 1);
      e.log.push({ ev: 'act', t: cx.time, name: ai.pat.name });
    }
  } else if (ai.state === 'act') {
    if (PRIMS[ai.cur.type].update(e, cx, ai.cur, dt * finalSlow, ai.st)) {
      if (++ai.prim < ai.pat.prims.length) { ai.cur = ai.pat.prims[ai.prim]; ai.st = PRIMS[ai.cur.type].start(e, cx, ai.cur) || {}; }
      else { ai.step++; ai.state = 'rest'; ai.t = e.phase === 2 ? 1.0 : 1.4; }
    }
  }
  if (e.flash > 0) e.pose = 'hurt';
}
