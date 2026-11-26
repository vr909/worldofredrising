/**
 * Runtime performance manager (T14), mounted inside the Canvas by App. It
 *  1. detects software rendering and writes the startup perf flags BEFORE the first frame (layout effect),
 *  2. bakes the terrain's static noise fields once (src/perf/bake.ts),
 *  3. drives demand rendering: store changes invalidate, a capped ambient tick keeps water and mist alive,
 *  4. flags a device that is far too slow in its first frames (< 8 fps) as "slow" and switches to the cheap path,
 *  5. adapts quality at runtime along the degrade ladder (settings.ts) with hysteresis.
 * It never regenerates the heightfield. `window.__perf.snapshot()` feeds scripts/perf.mjs.
 */
import { invalidate, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Uint32BufferAttribute, type BufferAttribute, type InstancedMesh, type Mesh } from 'three';
import { useStore, type PerfFlags } from '../state/store';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { bakeTerrainFields } from './bake';
import { rendererName, isSoftwareRenderer } from './detect';
import { isAutomated, parsePerfOverrides } from './params';
import {
  SOFTWARE_FLAGS,
  bakeWidthFor,
  degrade,
  isTooSlow,
  monitorStep,
  newMonitor,
  restore,
  startupFlags,
} from './settings';
import { IDLE_SETTLE_MS, newRefine, refineStep, stillDpr, type RefineEvent } from './refine';
import { setPerfReason } from './status';
import { coarseStride, strideIndex } from './terrainLod';

/** Frames invalidated back-to-back at start-up: lets the ReadySignal count frames and lets us time the device. */
const BURST = 14;
const BURST_SKIP = 4;

interface PerfSnapshot {
  calls: number;
  triangles: number;
  renderer: string;
  flags: PerfFlags;
  /** Frames rendered so far (lets tests check demand rendering). */
  frames: number;
}

declare global {
  interface Window {
    __perf?: { snapshot: () => PerfSnapshot; breakdown: () => string[] };
  }
}

