// Fixed-size object pool: no per-frame allocations in hot loops.
export class Pool {
  constructor(size, make) {
    this.items = [];
    for (let i = 0; i < size; i++) { const o = make(); o.alive = false; this.items.push(o); }
    this.count = 0;
  }
  spawn() {
    for (let i = 0; i < this.items.length; i++) {
      const o = this.items[i];
      if (!o.alive) { o.alive = true; this.count++; return o; }
    }
    return null;
  }
  kill(o) { if (o.alive) { o.alive = false; this.count--; } }
  forEach(fn) {
    for (let i = 0; i < this.items.length; i++) if (this.items[i].alive) fn(this.items[i]);
  }
}
