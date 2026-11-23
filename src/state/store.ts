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

  setReady: () => void;
  enter: () => void;
  setSeason: (s: Season) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  toggleLayer: (k: keyof Layers) => void;
  setQuality: (q: Quality) => void;
  flyTo: (shot: string, instant?: boolean) => void;
}

const start = readStartParams();

export const useStore = create<AppState>()((set) => ({
  ready: false,
  entered: !start.intro,
  showUi: start.ui,
  season: start.season,
  selectedId: start.selected,
  hoveredId: null,
  layers: { labels: true, banners: true, inferred: true },
  quality: start.quality ?? 'high',
  cameraRequest: { shot: start.selected ?? start.view ?? 'overview', nonce: 0, instant: true },

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
}));

export const START_PARAMS = start;
