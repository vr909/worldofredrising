/**
 * Allocation-free distance helpers (the shared ones in src/world/geometry.ts allocate per call, which
 * dominated the baseline generator's run time). Plain typed arrays, bounding boxes for culling.
 */
import type { Vec2 } from '../../world/types';

export interface PolyIndex {
  xs: Float64Array;
  zs: Float64Array;
  n: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function indexPolygon(poly: readonly Vec2[]): PolyIndex {
  const n = poly.length;
  const xs = new Float64Array(n);
  const zs = new Float64Array(n);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    xs[i] = poly[i]![0];
    zs[i] = poly[i]![1];
    minX = Math.min(minX, xs[i]!);
    maxX = Math.max(maxX, xs[i]!);
    minZ = Math.min(minZ, zs[i]!);
    maxZ = Math.max(maxZ, zs[i]!);
  }
  return { xs, zs, n, minX, maxX, minZ, maxZ };
}

/** Negative inside, positive outside. */
export function polySignedDistance(p: PolyIndex, x: number, z: number): number {
  const { xs, zs, n } = p;
  let best = Infinity;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = xs[i]!;
    const zi = zs[i]!;
    const xj = xs[j]!;
    const zj = zs[j]!;
    const ex = xj - xi;
    const ez = zj - zi;
    const len2 = ex * ex + ez * ez;
    let t = len2 === 0 ? 0 : ((x - xi) * ex + (z - zi) * ez) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (xi + ex * t);
    const dz = z - (zi + ez * t);
    const d2 = dx * dx + dz * dz;
    if (d2 < best) best = d2;
    if (zi > z !== zj > z && x < (ex * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  const d = Math.sqrt(best);
  return inside ? -d : d;
}

export interface LineIndex extends PolyIndex {
  /** Cumulative arc length at each vertex (cum[0] = 0). */
  cum: Float64Array;
  total: number;
}

export function indexLine(line: readonly Vec2[]): LineIndex {
  const base = indexPolygon(line);
  const cum = new Float64Array(base.n);
  for (let i = 1; i < base.n; i++) {
    cum[i] = cum[i - 1]! + Math.hypot(base.xs[i]! - base.xs[i - 1]!, base.zs[i]! - base.zs[i - 1]!);
  }
  return { ...base, cum, total: cum[base.n - 1]! || 1 };
}

export interface Nearest {
  dist: number;
  /** Normalised arc-length position of the closest point (matches geometry.distanceToPolyline). */
  u: number;
  /** Index of the closest segment. */
  seg: number;
}

export function nearestOnLine(l: LineIndex, x: number, z: number, out: Nearest): Nearest {
  const { xs, zs, cum, n } = l;
  let best = Infinity;
  let bestU = 0;
  let bestSeg = 0;
  for (let i = 0; i < n - 1; i++) {
    const ax = xs[i]!;
    const az = zs[i]!;
    const ex = xs[i + 1]! - ax;
    const ez = zs[i + 1]! - az;
    const len2 = ex * ex + ez * ez;
    let t = len2 === 0 ? 0 : ((x - ax) * ex + (z - az) * ez) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (ax + ex * t);
    const dz = z - (az + ez * t);
    const d2 = dx * dx + dz * dz;
    if (d2 < best) {
      best = d2;
      bestSeg = i;
      bestU = (cum[i]! + t * (cum[i + 1]! - cum[i]!)) / l.total;
    }
  }
  out.dist = Math.sqrt(best);
  out.u = bestU;
  out.seg = bestSeg;
  return out;
}

export interface LinePoint {
  x: number;
  z: number;
  /** Unit tangent. */
  tx: number;
  tz: number;
}

/** Point at normalised arc length u, written into out (allocation-free pointAlong). */
export function lineAt(l: LineIndex, u: number, out: LinePoint): void {
  const target = Math.max(0, Math.min(1, u)) * l.total;
  let i = 0;
  while (i < l.n - 2 && target > l.cum[i + 1]!) i++;
  const len = l.cum[i + 1]! - l.cum[i]!;
  const t = len === 0 ? 0 : Math.min(1, Math.max(0, (target - l.cum[i]!) / len));
  out.x = l.xs[i]! + (l.xs[i + 1]! - l.xs[i]!) * t;
  out.z = l.zs[i]! + (l.zs[i + 1]! - l.zs[i]!) * t;
  const tx = l.xs[i + 1]! - l.xs[i]!;
  const tz = l.zs[i + 1]! - l.zs[i]!;
  const tl = Math.hypot(tx, tz) || 1;
  out.tx = tx / tl;
  out.tz = tz / tl;
}
