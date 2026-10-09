// Procedural chiptune fallback (all 24 music keys), SFX tones (playbook §6.4), per-boss sting motifs (G28).
export const MUSIC_KEYS = [
  ...['overworld', 'boss', 'town', 'area2', 'dungeon'].flatMap((k) => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'w' + i + '_' + k)),
  'title', 'victory', 'gameover', 'dungeon', 'miniboss', 'ship', 'survival', 'forge', 'w7_boss_final', 'w8_boss_final', 'w8_farewell',
  'credits', 'intro', 'bossrush', 'shop', // [A6] the 4 new keys: synth plays them until the user's mp3s land
];
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], PENTA = [0, 2, 4, 7, 9], DORIAN = [0, 2, 3, 5, 7, 9, 10];
// mood: [bpm, scale, lead wave, bass wave, root midi]
const MOOD = {
  overworld: [118, MAJOR, 'square', 'triangle', 60], boss: [150, MINOR, 'sawtooth', 'square', 52], boss_final: [168, MINOR, 'sawtooth', 'square', 50], farewell: [84, MAJOR, 'triangle', 'sine', 62], title: [100, MAJOR, 'square', 'triangle', 62],
  victory: [132, MAJOR, 'square', 'triangle', 64], gameover: [70, MINOR, 'triangle', 'sine', 57], dungeon: [92, DORIAN, 'triangle', 'square', 55],
  miniboss: [140, MINOR, 'square', 'sawtooth', 54], ship: [88, PENTA, 'sine', 'triangle', 60], survival: [160, MINOR, 'sawtooth', 'square', 50],
  forge: [110, DORIAN, 'square', 'triangle', 57],
  credits: [92, MAJOR, 'triangle', 'sine', 64], intro: [80, PENTA, 'sine', 'triangle', 60], bossrush: [164, MINOR, 'sawtooth', 'square', 52], shop: [104, MAJOR, 'triangle', 'sine', 65],
  town: [96, MAJOR, 'triangle', 'sine', 62], area2: [124, PENTA, 'square', 'triangle', 59],
};
export const ONESHOT = ['victory', 'gameover', 'credits', 'intro']; // same one-shots as art-src/music/embed.py

function seedOf(key) { let h = 2166136261; for (const c of key) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let s = seed || 1; return () => ((s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296); }
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function moodOf(key) { return MOOD[key.replace(/^w\d_/, '')] || MOOD.overworld; }

// Deterministic 4-bar pattern per key: [{t (beats), dur, midi, voice}].
export function pattern(key) {
  const [bpm, scale, , , root] = moodOf(key);
  const r = rng(seedOf(key));
  const w = /^w(\d)/.exec(key);
  const shift = w ? (Number(w[1]) * 2) % 7 : 0;
  const notes = [];
  let deg = 0;
  for (let b = 0; b < 16; b += 0.5) {
    if (r() < 0.72) {
      deg = Math.max(-3, Math.min(9, deg + Math.floor(r() * 5) - 2));
      const o = Math.floor(deg / scale.length), i = ((deg % scale.length) + scale.length) % scale.length;
      notes.push({ t: b, dur: r() < 0.3 ? 1 : 0.5, midi: root + 12 + shift + o * 12 + scale[i], voice: 'lead' });
    }
    if (b % 2 === 0) notes.push({ t: b, dur: 1.5, midi: root - 12 + shift + scale[[0, 4, 5, 3][Math.floor(b / 4) % 4] % scale.length], voice: 'bass' });
  }
  return { bpm, beats: 16, notes };
}

function tone(ac, dest, wave, f0, t0, dur, vol, f1) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = wave;
  o.frequency.setValueAtTime(f0, t0);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(dest);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

// Starts the looping fallback for `key` into `dest`; returns { stop() }.
export function startSynthMusic(ac, dest, key) {
  const [, , lead, bass] = moodOf(key);
  const p = pattern(key);
  const spb = 60 / p.bpm;
  const loopLen = p.beats * spb;
  const once = ONESHOT.includes(key);
  let start = ac.currentTime + 0.05, nextLoop = 0, stopped = false;
  const schedule = () => {
    if (stopped) return;
    while (start + nextLoop * loopLen < ac.currentTime + 0.6 && !(once && nextLoop > 0)) {
      const base = start + nextLoop * loopLen;
      for (const n of p.notes) tone(ac, dest, n.voice === 'lead' ? lead : bass, hz(n.midi), base + n.t * spb, n.dur * spb * 0.9, n.voice === 'lead' ? 0.08 : 0.06);
      nextLoop++;
    }
  };
  schedule();
  const id = setInterval(schedule, 200);
  return { start, spb, stop() { stopped = true; clearInterval(id); } };
}

// SFX recipes: [wave, f0, f1, dur, vol] or a list of notes for jingles.
export const SFX = {
  swing: ['triangle', 900, 300, 0.1, 0.12], spin: ['sawtooth', 300, 1200, 0.3, 0.1], fists: ['square', 220, 110, 0.06, 0.12],
  roller: ['triangle', 180, 90, 0.15, 0.12], blaster: ['square', 1200, 400, 0.08, 0.08], splat: ['sawtooth', 200, 60, 0.25, 0.12],
  gatling: ['square', 1400, 900, 0.04, 0.06], shell: ['triangle', 500, 700, 0.12, 0.1], hit: ['square', 160, 60, 0.1, 0.14],
  coin: [[88, 0.06], [93, 0.12]], door: ['sawtooth', 120, 80, 0.3, 0.1], chest: [[72, 0.12], [76, 0.12], [79, 0.12], [84, 0.35]],
  portal: ['sine', 200, 1600, 0.6, 0.1], launch: ['sawtooth', 80, 600, 1.0, 0.1], correct: [[76, 0.08], [83, 0.16]],
  wrong: [[64, 0.12], [62, 0.18]], levelup: [[72, 0.08], [76, 0.08], [79, 0.08], [84, 0.08], [88, 0.25]],
  relic: [[84, 0.1], [91, 0.1], [96, 0.3]], scrape: ['sawtooth', 140, 90, 0.2, 0.08], click: [[84, 0.05], [91, 0.12]], rustle: ['sawtooth', 2000, 700, 0.12, 0.05], forge: ['square', 90, 60, 0.2, 0.16], trophy: [[72, 0.15], [72, 0.08], [79, 0.15], [84, 0.4]],
};
// Per-boss wind-up sting motifs (G28): midi notes, played on every wind-up.
export const STINGS = {
  malachar: [55, 58, 54], gormash: [48, 48, 43], vex: [62, 65, 61], dundor: [45, 52],
  rukus: [50, 50, 55], gorg: [41, 40, 39], seraphel: [74, 70, 66], astronova: [79, 83, 86],
};

export function playSfx(ac, dest, name) {
  const t0 = ac.currentTime + 0.005;
  if (name.startsWith('sting-')) {
    const m = STINGS[name.slice(6)] || [60, 63];
    m.forEach((n, i) => tone(ac, dest, 'square', hz(n), t0 + i * 0.13, 0.12, 0.1));
    return true;
  }
  const r = SFX[name];
  if (!r) return false;
  if (Array.isArray(r[0])) { let t = t0; for (const [n, d] of r) { tone(ac, dest, 'square', hz(n), t, d, 0.09); t += d; } } else tone(ac, dest, r[0], r[1], t0, r[3], r[4], r[2]);
  return true;
}
