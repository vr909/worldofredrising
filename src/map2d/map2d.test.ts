import { describe, expect, it } from 'vitest';
import { pointInPolygon } from '../world/geometry';
import { LANDMARKS, REGIONS, RIVERS } from '../world/layout';
import type { Vec2 } from '../world/types';
import { buildGlyphs, GLYPH_BUDGET } from './glyphs';
import { buildRiver } from './rivers';
import { scatterInPolygon } from './scatter';
import { clampView, fitView, screenToWorld, worldToScreen, zoomAbout } from './viewport';

const square: Vec2[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
const opts = { seed: 7, minDist: () => 1, maxMinDist: 1, attempts: 5000, maxPoints: 500 };

describe('scatterInPolygon', () => {
  it('is deterministic', () => {
    expect(scatterInPolygon(square, opts)).toEqual(scatterInPolygon(square, opts));
  });
  it('stays inside and respects spacing', () => {
    const pts = scatterInPolygon(square, opts);
    expect(pts.length).toBeGreaterThan(30);
    for (const p of pts) expect(pointInPolygon(p, square)).toBe(true);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i]![0] - pts[j]![0], pts[i]![1] - pts[j]![1])).toBeGreaterThanOrEqual(1);
  });
});

describe('glyphs', () => {
  const glyphs = buildGlyphs();
  it('is within budget', () => {
    expect(glyphs.length).toBeGreaterThan(500);
    expect(glyphs.length).toBeLessThanOrEqual(GLYPH_BUDGET);
  });
  it('keeps every glyph inside some region and off landmarks', () => {
    for (const g of glyphs) {
      expect(REGIONS.some((r) => pointInPolygon([g.x, g.z], r.polygon))).toBe(true);
      for (const l of LANDMARKS) {
        expect(Math.hypot(g.x - l.position[0], g.z - l.position[1])).toBeGreaterThan(0.85);
      }
    }
  });
});

describe('rivers', () => {
  it('tapers from source to mouth and keeps the Argos bold', () => {
    const argos = buildRiver(RIVERS.find((r) => r.id === 'argos')!);
    expect(argos.widths[0]!).toBeLessThan(argos.widths[argos.widths.length - 1]!);
    expect(argos.widths[argos.widths.length - 1]!).toBeGreaterThan(0.8);
  });
});

describe('viewport', () => {
  it('zooms about the cursor', () => {
    const v = fitView(1440, 900);
    const before = screenToWorld(v, 900, 300, 1440, 900);
    const z = zoomAbout(v, 0.4, 900, 300, 1440, 900);
    const after = worldToScreen(z, before, 1440, 900);
    expect(after[0]).toBeCloseTo(900, 3);
    expect(after[1]).toBeCloseTo(300, 3);
  });
  it('clamps to the valley', () => {
    const c = clampView({ cx: 999, cz: -999, w: 20 }, 1440, 900);
    expect(c.cx).toBeLessThan(60);
    expect(c.cz).toBeGreaterThan(-40);
  });
});
