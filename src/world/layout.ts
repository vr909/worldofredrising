/**
 * THE WORLD LAYOUT CONTRACT — where everything in the Institute valley is.
 *
 * Source of truth for geography. Terrain, water, castles, vegetation, labels, camera and UI all
 * read from here, so they agree with each other without coordinating.
 *
 * Derivation: positions were measured from the book's printed two-page map (front matter) at
 * 20 px/km, so the map spans ~90 km between the canyon walls, which matches the text
 * (walls ~50 km W and ~40 km E of House Mars). Then harmonised with textual details.
 * See docs/research/institute-canon.md for citations and docs/ARCHITECTURE.md §3 for conventions.
 *
 * Owner: lead (Opus). Agents may READ freely. Changes need a ticket that says so.
 */
import type { Landmark, Region, River, Vec2, WorldBounds } from './types';

export const BOUNDS: WorldBounds = {
  minX: -45,
  maxX: 45,
  minZ: -33,
  maxZ: 33,
  wallDepth: 6,
  wallHeight: 6,
  slabDepth: 1.2,
};

/** Water surface level of the South Sea and the reference "river level" (display km). */
export const SEA_LEVEL = 0;

// ---------------------------------------------------------------------------------------------
// Regions. Anything not inside a region is open plains/lowlands (the Argos basin).
// Shared borders use identical vertices so regions tile without gaps.
// ---------------------------------------------------------------------------------------------

function ring(cx: number, cz: number, r: number, n = 10): Vec2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r * 0.75] as Vec2;
  });
}

export const REGIONS: readonly Region[] = [
  {
    id: 'western-mountains',
    name: 'The Mountains',
    kind: 'mountains',
    confidence: 'canon',
    labelled: true,
    labelAt: [-36, -12],
    polygon: [
      [-45, -33],
      [-26, -33],
      [-25, -26],
      [-27, -18],
      [-24, -10],
      [-26, -2],
      [-23, 6],
      [-25, 14],
      [-20, 20],
      [-18, 22],
      [-18, 33],
      [-45, 33],
    ],
  },
  {
    id: 'north-woods',
    name: 'North Woods',
    kind: 'forest',
    confidence: 'canon',
    labelled: true,
    labelAt: [-12, -29.5],
    polygon: [
      [-26, -33],
      [2, -33],
      [2, -27],
      [-4, -25],
      [-10, -24.5],
      [-18, -25],
      [-25, -26],
    ],
  },
  {
    id: 'highlands',
    name: 'The Highlands',
    kind: 'highlands',
    confidence: 'canon',
    labelled: true,
    labelAt: [15, -27],
    polygon: [
      [2, -33],
      [28, -33],
      [29, -22],
      [27, -12],
      [22, -9],
      [14, -10],
      [6, -11],
      [3, -15],
      [1, -24],
      [2, -27],
    ],
  },
  {
    id: 'postern-hills',
    name: 'Postern Hills',
    kind: 'hills',
    confidence: 'canon',
    labelled: true,
    labelAt: [38, -24],
    polygon: [
      [28, -33],
      [45, -33],
      [45, -8],
      [36, -9],
      [29, -12],
      [27, -12],
      [29, -22],
    ],
  },
  {
    id: 'greatwoods',
    name: 'The Greatwoods',
    kind: 'forest',
    confidence: 'canon',
    labelled: true,
    labelAt: [24, 3],
    polygon: [
      [3, -2],
      [6, -11],
      [14, -10],
      [22, -9],
      [27, -12],
      [29, -12],
      [36, -9],
      [45, -8],
      [45, 17],
      [38, 20],
      [28, 19],
      [18, 20],
      [10, 18.5],
      [6, 14],
      [3, 8],
    ],
  },
  {
    id: 'southern-marshes',
    name: 'The Marshes',
    kind: 'marsh',
    confidence: 'canon',
    labelled: false,
    polygon: [
      [-20, 12],
      [-6, 11.5],
      [0, 14],
      [-1, 18.4],
      [-8, 18.4],
      [-12.75, 17.8],
      [-15.5, 19],
      [-20, 17.5],
    ],
  },
  {
    id: 'south-sea',
    name: 'South Sea',
    kind: 'sea',
    confidence: 'canon',
    labelled: true,
    labelAt: [0, 26],
    polygon: [
      [-18, 33],
      [-18, 22],
      [-15.5, 19.2],
      [-12.75, 18],
      [-8, 18.6],
      [0, 18.5],
      [5, 18.9],
      [10.25, 19.4],
      [14.25, 20.6],
      [17.75, 22.75],
      [18.2, 26.5],
      [14.2, 27.6],
      [13.8, 29.4],
      [17.5, 30.6],
      [18.5, 33],
    ],
  },
  {
    id: 'highland-loch',
    name: 'Highland Loch',
    kind: 'lake',
    confidence: 'canon',
    labelled: false,
    polygon: ring(14, -29, 1.1),
  },
  {
    // The small, cold, deep loch in a humid glen where Darrow and Cassius hid from Minerva's riders:
    // ~20 km east of Mars along the northern crests (p.210), riders "tear down the glen" (p.213),
    // "I'm in Minerva, not Mars" (p.214). Position inferred; not the supper loch above (p.190).
    id: 'dark-loch',
    name: 'The Dark Loch',
    kind: 'lake',
    confidence: 'inferred',
    labelled: false,
    polygon: ring(35.5, -24, 0.7),
  },
];

