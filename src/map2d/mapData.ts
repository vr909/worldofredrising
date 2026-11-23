/**
 * Everything the static layer of the map needs, precomputed once from the layout data: region and
 * coastline paths, river outlines, canyon-wall bands and the border frame.
 */
import { CANYON_STRATA } from '../render/palette';
import { BOUNDS, REGIONS, RIVERS } from '../world/layout';
import type { Region, Vec2 } from '../world/types';
import { buildGlyphs, type Glyph } from './glyphs';
import { buildRiver, f2, pathD, riverFillPath, smoothLine, type RiverShape } from './rivers';
import { mulberry32, seedFrom } from './scatter';

export interface WallBand {
  d: string;
  fill: string;
}

export interface MapData {
  glyphs: Glyph[];
  /** Region outline paths by region id (soft Catmull-Rom coasts for water and marsh). */
  regionPaths: Record<string, string>;
  rivers: { shape: RiverShape; fill: string; left: string; right: string }[];
  wallBands: WallBand[];
  /** Whole-wall outlines (for the hatch overlay) and their cliff-edge lines. */
  wallOutlines: string[];
  cliffEdges: string[];
  frameTicks: string[];
  frame: { x: number; z: number; w: number; h: number };
}

/** Straight polygon path. */
const polygonPath = (poly: readonly Vec2[]): string => pathD(poly, true);

/** Closed smooth blob (lakes, marsh). */
function smoothClosedPath(poly: readonly Vec2[]): string {
  return pathD(smoothLine(poly, 6, true), true);
}

/**
 * The sea polygon runs along the map's southern edge with a soft coast above it: smooth the coast
 * vertices only, keep the edge points that lie on the bounds sharp.
 */
function seaPath(region: Region): string {
  const onEdge = (p: Vec2) => Math.abs(p[1]) >= BOUNDS.maxZ - 1e-6;
  const first = region.polygon.findIndex((p) => !onEdge(p));
  let last = region.polygon.length - 1;
  while (last > 0 && onEdge(region.polygon[last]!)) last--;
  const coast = region.polygon.slice(first, last + 1);
  const smooth = smoothLine(coast, 6, false);
  const head = region.polygon.slice(0, first);
  const tail = region.polygon.slice(last + 1);
  return pathD([...head, ...smooth, ...tail], true);
}

function regionPath(region: Region): string {
  switch (region.kind) {
    case 'sea':
      return seaPath(region);
    case 'lake':
    case 'marsh':
      return smoothClosedPath(region.polygon);
    default:
      return polygonPath(region.polygon);
  }
}

/** A ragged vertical edge at base x, jittered along z with a seeded RNG. */
function raggedEdge(x: number, amp: number, rnd: () => number): Vec2[] {
  const pts: Vec2[] = [];
  const step = 1.25;
  for (let z = BOUNDS.minZ; z <= BOUNDS.maxZ + 1e-6; z += step) {
    pts.push([x + (rnd() - 0.5) * 2 * amp, Math.min(BOUNDS.maxZ, z)]);
  }
  return pts;
}

function buildWalls(): Pick<MapData, 'wallBands' | 'wallOutlines' | 'cliffEdges'> {
  const wallBands: WallBand[] = [];
  const wallOutlines: string[] = [];
  const cliffEdges: string[] = [];
  const bands = CANYON_STRATA.length;
  const bandW = BOUNDS.wallDepth / bands;
  for (const side of [-1, 1] as const) {
    const rnd = mulberry32(seedFrom(`wall:${side}`));
    const base = side < 0 ? BOUNDS.minX : BOUNDS.maxX;
    // edges[0] is the valley-side cliff edge, edges[bands] the outer rim.
    const edges: Vec2[][] = [];
    for (let k = 0; k <= bands; k++) {
      const x = base + side * k * bandW;
      edges.push(k === bands ? [[x, BOUNDS.minZ], [x, BOUNDS.maxZ]] : raggedEdge(x, k === 0 ? 0.42 : 0.28, rnd));
    }
    for (let k = 0; k < bands; k++) {
      // Lightest rust at the valley edge, deepest at the rim.
      const colour = CANYON_STRATA[bands - 1 - k]!;
      wallBands.push({ d: pathD([...edges[k]!, ...edges[k + 1]!.slice().reverse()], true), fill: colour });
    }
    wallOutlines.push(pathD([...edges[0]!, ...edges[bands]!.slice().reverse()], true));
    cliffEdges.push(pathD(edges[0]!));
  }
  return { wallBands, wallOutlines, cliffEdges };
}

function buildFrameTicks(): string[] {
  const ticks: string[] = [];
  const x0 = BOUNDS.minX - BOUNDS.wallDepth;
  const x1 = BOUNDS.maxX + BOUNDS.wallDepth;
  const z0 = BOUNDS.minZ;
  const z1 = BOUNDS.maxZ;
  const t = 0.7;
  // Alternating dark blocks around the border, like a surveyed map's graduated frame.
  for (let i = 0, x = x0; x < x1; x += 4, i++) {
    if (i % 2 === 0) {
      const xe = Math.min(x + 4, x1);
      ticks.push(`M${f2(x)} ${f2(z0 - t)}H${f2(xe)}V${f2(z0)}H${f2(x)}Z`);
      ticks.push(`M${f2(x)} ${f2(z1)}H${f2(xe)}V${f2(z1 + t)}H${f2(x)}Z`);
    }
  }
  for (let i = 0, z = z0; z < z1; z += 4, i++) {
    if (i % 2 === 0) {
      const ze = Math.min(z + 4, z1);
      ticks.push(`M${f2(x0 - t)} ${f2(z)}H${f2(x0)}V${f2(ze)}H${f2(x0 - t)}Z`);
      ticks.push(`M${f2(x1)} ${f2(z)}H${f2(x1 + t)}V${f2(ze)}H${f2(x1)}Z`);
    }
  }
  return ticks;
}

let cache: MapData | null = null;

export function getMapData(): MapData {
  if (cache) return cache;
  const regionPaths: Record<string, string> = {};
  for (const r of REGIONS) regionPaths[r.id] = regionPath(r);
  const rivers = RIVERS.map((r) => {
    const shape = buildRiver(r);
    return { shape, fill: riverFillPath(shape), left: pathD(shape.left), right: pathD(shape.right) };
  });
  const x0 = BOUNDS.minX - BOUNDS.wallDepth;
  cache = {
    glyphs: buildGlyphs(),
    regionPaths,
    rivers,
    ...buildWalls(),
    frameTicks: buildFrameTicks(),
    frame: { x: x0, z: BOUNDS.minZ, w: BOUNDS.maxX + BOUNDS.wallDepth - x0, h: BOUNDS.maxZ - BOUNDS.minZ },
  };
  return cache;
}
