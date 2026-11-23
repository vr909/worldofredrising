/**
 * Pure placement of mist banks and the Olympus cloud collar. No three.js here so it is testable.
 * Output is two packed arrays (4 floats per instance):
 *   pos  = x, y, z, seed
 *   size = width, height, alpha, kind (0 mist, 1 cloud)
 * Heights come from the Heightfield so the mist follows whatever terrain T01 produces: mist prefers
 * low points (glen floors) because it samples ground height against its neighbourhood.
 */
import type { Heightfield } from '../terrain/heightfield';
import { pointInPolygon, signedDistanceToPolygon } from '../world/geometry';
import { LANDMARKS, REGIONS } from '../world/layout';
import type { Vec2 } from '../world/types';

export interface MistInstances {
  pos: Float32Array;
  size: Float32Array;
  count: number;
}

type Hf = Pick<Heightfield, 'heightAt' | 'riverSurfaceAt'>;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How far below the mean of a ring of neighbours the ground at (x,z) sits (km): > 0 in glens and gulches. */
export function lowness(hf: Hf, x: number, z: number, radius = 1.4): number {
  let sum = 0;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    sum += hf.heightAt(x + Math.cos(a) * radius, z + Math.sin(a) * radius);
  }
  return sum / n - hf.heightAt(x, z);
}

/** Olympus altitude, as the graybox and shots compute it. */
export function olympusAnchor(hf: Hf): { x: number; y: number; z: number; radius: number } {
  const l = LANDMARKS.find((m) => m.id === 'olympus');
  if (!l) throw new Error('olympus landmark missing');
  return {
    x: l.position[0],
    y: hf.riverSurfaceAt('argos', 0.55) + (l.site.height ?? 2.6),
    z: l.position[1],
    radius: l.site.radius,
  };
}

export function placeMist(hf: Hf, seed = 4242): MistInstances {
  const rng = mulberry32(seed);
  const pos: number[] = [];
  const size: number[] = [];
  const taken: Vec2[] = [];
  const push = (x: number, y: number, z: number, w: number, h: number, alpha: number, kind: number) => {
    pos.push(x, y, z, rng());
    size.push(w, h, alpha, kind);
  };
  const free = (x: number, z: number, spacing: number) =>
    taken.every((t) => (t[0] - x) ** 2 + (t[1] - z) ** 2 > spacing * spacing);

  const regionPoly = (id: string): readonly Vec2[] => REGIONS.find((r) => r.id === id)?.polygon ?? [];

  // Highland glens: candidates on a jittered grid, kept where the ground is below its surroundings.
  const high = regionPoly('highlands');
  const cands: { x: number; z: number; score: number }[] = [];
  for (let x = 0; x < 32; x += 0.55) {
    for (let z = -34; z < -8; z += 0.55) {
      const px = x + (rng() - 0.5) * 0.5;
      const pz = z + (rng() - 0.5) * 0.5;
      if (!pointInPolygon([px, pz], high)) continue;
      const lo = lowness(hf, px, pz);
      if (lo < 0.04) continue;
      cands.push({ x: px, z: pz, score: lo + rng() * 0.15 });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  let n = 0;
  for (const c of cands) {
    if (n >= 150) break;
    if (!free(c.x, c.z, 1.0)) continue;
    const edge = -signedDistanceToPolygon([c.x, c.z], high); // distance inside the region
    const burn = Math.min(1, Math.max(0.25, edge / 2.5)); // burns off toward the plains
    const y = hf.heightAt(c.x, c.z) + 0.06 + rng() * 0.2;
    push(c.x, y, c.z, 1.7 + rng() * 1.3, 0.85 + rng() * 0.5, 0.42 * burn, 0);
    taken.push([c.x, c.z]);
    n++;
  }

  // Marshes: low sheet of drifting mist over the flats.
  const marsh = regionPoly('southern-marshes');
  let m = 0;
  for (let tries = 0; tries < 4000 && m < 45; tries++) {
    const x = -22 + rng() * 24;
    const z = 10 + rng() * 10;
    if (!pointInPolygon([x, z], marsh) || !free(x, z, 1.6)) continue;
    const y = Math.max(hf.heightAt(x, z), 0.02) + 0.08 + rng() * 0.18;
    push(x, y, z, 3.0 + rng() * 2.0, 1.0 + rng() * 0.5, 0.4, 0);
    taken.push([x, z]);
    m++;
  }

  // Mars's glen is "always misty": extra banks pooled in the low ground around the castle hill.
  const mars = LANDMARKS.find((l) => l.id === 'castle-mars');
  if (mars) {
    const [mx, mz] = mars.position;
    const ring = (mars.site.radius ?? 1.2) + 0.9;
    const pts: { x: number; z: number; score: number }[] = [];
    for (let i = 0; i < 400; i++) {
      const a = rng() * Math.PI * 2;
      const r = ring + rng() * 4.5;
      const x = mx + Math.cos(a) * r;
      const z = mz + Math.sin(a) * r;
      pts.push({ x, z, score: lowness(hf, x, z, 1.0) + rng() * 0.1 });
    }
    pts.sort((a, b) => b.score - a.score);
    let k = 0;
    for (const c of pts) {
      if (k >= 26) break;
      if (!free(c.x, c.z, 0.8)) continue;
      push(
        c.x,
        hf.heightAt(c.x, c.z) + 0.08 + rng() * 0.2,
        c.z,
        1.5 + rng() * 1.2,
        0.5 + rng() * 0.35,
        0.5,
        0,
      );
      taken.push([c.x, c.z]);
      k++;
    }
  }

  // Cloud collar under Olympus: clear air between it and the Argos below (rock hangs ~1.7 km).
  const o = olympusAnchor(hf);
  const collar = 24;
  for (let i = 0; i < collar; i++) {
    const a = ((i + rng() * 0.6) / collar) * Math.PI * 2;
    const inner = i % 3 === 0;
    const r = o.radius * (inner ? 0.6 : 0.85) + rng() * 0.7;
    const y = o.y - 0.75 - (inner ? 0.35 : 0) + (rng() - 0.5) * 0.25;
    push(o.x + Math.cos(a) * r, y, o.z + Math.sin(a) * r, 1.7 + rng() * 1.0, 0.8 + rng() * 0.35, 0.78, 1);
  }

  return { pos: Float32Array.from(pos), size: Float32Array.from(size), count: size.length / 4 };
}
