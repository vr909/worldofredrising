/**
 * Seeded Poisson-ish scatter inside a polygon (dart throwing on a grid hash). Pure and deterministic:
 * the same options always give the same points, so the map looks identical on every load.
 */
import { pointInPolygon } from '../world/geometry';
import type { Vec2 } from '../world/types';

/** Small, fast, seedable PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit hash of a string (FNV-1a), for seeding per region. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface ScatterOptions {
  seed: number;
  /** Minimum spacing at a position (km). May vary across the polygon. */
  minDist: (p: Vec2) => number;
  /** Upper bound of `minDist`, used as the grid cell size. */
  maxMinDist: number;
  /** Dart throws before giving up. */
  attempts: number;
  maxPoints: number;
  /** Extra rejection test (rivers, landmarks, lakes...). Return false to reject. */
  accept?: (p: Vec2) => boolean;
}

/** Points inside `poly`, at least minDist apart, sorted back-to-front (north to south, then west to east). */
export function scatterInPolygon(poly: readonly Vec2[], opts: ScatterOptions): Vec2[] {
  const rnd = mulberry32(opts.seed);
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const [x, z] of poly) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    z0 = Math.min(z0, z);
    z1 = Math.max(z1, z);
  }
  const cell = opts.maxMinDist;
  const grid = new Map<number, Vec2[]>();
  const key = (cx: number, cz: number) => cx * 73856093 + cz * 19349663;
  const out: Vec2[] = [];

  for (let n = 0; n < opts.attempts && out.length < opts.maxPoints; n++) {
    const p: Vec2 = [x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0)];
    if (!pointInPolygon(p, poly)) continue;
    const r = opts.minDist(p);
    const cx = Math.floor(p[0] / cell);
    const cz = Math.floor(p[1] / cell);
    let ok = true;
    for (let i = -1; i <= 1 && ok; i++) {
      for (let j = -1; j <= 1 && ok; j++) {
        const bucket = grid.get(key(cx + i, cz + j));
        if (!bucket) continue;
        for (const q of bucket) {
          if (Math.hypot(q[0] - p[0], q[1] - p[1]) < r) {
            ok = false;
            break;
          }
        }
      }
    }
    if (!ok) continue;
    if (opts.accept && !opts.accept(p)) continue;
    out.push(p);
    const k = key(cx, cz);
    const bucket = grid.get(k);
    if (bucket) bucket.push(p);
    else grid.set(k, [p]);
  }
  return out.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
