/**
 * HEIGHTFIELD CONTRACT + baseline generator.
 *
 * Every system that needs "how high is the ground here?" uses the Heightfield interface below:
 * terrain mesh, water, castles, vegetation, labels, camera. The interface is frozen (lead-owned);
 * the generator internals are owned by ticket T01 (see src/terrain/gen/).
 *
 * Grid layout: row-major. Row r runs west→east at z = minZ + r*cellSize (north→south).
 * Column c is at x = minX + c*cellSize. Vertex index = r * cols + c.
 */
import { lerp } from '../world/geometry';
import type { Vec2 } from '../world/types';
import { buildHeightfield } from './gen/build';
import { generateTerrainData } from './gen/generate';

/**
 * Splat channels: per-vertex surface weights 0..255, packed RGBA. Shader decides colours.
 * Combination rule (made explicit after M1 integration): weights may overlap and need not sum to 255; the
 * shader normalises them. EXCEPTION: canyon wall stone (splatB.b) is exclusive. Where it is w > 0, every
 * other channel is scaled by (1 - w) before normalising, so walls read as pure strata.
 */
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

/**
 * Synchronous generation (used by tests and Node scripts). The app uses generateHeightfieldAsync from
 * ./gen/async, which runs the same generator in a Web Worker. Deterministic for a given seed + cell size.
 * Generator internals live in src/terrain/gen/ (ticket T01).
 */
export function generateHeightfield(opts: HeightfieldOptions = DEFAULT_HEIGHTFIELD_OPTIONS): Heightfield {
  return buildHeightfield(generateTerrainData(opts));
}

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
