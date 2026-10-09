// Scene stack: push/pop/replace. A modal scene clears held keys and pauses the scenes beneath it.
import { clearHeld } from './input.js';

export const scenes = {
  stack: [],
  top() { return this.stack[this.stack.length - 1] || null; },
  push(s) { if (s.modal) clearHeld(); this.stack.push(s); if (s.enter) s.enter(); return s; },
  pop() { const s = this.stack.pop(); if (s && s.exit) s.exit(); return s; },
  replace(s) { while (this.stack.length) this.pop(); return this.push(s); },
  update(dt) { const t = this.top(); if (t) t.update(dt); },
  render(ctx) {
    let i = this.stack.length - 1;
    while (i > 0 && this.stack[i].modal) i--;
    for (; i < this.stack.length; i++) this.stack[i].render(ctx);
  },
};
