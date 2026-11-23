/**
 * GRAYBOX terrain — placeholder owned by T02, which replaces the material with the painterly
 * shader (docs/DESIGN.md §5) and adds the diorama slab sides. Colours here are a CPU blend of the
 * splat channels so the skeleton is readable.
 */
import { useMemo } from 'react';
import { Color, Float32BufferAttribute } from 'three';
import { SUMMER } from '../render/palette';
import { useHeightfield } from './HeightfieldContext';
import { buildTerrainGeometry } from './terrainGeometry';

export function Terrain() {
  const hf = useHeightfield();
  const geometry = useMemo(() => {
    const g = buildTerrainGeometry(hf);
    const t = SUMMER.terrain;
    const cols = {
      grass: new Color(t.grass),
      forest: new Color(t.forestFloor),
      rock: new Color(t.rock),
      sand: new Color(t.sand),
      marsh: new Color(t.marsh),
      sandstone: new Color(t.sandstone),
      wall: new Color('#A26B47'),
      moss: new Color(t.highlandMoss),
      snow: new Color(t.snow),
    };
    const { splatA, splatB } = hf.surface;
    const n = hf.cols * hf.rows;
    const out = new Float32Array(n * 3);
    const c = new Color();
    for (let i = 0; i < n; i++) {
      const w = [
        [splatA[i * 4]!, cols.grass],
        [splatA[i * 4 + 1]!, cols.forest],
        [splatA[i * 4 + 2]!, cols.rock],
        [splatA[i * 4 + 3]!, cols.sand],
        [splatB[i * 4]!, cols.marsh],
        [splatB[i * 4 + 1]!, cols.sandstone],
        [splatB[i * 4 + 2]!, cols.wall],
        [splatB[i * 4 + 3]!, cols.moss],
      ] as const;
      let sum = 0;
      c.setRGB(0, 0, 0);
      for (const [v, col] of w) {
        sum += v;
        c.r += col.r * v;
        c.g += col.g * v;
        c.b += col.b * v;
      }
      if (sum > 0) c.multiplyScalar(1 / sum);
      else c.copy(cols.grass);
      const h = hf.heights[i]!;
      if (h > 2.6 && splatB[i * 4 + 2]! < 128) c.lerp(cols.snow, Math.min(1, (h - 2.6) / 0.6));
      out[i * 3] = c.r;
      out[i * 3 + 1] = c.g;
      out[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new Float32BufferAttribute(out, 3));
    return g;
  }, [hf]);

  return (
    <mesh geometry={geometry} receiveShadow name="terrain">
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}
