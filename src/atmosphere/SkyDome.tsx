/**
 * Sky dome: an inverted sphere that follows the camera, drawn first with no depth. One draw call.
 * Gradient + warm sun glow + faint high cloud streaks + two potato moons, all in one shader.
 * The "horizon" is lifted (uDip) when the camera is high so the overview shows graded sky above the slab.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BackSide, Color, MathUtils, ShaderMaterial, SphereGeometry, Vector3, type Mesh } from 'three';
import { sharedUniforms } from '../render/uniforms';
import skyFrag from './shaders/sky.frag.glsl?raw';
import skyVert from './shaders/sky.vert.glsl?raw';
import noise from './shaders/noise.glsl?raw';
import { HORIZON, SKY, ZENITH } from './tuning';

function skyDir(azDeg: number, elDeg: number): Vector3 {
  const az = MathUtils.degToRad(azDeg);
  const el = MathUtils.degToRad(elDeg);
  return new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

export function SkyDome() {
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(() => new SphereGeometry(SKY.radius, 48, 24), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag.replace('// NOISE', noise),
        side: BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: {
          uTime: sharedUniforms.uTime,
          uSunDirection: sharedUniforms.uSunDirection,
          uSunColor: sharedUniforms.uSunColor,
          uHorizon: { value: new Color(HORIZON.summer) },
          uZenith: { value: new Color(ZENITH.summer) },
          uDip: { value: MathUtils.degToRad(SKY.dipHighDeg) },
          uMoonA: { value: skyDir(...SKY.phobos) },
          uMoonB: { value: skyDir(...SKY.deimos) },
        },
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ camera }) => {
    const m = mesh.current;
    if (!m) return;
    m.position.copy(camera.position);
    const s = sharedUniforms.uSeason.value;
    const u = material.uniforms;
    (u.uZenith!.value as Color).copy(ZENITH.summer).lerp(ZENITH.winter, s);
    (u.uHorizon!.value as Color).copy(HORIZON.summer).lerp(HORIZON.winter, s);
    const k = MathUtils.smoothstep(camera.position.y, 3, 60);
    u.uDip!.value = MathUtils.degToRad(MathUtils.lerp(SKY.dipLowDeg, SKY.dipHighDeg, k));
  });

  return (
    <mesh ref={mesh} geometry={geometry} material={material} renderOrder={-1000} frustumCulled={false} />
  );
}
