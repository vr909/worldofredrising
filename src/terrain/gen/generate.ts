/**
 * Terrain generator v2 (ticket T01). Pure TypeScript, no DOM or three.js, so it runs in a Web Worker,
 * in Node (vitest) and in scripts. Produces plain typed arrays; `build.ts` wraps them in the Heightfield.
 *
 * Height model, in one line:
 *   ground = datum(x,z)                    smooth regional base level (also what river profiles follow)
 *          + sum_k weight_k * relief_k     ridged/eroded noise per region kind
 *   then: sea/loch basins -> canyon wall -> landmark sites -> river valleys, beds and banks -> fix-ups.
 * Rivers follow the datum, so highland glens and plains valleys always sit exactly where the water is.
 */
import { lerp, smoothstep } from '../../world/geometry';
import { BOUNDS, LANDMARKS, REGIONS, RIVERS, SEA_LEVEL } from '../../world/layout';
import type { RegionKind } from '../../world/types';
import { createNoise } from './noise';
import {
  indexLine,
  indexPolygon,
  lineAt,
  nearestOnLine,
  polySignedDistance,
  type LineIndex,
  type LinePoint,
  type Nearest,
} from './sdf';

export interface TerrainOptions {
  cellSize: number;
  seed: number;
}

/** Plain data that crosses the worker boundary. */
export interface TerrainData {
  cellSize: number;
  cols: number;
  rows: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  heights: Float32Array;
  splatA: Uint8Array;
  splatB: Uint8Array;
  ao: Uint8Array;
  water: Uint8Array;
  /** 0 = plains, otherwise index into REGIONS + 1. */
  regionIdx: Uint8Array;
  /** One profile (PROFILE_SAMPLES values, source -> mouth) per entry of RIVERS, same order. */
  profiles: Float32Array[];
}

export const PROFILE_SAMPLES = 129;

// Kind slots in the weight vector.
const PLAINS = 0;
const MOUNTAINS = 1;
const FOREST = 2;
const HIGHLANDS = 3;
const HILLS = 4;
const MARSH = 5;
const SEA = 6;
const LAKE = 7;
const KIND_SLOT: Record<RegionKind, number> = {
  mountains: MOUNTAINS,
  forest: FOREST,
  highlands: HIGHLANDS,
  hills: HILLS,
  marsh: MARSH,
  sea: SEA,
  lake: LAKE,
};
/** Half-width (km) of the blend across each kind's polygon border. Mountains get the wide foothill band. */
const BLEND: Record<RegionKind, number> = {
  mountains: 3.0,
  forest: 2.0,
  highlands: 3.0,
  hills: 2.5,
  marsh: 1.2,
  sea: 0.5,
  lake: 0.3,
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const to8 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255));

interface Site {
  type: 'hill' | 'flat' | 'gorge' | 'underground';
  cx: number;
  cz: number;
  R: number;
  level: number;
  dirX: number;
  dirZ: number;
  height: number;
  /** Cells farther than this from the centre are untouched. */
  outer: number;
  rampW: number;
  cliffW: number;
}

interface RiverData {
  id: string;
  line: LineIndex;
  prof: Float32Array;
  w0: number;
  w1: number;
}

