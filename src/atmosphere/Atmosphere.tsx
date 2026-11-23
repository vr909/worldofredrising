/**
 * Atmosphere (T04): sky dome with moons, season-blended light rig, exponential + height fog, mist
 * banks and the Olympus cloud collar, plus the per-frame driver for shared uniforms (time, animated
 * season, sun, fog). T13 adds weather separately. The SharedUniformsDriver contract stays.
 *
 * Draw calls: sky dome 1 + mist/cloud 1 = 2 (plus the sun shadow pass).
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Color,
  FogExp2,
  MathUtils,
  Object3D,
  Vector3,
  type DirectionalLight,
  type HemisphereLight,
} from 'three';
import { SUMMER } from '../render/palette';
import { sharedUniforms } from '../render/uniforms';
import { useStore, type Season } from '../state/store';
import { MistLayer } from './MistLayer';
import { SkyDome } from './SkyDome';
import { AMBIENT_GROUND, AMBIENT_SKY, FOG_COLOR, RIG, SUN_COLOR } from './tuning';

/** Seconds for a full summer↔winter transition. */
const SEASON_SECONDS = 2.5;

/** Sun direction for an elevation, azimuth from the palette's SUN (written in place: shaders share the Vector3). */
function setSun(target: Vector3, azimuthDeg: number, elevationDeg: number) {
  const az = MathUtils.degToRad(azimuthDeg);
  const el = MathUtils.degToRad(elevationDeg);
  target.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

export function SharedUniformsDriver() {
  const season = useStore((s: { season: Season }) => s.season);
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
    sharedUniforms.uFogColor.value.copy(FOG_COLOR.summer).lerp(FOG_COLOR.winter, s);
    sharedUniforms.uSunColor.value.copy(SUN_COLOR.summer).lerp(SUN_COLOR.winter, s);
    sharedUniforms.uFogDensity.value = MathUtils.lerp(RIG.fogDensity.summer, RIG.fogDensity.winter, s);
    // winter sun sits lower
    setSun(
      sharedUniforms.uSunDirection.value,
      235,
      MathUtils.lerp(RIG.sunElevationDeg.summer, RIG.sunElevationDeg.winter, s),
    );
  });
  return null;
}

const SHADOW_MAP = { high: 2048, medium: 1024, low: 0 } as const;

export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const quality = useStore((s) => s.quality);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const tmp = useMemo(
    () => ({ focus: new Vector3(), dir: new Vector3(), right: new Vector3(), up: new Vector3() }),
    [],
  );

  useEffect(() => {
    scene.fog = new FogExp2(SUMMER.fog, sharedUniforms.uFogDensity.value);
    scene.background = new Color(SUMMER.skyHorizon); // fallback only: the sky dome covers it
    return () => {
      scene.fog = null;
      scene.background = null;
    };
  }, [scene]);

  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.target = target;
    const size = SHADOW_MAP[quality];
    l.castShadow = size > 0;
    if (size > 0) {
      l.shadow.mapSize.set(size, size);
      l.shadow.map?.dispose();
      l.shadow.map = null;
    }
  }, [quality, target]);

  useFrame(({ camera }) => {
    const s = sharedUniforms.uSeason.value;
    const fog = scene.fog;
    if (fog instanceof FogExp2) {
      fog.color.copy(sharedUniforms.uFogColor.value);
      fog.density = sharedUniforms.uFogDensity.value;
    }
    if (scene.background instanceof Color) scene.background.copy(sharedUniforms.uFogColor.value);
    gl.toneMappingExposure = MathUtils.lerp(RIG.exposure.summer, RIG.exposure.winter, s);

    const l = sun.current;
    if (l) {
      l.color.copy(sharedUniforms.uSunColor.value);
      l.intensity = MathUtils.lerp(RIG.sunIntensity.summer, RIG.sunIntensity.winter, s);

      // Shadow frustum follows what the camera looks at: where the view ray meets y~0, else ~20 km ahead.
      const { focus, dir, right, up } = tmp;
      camera.getWorldDirection(dir);
      let t = 20;
      if (dir.y < -0.03) t = MathUtils.clamp(-camera.position.y / dir.y, 6, 140);
      focus.copy(camera.position).addScaledVector(dir, t);
      focus.y = Math.max(0, focus.y);
      const half = MathUtils.clamp(t * 0.22, 3, 12);
      const sd = sharedUniforms.uSunDirection.value;
      // snap to shadow-map texels so shadows do not shimmer as the camera moves
      const texel = (2 * half) / Math.max(1, l.shadow.mapSize.x);
      right.set(0, 1, 0).cross(sd).normalize();
      up.copy(sd).cross(right).normalize();
      const fr = focus.dot(right);
      const fu = focus.dot(up);
      focus.addScaledVector(right, Math.round(fr / texel) * texel - fr);
      focus.addScaledVector(up, Math.round(fu / texel) * texel - fu);
      target.position.copy(focus);
      target.updateMatrixWorld();
      l.position.copy(focus).addScaledVector(sd, 160);
      const cam = l.shadow.camera;
      if (cam.right !== half) {
        cam.left = -half;
        cam.right = half;
        cam.top = half;
        cam.bottom = -half;
        cam.near = 1;
        cam.far = 360;
        cam.updateProjectionMatrix();
      }
    }
    if (hemi.current) {
      hemi.current.color.copy(AMBIENT_SKY.summer).lerp(AMBIENT_SKY.winter, s);
      hemi.current.groundColor.copy(AMBIENT_GROUND.summer).lerp(AMBIENT_GROUND.winter, s);
      hemi.current.intensity = MathUtils.lerp(RIG.hemiIntensity.summer, RIG.hemiIntensity.winter, s);
    }
  });

  return (
    <>
      <primitive object={target} />
      <hemisphereLight
        ref={hemi}
        args={[SUMMER.ambientSky, SUMMER.ambientGround, RIG.hemiIntensity.summer]}
      />
      <directionalLight
        ref={sun}
        position={[0, 100, 0]}
        intensity={RIG.sunIntensity.summer}
        color={SUMMER.sun}
        shadow-bias={-0.0004}
        shadow-normalBias={0.012}
      />
      <SkyDome />
      <MistLayer />
    </>
  );
}
