/**
 * Coarser terrain index buffer for the cheap path (T14). In software GL the terrain's ~340k triangles dominate frame time
 * (vertex work), not pixels. The mesh is a regular cols x rows grid, so taking every `stride`-th grid line gives a valid
 * coarser mesh from the SAME vertices and normals: no heightfield regeneration, just a different index buffer.
 */

/** Index buffer (counter-clockwise from above, alternating diagonals like terrainGeometry.ts) for every stride-th grid line. */
export function strideIndex(cols: number, rows: number, stride: number): Uint32Array {
  const cs: number[] = [];
  const rs: number[] = [];
  for (let c = 0; c < cols - 1; c += stride) cs.push(c);
  cs.push(cols - 1);
  for (let r = 0; r < rows - 1; r += stride) rs.push(r);
  rs.push(rows - 1);
  const idx = new Uint32Array((cs.length - 1) * (rs.length - 1) * 6);
  let k = 0;
  for (let j = 0; j < rs.length - 1; j++) {
    for (let i = 0; i < cs.length - 1; i++) {
      const a = rs[j]! * cols + cs[i]!;
      const b = rs[j]! * cols + cs[i + 1]!;
      const d = rs[j + 1]! * cols + cs[i]!;
      const e = rs[j + 1]! * cols + cs[i + 1]!;
      if ((i + j) % 2 === 0) {
        idx.set([a, d, b, b, d, e], k);
      } else {
        idx.set([a, d, e, a, e, b], k);
      }
      k += 6;
    }
  }
  return idx;
}

/** Grid stride that gives roughly 0.6 km cells whatever the heightfield tier (low 2, medium 3, high 5). */
export function coarseStride(cellSize: number): number {
  return Math.max(2, Math.round(0.6 / cellSize));
}
