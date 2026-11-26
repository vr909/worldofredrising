/**
 * BASELINE camera: orbit controls + fly-to on store.cameraRequest. Owned by T10, which adds the
 * intro flight path, arcing transitions, keyboard controls and reduced-motion handling.
 * Contract: the camera only moves in response to store.cameraRequest or direct user input.
 */
import { CameraControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Box3, Vector3 } from 'three';
import { useStore } from '../state/store';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { BOUNDS } from '../world/layout';
import { resolveShot } from './shots';

export function CameraRig() {
  const hf = useHeightfield();
  const ref = useRef<CameraControls>(null);
  const request = useStore((s) => s.cameraRequest);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.minDistance = 1.5;
    c.maxDistance = 190;
    c.minPolarAngle = (8 * Math.PI) / 180;
    c.maxPolarAngle = (80 * Math.PI) / 180;
    // Snappier than the M0 default (0.6): heavy smoothing reads as lag on slow renderers.
    c.smoothTime = 0.35;
    // Zoom towards the mouse pointer (map-style) and in bigger steps across a 100 km valley.
    c.dollyToCursor = true;
    c.dollySpeed = 1.6;
    c.setBoundary(
      new Box3(new Vector3(BOUNDS.minX, -1, BOUNDS.minZ), new Vector3(BOUNDS.maxX, 8, BOUNDS.maxZ)),
    );
  }, []);

  // Demand rendering (perf.frameloop === 'demand'): keep frames coming for the whole camera glide.
  // drei already invalidates on each controls 'update', and a frame-timeline probe showed that chain
  // works; this explicit wake→sleep keep-alive is a cheap safeguard so a glide can never stall if it
  // breaks. (The product owner's "zooming in is very slow" was zoom feel, fixed by dollyToCursor,
  // dollySpeed and smoothTime above.) From 'wake' until 'sleep' we invalidate every refresh, with a safety stop.
  // Also publishes store.cameraIdle so PerfManager can refine image quality when the view is still.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    let active = false;
    let since = 0;
    const tick = () => {
      if (!active) return;
      invalidate();
      if (performance.now() - since > 8000) return stop(); // safety: never spin forever
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      since = performance.now();
      if (active) return;
      active = true;
      useStore.getState().setCameraIdle(false);
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      active = false;
      cancelAnimationFrame(raf);
      useStore.getState().setCameraIdle(true);
      invalidate();
    };
    const events = ['wake', 'controlstart', 'control', 'transitionstart'] as const;
    for (const e of events) c.addEventListener(e, start);
    c.addEventListener('sleep', stop);
    return () => {
      for (const e of events) c.removeEventListener(e, start);
      c.removeEventListener('sleep', stop);
      cancelAnimationFrame(raf);
    };
  }, [invalidate]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !request) return;
    if (request.shot === 'north-up') {
      // Keep target and distance; turn so north is up the screen (compass click).
      void c.rotateAzimuthTo(0, !request.instant);
      return;
    }
    const shot = resolveShot(request.shot, hf);
    void c.setLookAt(...shot.position, ...shot.target, !request.instant);
  }, [request, hf]);

  // Broadcast the camera heading to the DOM compass as a CSS variable (no React re-render per frame).
  // azimuthAngle 0 = camera south of the target looking north; positive = orbiting anticlockwise from above.
  const lastHeading = useRef(NaN);
  useFrame(() => {
    const c = ref.current;
    if (!c) return;
    const deg = (c.azimuthAngle * 180) / Math.PI;
    if (Math.abs(deg - lastHeading.current) < 0.2) return;
    lastHeading.current = deg;
    document.documentElement.style.setProperty('--cam-heading', `${deg.toFixed(1)}deg`);
  });

  return <CameraControls ref={ref} makeDefault />;
}
