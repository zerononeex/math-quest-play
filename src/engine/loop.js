// Fixed-step 60 Hz loop with accumulator; survives exceptions (logs once per message).
import { CONFIG } from '../config.js';

export const loopStats = { updates: 0, frames: 0, upd: null, rnd: null, idx: 0, errors: {} };

function logOnce(err) {
  const msg = (err && err.message) || String(err);
  if (!loopStats.errors[msg]) {
    loopStats.errors[msg] = 0;
    console.error('[loop] ' + msg);
  }
  loopStats.errors[msg]++;
}

export function startLoop(update, render) {
  const step = 1000 / CONFIG.LOOP.TICK_HZ;
  const n = CONFIG.LOOP.STATS_RING;
  loopStats.upd = new Float32Array(n);
  loopStats.rnd = new Float32Array(n);
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = now - last;
    last = now;
    if (dt > CONFIG.LOOP.MAX_FRAME_MS) dt = CONFIG.LOOP.MAX_FRAME_MS;
    if (dt < 0) dt = 0;
    acc += dt;
    const t0 = performance.now();
    while (acc >= step) {
      acc -= step;
      loopStats.updates++;
      try { update(step / 1000); } catch (e) { logOnce(e); }
    }
    const t1 = performance.now();
    try { render(acc / step); } catch (e) { logOnce(e); }
    const t2 = performance.now();
    const i = loopStats.idx;
    loopStats.upd[i] = t1 - t0;
    loopStats.rnd[i] = t2 - t1;
    loopStats.idx = (i + 1) % n;
    loopStats.frames++;
  }
  requestAnimationFrame(frame);
}
