import { describe, expect, it } from 'vitest';
import { HOUSE_IDS } from '../world/houses';
import { SIGILS } from './sigilData';
import { H, P, bar, circ } from './shapes';

describe('sigils', () => {
  it('has a path for every House', () => {
    expect(Object.keys(SIGILS).sort()).toEqual([...HOUSE_IDS].sort());
    for (const id of HOUSE_IDS) expect(SIGILS[id].path.length).toBeGreaterThan(40);
  });

  it('stays on the 64-unit grid and is pure fill (finite numbers only)', () => {
    for (const id of HOUSE_IDS) {
      const d = SIGILS[id].path;
      expect(d).toMatch(/^M/);
      expect(d).not.toMatch(/NaN|Infinity|undefined/);
      const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(-1);
        expect(n).toBeLessThanOrEqual(65);
      }
    }
  });

  it('shape helpers wind solids and holes oppositely', () => {
    const sq = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ] as const;
    expect(P(sq)).not.toBe(H(sq));
    expect(bar(0, 0, 4, 0, 2)).toMatch(/^M.*Z$/);
    expect(circ(5, 5, 2, true)).not.toBe(circ(5, 5, 2, false));
  });
});
