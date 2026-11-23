/**
 * Builds the terrain BufferGeometry from a Heightfield. Attributes exposed to shaders:
 *   position, normal, uv (0..1 over the grid),
 *   splatA (vec4, normalised u8), splatB (vec4, normalised u8), ao (float), water (float)
 * Owner: T02 (may extend; must keep these attribute names).
 */
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from 'three';
import { BOUNDS } from '../world/layout';
import type { Heightfield } from './heightfield';

export function buildTerrainGeometry(hf: Heightfield): BufferGeometry {
  const { cols, rows, cellSize, minX, minZ, heights, surface } = hf;
  const n = cols * rows;
  const pos = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      pos[i * 3] = minX + c * cellSize;
      pos[i * 3 + 1] = heights[i]!;
      pos[i * 3 + 2] = minZ + r * cellSize;
      uv[i * 2] = c / (cols - 1);
      uv[i * 2 + 1] = 1 - r / (rows - 1);
    }
  }
  const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      // Counter-clockwise seen from above (+y). Diagonals alternate (checkerboard) so steep faces
      // do not show a one-directional saw-tooth.
      if ((r + c) % 2 === 0) {
        idx[k++] = a;
        idx[k++] = d;
        idx[k++] = b;
        idx[k++] = b;
        idx[k++] = d;
        idx[k++] = e;
      } else {
        idx[k++] = a;
        idx[k++] = d;
        idx[k++] = e;
        idx[k++] = a;
        idx[k++] = e;
        idx[k++] = b;
      }
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('splatA', new BufferAttribute(surface.splatA, 4, true));
  g.setAttribute('splatB', new BufferAttribute(surface.splatB, 4, true));
  g.setAttribute('ao', new BufferAttribute(surface.ao, 1, true));
  g.setAttribute('water', new BufferAttribute(surface.water, 1, true));
  g.setAttribute('wet', new Float32BufferAttribute(buildWetness(hf), 1));
  g.setIndex(new Uint32BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/**
 * Soft "near water" field 0..1: the submerged mask blurred outward by ~0.5 km (two separable box
 * passes), so the shader can darken a wet band on the dry ground just above the waterline.
 */
export function buildWetness(hf: Heightfield): Float32Array {
  const { cols, rows, cellSize, surface } = hf;
  const radius = Math.max(1, Math.round(0.45 / cellSize));
  const n = cols * rows;
  let src = new Float32Array(n);
  for (let i = 0; i < n; i++) src[i] = surface.water[i]! / 255;
  const tmp = new Float32Array(n);
  const norm = 1 / (2 * radius + 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++)
          sum += src[r * cols + Math.min(cols - 1, Math.max(0, c + k))]!;
        tmp[r * cols + c] = sum * norm;
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++)
          sum += tmp[Math.min(rows - 1, Math.max(0, r + k)) * cols + c]!;
        src[r * cols + c] = sum * norm;
      }
    }
  }
  // Ground that is itself submerged reads as fully wet; the blur only needs to reach onto land.
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.min(1, src[i]! * 2.2);
  src = out;
  return src;
}

/**
 * Four outward-facing skirts (N, E, S, W) from the heightfield's edge samples down to
 * -slabDepth. `aTop` carries the terrain height at each column so the shader can place the soil
 * cap and, where the terrain edge is below sea level, a water layer up to y = 0.
 */
export function buildSlabGeometry(hf: Heightfield): BufferGeometry {
  const { cols, rows, cellSize, minX, minZ, heights } = hf;
  const bottom = -BOUNDS.slabDepth;
  const pos: number[] = [];
  const nrm: number[] = [];
  const top: number[] = [];
  const idx: number[] = [];

  const side = (samples: { x: number; z: number; h: number }[], nx: number, nz: number, flip: boolean) => {
    const base = pos.length / 3;
    for (const s of samples) {
      pos.push(s.x, Math.max(s.h, 0), s.z, s.x, bottom, s.z);
      nrm.push(nx, 0, nz, nx, 0, nz);
      top.push(s.h, s.h);
    }
    for (let i = 0; i < samples.length - 1; i++) {
      const a = base + i * 2; // top i
      const b = a + 1; // bottom i
      const c = a + 2; // top i+1
      const d = a + 3; // bottom i+1
      if (flip) idx.push(a, b, c, c, b, d);
      else idx.push(a, c, b, c, d, b);
    }
  };

  const row = (r: number) =>
    Array.from({ length: cols }, (_, c) => ({
      x: minX + c * cellSize,
      z: minZ + r * cellSize,
      h: heights[r * cols + c]!,
    }));
  const col = (c: number) =>
    Array.from({ length: rows }, (_, r) => ({
      x: minX + c * cellSize,
      z: minZ + r * cellSize,
      h: heights[r * cols + c]!,
    }));

  side(row(0), 0, -1, false); // north, samples run west -> east
  side(row(rows - 1), 0, 1, true); // south
  side(col(0), -1, 0, true); // west, samples run north -> south
  side(col(cols - 1), 1, 0, false); // east

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  g.setAttribute('aTop', new Float32BufferAttribute(top, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
