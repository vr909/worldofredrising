import { describe, expect, it } from 'vitest';
import { coarseStride, strideIndex } from './terrainLod';

describe('strideIndex', () => {
  it('stride 1 covers every cell with two triangles', () => {
    expect(strideIndex(5, 4, 1).length).toBe(4 * 3 * 6);
  });
  it('stride 2 has about a quarter of the triangles and always reaches the far edge', () => {
    const idx = strideIndex(9, 9, 2);
    expect(idx.length).toBe(4 * 4 * 6);
    expect(Math.max(...idx)).toBe(9 * 9 - 1);
  });
  it('handles grids that are not a multiple of the stride', () => {
    const idx = strideIndex(6, 5, 2);
    expect(Math.max(...idx)).toBe(6 * 5 - 1);
    expect(idx.length % 3).toBe(0);
    expect(idx.every((i) => i < 30)).toBe(true);
  });
});

describe('coarseStride', () => {
  it('targets ~0.6 km cells per tier', () => {
    expect([0.33, 0.2, 0.125].map(coarseStride)).toEqual([2, 3, 5]);
  });
});
