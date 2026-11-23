/**
 * Contract tests for the world layout. If one of these fails, some system will render something
 * physically impossible (a river that ends in mid-air, a castle in the sea), so treat failures as bugs.
 */
import { describe, expect, it } from 'vitest';
import { distanceToPolyline, pointInPolygon } from './geometry';
import { HOUSE_IDS } from './houses';
import { BOUNDS, LANDMARKS, REGIONS, RIVERS, regionById, riverById } from './layout';
import type { Vec2 } from './types';

const inBounds = ([x, z]: Vec2) =>
  x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ;

describe('world layout contract', () => {
  it('has unique ids across landmarks, rivers and regions', () => {
    const ids = [...LANDMARKS, ...RIVERS, ...REGIONS].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps every point inside the valley bounds', () => {
    for (const l of LANDMARKS) expect(inBounds(l.position), l.id).toBe(true);
    for (const r of RIVERS) for (const p of r.points) expect(inBounds(p), r.id).toBe(true);
    for (const g of REGIONS) for (const p of g.polygon) expect(inBounds(p), g.id).toBe(true);
  });

  it('gives each of the 13 Houses exactly one castle', () => {
    const castles = LANDMARKS.filter((l) => l.kind === 'castle');
    expect(castles.map((c) => c.house).sort()).toEqual([...HOUSE_IDS].sort());
  });

  it('ends every river on its parent river, lake or sea', () => {
    for (const r of RIVERS) {
      const mouth = r.points[r.points.length - 1]!;
      const parentRiver = riverById(r.drainsInto);
      const parentRegion = regionById(r.drainsInto);
      if (parentRiver) {
        expect(distanceToPolyline(mouth, parentRiver.points).dist, r.id).toBeLessThan(0.05);
      } else {
        expect(parentRegion, `${r.id} drains into unknown ${r.drainsInto}`).toBeDefined();
        expect(pointInPolygon(mouth, parentRegion!.polygon), r.id).toBe(true);
      }
    }
  });

  it('puts river-straddling castles on a river and no castle in the sea', () => {
    const sea = regionById('south-sea')!;
    for (const l of LANDMARKS) {
      if (l.site.ground === 'river') {
        const nearest = Math.min(...RIVERS.map((r) => distanceToPolyline(l.position, r.points).dist));
        expect(nearest, l.id).toBeLessThan(0.1);
      }
      if (l.kind !== 'olympus') expect(pointInPolygon(l.position, sea.polygon), l.id).toBe(false);
    }
  });

  it('matches key canon relationships', () => {
    const mars = LANDMARKS.find((l) => l.id === 'castle-mars')!;
    const metas = riverById('metas')!;
    // Mars Castle stands "on a hill just north of" the Metas.
    const near = distanceToPolyline(mars.position, metas.points);
    expect(near.dist).toBeLessThan(2);
    expect(mars.position[1]).toBeLessThan(near.point[1]); // north = more negative z
    // Phobos lies south-west of Mars Castle, Deimos to the north-west.
    const phobos = LANDMARKS.find((l) => l.id === 'tower-phobos')!.position;
    const deimos = LANDMARKS.find((l) => l.id === 'tower-deimos')!.position;
    expect(phobos[0]).toBeLessThan(mars.position[0]);
    expect(phobos[1]).toBeGreaterThan(mars.position[1]);
    expect(deimos[0]).toBeLessThan(mars.position[0]);
    // Diana lies south of Minerva, in the Greatwoods.
    const diana = LANDMARKS.find((l) => l.id === 'castle-diana')!.position;
    const minerva = LANDMARKS.find((l) => l.id === 'castle-minerva')!.position;
    expect(diana[1]).toBeGreaterThan(minerva[1]);
    expect(pointInPolygon(diana, regionById('greatwoods')!.polygon)).toBe(true);
  });
});
