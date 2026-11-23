/**
 * BASELINE camera: orbit controls + fly-to on store.cameraRequest. Owned by T10, which adds the
 * intro flight path, arcing transitions, keyboard controls and reduced-motion handling.
 * Contract: the camera only moves in response to store.cameraRequest or direct user input.
 */
import { CameraControls } from '@react-three/drei';
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

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.minDistance = 1.5;
    c.maxDistance = 190;
    c.minPolarAngle = (8 * Math.PI) / 180;
    c.maxPolarAngle = (80 * Math.PI) / 180;
    c.smoothTime = 0.6;
    c.setBoundary(
      new Box3(new Vector3(BOUNDS.minX, -1, BOUNDS.minZ), new Vector3(BOUNDS.maxX, 8, BOUNDS.maxZ)),
    );
  }, []);

  useEffect(() => {
    const c = ref.current;
    if (!c || !request) return;
    const shot = resolveShot(request.shot, hf);
    void c.setLookAt(...shot.position, ...shot.target, !request.instant);
  }, [request, hf]);

  return <CameraControls ref={ref} makeDefault />;
}
