/** Generic ring-castle and inner-town helpers shared by the per-House recipes (T05). */
import type { Color } from 'three';
import { gatehouse, type Palette } from './common';
import { Kit, smoothRing, type P } from './kit';

export interface RingOpts {
  n: number;
  rMax: number;
  /** 'square' pushes ring vertices out to a square outline of half-side r. */
  shape?: 'round' | 'square';
  wallH: number;
  th?: number;
  /** vertex index of the gate (angle 270 deg = local -z). */
  gate: number;
  /** per-vertex hook; return false to skip the default tower. */
  vertex?: (i: number, u: number, v: number, a: number) => boolean | void;
  towerR: number;
  towerH: number;
  towerRoof: 'cone' | 'dome' | 'crenel' | 'mixed';
  roofH?: number;
  merlons?: boolean;
  gateOpts?: Omit<Parameters<typeof gatehouse>[2], 'topY'>;
  rimFit?: boolean;
}

/** Fit a ring wall (optionally to a plateau rim), place towers and a gatehouse. Returns the vertices. */
export function ringCastle(k: Kit, p: Palette, base: number, o: RingOpts): P[] {
  const N = o.n;
  const rs: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    rs.push(o.rimFit ? Math.min(o.rMax, k.rim(a, base, o.rMax + 0.2, 0.04) - 0.05) : o.rMax);
  }
  const sm = o.rimFit ? smoothRing(rs, 2) : rs;
  const pts: P[] = sm.map((r, i) => {
    const a = (i / N) * Math.PI * 2;
    let c = Math.cos(a);
    let s = Math.sin(a);
    if (o.shape === 'square') {
      const m = Math.max(Math.abs(c), Math.abs(s));
      c /= m;
      s /= m;
    }
    return [c * r, s * r] as P;
  });
  const topY = base + o.wallH;
  const gp = pts[o.gate]!;
  const gw = (o.gateOpts?.w ?? 0.3) / 2;
  const run: P[] = [[gp[0] + gw, gp[1]]];
  for (let i = o.gate + 1; i < o.gate + N; i++) run.push(pts[i % N]!);
  run.push([gp[0] - gw, gp[1]]);
  k.wall(run, { topY, th: o.th ?? 0.06, stone: p.stone, trim: p.trim, merlons: o.merlons });
  for (let i = 0; i < N; i++) {
    if (i === o.gate) continue;
    const [u, v] = pts[i]!;
    const a = (i / N) * Math.PI * 2;
    if (o.vertex?.(i, u, v, a) === false) continue;
    const roof = o.towerRoof === 'mixed' ? (i % 2 ? 'cone' : 'crenel') : o.towerRoof;
    k.tower(u, v, o.towerR, base + o.towerH, {
      stone: p.stone,
      roofC: p.roof,
      trim: p.trim,
      roof,
      roofH: o.roofH ?? o.towerR * 2.2,
      slits: 3,
    });
  }
  k.at(gp[0], gp[1], 0, () => gatehouse(k, p, { topY, ...o.gateOpts }));
  return pts;
}

export function lerpC(a: Color, b: Color, t: number): Color {
  return a.clone().lerp(b, t);
}

/** Scatter small gabled houses on a jittered grid (inner-town filler), avoiding keep-out circles. */
export function town(
  k: Kit,
  p: Palette,
  base: number,
  half: number,
  cell: number,
  keepOut: readonly (readonly [number, number, number])[],
  inside: (u: number, v: number) => boolean,
): number {
  let count = 0;
  for (let gu = -half; gu <= half; gu += cell) {
    for (let gv = -half; gv <= half; gv += cell) {
      const u = gu + (k.rng() - 0.5) * cell * 0.25;
      const v = gv + (k.rng() - 0.5) * cell * 0.25;
      if (!inside(u, v)) continue;
      if (keepOut.some(([cu, cv, cr]) => Math.hypot(u - cu, v - cv) < cr)) continue;
      const w = cell * (0.5 + k.rng() * 0.2);
      const d = cell * (0.55 + k.rng() * 0.25);
      const rot = k.rng() < 0.5 ? 0 : Math.PI / 2;
      const roofC = lerpC(p.roof, p.roofDeep, k.rng() * 0.5);
      k.hall(u, v, w, d, base, 0.03 + k.rng() * 0.02, 0.03, rot, { stone: p.stone2, roofC });
      count++;
    }
  }
  return count;
}
