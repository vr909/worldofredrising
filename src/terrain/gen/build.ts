/**
 * Wraps generated TerrainData (plain typed arrays, transferable from a worker) into the Heightfield
 * interface by rebuilding the cheap sampling functions on the calling thread.
 */
import { lerp } from '../../world/geometry';
import { REGIONS, RIVERS } from '../../world/layout';
import type { Heightfield } from '../heightfield';
import { PROFILE_SAMPLES, type TerrainData } from './generate';

const clampIdx = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v);

export function buildHeightfield(d: TerrainData): Heightfield {
  const { cols, rows, minX, minZ, cellSize: cs, heights } = d;
  const profiles = new Map<string, Float32Array>();
  RIVERS.forEach((r, i) => profiles.set(r.id, d.profiles[i]!));

  const heightAt = (x: number, z: number): number => {
    const fx = clampIdx((x - minX) / cs, cols - 1);
    const fz = clampIdx((z - minZ) / cs, rows - 1);
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
  const riverSurfaceAt = (riverId: string, u: number): number => {
    const prof = profiles.get(riverId);
    if (!prof) return 0;
    const f = Math.max(0, Math.min(1, u)) * (PROFILE_SAMPLES - 1);
    const i = Math.min(PROFILE_SAMPLES - 2, Math.floor(f));
    return lerp(prof[i]!, prof[i + 1]!, f - i);
  };
  const regionAt = (x: number, z: number): string => {
    const c = clampIdx(Math.round((x - minX) / cs), cols - 1);
    const r = clampIdx(Math.round((z - minZ) / cs), rows - 1);
    const k = d.regionIdx[r * cols + c]!;
    return k === 0 ? 'plains' : (REGIONS[k - 1]?.id ?? 'plains');
  };

  return {
    minX: d.minX,
    maxX: d.maxX,
    minZ: d.minZ,
    maxZ: d.maxZ,
    cellSize: cs,
    cols,
    rows,
    heights,
    surface: { splatA: d.splatA, splatB: d.splatB, ao: d.ao, water: d.water },
    heightAt,
    normalAt,
    riverSurfaceAt,
    regionAt,
  };
}
