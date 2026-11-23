/**
 * River geometry for the map: smooth the layout polyline, then build a tapered outline whose width
 * follows river.width (exaggerated so it reads at map scale).
 */
import { polylineLength } from '../world/geometry';
import type { River, Vec2 } from '../world/types';

/** Map-scale exaggeration of river.width, and the narrowest line we ever draw (km). */
export const RIVER_EXAGGERATION = 2;
export const RIVER_MIN_WIDTH = 0.14;

export const f2 = (n: number): string => (Math.round(n * 100) / 100).toString();

/** Uniform Catmull-Rom through the points (passes through every input vertex). */
export function smoothLine(points: readonly Vec2[], perSegment = 6, closed = false): Vec2[] {
  const n = points.length;
  if (n < 3) return points.slice();
  const at = (i: number): Vec2 => (closed ? points[(i + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const out: Vec2[] = [];
  const segs = closed ? n : n - 1;
  const cr = (a: number, b: number, c: number, d: number, t: number): number =>
    0.5 *
    (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      out.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  if (!closed) out.push(points[n - 1]!);
  return out;
}

export function pathD(points: readonly Vec2[], close = false): string {
  if (points.length === 0) return '';
  let d = `M${f2(points[0]![0])} ${f2(points[0]![1])}`;
  for (let i = 1; i < points.length; i++) d += `L${f2(points[i]![0])} ${f2(points[i]![1])}`;
  return close ? d + 'Z' : d;
}

export interface RiverShape {
  id: string;
  name: string | null;
  center: Vec2[];
  /** Normalised arc length of each centre point, 0 (source) .. 1 (mouth). */
  u: number[];
  widths: number[];
  left: Vec2[];
  right: Vec2[];
}

export function widthAt(river: River, u: number): number {
  const w = river.width[0] + (river.width[1] - river.width[0]) * u;
  return Math.max(RIVER_MIN_WIDTH, w * RIVER_EXAGGERATION);
}

export function buildRiver(river: River): RiverShape {
  const center = smoothLine(river.points, 7);
  const total = polylineLength(center) || 1;
  const u: number[] = [0];
  for (let i = 1; i < center.length; i++) {
    const a = center[i - 1]!;
    const b = center[i]!;
    u.push(u[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]) / total);
  }
  const widths = u.map((t) => widthAt(river, t));
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i < center.length; i++) {
    const a = center[Math.max(0, i - 1)]!;
    const b = center[Math.min(center.length - 1, i + 1)]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const nz = (b[0] - a[0]) / len;
    const h = widths[i]! / 2;
    const c = center[i]!;
    left.push([c[0] + nx * h, c[1] + nz * h]);
    right.push([c[0] - nx * h, c[1] - nz * h]);
  }
  return { id: river.id, name: river.name, center, u, widths, left, right };
}

/** The filled outline of the whole river (left bank forwards, right bank back). */
export function riverFillPath(s: RiverShape): string {
  return pathD([...s.left, ...s.right.slice().reverse()], true);
}

/**
 * A baseline for a text label that runs along the river between u0 and u1, offset to the side so the text
 * sits beside the bank, oriented to read left-to-right (or bottom-to-top for near-vertical stretches).
 */
export function labelBaseline(s: RiverShape, u0: number, u1: number, gap: number): string {
  let idx = s.u.map((t, i) => (t >= u0 && t <= u1 ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) idx = [0, s.center.length - 1];
  let pts = idx.map((i) => ({ p: s.center[i]!, w: s.widths[i]! }));
  const first = pts[0]!.p;
  const last = pts[pts.length - 1]!.p;
  const dx = last[0] - first[0];
  const dz = last[1] - first[1];
  const reverse = Math.abs(dx) >= Math.abs(dz) ? dx < 0 : dz > 0;
  if (reverse) pts = pts.reverse();
  const out: Vec2[] = pts.map(({ p, w }, i) => {
    const a = pts[Math.max(0, i - 1)]!.p;
    const b = pts[Math.min(pts.length - 1, i + 1)]!.p;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    // "Up" for text running along (tx, tz) in a y-down frame is (tz, -tx).
    const ux = (b[1] - a[1]) / len;
    const uz = -(b[0] - a[0]) / len;
    const off = w / 2 + gap;
    return [p[0] + ux * off, p[1] + uz * off];
  });
  return pathD(out);
}
