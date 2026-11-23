/**
 * BASELINE atmosphere: background, fog, sun and sky light, plus the per-frame driver for shared
 * uniforms (time, animated season). T04 replaces the visuals (sky dome, mist layers, cloud sea
 * around Olympus); T13 adds weather. The SharedUniformsDriver contract stays.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, FogExp2, type DirectionalLight, type HemisphereLight } from 'three';
import { SUMMER, WINTER } from '../render/palette';
import { sharedUniforms } from '../render/uniforms';
import { useStore } from '../state/store';

/** Seconds for a full summer↔winter transition. */
const SEASON_SECONDS = 2.5;

export function SharedUniformsDriver() {
  const season = useStore((s) => s.season);
  const first = useRef(true);
  useFrame((_, dt) => {
    sharedUniforms.uTime.value += dt;
    const target = season === 'winter' ? 1 : 0;
    const u = sharedUniforms.uSeason;
    if (first.current) {
      u.value = target; // start-up state from the URL applies instantly
      first.current = false;
    } else {
      const step = dt / SEASON_SECONDS;
      u.value = u.value < target ? Math.min(target, u.value + step) : Math.max(target, u.value - step);
    }
    const s = u.value;
    sharedUniforms.uFogColor.value.set(SUMMER.fog).lerp(new Color(WINTER.fog), s);
    sharedUniforms.uSunColor.value.set(SUMMER.sun).lerp(new Color(WINTER.sun), s);
  });
  return null;
}

export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const tmp = useMemo(() => new Color(), []);

  useEffect(() => {
    scene.fog = new FogExp2(SUMMER.fog, sharedUniforms.uFogDensity.value);
    scene.background = new Color(SUMMER.skyHorizon);
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  useFrame(() => {
    const s = sharedUniforms.uSeason.value;
    if (scene.fog instanceof FogExp2) scene.fog.color.copy(sharedUniforms.uFogColor.value);
    if (scene.background instanceof Color)
      scene.background.set(SUMMER.skyHorizon).lerp(tmp.set(WINTER.skyHorizon), s);
    if (sun.current) sun.current.color.copy(sharedUniforms.uSunColor.value);
    if (hemi.current) {
      hemi.current.color.set(SUMMER.ambientSky).lerp(tmp.set(WINTER.ambientSky), s);
      hemi.current.groundColor.set(SUMMER.ambientGround).lerp(tmp.set(WINTER.ambientGround), s);
    }
  });

  const d = sharedUniforms.uSunDirection.value;
  return (
    <>
      <hemisphereLight ref={hemi} args={[SUMMER.ambientSky, SUMMER.ambientGround, 1.1]} />
      <directionalLight
        ref={sun}
        position={[d.x * 120, d.y * 120, d.z * 120]}
        intensity={2.6}
        color={SUMMER.sun}
      />
    </>
  );
}
