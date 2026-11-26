import { describe, expect, it } from 'vitest';
import { generateHeightfield } from '../terrain/heightfield';
import { LANDMARKS, RIVERS } from '../world/layout';
import { distanceToPolyline } from '../world/geometry';
import { budgetFor, drawCounts, TIER_BUDGET } from './budget';
import { buildSpeciesGeometry, triangleCount } from './geometry';
import { MAX_SLOPE_TAN, SPECIES, STRIDE, TREE_LINE, scatterVegetation } from './scatter';

const hf = generateHeightfield({ cellSize: 0.33, seed: 1729 });
const a = scatterVegetation(hf);

function each(fn: (sp: (typeof SPECIES)[number], x: number, y: number, z: number) => void) {
  for (const sp of SPECIES) {
    const d = a.data[sp];
    for (let i = 0; i < a.counts[sp]; i++) fn(sp, d[i * STRIDE]!, d[i * STRIDE + 1]!, d[i * STRIDE + 2]!);
  }
}

describe('scatterVegetation', () => {
  it('is deterministic', () => {
    const b = scatterVegetation(hf);
    expect(b.total).toBe(a.total);
    for (const sp of SPECIES) expect(Array.from(b.data[sp])).toEqual(Array.from(a.data[sp]));
  });

  it('plants a real forest budget and uses every species', () => {
    expect(a.total).toBeGreaterThan(40000);
    expect(a.total).toBeLessThan(90000);
    for (const sp of SPECIES) expect(a.counts[sp], sp).toBeGreaterThan(100);
  });

  it('keeps out of castle sites (1.2 x radius)', () => {
    each((sp, x, _y, z) => {
      for (const l of LANDMARKS) {
        if (l.site.ground === 'floating') continue;
        const d = Math.hypot(x - l.position[0], z - l.position[1]);
        expect(d, `${sp} near ${l.id}`).toBeGreaterThanOrEqual(l.site.radius * 1.2);
      }
    });
  });

  it('keeps out of water and river channels', () => {
    each((sp, x, _y, z) => {
      const c = Math.round((x - hf.minX) / hf.cellSize);
      const r = Math.round((z - hf.minZ) / hf.cellSize);
      expect(
        hf.surface.water[r * hf.cols + c]!,
        `${sp} in water at ${x.toFixed(2)},${z.toFixed(2)}`,
      ).toBeLessThan(128);
      for (const rv of RIVERS) {
        const d = distanceToPolyline([x, z], rv.points);
        expect(d.dist, `${sp} in ${rv.id}`).toBeGreaterThan(rv.width[0] * 0.5 * 0.99);
      }
    });
  });

  it('respects the tree line and slope limit', () => {
    each((sp, x, y, z) => {
      expect(y, sp).toBeLessThan(TREE_LINE);
      if (sp === 'reed') return;
      const ny = hf.normalAt(x, z)[1];
      expect(Math.sqrt(1 - ny * ny) / ny, sp).toBeLessThanOrEqual(MAX_SLOPE_TAN * 1.05);
    });
  });

  it('is shuffled: the first 10 % spreads across the whole valley', () => {
    const d = a.data.broadleaf;
    const n = Math.floor(a.counts.broadleaf / 10);
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < n; i++) {
      minX = Math.min(minX, d[i * STRIDE]!);
      maxX = Math.max(maxX, d[i * STRIDE]!);
    }
    expect(maxX - minX).toBeGreaterThan(25);
  });
});

describe('budget and geometry', () => {
  it('maps tiers to the ticket budgets', () => {
    expect(budgetFor('high', false)).toBe(TIER_BUDGET.high);
    expect(budgetFor('medium', false)).toBe(25000);
    expect(budgetFor('low', false)).toBe(8000);
    expect(budgetFor('high', true)).toBe(3000);
    const c = drawCounts(a.counts, 8000);
    const sum = SPECIES.reduce((s, id) => s + c[id], 0);
    expect(Math.abs(sum - 8000)).toBeLessThan(10);
    for (const id of SPECIES) expect(c[id]).toBeLessThanOrEqual(a.counts[id]);
  });

  it('keeps species geometry low-poly', () => {
    for (const id of SPECIES) {
      const g = buildSpeciesGeometry(id);
      expect(triangleCount(g), id).toBeLessThanOrEqual(48);
      expect(triangleCount(g), id).toBeGreaterThanOrEqual(6);
      g.dispose();
    }
  });
});
