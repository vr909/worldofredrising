/**
 * Terrain glyph placement for the engraved map: peaks, trees, hills, tufts. Everything is scattered with a
 * seeded RNG inside the region polygons from src/world/layout.ts, away from rivers, lakes and landmarks,
 * so the drawing is deterministic and always agrees with the layout.
 */
import { distanceToPolyline, lerp, smoothstep } from '../world/geometry';
import { BOUNDS, LANDMARKS, REGIONS, RIVERS, regionById } from '../world/layout';
import type { Region, Vec2 } from '../world/types';
import { widthAt } from './rivers';
import { mulberry32, scatterInPolygon, seedFrom } from './scatter';

export type GlyphKind = 'peak' | 'conifer' | 'broadleaf' | 'hill' | 'crag' | 'rise' | 'tuft';

export interface Glyph {
  kind: GlyphKind;
  /** Which symbol variant to use (see VARIANTS). */
  v: number;
  x: number;
  z: number;
  /** Width and height in km. */
  w: number;
  h: number;
}

/** Number of distinct <symbol> drawings per glyph kind. */
export const VARIANTS: Record<GlyphKind, number> = {
  peak: 2,
  conifer: 1,
  broadleaf: 2,
  hill: 1,
  crag: 1,
  rise: 1,
  tuft: 1,
};

/** Hard cap on glyph count so the SVG stays light (see T17 requirement 6). */
export const GLYPH_BUDGET = 2400;

const LAKES = REGIONS.filter((r) => r.kind === 'lake' || r.kind === 'sea');

function distToPolygonEdge(p: Vec2, poly: readonly Vec2[]): number {
  return distanceToPolyline(p, [...poly, poly[0]!]).dist;
}

/** True when a glyph at p would sit on a river, lake, sea or landmark marker. */
function blocked(p: Vec2, margin = 0): boolean {
  for (const l of LANDMARKS) {
    const r = l.kind === 'castle' ? 1.6 : l.kind === 'olympus' ? 2.8 : 0.9;
    if (Math.hypot(p[0] - l.position[0], p[1] - l.position[1]) < r + margin) return true;
  }
  for (const river of RIVERS) {
    const { dist, u } = distanceToPolyline(p, river.points);
    if (dist < widthAt(river, u) / 2 + 0.35 + margin) return true;
  }
  for (const lake of LAKES) {
    if (distToPolygonEdge(p, lake.polygon) < 0.7 + margin) return true;
  }
  return false;
}

function glyphsFor(
  region: Region,
  make: (p: Vec2, rnd: () => number) => Glyph | null,
  spacing: {
    min: (p: Vec2) => number;
    max: number;
  },
  max: number,
): Glyph[] {
  const rnd = mulberry32(seedFrom(`glyph:${region.id}`) ^ 0x9e3779b9);
  const pts = scatterInPolygon(region.polygon, {
    seed: seedFrom(`scatter:${region.id}`),
    minDist: spacing.min,
    maxMinDist: spacing.max,
    attempts: 60000,
    maxPoints: max,
    accept: (p) => !blocked(p),
  });
  const out: Glyph[] = [];
  for (const p of pts) {
    const g = make(p, rnd);
    if (g) out.push(g);
  }
  return out;
}

let cache: Glyph[] | null = null;

export function buildGlyphs(): Glyph[] {
  if (cache) return cache;
  const all: Glyph[] = [];
  const westMin = BOUNDS.minX; // the canyon wall face

  // Mountains: tall, thin peaks; denser and taller toward the west wall.
  const mountains = regionById('western-mountains')!;
  const westness = (p: Vec2) => smoothstep(-24, westMin + 2, p[0]);
  all.push(
    ...glyphsFor(
      mountains,
      (p, rnd) => {
        const t = westness(p);
        const h = lerp(1.35, 2.7, t) * (0.8 + rnd() * 0.45);
        const w = (0.75 + rnd() * 0.3) * lerp(0.9, 1.15, t);
        return { kind: 'peak', v: rnd() < 0.55 ? 0 : 1, x: p[0], z: p[1], w, h };
      },
      { min: (p) => lerp(1.55, 0.98, westness(p)), max: 1.6 },
      760,
    ),
  );

  // North Woods: conifers.
  all.push(
    ...glyphsFor(
      regionById('north-woods')!,
      (p, rnd) => ({ kind: 'conifer', v: 0, x: p[0], z: p[1], w: 0.5 + rnd() * 0.14, h: 0.82 + rnd() * 0.3 }),
      { min: () => 0.68, max: 0.7 },
      360,
    ),
  );

  // Greatwoods: mostly broadleaf with a scattering of conifers.
  all.push(
    ...glyphsFor(
      regionById('greatwoods')!,
      (p, rnd) =>
        rnd() < 0.25
          ? { kind: 'conifer', v: 0, x: p[0], z: p[1], w: 0.5 + rnd() * 0.12, h: 0.8 + rnd() * 0.25 }
          : {
              kind: 'broadleaf',
              v: rnd() < 0.5 ? 0 : 1,
              x: p[0],
              z: p[1],
              w: 0.62 + rnd() * 0.16,
              h: 0.72 + rnd() * 0.18,
            },
      { min: () => 0.82, max: 0.85 },
      760,
    ),
  );

  // Highlands: rounded hills with a few crags.
  all.push(
    ...glyphsFor(
      regionById('highlands')!,
      (p, rnd) =>
        rnd() < 0.2
          ? { kind: 'crag', v: 0, x: p[0], z: p[1], w: 0.6 + rnd() * 0.3, h: 0.75 + rnd() * 0.35 }
          : { kind: 'hill', v: 0, x: p[0], z: p[1], w: 1.3 + rnd() * 0.8, h: 0.6 + rnd() * 0.4 },
      { min: () => 1.7, max: 1.75 },
      170,
    ),
  );

  // Postern Hills: low rolling contour arcs.
  all.push(
    ...glyphsFor(
      regionById('postern-hills')!,
      (p, rnd) => ({ kind: 'rise', v: 0, x: p[0], z: p[1], w: 1.7 + rnd() * 1.1, h: 0.45 + rnd() * 0.25 }),
      { min: () => 1.55, max: 1.6 },
      130,
    ),
  );

  // Southern marshes: reed tufts.
  all.push(
    ...glyphsFor(
      regionById('southern-marshes')!,
      (p, rnd) => ({ kind: 'tuft', v: 0, x: p[0], z: p[1], w: 0.42 + rnd() * 0.16, h: 0.34 + rnd() * 0.16 }),
      { min: () => 0.72, max: 0.75 },
      90,
    ),
  );

  cache = all.slice(0, GLYPH_BUDGET);
  return cache;
}
