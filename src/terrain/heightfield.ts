/**
 * HEIGHTFIELD CONTRACT + baseline generator.
 *
 * Every system that needs "how high is the ground here?" uses the Heightfield interface below:
 * terrain mesh, water, castles, vegetation, labels, camera. The interface is frozen (lead-owned);
 * the generator internals are owned by ticket T01 and are expected to be replaced wholesale.
 *
 * Grid layout: row-major. Row r runs west→east at z = minZ + r*cellSize (north→south).
 * Column c is at x = minX + c*cellSize. Vertex index = r * cols + c.
 */
import { createNoise2D } from 'simplex-noise';
import { distanceToPolyline, lerp, signedDistanceToPolygon, smoothstep } from '../world/geometry';
import { BOUNDS, LANDMARKS, REGIONS, RIVERS } from '../world/layout';
import type { RegionKind, Vec2 } from '../world/types';

/** Splat channels: per-vertex surface weights 0..255, packed RGBA. Shader decides colours. */
export interface SurfaceChannels {
  /** R = grass/meadow, G = forest floor, B = bare rock, A = sand/beach */
  splatA: Uint8Array;
  /** R = marsh, G = sandstone (Postern Hills), B = canyon wall stone, A = highland moss */
  splatB: Uint8Array;
  /** Baked ambient occlusion, 255 = fully open sky. */
  ao: Uint8Array;
  /** 255 = under water (sea/lake/river), used for wet shorelines and to suppress vegetation. */
  water: Uint8Array;
}

export interface Heightfield {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  /** Ground height (display km) per vertex. Sea floor is below SEA_LEVEL (0). */
  readonly heights: Float32Array;
  readonly surface: SurfaceChannels;
  /** Bilinear ground height at any x/z (clamped to the grid). */
  heightAt(x: number, z: number): number;
  /** Unit surface normal at x/z. */
  normalAt(x: number, z: number): [number, number, number];
  /** Water-surface height of a river at normalised arc position u (0 = source, 1 = mouth). Monotonic non-increasing in u. */
  riverSurfaceAt(riverId: string, u: number): number;
  /** Region id at a point ('plains' when outside every region). */
  regionAt(x: number, z: number): string;
}

export interface HeightfieldOptions {
  /** Grid spacing in display km. 0.125 high, 0.2 medium, 0.33 low. */
  cellSize: number;
  seed: number;
}

export const DEFAULT_HEIGHTFIELD_OPTIONS: HeightfieldOptions = { cellSize: 0.25, seed: 1729 };

// ---------------------------------------------------------------------------------------------
// Baseline generator (T01 replaces the internals; keep the exported signature).
// ---------------------------------------------------------------------------------------------

const BASE: Record<RegionKind | 'plains', { h: number; amp: number; freq: number }> = {
  plains: { h: 0.12, amp: 0.06, freq: 0.12 },
  forest: { h: 0.22, amp: 0.12, freq: 0.15 },
  highlands: { h: 0.75, amp: 0.55, freq: 0.18 },
  hills: { h: 0.4, amp: 0.25, freq: 0.14 },
  mountains: { h: 2.0, amp: 1.5, freq: 0.11 },
  marsh: { h: 0.03, amp: 0.02, freq: 0.3 },
  lake: { h: -0.12, amp: 0, freq: 0 },
  sea: { h: -0.35, amp: 0.05, freq: 0.1 },
};

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