// ---------------------------------------------------------------------------------------------
// Rivers, ordered source → mouth. Each mouth lies exactly on its parent river / inside its lake or sea.
// ---------------------------------------------------------------------------------------------

export const RIVERS: readonly River[] = [
  {
    id: 'argos',
    name: 'Argos',
    confidence: 'canon',
    drainsInto: 'south-sea',
    width: [0.12, 0.6],
    points: [
      [-23.6, -33],
      [-20.25, -26],
      [-17.15, -22],
      [-13.6, -18.45],
      [-11.1, -13.95],
      [-12.7, -11.3],
      [-13.1, -6.85],
      [-12.05, -2.4],
      [-9.8, 3.4],
      [-10.25, 6.25],
      [-11.25, 11.25],
      [-12.25, 16.25],
      [-12.75, 18.6],
    ],
  },
  {
    id: 'argos-east-fork',
    name: null,
    confidence: 'canon',
    drainsInto: 'argos',
    width: [0.1, 0.25],
    points: [
      [-8.65, -33],
      [-8.2, -26],
      [-9.3, -20.2],
      [-10.9, -14.85],
      [-11.1, -13.95],
    ],
  },
  {
    // Formed where the Furor and Metas meet; "one tributary to the Argos" (unnamed in the book).
    id: 'highland-river',
    name: null,
    confidence: 'canon',
    drainsInto: 'argos',
    width: [0.15, 0.35],
    points: [
      [11.6, -19.1],
      [8.9, -18],
      [5.8, -17.1],
      [0, -16.65],
      [-3.8, -16],
      [-8.7, -15.3],
      [-10.6, -13.4],
      [-12.0, -12.46],
    ],
  },
  {
    id: 'furor',
    name: 'Furor',
    confidence: 'canon',
    drainsInto: 'highland-river',
    width: [0.06, 0.12],
    points: [
      [13.9, -28.1],
      [12.4, -26.4],
      [10.7, -23.8],
      [11.15, -20.65],
      [11.6, -19.1],
    ],
  },
  {
    // Runs just south of Mars Castle. One bridge spans it (see LANDMARKS 'metas-bridge').
    id: 'metas',
    name: 'Metas',
    confidence: 'canon',
    drainsInto: 'highland-river',
    width: [0.06, 0.14],
    points: [
      [25, -21.5],
      [21, -20],
      [18.7, -19.45],
      [14.7, -19.35],
      [11.6, -19.1],
    ],
  },
  {
    // "Juno ... lies to the west on a tributary of the Argos. Mountains frame it." (p.320)
    id: 'juno-stream',
    name: null,
    confidence: 'inferred',
    drainsInto: 'argos',
    width: [0.05, 0.15],
    points: [
      [-27.5, -14.5],
      [-22, -11.6],
      [-16.7, -10.4],
      [-12.95, -8.5],
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// Landmarks. Site radii are in display km and include the 4× landmark exaggeration (DESIGN.md §4).
// facingDeg: 0 = north, 90 = east, 180 = south, 270 = west.
// ---------------------------------------------------------------------------------------------

export const LANDMARKS: readonly Landmark[] = [
  // --- Named on the book's map -------------------------------------------------------------
  {
    id: 'castle-mars',
    kind: 'castle',
    name: 'Mars Castle',
    house: 'mars',
    position: [16.7, -20.9],
    facingDeg: 270, // western gate, opposite the keep in the NW wall
    site: { ground: 'hill', radius: 1.2, height: 0.25 },
    confidence: 'canon',
  },
  {
    id: 'castle-minerva',
    kind: 'castle',
    name: 'Minerva Castle',
    house: 'minerva',
    position: [35, -14],
    facingDeg: 270,
    site: { ground: 'flat', radius: 1.6 },
    confidence: 'canon',
  },
  {
    id: 'castle-diana',
    kind: 'castle',
    name: 'Diana Castle',
    house: 'diana',
    position: [31.5, -2.5],
    facingDeg: 315,
    site: { ground: 'flat', radius: 1.1 },
    confidence: 'canon',
  },
  {
    id: 'castle-apollo',
    kind: 'castle',
    name: 'Apollo Castle',
    house: 'apollo',
    position: [38.25, 16],
    facingDeg: 270,
    site: { ground: 'hill', radius: 1.2, height: 0.12 },
    confidence: 'canon',
  },
  {
    id: 'castle-ceres',
    kind: 'castle',
    name: 'Ceres Castle',
    house: 'ceres',
    position: [-5.0, -15.83],
    facingDeg: 180,
    site: { ground: 'river', radius: 1.4 },
    confidence: 'canon',
  },
  {
    id: 'castle-jupiter',
    kind: 'castle',
    name: 'Jupiter Castle',
    house: 'jupiter',
    position: [-33.75, -25.25],
    facingDeg: 90,
    site: { ground: 'gorge', radius: 1.2 },
    confidence: 'canon',
  },
  {
    id: 'castle-juno',
    kind: 'castle',
    name: 'Juno Castle',
    house: 'juno',
    position: [-16.7, -11.0],
    facingDeg: 90,
    site: { ground: 'flat', radius: 1.1 },
    confidence: 'canon',
  },
  // --- Unknown triangles on the book's map, assigned from textual clues -------------------
  {
    id: 'castle-vulcan',
    kind: 'castle',
    name: 'Vulcan Castle',
    house: 'vulcan',
    position: [-32.75, -7],
    facingDeg: 90,
    site: { ground: 'hill', radius: 1.0, height: 0.15 },
    confidence: 'inferred',
  },
  {
    id: 'castle-bacchus',
    kind: 'castle',
    name: 'Bacchus Castle',
    house: 'bacchus',
    position: [-14.25, 1.5],
    facingDeg: 90,
    site: { ground: 'flat', radius: 1.1 },
    confidence: 'inferred',
  },
  {
    id: 'castle-venus',
    kind: 'castle',
    name: 'Venus Castle',
    house: 'venus',
    position: [-6, 6],
    facingDeg: 270,
    site: { ground: 'flat', radius: 1.1 },
    confidence: 'inferred',
  },
  {
    id: 'castle-mercury',
    kind: 'castle',
    name: 'Mercury Castle',
    house: 'mercury',
    position: [4.5, 16.25],
    facingDeg: 270,
    site: { ground: 'flat', radius: 1.1 },
    confidence: 'inferred',
  },
  {
    id: 'castle-neptune',
    kind: 'castle',
    name: 'Neptune Castle',
    house: 'neptune',
    position: [15.6, 28.6],
    facingDeg: 270,
    site: { ground: 'hill', radius: 1.0, height: 0.15 },
    confidence: 'inferred',
  },
  // --- Not on the map: subterranean ------------------------------------------------------
  {
    id: 'castle-pluto',
    kind: 'castle',
    name: 'Pluto’s Warrens',
    house: 'pluto',
    position: [-27.5, -1.5],
    facingDeg: 90,
    site: { ground: 'underground', radius: 0.6 },
    confidence: 'inferred',
  },
  // --- House Mars territory ----------------------------------------------------------------
  {
    id: 'tower-phobos',
    kind: 'tower',
    name: 'Phobos Tower',
    house: 'mars',
    position: [13.2, -17.4], // ~5 km SW of the castle (p.168); NW of here lies Deimos
    facingDeg: 180,
    site: { ground: 'hill', radius: 0.35, height: 0.12 },
    confidence: 'canon',
  },
  {
    id: 'tower-deimos',
    kind: 'tower',
    name: 'Deimos Tower',
    house: 'mars',
    position: [5.55, -24],
    facingDeg: 180,
    site: { ground: 'hill', radius: 0.35, height: 0.12 },
    confidence: 'canon',
  },
  {
    id: 'metas-bridge',
    kind: 'bridge',
    name: 'The Metas Bridge',
    house: null,
    position: [13.6, -19.26],
    facingDeg: 0, // spans north–south across the west-flowing Metas
    site: { ground: 'flat', radius: 0.15 },
    confidence: 'canon',
  },
  {
    id: 'pass-fort',
    kind: 'fort',
    name: 'The Pass Fort',
    house: null,
    position: [22, -12],
    facingDeg: 180,
    site: { ground: 'hill', radius: 0.4, height: 0.08 },
    confidence: 'inferred',
  },
  // --- Olympus -----------------------------------------------------------------------------
  {
    id: 'olympus',
    kind: 'olympus',
    name: 'Olympus',
    house: null,
    position: [-12.2, -3.0],
    facingDeg: 180,
    site: { ground: 'floating', radius: 2.2, height: 2.6 },
    confidence: 'canon',
  },
];

export const landmarkById = (id: string): Landmark | undefined => LANDMARKS.find((l) => l.id === id);
export const riverById = (id: string): River | undefined => RIVERS.find((r) => r.id === id);
export const regionById = (id: string): Region | undefined => REGIONS.find((r) => r.id === id);
