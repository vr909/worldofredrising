/**
 * Mist banks (highland glens, marshes, Mars's glen) and the Olympus cloud collar: ONE InstancedMesh,
 * ONE draw call. Camera-facing soft quads, noise alpha in the shader, depth-tested, no depth write.
 * Instances are re-sorted back-to-front when the camera has moved, so blending stays stable in orbit.
 */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import { sharedUniforms } from '../render/uniforms';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { placeMist } from './mistPlacement';
import mistFrag from './shaders/mist.frag.glsl?raw';
import mistVert from './shaders/mist.vert.glsl?raw';
import noise from './shaders/noise.glsl?raw';

const WHITE = new Color('#ffffff');
const CLOUD_LIT = { summer: new Color('#FFF6E8'), winter: new Color('#FAFBFC') };
const CLOUD_SHADE = { summer: new Color('#B9BCCB'), winter: new Color('#BFC6D0') };

export function MistLayer() {
  const hf = useHeightfield();
  const data = useMemo(() => placeMist(hf), [hf]);

  const { mesh, sortedPos, sortedSize, sortedDir, last } = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    const posAttr = new InstancedBufferAttribute(new Float32Array(data.pos), 4);
    const sizeAttr = new InstancedBufferAttribute(new Float32Array(data.size), 4);
    geo.setAttribute('aPos', posAttr);
    geo.setAttribute('aSize', sizeAttr);
    const dirAttr = new InstancedBufferAttribute(new Float32Array(data.dir), 4);
    geo.setAttribute('aDir', dirAttr);
    const mat = new ShaderMaterial({
      vertexShader: mistVert,
      fragmentShader: mistFrag.replace('// NOISE', noise),
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: true,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        {
          uTime: sharedUniforms.uTime,
          uMistColor: { value: new Color('#d8d9d8') },
          uCloudLit: { value: new Color(CLOUD_LIT.summer) },
          uCloudShade: { value: new Color(CLOUD_SHADE.summer) },
        },
      ]),
    });
    // merge() clones values; point the time uniform back at the shared object so one update reaches us
    mat.uniforms.uTime = sharedUniforms.uTime;
    const m = new InstancedMesh(geo, mat, data.count);
    m.frustumCulled = false;
    m.renderOrder = 50;
    return {
      mesh: m,
      sortedPos: posAttr,
      sortedSize: sizeAttr,
      sortedDir: dirAttr,
      last: new Vector3(1e9, 0, 0),
    };
  }, [data]);

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as ShaderMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );

  const order = useMemo(() => Uint16Array.from({ length: data.count }, (_, i) => i), [data]);
  const dist = useMemo(() => new Float32Array(data.count), [data]);

  useFrame(({ camera }) => {
    const u = (mesh.material as ShaderMaterial).uniforms;
    const s = sharedUniforms.uSeason.value;
    (u.uMistColor!.value as Color).copy(sharedUniforms.uFogColor.value).lerp(WHITE, 0.3);
    (u.uCloudLit!.value as Color).copy(CLOUD_LIT.summer).lerp(CLOUD_LIT.winter, s);
    (u.uCloudShade!.value as Color).copy(CLOUD_SHADE.summer).lerp(CLOUD_SHADE.winter, s);

    // Back-to-front re-sort when the camera has moved enough to matter.
    if (camera.position.distanceToSquared(last) < 0.25) return;
    last.copy(camera.position);
    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;
    const sp = sortedPos.array as Float32Array;
    const ss = sortedSize.array as Float32Array;
    const sdr = sortedDir.array as Float32Array;
    for (let i = 0; i < data.count; i++) {
      const dx = data.pos[i * 4]! - cx;
      const dy = data.pos[i * 4 + 1]! - cy;
      const dz = data.pos[i * 4 + 2]! - cz;
      dist[i] = dx * dx + dy * dy + dz * dz;
    }
    order.sort((a, b) => dist[b]! - dist[a]!);
    for (let i = 0; i < data.count; i++) {
      const src = order[i]! * 4;
      const dst = i * 4;
      for (let k = 0; k < 4; k++) {
        sp[dst + k] = data.pos[src + k]!;
        ss[dst + k] = data.size[src + k]!;
        sdr[dst + k] = data.dir[src + k]!;
      }
    }
    sortedPos.needsUpdate = true;
    sortedSize.needsUpdate = true;
    sortedDir.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
