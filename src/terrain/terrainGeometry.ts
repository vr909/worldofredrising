/**
 * Builds the terrain BufferGeometry from a Heightfield. Attributes exposed to shaders:
 *   position, normal, uv (0..1 over the grid),
 *   splatA (vec4, normalised u8), splatB (vec4, normalised u8), ao (float), water (float)
 * Owner: T02 (may extend; must keep these attribute names).
 */
import { BufferAttribute, BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute } from 'three';
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
      // Counter-clockwise seen from above (+y) so normals point up.
      idx[k++] = a;
      idx[k++] = d;
      idx[k++] = b;
      idx[k++] = b;
      idx[k++] = d;
      idx[k++] = e;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('splatA', new BufferAttribute(surface.splatA, 4, true));
  g.setAttribute('splatB', new BufferAttribute(surface.splatB, 4, true));
  g.setAttribute('ao', new BufferAttribute(surface.ao, 1, true));
  g.setAttribute('water', new BufferAttribute(surface.water, 1, true));
  g.setIndex(new Uint32BufferAttribute(idx, 1));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
