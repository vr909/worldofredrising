/**
 * World contract types. These are the shared interfaces every system builds against.
 * Owned by the lead (Opus). Agents: do not change these without an approved ticket.
 *
 * Coordinate system (see docs/ARCHITECTURE.md §3):
 *   - 1 world unit = 1 "display kilometre".
 *   - +x = east, -x = west, -z = north, +z = south, +y = up.
 *   - Origin = centre of the valley map. Default camera looks north (towards -z).
 *   - 2D layout points are [x, z] pairs.
 */

export type Vec2 = readonly [x: number, z: number];

/** How sure we are a fact matches the book. Shown to users as a badge. */
export type Confidence = 'canon' | 'inferred' | 'invented';

export type HouseId =
  | 'mars'
  | 'minerva'
  | 'diana'
  | 'apollo'
  | 'ceres'
  | 'jupiter'
  | 'juno'
  | 'pluto'
  | 'vulcan'
  | 'venus'
  | 'mercury'
  | 'neptune'
  | 'bacchus';

export type RegionKind = 'mountains' | 'highlands' | 'hills' | 'forest' | 'marsh' | 'sea' | 'lake';

export interface Region {
  id: string;
  name: string;
  kind: RegionKind;
  /** Closed polygon, clockwise or counter-clockwise, no self-intersections. */
  polygon: readonly Vec2[];
  confidence: Confidence;
  /** Whether the region name is drawn as an in-world label. */
  labelled: boolean;
  /** Optional label anchor; defaults to polygon centroid. */
  labelAt?: Vec2;
}

export interface River {
  id: string;
  /** null = unnamed in the book (label omitted). */
  name: string | null;
  /** Ordered from source to mouth. Mouth must touch another river, a lake or the sea. */
  points: readonly Vec2[];
  /** Display width in km at source and mouth (linearly interpolated). */
  width: readonly [source: number, mouth: number];
  confidence: Confidence;
  /** id of the river/lake/sea this one drains into. */
  drainsInto: string;
}

/** How the terrain must be shaped under a landmark so its model sits correctly. */
export type SiteGround =
  | 'hill' // raised plateau with steep sides (e.g. Mars: 80 m cliffs on three sides)
  | 'flat' // levelled pad at local ground height
  | 'river' // straddles a river; terrain is levelled on both banks
  | 'gorge' // wedged between two rock faces (Jupiter)
  | 'underground' // only an entrance is visible (Pluto)
  | 'floating'; // not on the terrain at all (Olympus)

export type LandmarkKind = 'castle' | 'tower' | 'fort' | 'olympus' | 'bridge';

export interface Landmark {
  id: string;
  kind: LandmarkKind;
  name: string;
  house: HouseId | null;
  position: Vec2;
  /** Direction the main gate/front faces, degrees clockwise from north (0 = north, 90 = east). */
  facingDeg: number;
  site: {
    ground: SiteGround;
    /** Radius (display km) of the levelled/plateau area under the model. */
    radius: number;
    /** For 'hill': plateau height above surrounding terrain. For 'floating': altitude above river level. */
    height?: number;
  };
  confidence: Confidence;
}

export interface WorldBounds {
  /** Playable valley floor extents (display km). */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Canyon walls occupy [minX - wallDepth, minX] and [maxX, maxX + wallDepth]. */
  wallDepth: number;
  /** Canyon wall height (canon: 6 km). */
  wallHeight: number;
  /** Depth of the diorama slab below sea level (visible strata on the cut faces). */
  slabDepth: number;
}
