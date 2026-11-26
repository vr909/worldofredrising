import { describe, expect, it } from 'vitest';
import { generateHeightfield } from '../terrain/heightfield';
import { SPECIES, scatterVegetation } from './scatter';

const hf = generateHeightfield({ cellSize: 0.33, seed: 1729 });
const t0 = performance.now();
const a = scatterVegetation(hf);
const ms = performance.now() - t0;
console.log('scatter ms', ms.toFixed(0), a.counts, a.total);

describe('scatterVegetation', () => {
  it('is deterministic', () => {
    const b = scatterVegetation(hf);
    expect(b.total).toBe(a.total);
    for (const sp of SPECIES)
      expect(Array.from(b.data[sp].slice(0, 64))).toEqual(Array.from(a.data[sp].slice(0, 64)));
  });
});
