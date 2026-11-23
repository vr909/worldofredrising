/**
 * Pure 2D geometry helpers over the layout (x/z plane, display km). No three.js imports here, so
 * this runs in workers, tests and Node scripts.
 */
import type { Vec2 } from './types';

export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  const [px, pz] = p;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!;
    const [xj, zj] = poly[j]!;
    const intersects = zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Closest point on segment ab to p, with t in [0,1]. */
export function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): { point: Vec2; t: number; dist: number } {
  const abx = b[0] - a[0];
  const abz = b[1] - a[1];
  const len2 = abx * abx + abz * abz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * abz) / len2));
  const point: Vec2 = [a[0] + abx * t, a[1] + abz * t];
  return { point, t, dist: Math.hypot(p[0] - point[0], p[1] - point[1]) };
}

/**
 * Distance from p to a polyline, plus the normalised arc-length position (0 = first point,
 * 1 = last point) of the closest point. Used for river carving and width interpolation.
 */
export function distanceToPolyline(p: Vec2, line: readonly Vec2[]): { dist: number; u: number; point: Vec2 } {
  const lengths = segmentLengths(line);
  const total = lengths.reduce((s, l) => s + l, 0) || 1;
  let best = { dist: Infinity, u: 0, point: line[0]! as Vec2 };
  let acc = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const c = closestOnSegment(p, line[i]!, line[i + 1]!);
    if (c.dist < best.dist) best = { dist: c.dist, u: (acc + c.t * lengths[i]!) / total, point: c.point };
    acc += lengths[i]!;
  }
  return best;
}

/** Signed distance to a polygon boundary: negative inside, positive outside. */
export function signedDistanceToPolygon(p: Vec2, poly: readonly Vec2[]): number {
  const closed = [...poly, poly[0]!];
  const d = distanceToPolyline(p, closed).dist;
  return pointInPolygon(p, poly) ? -d : d;
}

export function segmentLengths(line: readonly Vec2[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    out.push(Math.hypot(line[i + 1]![0] - line[i]![0], line[i + 1]![1] - line[i]![1]));
  }
  return out;
}

export function polylineLength(line: readonly Vec2[]): number {
  return segmentLengths(line).reduce((s, l) => s + l, 0);
}

export function centroid(poly: readonly Vec2[]): Vec2 {
  let x = 0;
  let z = 0;
  for (const [px, pz] of poly) {
    x += px;
    z += pz;
  }
  return [x / poly.length, z / poly.length];
}

/** Smooth Hermite step, the workhorse of every blend in the terrain. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