export function generateTerrainData(opts: TerrainOptions): TerrainData {
  const cs = opts.cellSize;
  const nz = createNoise(opts.seed);
  const minX = BOUNDS.minX - BOUNDS.wallDepth;
  const maxX = BOUNDS.maxX + BOUNDS.wallDepth;
  const minZ = BOUNDS.minZ;
  const maxZ = BOUNDS.maxZ;
  const cols = Math.round((maxX - minX) / cs) + 1;
  const rows = Math.round((maxZ - minZ) / cs) + 1;
  const n = cols * rows;

  // Octaves with a wavelength under ~5 cells only alias into saw-teeth, so every fbm stops there.
  const maxFreq = 1 / (5 * cs);

  // ------------------------------------------------------------------------------------------
  // Noise toolbox
  // ------------------------------------------------------------------------------------------
  const fbm = (x: number, z: number, f0: number, oct: number): number => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let f = f0;
    for (let o = 0; o < oct; o++) {
      if (o > 0 && f > maxFreq) break;
      sum += nz.sample(x * f, z * f) * amp;
      norm += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return sum / norm;
  };

  /** Ridged multifractal with derivative damping: sharp crests, smooth erosion-like flanks. 0..1. */
  const ridged = (x: number, z: number, f0: number, oct: number, damp: number): number => {
    let sum = 0;
    let amp = 1;
    let norm = 0;
    let dxs = 0;
    let dzs = 0;
    let f = f0;
    for (let o = 0; o < oct; o++) {
      if (o > 0 && f > maxFreq) break;
      const v = nz.sample(x * f, z * f);
      const sq = Math.sqrt(v * v + 0.02);
      // Slightly rounded |v| so crests are ridges, not razor creases; its derivative stays continuous.
      const r = 1 - sq;
      const k = (-v / sq) * f * amp * 2 * r;
      dxs += k * nz.dx;
      dzs += k * nz.dz;
      sum += (amp * r * r) / (1 + damp * (dxs * dxs + dzs * dzs));
      norm += amp;
      amp *= 0.5;
      f *= 2.1;
    }
    return sum / norm;
  };

  // ------------------------------------------------------------------------------------------
  // Regions -> smooth kind weights
  // ------------------------------------------------------------------------------------------
  const regs = REGIONS.map((r, idx) => ({
    idx,
    slot: KIND_SLOT[r.kind],
    blend: BLEND[r.kind],
    margin: Math.max(BLEND[r.kind], r.kind === 'sea' ? 1.2 : 0) + 0.01,
    poly: indexPolygon(r.polygon),
  }));
  const W = new Float64Array(8);
  let curRegion = 0;
  let seaSd = 1e9;
  let lakeSd = 1e9;

  const regionWeights = (x: number, z: number): void => {
    W.fill(0);
    curRegion = 0;
    seaSd = 1e9;
    lakeSd = 1e9;
    let landSum = 0;
    for (let k = 0; k < regs.length; k++) {
      const r = regs[k]!;
      const p = r.poly;
      const m = r.margin;
      if (x < p.minX - m || x > p.maxX + m || z < p.minZ - m || z > p.maxZ + m) continue;
      const sd = polySignedDistance(p, x, z);
      if (sd < 0) curRegion = r.idx + 1;
      if (r.slot === SEA) seaSd = sd;
      if (r.slot === LAKE) lakeSd = sd;
      const raw = 1 - smoothstep(-r.blend, r.blend, sd);
      if (raw <= 0) continue;
      W[r.slot] = W[r.slot]! + raw;
      if (r.slot < SEA) landSum += raw;
    }
    if (landSum > 1) {
      const inv = 1 / landSum;
      for (let s = 0; s < SEA; s++) W[s] = W[s]! * inv;
    } else {
      W[PLAINS] = 1 - landSum;
    }
    if (W[SEA]! > 1) W[SEA] = 1;
    if (W[LAKE]! > 1) W[LAKE] = 1;
  };

  /** Mountain envelope: 0 at the foothills (x = -20) to 1 near the canyon wall (x = -44). */
  const mtnEnv = (x: number) => smoothstep(-20, -44, x);

  /** Smooth regional base level. Uses the current weights W. */
  const datumFromWeights = (x: number, z: number): number => {
    const p0 = 0.08 + 0.18 * smoothstep(20, -30, z);
    return (
      W[PLAINS]! * p0 +
      W[FOREST]! * (p0 + 0.06) +
      W[HIGHLANDS]! * (0.62 + 0.1 * smoothstep(-10, -30, z)) +
      W[HILLS]! * (p0 + 0.1) +
      W[MOUNTAINS]! * (0.3 + 0.9 * mtnEnv(x)) +
      W[MARSH]! * 0.045
    );
  };

  // ------------------------------------------------------------------------------------------
  // Rivers: indexed lines and elevation profiles (monotone, following the datum)
  // ------------------------------------------------------------------------------------------
  const rivers: RiverData[] = RIVERS.map((r) => ({
    id: r.id,
    line: indexLine(r.points),
    prof: new Float32Array(PROFILE_SAMPLES),
    w0: r.width[0],
    w1: r.width[1],
  }));
  const riverIndex = new Map(RIVERS.map((r, i) => [r.id, i]));
  const profNearest: Nearest = { dist: 0, u: 0, seg: 0 };
  const lp: LinePoint = { x: 0, z: 0, tx: 0, tz: 0 };

  const profAt = (rv: RiverData, u: number): number => {
    const f = clamp01(u) * (PROFILE_SAMPLES - 1);
    const i = Math.min(PROFILE_SAMPLES - 2, Math.floor(f));
    return lerp(rv.prof[i]!, rv.prof[i + 1]!, f - i);
  };

  const lochRegion = REGIONS.find((r) => r.kind === 'lake');
  let lochX = 0;
  let lochZ = 0;
  if (lochRegion) {
    for (const [px, pz] of lochRegion.polygon) {
      lochX += px / lochRegion.polygon.length;
      lochZ += pz / lochRegion.polygon.length;
    }
  }
  regionWeights(lochX, lochZ);
  /** Highland loch water level: the Furor leaves it, so the Furor's first profile value equals this. */
  const lochLevel = datumFromWeights(lochX, lochZ) - 0.03;

  const built = new Set<string>();
  const buildProfile = (i: number): void => {
    const def = RIVERS[i]!;
    if (built.has(def.id)) return;
    built.add(def.id);
    const rv = rivers[i]!;
    const parentIdx = riverIndex.get(def.drainsInto);
    if (parentIdx !== undefined) buildProfile(parentIdx);
    let run = Infinity;
    for (let k = 0; k < PROFILE_SAMPLES; k++) {
      lineAt(rv.line, k / (PROFILE_SAMPLES - 1), lp);
      regionWeights(Math.max(-45, Math.min(45, lp.x)), lp.z);
      run = Math.min(run, datumFromWeights(lp.x, lp.z) - 0.03);
      rv.prof[k] = run;
    }
    // Shift so the mouth meets the parent's surface (or sea level) exactly; shifting keeps it monotone.
    let mouth = SEA_LEVEL;
    if (parentIdx !== undefined) {
      const parent = rivers[parentIdx]!;
      nearestOnLine(parent.line, rv.line.xs[rv.line.n - 1]!, rv.line.zs[rv.line.n - 1]!, profNearest);
      mouth = profAt(parent, profNearest.u);
    }
    const shift = mouth - rv.prof[PROFILE_SAMPLES - 1]!;
    for (let k = 0; k < PROFILE_SAMPLES; k++) rv.prof[k] = Math.max(SEA_LEVEL, rv.prof[k]! + shift);
    if (def.id === 'furor') {
      // Leave the loch at the loch's level, falling from there.
      const top = rv.prof[0]!;
      const fall = Math.max(0, lochLevel - top);
      if (fall > 0)
        for (let k = 0; k < PROFILE_SAMPLES; k++)
          rv.prof[k] = rv.prof[k]! + fall * (1 - k / (PROFILE_SAMPLES - 1));
    }
  };
  for (let i = 0; i < RIVERS.length; i++) buildProfile(i);

  const glenRivers = ['furor', 'metas', 'highland-river'].map((id) => rivers[riverIndex.get(id)!]!);
  const glenFloor = [0.5, 0.7, 0.8];
  const mars = LANDMARKS.find((l) => l.id === 'castle-mars');
  const marsX = mars?.position[0] ?? 16.7;
  const marsZ = mars?.position[1] ?? -20.9;
  const glenNearest: Nearest = { dist: 0, u: 0, seg: 0 };

  /**
   * 0 on glen floors, 1 on the hills. U-shaped: flat floor of half-width fw, then steep sides.
   * Glens follow the Furor, Metas and highland river and open into a bowl around Mars Castle.
   */
  const glenSide = (x: number, z: number): number => {
    const bell = 1 - smoothstep(0, 4.6, Math.hypot(x - marsX, z - marsZ));
    let side = 1;
    for (let i = 0; i < glenRivers.length; i++) {
      const g = glenRivers[i]!;
      if (x < g.line.minX - 7 || x > g.line.maxX + 7 || z < g.line.minZ - 7 || z > g.line.maxZ + 7) continue;
      nearestOnLine(g.line, x, z, glenNearest);
      const fw = glenFloor[i]! * (1 + 0.5 * glenNearest.u) + 3.4 * bell;
      const t = smoothstep(0, 1.15, glenNearest.dist - fw);
      if (t < side) side = t;
    }
    // The loch sits in its own round glen at the head of the Furor.
    const lochT = smoothstep(0, 1.15, Math.hypot(x - lochX, z - lochZ) - 1.9);
    return lochT < side ? lochT : side;
  };

  // ------------------------------------------------------------------------------------------
  // Per-region relief
  // ------------------------------------------------------------------------------------------
  const mountainRelief = (x: number, z: number, m: number): number => {
    // Domain-warped, N-S stretched ridged noise: long ridgelines with valleys between them.
    const wx = x + 2.2 * nz.sample(x * 0.05 + 3.1, z * 0.05 + 9.7);
    const wz = z + 2.2 * nz.sample(x * 0.05 + 17.3, z * 0.05 + 1.9);
    const c = 0.94;
    const s = 0.34;
    const rx = wx * c - wz * s;
    const rz = (wx * s + wz * c) * 0.42;
    const ridge = ridged(rx, rz, 0.16, 6, 0.45);
    // Massifs and passes: a slow multiplier so peak heights vary a lot along the range.
    const massif = 0.7 + 0.45 * (0.5 + 0.5 * fbm(x + 40, z - 20, 0.04, 2));
    const shape = Math.pow(clamp01(ridge * 1.6), 1.7) * massif;
    return (0.5 + 2.7 * m) * (0.1 + 0.9 * clamp01(shape));
  };

  const highlandRelief = (x: number, z: number): number => {
    const wx = x + 1.6 * nz.sample(x * 0.1 + 5.3, z * 0.1 + 2.2);
    const wz = z + 1.6 * nz.sample(x * 0.1 + 8.8, z * 0.1 + 6.1);
    const crag = ridged(wx, wz, 0.27, 5, 1.4);
    const rolling = 0.5 + 0.5 * fbm(x, z, 0.09, 3);
    // Taller hills cup Mars Castle's glen to the north and south.
    const dz = Math.abs(z - marsZ);
    const dx = Math.abs(x - marsX);
    const cup = smoothstep(2.8, 5.2, dz) * (1 - smoothstep(7.5, 11, dz)) * (1 - smoothstep(7, 13, dx));
    const shape = 0.22 * rolling + 0.78 * clamp01(crag * 1.5);
    return 1.0 * shape * (1 + 0.5 * cup);
  };

  const hillsRelief = (x: number, z: number): number => {
    const roll = clamp01(0.5 + 0.8 * fbm(x, z, 0.14, 4));
    const top = smoothstep(0.62, 0.9, roll);
    return 0.62 * roll * roll * (1.5 - 0.5 * roll) + 0.09 * top * ridged(x + 11, z - 7, 0.8, 3, 0.5);
  };

  const forestRelief = (x: number, z: number): number => 0.3 * clamp01(0.5 + 0.8 * fbm(x, z, 0.12, 4));
  const plainsRelief = (x: number, z: number): number => 0.05 * (0.5 + 0.5 * fbm(x, z, 0.08, 3));
  const marshRelief = (x: number, z: number): number => {
    // Shallow pools dip below sea level so the water flag (and a sea-level plane) fills them.
    const p = fbm(x + 90, z, 0.75, 3);
    const pool = smoothstep(-0.12, -0.38, p);
    return 0.012 * fbm(x, z, 0.6, 2) - 0.085 * pool;
  };

  // ------------------------------------------------------------------------------------------
  // Canyon wall: terraced cliffs rising continuously from the valley edge
  // ------------------------------------------------------------------------------------------
  const WALL_START = -1.5;
  const WALL_SPAN = 5.5;
  const STEP = 0.55;
  /**
   * g = ground with all its relief, glow = the smooth base of that ground (no relief). The terraces are
   * laid on the smooth base so ledges stay level and continuous; relief fades out into the wall face.
   */
  const wallHeight = (x: number, z: number, g: number, glow: number): number => {
    const east = x > 0;
    const e = east ? x - BOUNDS.maxX : BOUNDS.minX - x;
    if (e < WALL_START - 1.5) return g;
    const side = east ? 11 : 23;
    // Buttresses (broad bulges) and erosion gullies pushing the face in and out along z.
    const buttress =
      1.1 * nz.sample(z * 0.26 + side, 4.4) +
      0.4 * nz.sample(z * 0.7 + side, 9.1 + e * 0.1) +
      0.25 * Math.abs(nz.sample(z * 1.1, side + e * 0.1));
    const s = clamp01((e + buttress - WALL_START) / WALL_SPAN);
    const top = BOUNDS.wallHeight + 0.45 * fbm(x * 0.7, z * 0.7, 0.5, 3);
    const full = Math.max(0.3, top - glow);
    const rise = (0.18 * s + 0.82 * (s * s * (3 - 2 * s))) * full;
    const q = rise / STEP;
    const fl = Math.floor(q);
    const terr = (fl + smoothstep(0.5, 1, q - fl)) * STEP;
    const strength = 0.45 + 0.55 * clamp01(0.5 + 0.9 * nz.sample(z * 0.18 + side, 21.7));
    const face = glow + lerp(lerp(rise, terr, strength), rise, smoothstep(0.8, 1, s));
    return face + (g - glow) * (1 - smoothstep(0, 0.5, s));
  };
  const wallMask = (x: number): number => {
    const e = x > 0 ? x - BOUNDS.maxX : BOUNDS.minX - x;
    return smoothstep(-1.2, 1.6, e);
  };

  // ------------------------------------------------------------------------------------------
  // Base height (everything except sites and rivers). Leaves weights in W.
  // ------------------------------------------------------------------------------------------
  const baseHeight = (x: number, z: number): number => {
    regionWeights(Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x)), z);
    let h = datumFromWeights(x, z);
    if (W[MOUNTAINS]! > 0.002) h += W[MOUNTAINS]! * mountainRelief(x, z, mtnEnv(x));
    if (W[HIGHLANDS]! > 0.002) h += W[HIGHLANDS]! * highlandRelief(x, z) * glenSide(x, z);
    if (W[HILLS]! > 0.002) h += W[HILLS]! * hillsRelief(x, z);
    if (W[FOREST]! > 0.002) h += W[FOREST]! * forestRelief(x, z);
    if (W[PLAINS]! > 0.002) h += W[PLAINS]! * plainsRelief(x, z);
    if (W[MARSH]! > 0.002) h += W[MARSH]! * marshRelief(x, z);

    // South Sea: beach shelf, then a deeper floor.
    if (W[SEA]! > 0) {
      const depth = Math.max(0, -seaSd);
      const seaH = -0.06 - 0.52 * smoothstep(0, 8, depth) - 0.03 * fbm(x, z, 0.35, 2);
      h = lerp(h, seaH, W[SEA]!);
    }
    // Highland loch: a bowl whose rim sits 0.02 above the water plane (Water.tsx puts the plane at rim - 0.02).
    if (lakeSd < 0.4) {
      const bowl = lochLevel + 0.02 - 0.15 * smoothstep(0, 0.5, -lakeSd);
      const t = smoothstep(0, 0.4, lakeSd);
      h = lerp(bowl, Math.max(h, lochLevel + 0.03), t);
    }
    const mean =
      W[MOUNTAINS]! * (0.25 + 1.3 * mtnEnv(x)) + W[HIGHLANDS]! * 0.45 + W[HILLS]! * 0.3 + W[FOREST]! * 0.15;
    return wallHeight(x, z, h, datumFromWeights(x, z) + mean);
  };

  // ------------------------------------------------------------------------------------------
  // Landmark sites
  // ------------------------------------------------------------------------------------------
  const ringMean = (cx: number, cz: number, r: number, landOnly: boolean): number => {
    let sum = 0;
    let cnt = 0;
    for (let k = -1; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rr = k < 0 ? 0 : r;
      const h = baseHeight(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr);
      if (landOnly && h < 0.02) continue;
      sum += h;
      cnt++;
    }
    return cnt ? sum / cnt : 0.05;
  };

  const sites: Site[] = [];
  for (const l of LANDMARKS) {
    const g = l.site.ground;
    if (g === 'floating') continue;
    const R = l.site.radius;
    const [cx, cz] = l.position;
    const a = (l.facingDeg * Math.PI) / 180;
    const dirX = Math.sin(a);
    const dirZ = -Math.cos(a);
    const type: Site['type'] = g === 'river' ? 'flat' : g;
    let level = ringMean(cx, cz, R * 0.8, true);
    if (type === 'hill') level += l.site.height ?? 0.1;
    if (type === 'flat') {
      // Keep the pad above the water of any river that crosses it.
      for (let i = 0; i < rivers.length; i++) {
        const rv = rivers[i]!;
        for (let k = 0; k <= 160; k++) {
          lineAt(rv.line, k / 160, lp);
          if (Math.hypot(lp.x - cx, lp.z - cz) < R + 0.6) level = Math.max(level, profAt(rv, k / 160) + 0.05);
        }
      }
    }
    const cliffW = 0.08 + 0.05 * R;
    const rampW = 2.0 * R;
    const outer =
      type === 'hill'
        ? R + Math.max(rampW, cliffW) + 0.3
        : type === 'gorge'
          ? R * 3.4 + 0.5
          : R + 1.6 * R + 0.8;
    sites.push({ type, cx, cz, R, level, dirX, dirZ, height: l.site.height ?? 0, outer, rampW, cliffW });
  }

  let lock = 0;
  const applySites = (x: number, z: number, h0: number): number => {
    let h = h0;
    lock = 0;
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i]!;
      const dx = x - s.cx;
      const dz = z - s.cz;
      if (dx > s.outer || dx < -s.outer || dz > s.outer || dz < -s.outer) continue;
      const r0 = Math.hypot(dx, dz);
      if (r0 > s.outer) continue;
      // The flat pad extends one cell past the nominal radius so bilinear samples anywhere inside the
      // radius never see a blended corner vertex.
      const r = Math.max(s.R, r0 - cs);
      if (r0 <= s.R + cs) lock = Math.max(lock, s.type === 'hill' ? 2 : 1);
      switch (s.type) {
        case 'flat': {
          const bw = 0.6 * s.R + 0.3;
          h = lerp(h, s.level, 1 - smoothstep(s.R, s.R + bw, r));
          break;
        }
        case 'hill': {
          // Cliffs all round, with a gentle ramp toward the gate (facingDeg).
          const facing = r > 1e-6 ? (dx * s.dirX + dz * s.dirZ) / r : 0;
          const q = smoothstep(0.55, 0.9, facing);
          const jitter = 0.75 + 0.5 * (0.5 + 0.5 * nz.sample(x * 0.8 + 4, z * 0.8 - 9));
          const cw = lerp(s.cliffW * jitter, s.rampW, q);
          h = lerp(h, s.level, 1 - smoothstep(s.R, s.R + cw, r));
          break;
        }
        case 'gorge': {
          // Flat floor, with two rock faces flanking it, perpendicular to the facing direction.
          const bw = 0.6;
          h = lerp(h, s.level, 1 - smoothstep(s.R, s.R + bw, r));
          const u = dx * s.dirX + dz * s.dirZ;
          const v = Math.max(0, Math.abs(-dx * s.dirZ + dz * s.dirX) - cs);
          const along =
            (1 - smoothstep(s.R * 0.2, s.R * 2.2, u)) * (1 - smoothstep(s.R * 1.2, s.R * 3.4, -u));
          const across = smoothstep(s.R, s.R + 0.7, v) * (1 - smoothstep(s.R + 0.6, s.R + 3.2, v));
          if (along > 0 && across > 0) {
            const rough = 0.6 + 0.8 * ridged(x + 2, z + 3, 0.7, 3, 0.6);
            h = Math.max(h, s.level + 1.7 * along * along * across * rough);
          }
          break;
        }
        case 'underground': {
          // A level ledge in front of a hillside face (the cave mouth); face rises behind the ledge.
          const bw = 0.45;
          h = lerp(h, s.level, 1 - smoothstep(s.R, s.R + bw, r));
          const u = dx * s.dirX + dz * s.dirZ;
          const v = Math.max(0, Math.abs(-dx * s.dirZ + dz * s.dirX) - cs);
          const face = smoothstep(s.R, s.R + 0.55, -u - cs) * (1 - smoothstep(s.R * 1.2, s.R * 3, v));
          if (face > 0) h = Math.max(h, s.level + 1.3 * face);
          break;
        }
      }
    }
    return h;
  };

  // ------------------------------------------------------------------------------------------
  // Pass 1: base heights, sites, kind weights, region ids
  // ------------------------------------------------------------------------------------------
  const heights = new Float32Array(n);
  const splatA = new Uint8Array(n * 4);
  const splatB = new Uint8Array(n * 4);
  const ao = new Uint8Array(n).fill(255);
  const water = new Uint8Array(n);
  const regionIdx = new Uint8Array(n);
  const wk = new Uint8Array(n * 8);
  const sandW = new Uint8Array(n);
  const wallW = new Uint8Array(n);
  const lockArr = new Uint8Array(n);
  const bedArr = new Uint8Array(n);

  for (let r = 0; r < rows; r++) {
    const z = minZ + r * cs;
    for (let c = 0; c < cols; c++) {
      const x = minX + c * cs;
      const i = r * cols + c;
      let h = baseHeight(x, z);
      regionIdx[i] = curRegion;
      for (let k = 0; k < 8; k++) wk[i * 8 + k] = to8(W[k]!);
      sandW[i] = to8(1 - smoothstep(0.25, 0.75, seaSd));
      wallW[i] = to8(wallMask(x));
      const lakeNow = lakeSd;
      const seaNow = W[SEA]!;
      const marshNow = W[MARSH]!;
      h = applySites(x, z, h);
      lockArr[i] = lock;
      heights[i] = h;
      let wet = 0;
      if (seaNow > 0.02 || marshNow > 0.1) wet = Math.max(wet, 1 - smoothstep(-0.01, 0.02, h));
      if (lakeNow < 0.3) wet = Math.max(wet, 1 - smoothstep(-0.12, 0.0, lakeNow));
      water[i] = to8(wet);
    }
  }

  // ------------------------------------------------------------------------------------------
  // Pass 2: river valleys, beds and banks
  // ------------------------------------------------------------------------------------------
  const near: Nearest = { dist: 0, u: 0, seg: 0 };
  const VALLEY_REACH = 5.5;
  for (const rv of rivers) {
    const c0 = Math.max(0, Math.floor((rv.line.minX - VALLEY_REACH - minX) / cs));
    const c1 = Math.min(cols - 1, Math.ceil((rv.line.maxX + VALLEY_REACH - minX) / cs));
    const r0 = Math.max(0, Math.floor((rv.line.minZ - VALLEY_REACH - minZ) / cs));
    const r1 = Math.min(rows - 1, Math.ceil((rv.line.maxZ + VALLEY_REACH - minZ) / cs));
    for (let r = r0; r <= r1; r++) {
      const z = minZ + r * cs;
      for (let c = c0; c <= c1; c++) {
        const x = minX + c * cs;
        nearestOnLine(rv.line, x, z, near);
        const d = near.dist;
        if (d > VALLEY_REACH) continue;
        const i = r * cols + c;
        const u = near.u;
        const halfW = 0.5 * lerp(rv.w0, rv.w1, u);
        const surf = profAt(rv, u);
        // Bed half-width: the real channel, but never narrower than the grid can show.
        const B = Math.max(halfW * 1.05, 0.62 * cs);
        const bw = 0.05 + 0.6 * cs;
        // Hill plateaus keep their rim right down to the river's bed (the cliff drops toward the water).
        if (lockArr[i] === 2 && d > B) continue;
        let h = heights[i]!;
        let target = surf - 0.045 + 0.075 * smoothstep(B, B + bw, d);
        if (d > B + bw && lockArr[i] === 0) {
          const wm = wk[i * 8 + MOUNTAINS]! / 255;
          const wh = wk[i * 8 + HIGHLANDS]! / 255;
          const wl = wk[i * 8 + HILLS]! / 255;
          const widen = 1 / (1 + 1.2 * u);
          const dd = Math.max(0, (d - halfW) * widen);
          const gradK = 0.025 + 0.45 * wm + 1.6 * wh + 0.12 * wl;
          // Two river terraces, then a slope that is steep in mountain gorges.
          target +=
            0.04 * smoothstep(0.4, 0.75, dd) +
            0.05 * smoothstep(1.2, 1.8, dd) +
            gradK * Math.max(0, dd - 0.3);
        } else if (d > B + bw) {
          target = Infinity;
        }
        if (target < h) h = target;
        heights[i] = h;
        if (d < B) bedArr[i] = 255;
        if (d < halfW) water[i] = 255;
      }
    }
  }
  // Banks: ground beside a river is never lower than the water.
  for (const rv of rivers) {
    const c0 = Math.max(0, Math.floor((rv.line.minX - 1.5 - minX) / cs));
    const c1 = Math.min(cols - 1, Math.ceil((rv.line.maxX + 1.5 - minX) / cs));
    const r0 = Math.max(0, Math.floor((rv.line.minZ - 1.5 - minZ) / cs));
    const r1 = Math.min(rows - 1, Math.ceil((rv.line.maxZ + 1.5 - minZ) / cs));
    for (let r = r0; r <= r1; r++) {
      const z = minZ + r * cs;
      for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        if (bedArr[i] !== 0) continue;
        const x = minX + c * cs;
        nearestOnLine(rv.line, x, z, near);
        const halfW = 0.5 * lerp(rv.w0, rv.w1, near.u);
        const B = Math.max(halfW * 1.05, 0.62 * cs);
        const reach = B + 0.05 + 0.6 * cs + 0.4;
        if (near.dist > reach) continue;
        const minBank = profAt(rv, near.u) + 0.03;
        if (heights[i]! < minBank) heights[i] = minBank;
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Pass 3: make sure no river ribbon is hidden under bilinear terrain
  // ------------------------------------------------------------------------------------------
  const lowerAround = (x: number, z: number, level: number): void => {
    const fx = (x - minX) / cs;
    const fz = (z - minZ) / cs;
    const c0 = Math.floor(fx);
    const r0 = Math.floor(fz);
    for (let dr = 0; dr <= 1; dr++) {
      for (let dc = 0; dc <= 1; dc++) {
        const cc = c0 + dc;
        const rr = r0 + dr;
        if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
        const i = rr * cols + cc;
        if (heights[i]! > level) heights[i] = level;
      }
    }
  };
  const sampleBilinear = (x: number, z: number): number => {
    const fx = Math.max(0, Math.min(cols - 1, (x - minX) / cs));
    const fz = Math.max(0, Math.min(rows - 1, (z - minZ) / cs));
    const c0 = Math.min(cols - 2, Math.floor(fx));
    const r0 = Math.min(rows - 2, Math.floor(fz));
    const tx = fx - c0;
    const tz = fz - r0;
    const i = r0 * cols + c0;
    return lerp(
      lerp(heights[i]!, heights[i + 1]!, tx),
      lerp(heights[i + cols]!, heights[i + cols + 1]!, tx),
      tz,
    );
  };
  for (const rv of rivers) {
    const steps = Math.ceil(rv.line.total / (0.4 * cs));
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      lineAt(rv.line, u, lp);
      const halfW = 0.5 * lerp(rv.w0, rv.w1, u);
      const surf = profAt(rv, u);
      for (let o = -1; o <= 1; o++) {
        const px = lp.x - lp.tz * o * halfW * 0.9;
        const pz = lp.z + lp.tx * o * halfW * 0.9;
        if (sampleBilinear(px, pz) > surf - 0.008) lowerAround(px, pz, surf - 0.025);
      }
    }
  }

  // ------------------------------------------------------------------------------------------
  // Pass 4: slope, splat weights, baked horizon AO
  // ------------------------------------------------------------------------------------------
  const hAt = (c: number, r: number) =>
    heights[(r < 0 ? 0 : r >= rows ? rows - 1 : r) * cols + (c < 0 ? 0 : c >= cols ? cols - 1 : c)]!;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const h = heights[i]!;
      const gx = (hAt(c + 1, r) - hAt(c - 1, r)) / (2 * cs);
      const gz = (hAt(c, r + 1) - hAt(c, r - 1)) / (2 * cs);
      const slope = Math.hypot(gx, gz);
      // Rock above ~32 degrees (tan = 0.62).
      const slopeRock = smoothstep(0.5, 0.75, slope);
      const w0 = wk[i * 8 + PLAINS]! / 255;
      const w1 = wk[i * 8 + MOUNTAINS]! / 255;
      const w2 = wk[i * 8 + FOREST]! / 255;
      const w3 = wk[i * 8 + HIGHLANDS]! / 255;
      const w4 = wk[i * 8 + HILLS]! / 255;
      const w5 = wk[i * 8 + MARSH]! / 255;
      const wall = wallW[i]! / 255;
      const rockBase =
        w1 * smoothstep(0.7, 1.7, h) * 0.85 +
        w3 * smoothstep(1.2, 1.7, h) * 0.5 +
        w4 * smoothstep(0.5, 0.8, h) * 0.4;
      const rock = Math.max(slopeRock, rockBase, wall * 0.6);
      const sand = (sandW[i]! / 255) * (1 - slopeRock);
      const keep = 1 - rock;
      const grass = (w0 + 0.45 * w4 + 0.35 * w3 + w1 * 0.8 * (1 - smoothstep(0.4, 1.2, h))) * keep;
      splatA[i * 4] = to8(grass);
      splatA[i * 4 + 1] = to8(w2 * keep);
      splatA[i * 4 + 2] = to8(rock);
      splatA[i * 4 + 3] = to8(sand);
      splatB[i * 4] = to8(w5 * keep);
      splatB[i * 4 + 1] = to8(0.65 * w4 * keep);
      splatB[i * 4 + 2] = to8(wall);
      splatB[i * 4 + 3] = to8(0.65 * w3 * keep);
    }
  }

  // Horizon AO: 8 directions x 4 steps, nearest-cell lookups. Glens and gulches darken softly.
  const DIRS = 8;
  const STEPS_KM = [0.15, 0.3, 0.55, 0.9, 1.4];
  const dcs = new Int32Array(DIRS * STEPS_KM.length);
  const drs = new Int32Array(DIRS * STEPS_KM.length);
  const dds = new Float64Array(DIRS * STEPS_KM.length);
  const aoRaw = new Float32Array(n);
  for (let d = 0; d < DIRS; d++) {
    const a = (d / DIRS) * Math.PI * 2;
    for (let s = 0; s < STEPS_KM.length; s++) {
      const dist = Math.max(STEPS_KM[s]!, cs * (s + 1) * 0.9);
      dcs[d * STEPS_KM.length + s] = Math.round((Math.cos(a) * dist) / cs);
      drs[d * STEPS_KM.length + s] = Math.round((Math.sin(a) * dist) / cs);
      dds[d * STEPS_KM.length + s] = dist;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const h0 = heights[i]!;
      let occ = 0;
      for (let d = 0; d < DIRS; d++) {
        let best = 0;
        for (let s = 0; s < STEPS_KM.length; s++) {
          const k = d * STEPS_KM.length + s;
          const cc = c + dcs[k]!;
          const rr = r + drs[k]!;
          if (cc < 0 || cc >= cols || rr < 0 || rr >= rows) continue;
          const t = (heights[rr * cols + cc]! - h0) / dds[k]!;
          if (t > best) best = t;
        }
        // sin(horizon angle) = t / sqrt(1 + t^2)
        occ += best / Math.sqrt(1 + best * best);
      }
      aoRaw[i] = 1 - 0.8 * (occ / DIRS);
    }
  }

  // 3x3 blur hides the lookup quantisation of the horizon search.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let sum = 0;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++) {
        const rr = r + dr;
        if (rr < 0 || rr >= rows) continue;
        for (let dc = -1; dc <= 1; dc++) {
          const cc = c + dc;
          if (cc < 0 || cc >= cols) continue;
          sum += aoRaw[rr * cols + cc]!;
          cnt++;
        }
      }
      ao[r * cols + c] = to8(sum / cnt);
    }
  }

  return {
    cellSize: cs,
    cols,
    rows,
    minX,
    maxX,
    minZ,
    maxZ,
    heights,
    splatA,
    splatB,
    ao,
    water,
    regionIdx,
    profiles: rivers.map((rv) => rv.prof),
  };
}
