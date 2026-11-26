import { describe, expect, it } from 'vitest';
import { buildOlympus, ROCK_DEPTH } from './geometry';

describe('buildOlympus', () => {
  const g = buildOlympus(2.2);
  it('stays within the triangle budget', () => {
    expect(g.tris).toBeGreaterThan(1000);
    expect(g.tris).toBeLessThanOrEqual(40000);
  });
  it('tapers to a point about 2 km below the plateau and leaves clear air above the river', () => {
    g.rock.computeBoundingBox();
    const min = g.rock.boundingBox!.min.y;
    expect(min).toBeLessThan(-ROCK_DEPTH * 0.9);
    expect(2.6 + min).toBeGreaterThanOrEqual(0.5); // site.height 2.6 above the river
  });
  it('has a tall slender citadel', () => {
    g.marble.computeBoundingBox();
    const b = g.marble.boundingBox!;
    expect(b.max.y).toBeGreaterThan(2.5);
    expect(b.max.y - b.min.y).toBeGreaterThan((b.max.x - b.min.x) * 1.2);
  });
});
