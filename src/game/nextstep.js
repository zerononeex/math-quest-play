// [D40] Where should a kid go next? Picked automatically from progress (pure logic, used by the map star, its hint line and
// the HUD compass). Overworld: nearest dungeon without its medallion → the boss gate once all medallions are owned → the
// landing pad once the boss is beaten. Dungeon: the big-key room while the big key is missing → the boss room → the medallion room.

// ow = built overworld; heroCell = { cx, cy }. Returns { cx, cy, label } or null.
export function overworldNextStep(data, ow, heroCell) {
  const w = ow.world.id, wd = data.worlds[w - 1], f = ow.feat;
  const list = Object.values(ow.world.dungeons || {}).map((dg) => (dg.rush || dg.survival ? null : dg)); // rush gates are optional postgame
  const open = Object.entries(f.dungeons).map(([k, e]) => ({ e, dg: list[Number(k) - 1] })).filter((x) => x.dg && !wd.medallions.includes(x.dg.medallion || x.dg.id));
  if (open.length) {
    const d2 = (e) => (e.cx - heroCell.cx) ** 2 + (e.cy - heroCell.cy) ** 2;
    open.sort((a, b) => d2(a.e) - d2(b.e));
    return { cx: open[0].e.cx, cy: open[0].e.cy, label: 'Next: ' + open[0].dg.name };
  }
  if (!wd.bossBeaten && f.boss && ow.world.throne) return { cx: f.boss.cx, cy: f.boss.cy, label: 'Next: ' + ow.world.throne.name };
  if (f.pad) return { cx: Math.floor(f.pad.tx / 8), cy: Math.floor(f.pad.ty / 8), label: wd.bossBeaten ? 'Next: talk to Pilot Juno at the ship' : 'Next: the Wayfarer — fly to a new world!' };
  return null;
}

// d = dungeon scene. Returns { roomId, label } or null.
export function dungeonNextStep(d) {
  const st = d.st, rooms = d.dg.rooms, ids = Object.keys(rooms);
  const find = (type) => ids.find((id) => rooms[id].type === type);
  if (!st.subBoss) {
    const bk = find('bigkey');
    if (bk && !st.bigKey) return { roomId: bk, label: 'Next: find the Big Key' };
    const sub = find('sub');
    if (sub) return { roomId: sub, label: 'Next: the boss room' };
  }
  const v = find('vault'); // [R3-15] the keep's royal vault
  if (v && !st.chests.includes(v)) return { roomId: v, label: 'Next: open the royal chest' };
  const t = find('treasure');
  if (t && !st.done) return { roomId: t, label: 'Next: claim the medallion' };
  return null;
}
