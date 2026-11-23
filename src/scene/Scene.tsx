/**
 * Composition root of the 3D scene. Each system is one component, owned by one ticket.
 * Adding a system = one new line here (lead merges these lines to avoid conflicts).
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Atmosphere, SharedUniformsDriver } from '../atmosphere/Atmosphere';
import { CameraRig } from '../camera/CameraRig';
import { Landmarks } from '../landmarks/Landmarks';
import { useStore } from '../state/store';
import { Terrain } from '../terrain/Terrain';
import { Water } from '../water/Water';

export function Scene() {
  return (
    <>
      <SharedUniformsDriver />
      <Atmosphere />
      <CameraRig />
      <Terrain />
      <Water />
      <Landmarks />
      <ReadySignal />
    </>
  );
}

/** Marks the app ready after a few rendered frames (the screenshot tool waits on body[data-ready]). */
function ReadySignal() {
  const frames = useRef(0);
  const setReady = useStore((s) => s.setReady);
  const ready = useStore((s) => s.ready);
  useFrame(() => {
    if (!ready && ++frames.current === 8) setReady();
  });
  useEffect(() => {
    if (ready) document.body.dataset.ready = 'true';
  }, [ready]);
  return null;
}
