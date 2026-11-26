/**
 * Progressive refinement (T14 follow-up). On the software path the interactive dpr is low (0.6) so dragging stays smooth;
 * when the camera comes to rest we raise dpr once for one sharp still, and drop back the instant it moves again.
 * Only dpr is touched (a canvas resize): detail and shadows change shader programs and would hitch, so they never refine.
 * Pure state machine, unit tested; PerfManager feeds it the camera-idle signal.
 */
import type { PerfFlags } from '../state/store';

/**
 * Still dpr ceiling on the software path. A 1280x720 still at dpr 1.25 measured ~375 ms (vs ~133 ms interactive at 0.6) in the
 * software probe, under the ~600 ms budget. It is further capped by the display's devicePixelRatio (no supersampling).
 */
export const STILL_DPR_SOFTWARE = 1.25;
/** How long the camera must rest before the sharp frame is rendered. */
export const IDLE_SETTLE_MS = 250;

/**
 * Target dpr for a still frame: software goes to STILL_DPR_SOFTWARE (never below the startup value); real GPUs return to the
 * startup dpr, which is only above the current one after the adaptive ladder lowered it (the "dpr before the drop").
 */
export function stillDpr(start: PerfFlags, deviceRatio = 1): number {
  return start.software ? Math.max(start.dpr, Math.min(STILL_DPR_SOFTWARE, deviceRatio)) : start.dpr;
}

export interface RefineState {
  active: boolean;
  /** The interactive dpr to return to; meaningful while active. */
  base: number;
}

export const newRefine = (): RefineState => ({ active: false, base: 0 });

export type RefineEvent = 'settled' | 'wake';

/** Next state, and the dpr to write (null = leave unchanged). `current` is perf.dpr, `still` is stillDpr(). */
export function refineStep(
  s: RefineState,
  ev: RefineEvent,
  current: number,
  still: number,
): { state: RefineState; dpr: number | null } {
  if (ev === 'settled') {
    if (s.active || still <= current) return { state: s, dpr: null };
    return { state: { active: true, base: current }, dpr: still };
  }
  if (!s.active) return { state: s, dpr: null };
  return { state: { active: false, base: s.base }, dpr: s.base };
}
