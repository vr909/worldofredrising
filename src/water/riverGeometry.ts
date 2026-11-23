/**
 * Ribbon geometry along a river polyline, sitting on the heightfield's river surface profile.
 * Attributes: position, normal, uv (u = 0..1 along the river, v = 0..1 across). Owner: T03.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { pointAlong, type Heightfield } from '../terrain/heightfield';
import { polylineLength } from '../world/geometry';
import type { River } from '../world/types';

export function buildRiverGeometry(river: River, hf: Heightfield, step = 0.2): BufferGeometry {
  const len = polylineLength(river.points);
  const segs = Math.max(2, Math.ceil(len / step));
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const p = pointAlong(river.points, u);
    const q = pointAlong(river.points, Math.min(1, u + 1 / segs));
    const o = pointAlong(river.points, Math.max(0, u - 1 / segs));
    let dx = q[0] - o[0];
    let dz = q[1] - o[1];
    const l = Math.hypot(dx, dz) || 1;
    dx /= l;
    dz /= l;
    const half = (river.width[0] + (river.width[1] - river.width[0]) * u) * 0.5;
    const y = hf.riverSurfaceAt(river.id, u) + 0.004;
    // Left/right of travel direction (perpendicular in x/z).
    pos.push(p[0] - dz * half, y, p[1] + dx * half, p[0] + dz * half, y, p[1] - dx * half);
    uv.push(u, 0, u, 1);
    if (i < segs) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
