/**
 * App state (zustand). UI and scene talk to each other ONLY through this store — never by
 * importing each other's components. Keep per-frame values (animated season, camera pose) out of
 * here; those live in refs or src/render/uniforms.ts.
 */
import { create } from 'zustand';
import { readStartParams, type Quality } from './urlParams';

export type Season = 'summer' | 'winter';

export interface Layers {
  /** In-world place and region labels. */
  labels: boolean;
  /** House banners/sigils floating over castles. */
  banners: boolean;
  /** Show places whose position is inferred rather than printed in the book. */
  inferred: boolean;
}

export type ViewMode = '3d' | '2d';

/**
 * Runtime performance knobs. Owned by T14 (src/perf/): it detects the device and adapts these at runtime;
 * every system READS the flags relevant to it. Changing them must never regenerate the heightfield
 * (the heightfield tier is `quality`, chosen once at startup).
 */
export interface PerfFlags {
  /** WebGL is rendered without a GPU (SwiftShader, llvmpipe, Microsoft Basic Render...). */
  software: boolean;
  /** Canvas device-pixel ratio. */
  dpr: number;
  /** Realtime sun shadows for landmarks/trees. */
  shadows: boolean;
  /** Mist banks and the Olympus cloud collar. */
  mist: boolean;
  /** Terrain shader detail: 0 = cheapest (baked), 1 = reduced, 2 = full per-pixel painterly. */
  detail: 0 | 1 | 2;
  /** Cap for ambient animation (water flow, mist drift) when nothing else is moving. 0 = static. */
  ambientFps: number;
  /** R3F frame loop. 'demand' renders only on invalidate(); T14 drives ambient ticks and invalidation. */
  frameloop: 'always' | 'demand';
}

export interface CameraRequest {
  /** A shot id from src/camera/shots.ts (usually a place id, or 'overview'). */
  shot: string;
  /** Changes on every request so re-requesting the same shot still triggers a flight. */
  nonce: number;
  instant?: boolean;
}

export interface AppState {
  /** Heightfield built and first frames rendered. The screenshot tool waits for this. */
  ready: boolean;
  /** Spoiler notice acknowledged and intro flight finished (or skipped). */
  entered: boolean;
  showUi: boolean;
  season: Season;
  selectedId: string | null;
  hoveredId: string | null;
  layers: Layers;
  quality: Quality;
  cameraRequest: CameraRequest | null;
  /** 3D diorama or flat 2D map. */
  viewMode: ViewMode;
  perf: PerfFlags;

  setReady: () => void;
  enter: () => void;
  setSeason: (s: Season) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  toggleLayer: (k: keyof Layers) => void;
  setQuality: (q: Quality) => void;
  flyTo: (shot: string, instant?: boolean) => void;
  setViewMode: (m: ViewMode) => void;
  setPerf: (p: Partial<PerfFlags>) => void;
}

const start = readStartParams();

/**
 * Default render tier. Measured after M1 (docs/learning/01-m1-the-land.md): 'high' costs ~2.1x 'medium' per
 * frame for an almost identical overview, so medium is the default; touch devices start on low.
 * ?quality=high opts in. (T14 will replace this guess with adaptive quality.)
 */
function defaultQuality(): Quality {
  if (typeof window === 'undefined') return 'medium';
  return window.matchMedia?.('(pointer: coarse)').matches ? 'low' : 'medium';
}

/** Starting perf flags per heightfield tier (T14 refines these from real device detection). */
export function perfForQuality(q: Quality): PerfFlags {
  const base = { software: false, frameloop: 'always' as const };
  if (q === 'high') return { ...base, dpr: 1.5, shadows: true, mist: true, detail: 2, ambientFps: 60 };
  if (q === 'medium') return { ...base, dpr: 1, shadows: true, mist: true, detail: 2, ambientFps: 60 };
  return { ...base, dpr: 1, shadows: false, mist: true, detail: 1, ambientFps: 30 };
}

const startQuality = start.quality ?? defaultQuality();

export const useStore = create<AppState>()((set) => ({
  ready: false,
  entered: !start.intro,
  showUi: start.ui,
  season: start.season,
  selectedId: start.selected,
  hoveredId: null,
  layers: { labels: true, banners: true, inferred: true },
  quality: startQuality,
  cameraRequest: { shot: start.selected ?? start.view ?? 'overview', nonce: 0, instant: true },
  viewMode: start.mode,
  perf: perfForQuality(startQuality),

  setReady: () => set({ ready: true }),
  enter: () => set({ entered: true }),
  setSeason: (season) => set({ season }),
  select: (selectedId) =>
    set((s) => ({
      selectedId,
      cameraRequest: { shot: selectedId ?? 'overview', nonce: (s.cameraRequest?.nonce ?? 0) + 1 },
    })),
  hover: (hoveredId) => set({ hoveredId }),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  setQuality: (quality) => set({ quality }),
  flyTo: (shot, instant) =>
    set((s) => ({ cameraRequest: { shot, instant, nonce: (s.cameraRequest?.nonce ?? 0) + 1 } })),
  setViewMode: (viewMode) => set({ viewMode }),
  setPerf: (p) => set((s) => ({ perf: { ...s.perf, ...p } })),
}));

export const START_PARAMS = start;
