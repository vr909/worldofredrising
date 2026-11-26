/**
 * Deterministic vegetation scatter (T07). Pure TypeScript: no three.js, runs in tests and Node.
 *
 * One jittered-grid "forest pass" over the whole valley picks a species per point from the region, the splat
 * channels, slope and height; separate passes lay out orchard / vineyard rows near their castles and reed tufts
 * around water. Everything is rejected on water, rivers, castle sites (>= 1.2 x site.radius), steep slopes,
 * canyon walls and above the tree line. The result is shuffled once per species, so the first N instances are an
 * even spatial sample: lowering `mesh.count` thins the whole forest instead of chopping regions off.
 */
import { LANDMARKS, REGIONS, RIVERS } from '../world/layout';
import { signedDistanceToPolygon, smoothstep } from '../world/geometry';
import type { Heightfield } from '../terrain/heightfield';

export type SpeciesId = 'conifer' | 'broadleaf' | 'olive' | 'orchard' | 'vine' | 'reed';
export const SPECIES: readonly SpeciesId[] = ['conifer', 'broadleaf', 'olive', 'orchard', 'vine', 'reed'];

/** Floats per instance: x, y, z, scale, yaw, lean, leanDir, tint (0..1 random for colour jitter). */
export const STRIDE = 8;

export type VegetationField = Pick<
  Heightfield,
  | 'minX'
  | 'maxX'
  | 'minZ'
  | 'maxZ'
  | 'cellSize'
  | 'cols'
  | 'rows'
  | 'surface'
  | 'heightAt'
  | 'normalAt'
  | 'regionAt'
>;

export interface ScatterOptions {
  seed?: number;
  /** Grid spacing of the forest pass in display km (default 0.18, about 31 trees per km2 at full acceptance). */
  forestSpacing?: number;
}

export interface Scatter {
  /** Per species: Float32Array of `count * STRIDE`, already shuffled. */
  data: Record<SpeciesId, Float32Array>;
  counts: Record<SpeciesId, number>;
  total: number;
}

/** Tree line: nothing above this (display km). */
export const TREE_LINE = 2.0;
/** tan(35 degrees). */
export const MAX_SLOPE_TAN = 0.7;

// ---------------------------------------------------------------------------------------------
// Small deterministic helpers
// ---------------------------------------------------------------------------------------------

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

function hash2(ix: number, iz: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1]. */
export function valueNoise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, z: number, seed: number): number {
  return valueNoise(x, z, seed) * 0.65 + valueNoise(x * 2.3 + 17, z * 2.3 - 9, seed + 1) * 0.35;
}

// ---------------------------------------------------------------------------------------------
// Terrain queries
// ---------------------------------------------------------------------------------------------

class Sampler {
  constructor(readonly hf: VegetationField) {}

  /** Bilinear sample of one 8-bit channel (0..1). */
  chan(arr: Uint8Array, stride: number, ch: number, x: number, z: number): number {
    const hf = this.hf;
    const fx = Math.min(Math.max((x - hf.minX) / hf.cellSize, 0), hf.cols - 1.001);
    const fz = Math.min(Math.max((z - hf.minZ) / hf.cellSize, 0), hf.rows - 1.001);
    const c = Math.floor(fx);
    const r = Math.floor(fz);
    const tx = fx - c;
    const tz = fz - r;
    const i = r * hf.cols + c;
    const a = arr[i * stride + ch]!;
    const b = arr[(i + 1) * stride + ch]!;
    const cc = arr[(i + hf.cols) * stride + ch]!;
    const d = arr[(i + hf.cols + 1) * stride + ch]!;
    return (a + (b - a) * tx + (cc - a + (a - b - cc + d) * tx) * tz) / 255;
  }

