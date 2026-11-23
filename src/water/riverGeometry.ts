/**
 * Ribbon geometry along river polylines, sitting on the heightfield's river surface profile.
 * Attributes: position, normal, uv (u = 0..1 along the river, v = 0..1 across),
 * aLen (river length km), aWid (local width km), aMouth (1 if the river drains into the sea). Owner: T03.
 */
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { pointAlong, type Heightfield } from '../terrain/heightfield';
import { polylineLength, smoothstep } from '../world/geometry';
import { REGIONS } from '../world/layout';
import type { River } from '../world/types';

interface Buffers {
  pos: number[];
  uv: number[];
  len: number[];
  wid: number[];
  mouth: number[];
  idx: number[];
}

function appendRiver(b: Buffers, river: River, hf: Heightfield, step: number, lift: number) {
  const len = polylineLength(river.points);
  const segs = Math.max(2, Math.ceil(len / step));
  const base = b.pos.length / 3;
  const sea = REGIONS.some((r) => r.id === river.drainsInto && r.kind === 'sea') ? 1 : 0;
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
    // Width grows downstream; a river that meets the sea flares into a small delta mouth.
    const w =
      (river.width[0] + (river.width[1] - river.width[0]) * u) * (1 + 0.45 * sea * smoothstep(0.9, 1, u));
    const half = w * 0.5;
    const y = hf.riverSurfaceAt(river.id, u) + lift;
    // Left/right of travel direction (perpendicular in x/z).
    b.pos.push(p[0] - dz * half, y, p[1] + dx * half, p[0] + dz * half, y, p[1] - dx * half);
    b.uv.push(u, 0, u, 1);
    b.len.push(len, len);
    b.wid.push(w, w);
    b.mouth.push(sea, sea);
    if (i < segs) {
      const a = base + i * 2;
      b.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
}

function toGeometry(b: Buffers): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(b.pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(b.uv, 2));
  g.setAttribute('aLen', new Float32BufferAttribute(b.len, 1));
  g.setAttribute('aWid', new Float32BufferAttribute(b.wid, 1));
  g.setAttribute('aMouth', new Float32BufferAttribute(b.mouth, 1));
  g.setIndex(b.idx);
  g.computeVertexNormals();
  return g;
}

const emptyBuffers = (): Buffers => ({ pos: [], uv: [], len: [], wid: [], mouth: [], idx: [] });

export function buildRiverGeometry(river: River, hf: Heightfield, step = 0.15): BufferGeometry {
  const b = emptyBuffers();
  appendRiver(b, river, hf, step, 0.004);
  return toGeometry(b);
}

/**
 * All rivers merged into one geometry (one draw call). Rivers are listed parent-first, so each gets a
 * slightly smaller lift than the one before it; where a tributary's mouth overlaps its parent the
 * parent (higher, opaque, depth-written) wins and no double-blended seam appears.
 */
export function buildRiversGeometry(rivers: readonly River[], hf: Heightfield, step = 0.15): BufferGeometry {
  const b = emptyBuffers();
  rivers.forEach((r, i) => appendRiver(b, r, hf, step, 0.003 + (rivers.length - i) * 0.0012));
  return toGeometry(b);
}
