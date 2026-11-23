import { describe, expect, it } from 'vitest';
import { generateHeightfield } from '../terrain/heightfield';
import { REGIONS } from '../world/layout';
import { bakeWaterDepth, distanceTransform, lochLevel } from './bake';

describe('water bake', () => {
  it('chamfer distance grows away from seeds', () => {
    const seed = new Uint8Array(25);
    seed[0] = 1;
    const d = distanceTransform(seed, 5, 5, 1);
    expect(d[0]).toBe(0);
    expect(d[4]).toBeCloseTo(4, 5);
    expect(d[24]!).toBeGreaterThan(5);
  });

  it('loch level sits below the shore ground', () => {
    const hf = generateHeightfield({ cellSize: 0.5, seed: 1729 });
    const loch = REGIONS.find((r) => r.id === 'highland-loch')!;
    const level = lochLevel(hf, loch.polygon);
    for (const [x, z] of loch.polygon) expect(hf.heightAt(x, z)).toBeGreaterThan(level);
  });

  it('bakes sea depth within range', () => {
    const hf = generateHeightfield({ cellSize: 0.5, seed: 1729 });
    const sea = REGIONS.find((r) => r.id === 'south-sea')!;
    const b = bakeWaterDepth(hf, sea.polygon, 0, { texel: 0.2 });
    expect(b.data.length).toBe(b.width * b.height * 4);
    expect(b.depthMax).toBeGreaterThan(0.05);
  });
});
