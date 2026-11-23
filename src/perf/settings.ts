/**
 * Pure performance policy (T14): startup flags per device class, and the adaptive degrade / restore ladder.
 * Kept free of React and three so it is unit tested.
 */
import { perfForQuality, type PerfFlags } from '../state/store';
import type { Quality } from '../state/urlParams';

/** Cheapest settings, for software rendering and for devices measured as too slow. */
export const SOFTWARE_FLAGS: PerfFlags = {
  software: true,
  dpr: 0.6,
  shadows: false,
  mist: false,
  detail: 0,
  ambientFps: 0,
  frameloop: 'demand',
};

export function startupFlags(quality: Quality, software: boolean, demand = true): PerfFlags {
  if (software) return { ...SOFTWARE_FLAGS, frameloop: demand ? 'demand' : 'always' };
  const base = perfForQuality(quality);
  return {
    ...base,
    // Ambient (water flow, mist drift) is capped: nothing else is moving when idle, so 30 fps is plenty.
    ambientFps: Math.min(base.ambientFps, quality === 'low' ? 20 : 30),
    frameloop: demand ? 'demand' : 'always',
  };
}

/** Texel width of the terrain noise bake: full for GPUs, a quarter of the pixels for software GL. */
export function bakeWidthFor(software: boolean): number {
  return software ? 1024 : 2048;
}

/**
 * Degrade ladder, applied in order: dpr (down to 0.75), shadows, mist, detail, ambientFps. `level` counts applied steps;
 * `start` are the startup flags (the ceiling that restoring climbs back to).
 */
export type LadderStep = (f: PerfFlags, start: PerfFlags) => PerfFlags | null;

const STEPS: LadderStep[] = [
  (f) => (f.dpr > 0.75 ? { ...f, dpr: Math.max(0.75, f.dpr - 0.25) } : null),
  (f) => (f.shadows ? { ...f, shadows: false } : null),
  (f) => (f.mist ? { ...f, mist: false } : null),
  (f) => (f.detail > 0 ? { ...f, detail: (f.detail - 1) as 0 | 1 | 2 } : null),
  (f) =>
    f.ambientFps > 0 ? { ...f, ambientFps: f.ambientFps > 10 ? Math.round(f.ambientFps / 2) : 0 } : null,
];

/** One step down the ladder from `f`, or null when everything is already at the floor. */
export function degrade(f: PerfFlags): PerfFlags | null {
  for (const step of STEPS) {
    const next = step(f, f);
    if (next) return next;
  }
  return null;
}

/** One step back up, in reverse order, never exceeding `start`. Null when `f` already equals `start`. */
export function restore(f: PerfFlags, start: PerfFlags): PerfFlags | null {
  if (f.ambientFps < start.ambientFps)
    return { ...f, ambientFps: Math.min(start.ambientFps, f.ambientFps * 2 || 5) };
  if (f.detail < start.detail) return { ...f, detail: (f.detail + 1) as 0 | 1 | 2 };
  if (f.mist !== start.mist) return { ...f, mist: start.mist };
  if (f.shadows !== start.shadows) return { ...f, shadows: start.shadows };
  if (f.dpr < start.dpr) return { ...f, dpr: Math.min(start.dpr, f.dpr + 0.25) };
  return null;
}

export interface MonitorState {
  /** Exponential moving average of continuous frame times, seconds. */
  ema: number;
  samples: number;
  /** Seconds of sustained decline / incline condition. */
  declineFor: number;
  inclineFor: number;
  /** After a restore that had to be undone, restoring stops (hysteresis). */
  flips: number;
  lastChange: number;
}

export const newMonitor = (): MonitorState => ({
  ema: 1 / 60,
  samples: 0,
  declineFor: 0,
  inclineFor: 0,
  flips: 0,
  lastChange: 0,
});

export type MonitorAction = 'none' | 'degrade' | 'restore';

/**
 * Feed one frame time (seconds). Gaps above 0.5 s are idle pauses in demand mode, not slowness, and are ignored.
 * Frames at the ambient tick rate are idle ticking, not stress, so decline requires dt well above 1/ambientFps.
 */
export function monitorStep(
  m: MonitorState,
  dt: number,
  ambientFps: number,
  now: number,
  canRestore: boolean,
): MonitorAction {
  if (dt <= 0 || dt > 0.5) {
    m.declineFor = 0;
    m.inclineFor = 0;
    return 'none';
  }
  m.ema += (dt - m.ema) * 0.1;
  m.samples++;
  if (m.samples < 20) return 'none';
  const idleTick = ambientFps > 0 ? 1.5 / ambientFps : 0;
  if (m.ema > 1 / 24 && m.ema > idleTick) {
    m.declineFor += dt;
    m.inclineFor = 0;
    if (m.declineFor > 2) {
      m.declineFor = 0;
      m.samples = 0;
      if (now - m.lastChange < 25) m.flips++;
      m.lastChange = now;
      return 'degrade';
    }
  } else if (m.ema < 1 / 50 && canRestore && m.flips < 2) {
    m.inclineFor += dt;
    m.declineFor = 0;
    if (m.inclineFor > 8) {
      m.inclineFor = 0;
      m.samples = 0;
      m.lastChange = now;
      return 'restore';
    }
  } else {
    m.declineFor = 0;
    m.inclineFor = 0;
  }
  return 'none';
}

/** Startup check: median of consecutive frame times (seconds) above 1/8 s means the device cannot do real-time 3D. */
export function isTooSlow(frameTimes: number[]): boolean {
  if (frameTimes.length < 4) return false;
  const sorted = [...frameTimes].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]! > 1 / 8;
}