export function generateHeightfield(opts: HeightfieldOptions = DEFAULT_HEIGHTFIELD_OPTIONS): Heightfield {
  const noise = createNoise2D(mulberry32(opts.seed));
  const fbm = (x: number, z: number, freq: number, octaves = 4) => {
    let sum = 0;
    let amp = 1;
    let f = freq;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += noise(x * f, z * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };

  const minX = BOUNDS.minX - BOUNDS.wallDepth;
  const maxX = BOUNDS.maxX + BOUNDS.wallDepth;
  const minZ = BOUNDS.minZ;
  const maxZ = BOUNDS.maxZ;
  const cs = opts.cellSize;
  const cols = Math.round((maxX - minX) / cs) + 1;
  const rows = Math.round((maxZ - minZ) / cs) + 1;
  const n = cols * rows;
  const heights = new Float32Array(n);
  const splatA = new Uint8Array(n * 4);
  const splatB = new Uint8Array(n * 4);
  const ao = new Uint8Array(n).fill(255);
  const water = new Uint8Array(n);

  const regionHeight = (kind: RegionKind | 'plains', x: number, z: number) => {
    const b = BASE[kind];
    const v = fbm(x, z, b.freq);
    // Mountains: ridged (1 - |n|) reads as sharp crests.
    const shaped = kind === 'mountains' ? 1 - Math.abs(v) * 1.6 : v;
    return b.h + shaped * b.amp;
  };

  // River level profiles: sample base terrain along each river, force monotonic, used for carving.
  const PROFILE_SAMPLES = 64;
  const profiles = new Map<string, Float32Array>();

  const baseAt = (
    x: number,
    z: number,
  ): {
    h: number;
    region: string;
    kind: RegionKind | 'plains';
    weights: Map<RegionKind | 'plains', number>;
  } => {
    let h = regionHeight('plains', x, z);
    let region = 'plains';
    let kind: RegionKind | 'plains' = 'plains';
    const weights = new Map<RegionKind | 'plains', number>([['plains', 1]]);
    for (const r of REGIONS) {
      const sd = signedDistanceToPolygon([x, z], r.polygon);
      const blend = r.kind === 'sea' || r.kind === 'lake' ? 0.8 : 2.5;
      const w = 1 - smoothstep(-blend, blend, sd);
      if (w <= 0) continue;
      h = lerp(h, regionHeight(r.kind, x, z), w);
      for (const [k, v] of weights) weights.set(k, v * (1 - w));
      weights.set(r.kind, (weights.get(r.kind) ?? 0) + w);
      if (sd < 0) {
        region = r.id;
        kind = r.kind;
      }
    }
    return { h, region, kind, weights };
  };

  for (const river of RIVERS) {
    const prof = new Float32Array(PROFILE_SAMPLES);
    let running = Infinity;
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      const p = pointAlong(river.points, i / (PROFILE_SAMPLES - 1));
      running = Math.min(running, baseAt(p[0], p[1]).h - 0.02);
      prof[i] = running;
    }
    profiles.set(river.id, prof);
  }
  const riverSurfaceAt = (riverId: string, u: number) => {
    const prof = profiles.get(riverId);
    if (!prof) return 0;
    const f = Math.max(0, Math.min(1, u)) * (PROFILE_SAMPLES - 1);
    const i = Math.floor(f);
    const j = Math.min(PROFILE_SAMPLES - 1, i + 1);
    return lerp(prof[i]!, prof[j]!, f - i);
  };

  // Site centre heights are constant per landmark; compute once, not per vertex.
  const siteCentre = new Map<string, number>();
  for (const l of LANDMARKS) {
    const lift = l.site.ground === 'hill' ? (l.site.height ?? 0.1) : 0;
    siteCentre.set(l.id, baseAt(l.position[0], l.position[1]).h + lift);
  }

  const regionIds = new Array<string>(n);
  for (let r = 0; r < rows; r++) {
    const z = minZ + r * cs;
    for (let c = 0; c < cols; c++) {
      const x = minX + c * cs;
      const i = r * cols + c;
      const base = baseAt(x, z);
      let h = base.h;
      regionIds[i] = base.region;

      // Rivers: carve a channel down to the river profile.
      let wet = 0;
      for (const river of RIVERS) {
        const d = distanceToPolyline([x, z], river.points);
        const halfW = lerp(river.width[0], river.width[1], d.u) * 0.5;
        if (d.dist > halfW + 1.2) continue;
        const surface = riverSurfaceAt(river.id, d.u);
        const bed = surface - 0.04;
        const t = 1 - smoothstep(halfW, halfW + 1.2, d.dist);
        h = lerp(h, Math.min(h, bed), t);
        if (d.dist < halfW) wet = 255;
      }

      // Landmark sites: level the ground (T01 adds cliffs, gorges, plateaus).
      for (const l of LANDMARKS) {
        if (l.site.ground === 'floating' || l.site.ground === 'underground') continue;
        const dist = Math.hypot(x - l.position[0], z - l.position[1]);
        const outer = l.site.radius * 1.8;
        if (dist > outer) continue;
        h = lerp(h, siteCentre.get(l.id)!, 1 - smoothstep(l.site.radius, outer, dist));
      }

      // Canyon walls: Martian stone rising to 6 km beyond the valley's east and west edges.
      const edge = Math.max(BOUNDS.minX - x, x - BOUNDS.maxX);
      const wallT = smoothstep(-1.5, 2.5, edge);
      if (wallT > 0) {
        const terraces = Math.floor((BOUNDS.wallHeight * wallT) / 0.6) * 0.6;
        const wallH = lerp(BOUNDS.wallHeight * wallT, terraces, 0.35) + fbm(x, z, 0.4, 2) * 0.25 * wallT;
        h = Math.max(h, wallH);
      }

      heights[i] = h;
      if (base.kind === 'sea' || base.kind === 'lake') wet = 255;
      water[i] = wet;

      const w = base.weights;
      const slopeRock = smoothstep(1.6, 3.2, h) * (base.kind === 'mountains' ? 1 : 0.3);
      splatA[i * 4 + 0] = to8((w.get('plains') ?? 0) + (w.get('hills') ?? 0) * 0.4);
      splatA[i * 4 + 1] = to8(w.get('forest') ?? 0);
      splatA[i * 4 + 2] = to8(Math.max(slopeRock, (w.get('mountains') ?? 0) * 0.6, wallT));
      splatA[i * 4 + 3] = to8(w.get('sea') ? Math.min(1, (w.get('sea') ?? 0) * 3) : 0);
      splatB[i * 4 + 0] = to8(w.get('marsh') ?? 0);
      splatB[i * 4 + 1] = to8((w.get('hills') ?? 0) * 0.6);
      splatB[i * 4 + 2] = to8(wallT);
      splatB[i * 4 + 3] = to8(w.get('highlands') ?? 0);
    }
  }

  const clampIdx = (v: number, max: number) => Math.max(0, Math.min(max, v));
  const heightAt = (x: number, z: number) => {
    const fx = clampIdx((x - minX) / cs, cols - 1);
    const fz = clampIdx((z - minZ) / cs, rows - 1);
    const c0 = Math.floor(fx);
    const r0 = Math.floor(fz);
    const c1 = Math.min(cols - 1, c0 + 1);
    const r1 = Math.min(rows - 1, r0 + 1);
    const tx = fx - c0;
    const tz = fz - r0;
    const h00 = heights[r0 * cols + c0]!;
    const h10 = heights[r0 * cols + c1]!;
    const h01 = heights[r1 * cols + c0]!;
    const h11 = heights[r1 * cols + c1]!;
    return lerp(lerp(h00, h10, tx), lerp(h01, h11, tx), tz);
  };
  const normalAt = (x: number, z: number): [number, number, number] => {
    const e = cs;
    const dx = heightAt(x + e, z) - heightAt(x - e, z);
    const dz = heightAt(x, z + e) - heightAt(x, z - e);
    const nx = -dx;
    const ny = 2 * e;
    const nz = -dz;
    const len = Math.hypot(nx, ny, nz);
    return [nx / len, ny / len, nz / len];
  };
  const regionAt = (x: number, z: number) => {
    const c = clampIdx(Math.round((x - minX) / cs), cols - 1);
    const r = clampIdx(Math.round((z - minZ) / cs), rows - 1);
    return regionIds[r * cols + c] ?? 'plains';
  };

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    cellSize: cs,
    cols,
    rows,
    heights,
    surface: { splatA, splatB, ao, water },
    heightAt,
    normalAt,
    riverSurfaceAt,
    regionAt,
  };
}

const to8 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

/** Point at normalised arc length u along a polyline. */
export function pointAlong(line: readonly Vec2[], u: number): Vec2 {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < line.length - 1; i++) {
    const l = Math.hypot(line[i + 1]![0] - line[i]![0], line[i + 1]![1] - line[i]![1]);
    lens.push(l);
    total += l;
  }
  let target = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]! || i === lens.length - 1) {
      const t = lens[i] === 0 ? 0 : Math.min(1, target / lens[i]!);
      return [lerp(line[i]![0], line[i + 1]![0], t), lerp(line[i]![1], line[i + 1]![1], t)];
    }
    target -= lens[i]!;
  }
  return line[line.length - 1]!;
}
