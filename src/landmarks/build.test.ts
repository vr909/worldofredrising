import { describe, expect, it } from 'vitest';
import { generateHeightfield } from '../terrain/heightfield';
import { LANDMARKS } from '../world/layout';
import { buildLandmark, RECIPES } from './build';

const hf = generateHeightfield({ cellSize: 0.25, seed: 1729 });

describe('landmark recipes', () => {
  it('has a recipe for every landmark except Olympus (T06)', () => {
    for (const l of LANDMARKS) {
      if (l.kind === 'olympus') continue;
      expect(RECIPES[l.id], l.id).toBeTypeOf('function');
    }
  });

  it('builds finite, budgeted geometry for each landmark', () => {
    let total = 0;
    let draws = 0;
    const rows: string[] = [];
    for (const l of LANDMARKS) {
      if (l.kind === 'olympus') continue;
      const b = buildLandmark(hf, l);
      let n = 0;
      for (const g of [b.stone, b.roof, b.trim]) {
        if (!g) continue;
        n++;
        const pos = g.getAttribute('position');
        expect(g.getAttribute('color').count).toBe(pos.count);
        expect(g.getAttribute('normal').count).toBe(pos.count);
        let bad = -1;
        const arr = pos.array;
        for (let i = 0; i < arr.length; i++) {
          if (!Number.isFinite(arr[i]!)) {
            bad = i;
            break;
          }
        }
        expect(bad, `${l.id} non-finite position`).toBe(-1);
        // nothing should wander far outside the site (gatehouse barbicans and walls may overshoot a little)
        const box = g.boundingBox!;
        const reach = Math.max(
          Math.abs(box.min.x),
          Math.abs(box.max.x),
          Math.abs(box.min.z),
          Math.abs(box.max.z),
        );
        expect(reach, `${l.id} reach`).toBeLessThan(l.site.radius * 1.7 + 0.5);
      }
      expect(n).toBeLessThanOrEqual(3);
      expect(b.tris, l.id).toBeGreaterThan(100);
      expect(b.tris, l.id).toBeLessThan(40000);
      total += b.tris;
      draws += n;
      rows.push(`${l.id}: ${Math.round(b.tris)} tris, ${n} draws`);
    }
    console.log(rows.join('\n'), `\nTOTAL ${Math.round(total)} tris, ${draws} draws`);
    expect(total).toBeLessThan(200000);
    expect(draws).toBeLessThanOrEqual(60);
  });
});
