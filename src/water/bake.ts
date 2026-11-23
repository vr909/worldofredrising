/**
 * Bakes a depth / shore-distance texture for a standing body of water from the heightfield.
 * Channels (8-bit, linear filtered): R = depth below the water level, G = km to the nearest ground,
 * B = km inside the body's polygon. Pure logic (no GL) apart from the final DataTexture wrapper.
 */
import { DataTexture, LinearFilter, RGBAFormat, UnsignedByteType } from 'three';
import type { Heightfield } from '../terrain/heightfield';
import { pointInPolygon } from '../world/geometry';
import type { Vec2 } from '../world/types';

export interface WaterBake {
  width: number;
  height: number;
  data: Uint8Array;
  /** minX, minZ, sizeX, sizeZ */
  box: [number, number, number, number];
  depthMax: number;
  distMax: number;
  edgeMax: number;
}

export interface BakeOptions {
  /** Target texel size in km (raised automatically so the texture stays <= maxRes). */
  texel?: number;
  maxRes?: number;
  /** Ground at or below this height counts as "not this body" (used to keep marsh pools off the sea). */
  minGround?: number;
  /** Cap for the stored shore distance in km. */
  distCap?: number;
}

/** Two-pass chamfer distance transform (km) from every `seed` cell. */
export function distanceTransform(seed: Uint8Array, w: number, h: number, texel: number): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = seed[i] ? 0 : INF;
  const a = texel;
  const b = texel * Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let v = d[i]!;
      if (x > 0) v = Math.min(v, d[i - 1]! + a);
      if (y > 0) {
        v = Math.min(v, d[i - w]! + a);
        if (x > 0) v = Math.min(v, d[i - w - 1]! + b);
        if (x < w - 1) v = Math.min(v, d[i - w + 1]! + b);
      }
      d[i] = v;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let v = d[i]!;
      if (x < w - 1) v = Math.min(v, d[i + 1]! + a);
      if (y < h - 1) {
        v = Math.min(v, d[i + w]! + a);
        if (x < w - 1) v = Math.min(v, d[i + w + 1]! + b);
        if (x > 0) v = Math.min(v, d[i + w - 1]! + b);
      }
      d[i] = v;
    }
  }
  return d;
}

export function bakeWaterDepth(
  hf: Heightfield,
  polygon: readonly Vec2[],
  level: number,
  opts: BakeOptions = {},
): WaterBake {
  const { texel: texel0 = 0.04, maxRes = 1024, minGround = -Infinity, distCap = 2 } = opts;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of polygon) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  const pad = 0.4;
  minX -= pad;
  minZ -= pad;
  maxX += pad;
  maxZ += pad;
  const texel = Math.max(texel0, (maxX - minX) / maxRes, (maxZ - minZ) / maxRes);
  const w = Math.max(2, Math.ceil((maxX - minX) / texel));
  const h = Math.max(2, Math.ceil((maxZ - minZ) / texel));
  const sizeX = w * texel;
  const sizeZ = h * texel;

  const depth = new Float32Array(w * h);
  const ground = new Uint8Array(w * h);
  const outside = new Uint8Array(w * h);
  let depthMax = 0.05;
  for (let y = 0; y < h; y++) {
    const z = minZ + (y + 0.5) * texel;
    for (let x = 0; x < w; x++) {
      const px = minX + (x + 0.5) * texel;
      const i = y * w + x;
      const gh = hf.heightAt(px, z);
      const dep = gh <= minGround ? -1 : level - gh;
      depth[i] = dep;
      if (dep <= 0) ground[i] = 1;
      else depthMax = Math.max(depthMax, dep);
      if (!pointInPolygon([px, z], polygon)) outside[i] = 1;
    }
  }
  // Pixels outside the polygon are not part of the body either.
  const seed = new Uint8Array(w * h);
  for (let i = 0; i < seed.length; i++) seed[i] = ground[i] || outside[i] ? 1 : 0;
  const shore = distanceTransform(seed, w, h, texel);
  const inside = new Float32Array(w * h);
  const edge = distanceTransform(outside, w, h, texel);
  inside.set(edge);
  let edgeMax = 0.5;
  for (let i = 0; i < inside.length; i++) edgeMax = Math.max(edgeMax, Math.min(inside[i]!, 4));
  const distMax = distCap;
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = Math.round(Math.max(0, Math.min(1, depth[i]! / depthMax)) * 255);
    data[i * 4 + 1] = Math.round(Math.max(0, Math.min(1, shore[i]! / distMax)) * 255);
    data[i * 4 + 2] = Math.round(Math.max(0, Math.min(1, inside[i]! / edgeMax)) * 255);
    data[i * 4 + 3] = 255;
  }
  return { width: w, height: h, data, box: [minX, minZ, sizeX, sizeZ], depthMax, distMax, edgeMax };
}

export function bakeToTexture(b: WaterBake): DataTexture {
  const t = new DataTexture(b.data, b.width, b.height, RGBAFormat, UnsignedByteType);
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/** Loch level: below the lowest ground sampled along the shore (not just one vertex). */
export function lochLevel(hf: Heightfield, polygon: readonly Vec2[], samplesPerEdge = 12): number {
  let min = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    for (let s = 0; s < samplesPerEdge; s++) {
      const t = s / samplesPerEdge;
      min = Math.min(min, hf.heightAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
    }
  }
  return min - 0.01;
}

/** Marsh pool level: just above wet vertices if the terrain marks any, else a low quantile of the ground. */
export function marshLevel(hf: Heightfield, polygon: readonly Vec2[]): number {
  const wet: number[] = [];
  const all: number[] = [];
  for (let r = 0; r < hf.rows; r++) {
    const z = hf.minZ + r * hf.cellSize;
    for (let c = 0; c < hf.cols; c++) {
      const x = hf.minX + c * hf.cellSize;
      if (!pointInPolygon([x, z], polygon)) continue;
      const i = r * hf.cols + c;
      const g = hf.heights[i]!;
      if (g < 0.004) continue; // sea side
      all.push(g);
      if (hf.surface.water[i]! > 127) wet.push(g);
    }
  }
  const q = (arr: number[], f: number) => {
    arr.sort((a, b) => a - b);
    return arr[Math.min(arr.length - 1, Math.floor(arr.length * f))] ?? 0.02;
  };
  return wet.length > 12 ? q(wet, 0.85) + 0.004 : q(all, 0.3);
}