  forest(x: number, z: number) {
    return this.chan(this.hf.surface.splatA, 4, 1, x, z);
  }
  rock(x: number, z: number) {
    return this.chan(this.hf.surface.splatA, 4, 2, x, z);
  }
  sand(x: number, z: number) {
    return this.chan(this.hf.surface.splatA, 4, 3, x, z);
  }
  wall(x: number, z: number) {
    return this.chan(this.hf.surface.splatB, 4, 2, x, z);
  }
  /** Nearest-cell water mask. */
  waterAt(x: number, z: number): boolean {
    const hf = this.hf;
    const c = Math.min(Math.max(Math.round((x - hf.minX) / hf.cellSize), 0), hf.cols - 1);
    const r = Math.min(Math.max(Math.round((z - hf.minZ) / hf.cellSize), 0), hf.rows - 1);
    return hf.surface.water[r * hf.cols + c]! > 127;
  }
  waterNear(x: number, z: number, margin: number): boolean {
    const hf = this.hf;
    const w = hf.surface.water;
    const m = Math.max(1, Math.ceil(margin / hf.cellSize));
    const c0 = Math.round((x - hf.minX) / hf.cellSize);
    const r0 = Math.round((z - hf.minZ) / hf.cellSize);
    for (let dr = -m; dr <= m; dr += m) {
      for (let dc = -m; dc <= m; dc += m) {
        const c = Math.min(Math.max(c0 + dc, 0), hf.cols - 1);
        const r = Math.min(Math.max(r0 + dr, 0), hf.rows - 1);
        if (w[r * hf.cols + c]! > 127) return true;
      }
    }
    return false;
  }
  /** tan of the slope angle. */
  slopeTan(x: number, z: number): number {
    const ny = Math.max(this.hf.normalAt(x, z)[1], 0.05);
    return Math.sqrt(Math.max(0, 1 - ny * ny)) / ny;
  }
}

interface RiverSeg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** Half the channel width at the segment's mid-point. */
  half: number;
}

const RIVER_SEGS: RiverSeg[] = [];
for (const r of RIVERS) {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < r.points.length - 1; i++) {
    const l = Math.hypot(r.points[i + 1]![0] - r.points[i]![0], r.points[i + 1]![1] - r.points[i]![1]);
    lens.push(l);
    total += l;
  }
  let acc = 0;
  for (let i = 0; i < r.points.length - 1; i++) {
    const u = (acc + lens[i]! / 2) / total;
    RIVER_SEGS.push({
      ax: r.points[i]![0],
      az: r.points[i]![1],
      bx: r.points[i + 1]![0],
      bz: r.points[i + 1]![1],
      half: (r.width[0] + (r.width[1] - r.width[0]) * u) * 0.5,
    });
    acc += lens[i]!;
  }
}

/** True when (x, z) lies within half a channel width plus `margin` km of any river centre line. */
function nearRiver(x: number, z: number, margin: number): boolean {
  for (const s of RIVER_SEGS) {
    const lim = s.half + margin;
    const abx = s.bx - s.ax;
    const abz = s.bz - s.az;
    const len2 = abx * abx + abz * abz;
    let t = len2 === 0 ? 0 : ((x - s.ax) * abx + (z - s.az) * abz) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - (s.ax + abx * t);
    const dz = z - (s.az + abz * t);
    if (dx * dx + dz * dz < lim * lim) return true;
  }
  return false;
}

const NORTH_WOODS = REGIONS.find((r) => r.id === 'north-woods')!;
const SITES = LANDMARKS.filter((l) => l.site.ground !== 'floating');
const MARS = LANDMARKS.find((l) => l.id === 'castle-mars')!;
/** Castles that sit in a clearing in the middle of forest (canon: Diana and Apollo, pp.168, 340). */
const CLEARING_IDS = new Set(['castle-diana', 'castle-apollo']);