export function PerfManager() {
  const hf = useHeightfield();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const overrides = useRef(parsePerfOverrides(window.location.search, isAutomated()));
  const startFlags = useRef<PerfFlags>(useStore.getState().perf);
  const monitor = useRef(newMonitor());
  const refine = useRef(newRefine());
  const frameCount = useRef(0);
  const burst = useRef({ n: 0, times: [] as number[] });
  const ambientFps = useStore((s) => s.perf.ambientFps);
  const frameloop = useStore((s) => s.perf.frameloop);

  useLayoutEffect(() => {
    const ov = overrides.current;
    const renderer = rendererName(gl.getContext());
    const software = ov.software ?? (!isAutomated() && isSoftwareRenderer(renderer));
    const flags = { ...startupFlags(useStore.getState().quality, software, ov.demand), ...ov.flags };
    startFlags.current = flags;
    useStore.getState().setPerf(flags);
    setPerfReason(software ? 'software' : null);
    bakeTerrainFields(gl, bakeWidthFor(software));
    window.__perf = {
      snapshot: () => ({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        renderer,
        flags: useStore.getState().perf,
        frames: frameCount.current,
      }),
      // Triangles per mesh, largest first (debug aid for `npm run perf`).
      breakdown: () => {
        const rows: { n: string; t: number }[] = [];
        scene.traverse((o) => {
          const m = o as Mesh;
          if (!m.isMesh || !m.visible) return;
          const g = m.geometry;
          const t = (g.index ? g.index.count : (g.attributes.position?.count ?? 0)) / 3;
          rows.push({
            n: `${m.name || m.material.constructor.name}${(m as InstancedMesh).isInstancedMesh ? '*' : ''}`,
            t,
          });
        });
        return rows
          .sort((a, b) => b.t - a.t)
          .slice(0, 8)
          .map((r) => `${r.n} ${Math.round(r.t)}`);
      },
    };
    return () => {
      delete window.__perf;
    };
  }, [gl, scene]);

  // Anything in the app state (hover, selection, season, layers, camera request, perf flags) shows up on the next frame.
  useEffect(() => {
    const unsub = useStore.subscribe(() => invalidate());
    const onVisible = () => document.visibilityState === 'visible' && invalidate();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      unsub();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Progressive refinement: a sharp still (higher dpr) once the camera has rested; back to the interactive dpr on wake.
  // Keys off store.cameraIdle ONLY, so hover / selection while idle cannot flip the resolution.
  useEffect(() => {
    if (!overrides.current.refine) return;
    let timer = 0;
    const apply = (ev: RefineEvent) => {
      const st = useStore.getState();
      const r = refineStep(
        refine.current,
        ev,
        st.perf.dpr,
        stillDpr(startFlags.current, window.devicePixelRatio),
      );
      refine.current = r.state;
      if (r.dpr !== null) st.setPerf({ dpr: r.dpr });
    };
    const settle = () => {
      // wait for the start-up burst (and the slow-device check) to finish before the first still
      if (burst.current.n < BURST) timer = window.setTimeout(settle, IDLE_SETTLE_MS);
      else apply('settled');
    };
    const onIdle = (idle: boolean) => {
      window.clearTimeout(timer);
      if (idle) timer = window.setTimeout(settle, IDLE_SETTLE_MS);
      else apply('wake');
    };
    if (useStore.getState().cameraIdle) onIdle(true);
    let prev = useStore.getState().cameraIdle;
    const unsub = useStore.subscribe((s) => {
      if (s.cameraIdle === prev) return;
      prev = s.cameraIdle;
      onIdle(prev);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  // Ambient tick: water flow and mist drift at a capped rate while the tab is visible. 0 = static.
  useEffect(() => {
    if (frameloop !== 'demand' || ambientFps <= 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') invalidate();
    }, 1000 / ambientFps);
    return () => window.clearInterval(id);
  }, [ambientFps, frameloop]);

  // Coarser terrain index when the cheapest shading level is active (software GL is vertex-bound: ~340k triangles).
  const terrain = useRef<Mesh | null>(null);
  const originalIndex = useRef<BufferAttribute | null>(null);
  const coarseIndex = useRef<Uint32BufferAttribute | null>(null);
  const applyTerrainLod = (coarse: boolean) => {
    const mesh = (terrain.current ??= scene.getObjectByName('terrain') as Mesh | null);
    if (!mesh) return;
    const g = mesh.geometry;
    originalIndex.current ??= g.index;
    const want = coarse
      ? (coarseIndex.current ??= new Uint32BufferAttribute(
          strideIndex(hf.cols, hf.rows, coarseStride(hf.cellSize)),
          1,
        ))
      : originalIndex.current;
    if (want && g.index !== want) g.setIndex(want);
  };

  useFrame((state, dt) => {
    frameCount.current++;
    applyTerrainLod(useStore.getState().perf.detail === 0);
    const b = burst.current;
    if (b.n < BURST) {
      b.n++;
      if (b.n > BURST_SKIP) b.times.push(dt);
      if (b.n === BURST) {
        const s = useStore.getState();
        if (overrides.current.adapt && !s.perf.software && isTooSlow(b.times)) {
          // Measured, not detected: same cheap path and the notice, with its own wording.
          startFlags.current = { ...SOFTWARE_FLAGS, frameloop: s.perf.frameloop };
          s.setPerf(startFlags.current);
          setPerfReason('slow');
        }
      } else {
        state.invalidate();
      }
      return;
    }
    // Stills rendered at the refined dpr are one-offs, not evidence of decline: the monitor only sees interactive frames.
    if (!overrides.current.adapt || refine.current.active) return;
    const s = useStore.getState().perf;
    const canRestore = restore(s, startFlags.current) !== null;
    const act = monitorStep(monitor.current, dt, s.ambientFps, state.clock.elapsedTime, canRestore);
    if (act === 'degrade') {
      const next = degrade(s);
      if (next) useStore.getState().setPerf(next);
    } else if (act === 'restore') {
      const next = restore(s, startFlags.current);
      if (next) useStore.getState().setPerf(next);
    }
  });

  return null;
}
