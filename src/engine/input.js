// Keyboard + pointer input with release latching (bug registry INPUT LATCHING).
import { view } from './render.js';

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'attack', KeyJ: 'attack', Digit1: 'k1', Digit2: 'k2', Digit3: 'k3', Digit4: 'k4',
  KeyB: 'item', KeyV: 'cycle', KeyE: 'interact', KeyQ: 'question', KeyP: 'equip', KeyM: 'map', Escape: 'pause', Enter: 'confirm', F9: 'debugHero', KeyG: 'buddy',
};

// down: physically held; pressed: went down since last update; latched: released before an update saw it.
export const input = { down: {}, pressed: {}, latched: {}, pointer: { x: 0, y: 0, down: false, tapped: false, id: null }, wheel: 0 };

export function held(a) { return !!(input.down[a] || input.latched[a]); }
export function pressed(a) { return !!input.pressed[a]; }

// Called once after every fixed update.
export function endUpdate() {
  input.pressed = {};
  input.latched = {};
  input.pointer.tapped = false;
  input.wheel = 0;
}

// Modal opened: forget held keys so the hero doesn't keep walking.
export function clearHeld() {
  input.down = {};
  input.latched = {};
  input.pressed = {};
}

export function toGame(clientX, clientY) {
  const r = view.canvas.getBoundingClientRect();
  return { x: ((clientX - r.left) / r.width) * view.w, y: ((clientY - r.top) / r.height) * view.h };
}

export function initInput(target = window) {
  target.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!input.down[a]) input.pressed[a] = true;
    input.down[a] = true;
  });
  target.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    if (input.pressed[a]) input.latched[a] = true;
    input.down[a] = false;
  });
  window.addEventListener('blur', clearHeld);
  const c = view.canvas;
  c.addEventListener('pointerdown', (e) => {
    const p = toGame(e.clientX, e.clientY);
    Object.assign(input.pointer, p, { down: true, tapped: true, id: e.pointerId });
  });
  c.addEventListener('pointermove', (e) => { Object.assign(input.pointer, toGame(e.clientX, e.clientY)); });
  window.addEventListener('pointerup', () => { input.pointer.down = false; });
  c.addEventListener('wheel', (e) => { input.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  holdTouches(document);
}

// [R1-23] Full screen in the Documents (Readdle) viewer: cancel the touch events on the game canvas, so WebKit never
// turns a tap into a click/zoom that the viewer reads as "show the toolbar". Taps on the black letterbox bars are left
// alone on purpose (user 2026-10-06): tapping the side bars toggles the viewer's toolbar, e.g. to hide it after opening.
// Pointer events still fire before these, so game input is unchanged; audio unlock listens on pointerdown/touchend.
export function holdTouches(doc) {
  const stop = (e) => { if (e.cancelable) e.preventDefault(); };
  const onGame = (e) => { if (e.target && e.target.tagName === 'CANVAS') stop(e); };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) doc.addEventListener(ev, onGame, { passive: false });
  for (const ev of ['gesturestart', 'gesturechange', 'dblclick', 'contextmenu']) doc.addEventListener(ev, stop, { passive: false });
}