/** Hard keep-out around a castle site: 1.2 x site.radius (ticket), plus a little extra for walls. */
export function insideSite(x: number, z: number, scale = 1.2): boolean {
  for (const l of SITES) {
    const r = l.site.radius * scale;
    const dx = x - l.position[0];
    const dz = z - l.position[1];
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}

/** 0 at the castle, 1 well away: soft thinning of forest around every castle, wider for Diana and Apollo. */
function siteOpenness(x: number, z: number): number {
  let o = 1;
  for (const l of SITES) {
    const clearing = CLEARING_IDS.has(l.id);
    const r = l.site.radius;
    const dx = x - l.position[0];
    const dz = z - l.position[1];
    const d = Math.sqrt(dx * dx + dz * dz);
    const inner = r * (clearing ? 1.55 : 1.2);
    const outer = r * (clearing ? 2.7 : 1.9);
    if (d < outer) o = Math.min(o, smoothstep(inner, outer, d));
  }
  return o;
}

// ---------------------------------------------------------------------------------------------
// Orchards and vineyards
// ---------------------------------------------------------------------------------------------

interface Block {
  species: 'orchard' | 'vine';
  /** Centre, extent along rows (w) and across rows (d), display km, and row direction in degrees. */
  cx: number;
  cz: number;
  w: number;
  d: number;
  angleDeg: number;
  rowGap: number;
  step: number;
}

/**
 * Blocks sit 1.9 - 4.5 km from their castle, on the flat ground. Ceres: apple orchards (p.169, 201);
 * Bacchus: vineyards (invented). Minerva's olive country is handled by the forest pass.
 */
const BLOCKS: readonly Block[] = [
  { species: 'orchard', cx: -5.0, cz: -19.6, w: 3.4, d: 1.6, angleDeg: 0, rowGap: 0.16, step: 0.14 },
  { species: 'orchard', cx: -8.2, cz: -12.6, w: 2.8, d: 1.4, angleDeg: 8, rowGap: 0.16, step: 0.14 },
  { species: 'orchard', cx: -1.4, cz: -12.6, w: 2.4, d: 1.4, angleDeg: -6, rowGap: 0.16, step: 0.14 },
  { species: 'orchard', cx: -1.2, cz: -19.6, w: 2.0, d: 1.2, angleDeg: 4, rowGap: 0.16, step: 0.14 },
  { species: 'vine', cx: -14.3, cz: 5.0, w: 3.6, d: 1.8, angleDeg: 90, rowGap: 0.1, step: 0.13 },
  { species: 'vine', cx: -18.3, cz: 1.2, w: 2.4, d: 2.4, angleDeg: 90, rowGap: 0.1, step: 0.13 },
  { species: 'vine', cx: -10.2, cz: 1.2, w: 2.4, d: 2.0, angleDeg: 60, rowGap: 0.1, step: 0.13 },
  { species: 'vine', cx: -14.0, cz: -2.4, w: 3.2, d: 1.4, angleDeg: 90, rowGap: 0.1, step: 0.13 },
];

// ---------------------------------------------------------------------------------------------
// Scatter
// ---------------------------------------------------------------------------------------------

type Pending = Record<SpeciesId, number[]>;

const emptyPending = (): Pending => ({
  conifer: [],
  broadleaf: [],
  olive: [],
  orchard: [],
  vine: [],
  reed: [],
});

export function scatterVegetation(hf: VegetationField, opts: ScatterOptions = {}): Scatter {
  const seed = opts.seed ?? 20240;
  const spacing = opts.forestSpacing ?? 0.18;
  const rng = mulberry32(seed);
  const S = new Sampler(hf);
  const out = emptyPending();

  const push = (
    sp: SpeciesId,
    x: number,
    z: number,
    scale: number,
    yaw: number,
    lean: number,
    leanDir: number,
    tint: number,
    sink = 0.006,
  ) => {
    out[sp].push(x, hf.heightAt(x, z) - sink, z, scale, yaw, lean, leanDir, tint);
  };

  const margin = 0.5;
  const x0 = hf.minX + margin;
  const x1 = hf.maxX - margin;
  const z0 = hf.minZ + margin;
  const z1 = hf.maxZ - margin;

  // ---- Forest pass ------------------------------------------------------------------------
  for (let gz = z0; gz < z1; gz += spacing) {
    for (let gx = x0; gx < x1; gx += spacing) {
      const x = gx + (rng() - 0.5) * spacing * 0.9;
      const z = gz + (rng() - 0.5) * spacing * 0.9;
      const roll = rng();
      const region = hf.regionAt(x, z);
      if (region === 'south-sea' || region === 'highland-loch' || region === 'dark-loch') continue;
      if (region === 'southern-marshes') continue;
      const h = hf.heightAt(x, z);
      if (h < 0.02 || h > TREE_LINE) continue;

      // Acceptance probability and species by region.
      let p: number;
      let sp: SpeciesId;
      let edge: number; // 1 = deep in the stand, small = ragged edge (trees get smaller)
      const f = S.forest(x, z);
      switch (region) {
        case 'greatwoods': {
          p = smoothstep(0.06, 0.62, f) * (0.82 + 0.3 * fbm(x * 0.55, z * 0.55, seed + 3));
          // "a primordial wood" (p.168): mostly broadleaf, with stands of tall conifer.
          const stand = fbm(x * 0.32, z * 0.32, seed + 5);
          sp = rng() < smoothstep(0.52, 0.68, stand) * 0.75 + 0.07 ? 'conifer' : 'broadleaf';
          edge = smoothstep(0.1, 0.7, f);
          break;
        }
        case 'north-woods': {
          // Dense from the region's edge inward, ragged on the fringe.
          const depth = -signedDistanceToPolygon([x, z], NORTH_WOODS.polygon);
          const body = smoothstep(0.0, 2.2, depth + (fbm(x * 0.7, z * 0.7, seed + 29) - 0.5) * 1.6);
          p = Math.max(smoothstep(0.04, 0.5, f) * 0.8, body) * 0.97;
          sp = rng() < 0.93 ? 'conifer' : 'broadleaf';
          edge = 0.45 + 0.55 * Math.max(body, smoothstep(0.1, 0.7, f));
          break;
        }
        case 'highlands': {
          // Fir and oak woods on the foothills and in the glens, quilted into patches (p.166); the flat glen
          // floors stay open and grassy.
          const patch = smoothstep(0.4, 0.56, fbm(x * 0.28, z * 0.28, seed + 7));
          const slope = S.slopeTan(x, z);
          const onSlope = smoothstep(0.07, 0.24, slope);
          const marsD = Math.hypot(x - MARS.position[0], z - MARS.position[1]);
          const glen = smoothstep(2.2, 5.5, marsD); // keep Mars's bowl open
          p = patch * (0.08 + 0.92 * onSlope) * (0.15 + 0.85 * glen) * 0.9;
          sp = rng() < 0.58 ? 'conifer' : 'broadleaf';
          edge = 0.5 + 0.5 * patch;
          break;
        }
        case 'postern-hills': {
          const slope = S.slopeTan(x, z);
          const grove = smoothstep(0.46, 0.6, fbm(x * 0.3, z * 0.3, seed + 11));
          p = grove * (1 - smoothstep(0.3, 0.5, slope)) * 0.85;
          sp = 'olive';
          edge = 0.55 + 0.45 * grove;
          if (rng() < 0.05) sp = 'conifer';
          break;
        }
        case 'western-mountains': {
          // Conifers climb the foothills and thin out towards the tree line.
          const lowFade = 1 - smoothstep(0.7, 1.9, h);
          const patch = smoothstep(0.3, 0.55, fbm(x * 0.4, z * 0.4, seed + 13));
          p = lowFade * (1 - S.rock(x, z)) * (0.2 + 0.8 * patch) * 0.8;
          sp = 'conifer';
          edge = 0.55 + 0.45 * lowFade;
          break;
        }
        default: {
          // Plains and anything unlisted: scattered copses of broadleaf, denser beside the Greatwoods.
          const copse = smoothstep(0.68, 0.8, fbm(x * 0.2, z * 0.2, seed + 17));
          p = copse * 0.55 + smoothstep(0.1, 0.6, f) * 0.5;
          sp = rng() < 0.12 ? 'conifer' : 'broadleaf';
          edge = 0.6 + 0.4 * copse;
        }
      }
      if (p <= 0.001 || roll > p) continue;

      // Shared rejections (cheap first).
      const wall = S.wall(x, z);
      if (wall > 0.2) continue;
      const rock = S.rock(x, z);
      if (rock > 0.72 || S.sand(x, z) > 0.55) continue;
      if (S.slopeTan(x, z) > MAX_SLOPE_TAN) continue;
      if (insideSite(x, z)) continue;
      // Soft thinning near castles (wider clearings for Diana and Apollo).
      if (rng() > siteOpenness(x, z)) continue;
      if (S.waterNear(x, z, 0.06) || nearRiver(x, z, 0.09)) continue;

      const t = rng();
      const size = (0.8 + 0.7 * Math.pow(rng(), 1.4)) * (0.72 + 0.34 * edge);
      const aspect = sp === 'olive' ? 0.9 + 0.4 * rng() : 0.9 + 0.2 * rng();
      push(
        sp,
        x,
        z,
        size * (sp === 'olive' ? 1 : aspect),
        rng() * Math.PI * 2,
        rng() * 0.1,
        rng() * Math.PI * 2,
        t,
      );
    }
  }

  // ---- Orchards and vineyards -------------------------------------------------------------
  for (const b of BLOCKS) {
    const a = (b.angleDeg * Math.PI) / 180;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    for (let v = -b.d / 2; v <= b.d / 2; v += b.rowGap) {
      for (let u = -b.w / 2; u <= b.w / 2; u += b.step) {
        const ju = (rng() - 0.5) * 0.015;
        const jv = (rng() - 0.5) * 0.015;
        const lx = u + ju;
        const lz = v + jv;
        const x = b.cx + lx * ca - lz * sa;
        const z = b.cz + lx * sa + lz * ca;
        if (x < x0 || x > x1 || z < z0 || z > z1) continue;
        if (hf.regionAt(x, z) === 'south-sea') continue;
        // Keep a soft edge: the outer rows are sometimes missing.
        const edgeU = Math.abs(u) / (b.w / 2);
        const edgeV = Math.abs(v) / (b.d / 2);
        if (Math.max(edgeU, edgeV) > 0.85 && rng() < 0.2) continue;
        if (insideSite(x, z, 1.3)) continue;
        if (S.slopeTan(x, z) > 0.2 || S.waterNear(x, z, 0.08) || nearRiver(x, z, 0.1)) continue;
        const h = hf.heightAt(x, z);
        if (h < 0.02) continue;
        const t = rng();
        if (b.species === 'orchard') {
          push('orchard', x, z, 1.05 + 0.3 * rng(), rng() * Math.PI * 2, rng() * 0.03, rng() * 6.28, t);
        } else {
          // Vine rows run along the block axis; yaw aligns each strip with it.
          push('vine', x, z, 0.95 + 0.1 * rng(), -a, 0, 0, t, 0.002);
        }
      }
    }
  }

  // ---- Reeds ------------------------------------------------------------------------------
  const reedZones: { box: [number, number, number, number]; region: string; gap: number; keep: number }[] = [
    { box: [-21, 11, 1, 19], region: 'southern-marshes', gap: 0.075, keep: 0.8 },
    { box: [12.5, -30.5, 15.5, -27.5], region: 'highland-loch', gap: 0.1, keep: 0.9 },
    { box: [34, -25, 37, -23], region: 'dark-loch', gap: 0.1, keep: 0.9 },
  ];
  for (const zone of reedZones) {
    const [bx0, bz0, bx1, bz1] = zone.box;
    for (let gz = bz0; gz < bz1; gz += zone.gap) {
      for (let gx = bx0; gx < bx1; gx += zone.gap) {
        const x = gx + (rng() - 0.5) * zone.gap * 0.9;
        const z = gz + (rng() - 0.5) * zone.gap * 0.9;
        const r = rng();
        const region = hf.regionAt(x, z);
        const inZone =
          region === zone.region ||
          // lake shores belong to the surrounding region
          ((zone.region === 'highland-loch' || zone.region === 'dark-loch') &&
            (region === 'highlands' || region === 'postern-hills' || region === zone.region));
        if (!inZone) continue;
        if (x < x0 || x > x1 || z < z0 || z > z1) continue;
        // Reeds stand on the bank and in shallow ground right beside open water, in loose beds.
        const bed = fbm(x * 0.9, z * 0.9, seed + 23);
        const wetEdge = S.waterNear(x, z, 0.2);
        if (!wetEdge) {
          if (zone.region !== 'southern-marshes' || r > 0.18 * bed) continue;
        } else if (r > zone.keep * (0.35 + 0.65 * bed)) continue;
        if (S.waterAt(x, z) || nearRiver(x, z, 0.01)) continue;
        if (insideSite(x, z, 1.2)) continue;
        push('reed', x, z, 0.75 + 0.6 * rng(), rng() * Math.PI * 2, rng() * 0.08, rng() * 6.28, rng(), 0.004);
      }
    }
  }

  // ---- Shuffle each species once, pack into typed arrays ------------------------------------
  const data = {} as Record<SpeciesId, Float32Array>;
  const counts = {} as Record<SpeciesId, number>;
  let total = 0;
  const shuf = mulberry32(seed ^ 0x9e3779b9);
  for (const sp of SPECIES) {
    const src = out[sp];
    const n = src.length / STRIDE;
    const order = new Uint32Array(n);
    for (let i = 0; i < n; i++) order[i] = i;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(shuf() * (i + 1));
      const tmp = order[i]!;
      order[i] = order[j]!;
      order[j] = tmp;
    }
    const arr = new Float32Array(n * STRIDE);
    for (let i = 0; i < n; i++) {
      const o = order[i]! * STRIDE;
      for (let k = 0; k < STRIDE; k++) arr[i * STRIDE + k] = src[o + k]!;
    }
    data[sp] = arr;
    counts[sp] = n;
    total += n;
  }
  return { data, counts, total };
}
