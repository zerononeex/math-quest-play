// Wren, the Inkling: roller wide arc (1 AP/hit), blaster (1 AP), inks (1 AP), Splat Bomb (2 AP AoE), Ink Gatling (4 AP, 8-shot cone).
// [D37] the cone centres on `angle` (tapped or auto-aimed) when given, else on the facing.
export function inkGatling(fire, facing, angle = null) {
  const base = angle != null ? angle : { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[facing];
  for (let i = 0; i < 8; i++) { const a = base + (i / 7 - 0.5) * 0.8; fire('blaster', Math.cos(a), Math.sin(a), true); }
}
