// Audio: WebAudio unlock on first input (iPad), music manager (MP3 data URLs or synth fallback), crossfade, mute, SFX.
import { MUSIC_KEYS, ONESHOT, startSynthMusic, playSfx, moodOf } from './synth.js';
import { embeddedAssets } from './assets.js';

export const MUSIC_FADE = 0.8;
export const MUSIC_LAZY = ['w1_boss', 'w2_boss', 'w3_boss', 'w4_boss', 'w5_boss', 'w6_boss', 'w7_boss', 'w8_boss', 'miniboss', 'survival', ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => 'w' + i + '_dungeon')];
export const MUSIC_ONESHOT = ONESHOT;
export const MUSIC_SRC = {};

export const audio = { ac: null, master: null, muted: false, unlocked: false, current: null, track: null, ramps: [], buffers: {}, onMuteChange: null };

export function resolveMusic(key) { return MUSIC_KEYS.includes(key) ? (MUSIC_SRC[key] ? 'mp3' : 'fallback') : null; }

// Tracks found in the embedded assets (call again after the page is parsed — tags after the script arrive late).
export function registerMusic(assets = embeddedAssets()) {
  for (const k of MUSIC_KEYS) { const id = 'music/' + k + '.mp3'; if (!MUSIC_SRC[k] && id in assets) Object.defineProperty(MUSIC_SRC, k, { enumerable: true, configurable: true, get: () => assets[id] }); }
}

export function initAudio(assets = window.ASSETS || {}, muted = false) {
  // [S60] tracks live in inert <script type="text/plain" id="mq-music/<key>.mp3"> tags (base64); older builds put data URLs in ASSETS
  registerMusic(assets);
  audio.muted = muted;
  const unlock = () => {
    if (!audio.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio.ac = new AC();
      audio.master = audio.ac.createGain();
      audio.master.gain.value = audio.muted ? 0 : 1;
      audio.master.connect(audio.ac.destination);
      const b = audio.ac.createBuffer(1, 1, 22050), s = audio.ac.createBufferSource();
      s.buffer = b; s.connect(audio.master); s.start(0);
      if (audio.current) { const k = audio.current; audio.current = null; playMusic(k); }
    }
    if (audio.ac.state === 'suspended') audio.ac.resume();
    audio.unlocked = true;
  };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true });
  return audio;
}

function decode(key) {
  if (audio.buffers[key]) return audio.buffers[key];
  // decoded the first time a track plays (no boot or first-tap stall); fetch() turns the base64 into bytes off the main loop
  audio.buffers[key] = fetch(MUSIC_SRC[key]).then((r) => r.arrayBuffer()).then((b) => audio.ac.decodeAudioData(b)).catch(() => null);
  return audio.buffers[key];
}

function ramp(gain, key, to) {
  const t = audio.ac ? audio.ac.currentTime : 0;
  audio.ramps.push({ key, to, dur: MUSIC_FADE, t });
  if (audio.ramps.length > 50) audio.ramps.shift();
  if (!gain) return;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(to, t + MUSIC_FADE);
}

export function playMusic(key) {
  if (!resolveMusic(key) || audio.current === key) return;
  const old = audio.track;
  audio.current = key;
  audio.track = null;
  if (old) { ramp(old.gain, old.key, 0); setTimeout(() => old.stop(), MUSIC_FADE * 1000 + 50); }
  if (!audio.ac) { ramp(null, key, 1); return; } // before unlock: logged, starts on unlock
  const gain = audio.ac.createGain();
  gain.gain.value = 0;
  gain.connect(audio.master);
  const tr = { key, gain, stopFn: null, stop() { if (this.stopFn) this.stopFn(); gain.disconnect(); } };
  audio.track = tr;
  ramp(gain, key, 1);
  if (MUSIC_SRC[key]) {
    Promise.resolve(decode(key)).then((buf) => {
      if (audio.track !== tr) return;
      if (!buf) { const s = startSynthMusic(audio.ac, gain, key); tr.stopFn = () => s.stop(); audio.beat = { t0: s.start, spb: s.spb }; return; }
      const src = audio.ac.createBufferSource();
      src.buffer = buf; src.loop = !MUSIC_ONESHOT.includes(key);
      src.connect(gain); src.start(); audio.beat = { t0: audio.ac.currentTime, spb: 60 / moodOf(key)[0] }; // MP3s are cut at the track's mood tempo
      tr.stopFn = () => { try { src.stop(); } catch (e) { /* already stopped */ } };
    });
  } else {
    const s = startSynthMusic(audio.ac, gain, key);
    tr.stopFn = () => s.stop();
    audio.beat = { t0: s.start, spb: s.spb };
  }
}

// Beat clock of the playing track (synth or MP3): seconds until its next beat, or null while there is no audio.
export function beatIn() { const b = audio.beat; if (!audio.ac || !b || audio.muted) return null; const t = audio.ac.currentTime - b.t0; return t < 0 ? -t : b.spb - (t % b.spb); }

export function sfx(name) { if (audio.ac && !audio.muted) playSfx(audio.ac, audio.master, name); }

export function setMute(m) {
  audio.muted = !!m;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 1;
  if (audio.onMuteChange) audio.onMuteChange(audio.muted);
  return audio.muted;
}
