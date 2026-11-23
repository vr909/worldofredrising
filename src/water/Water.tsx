/**
 * Water (T03): rivers (one merged ribbon mesh), South Sea, Highland Loch and marsh pools.
 * Custom ShaderMaterials with scene fog; shared uniforms are passed by reference. In winter rivers and the loch
 * freeze from the edges inwards and the sea grows shore ice.
 */
import { useMemo } from 'react';
import {
  Color,
  DoubleSide,
  Shape,
  ShapeGeometry,
  ShaderMaterial,
  UniformsLib,
  Vector2,
  type BufferGeometry,
  type IUniform,
} from 'three';
import { SUMMER, WINTER } from '../render/palette';
import { sharedUniforms } from '../render/uniforms';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { REGIONS, RIVERS, SEA_LEVEL } from '../world/layout';
import type { Region } from '../world/types';
import { bakeToTexture, bakeWaterDepth, lochLevel } from './bake';
import { buildRiversGeometry } from './riverGeometry';
import commonGlsl from './shaders/common.glsl?raw';
import riverFrag from './shaders/river.frag.glsl?raw';
import riverVert from './shaders/river.vert.glsl?raw';
import stillFrag from './shaders/still.frag.glsl?raw';
import stillVert from './shaders/still.vert.glsl?raw';

const ICE = '#CFE3EA';
const SNOW = '#F4F7F8';

function paletteUniforms(): Record<string, IUniform> {
  return {
    uTime: sharedUniforms.uTime,
    uSeason: sharedUniforms.uSeason,
    uSunDirection: sharedUniforms.uSunDirection,
    uSunColor: sharedUniforms.uSunColor,
    uFogColor: sharedUniforms.uFogColor,
    uDeepS: { value: new Color(SUMMER.water.deep) },
    uDeepW: { value: new Color(WINTER.water.deep) },
    uShallowS: { value: new Color(SUMMER.water.shallow) },
    uShallowW: { value: new Color(WINTER.water.shallow) },
    uFoamS: { value: new Color(SUMMER.water.foam) },
    uFoamW: { value: new Color(WINTER.water.foam) },
    uIce: { value: new Color(ICE) },
    uSnow: { value: new Color(SNOW) },
  };
}

function makeRiverMaterial(): ShaderMaterial {
  const m = new ShaderMaterial({
    uniforms: { ...UniformsLib.fog, ...paletteUniforms() },
    vertexShader: riverVert,
    fragmentShader: commonGlsl + riverFrag,
    fog: true,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
  });
  return m;
}

interface StillSpec {
  region: Region;
  level: number;
  geometry: BufferGeometry;
  material: ShaderMaterial;
  renderOrder: number;
}

function polygonGeometry(r: Region): ShapeGeometry {
  // Shape is built in x/(-z) so that rotating -90° about X maps it onto the x/z ground plane.
  return new ShapeGeometry(new Shape(r.polygon.map(([x, z]) => new Vector2(x, -z))));
}

export function Water() {
  const hf = useHeightfield();

  const riverGeo = useMemo(() => buildRiversGeometry(RIVERS, hf), [hf]);
  const riverMat = useMemo(() => makeRiverMaterial(), []);

  const stills = useMemo<StillSpec[]>(() => {
    const out: StillSpec[] = [];
    for (const r of REGIONS) {
      let level: number;
      let kind: 'sea' | 'loch' | 'marsh';
      if (r.kind === 'sea') {
        level = SEA_LEVEL;
        kind = 'sea';
      } else if (r.kind === 'lake') {
        level = lochLevel(hf, r.polygon);
        kind = 'loch';
      } else if (r.kind === 'marsh') {
        level = SEA_LEVEL - 0.012; // T01 marsh pool floors are ~-0.04, so a near-sea-level plane fills only the real dips
        kind = 'marsh';
      } else continue;
      const bake = bakeWaterDepth(hf, r.polygon, level, {
        distCap: kind === 'sea' ? 2 : 3,
      });
      const tint =
        kind === 'sea' ? new Color(0, 0, 0) : kind === 'loch' ? new Color('#1F3E4E') : new Color('#A9C0C6');
      const material = new ShaderMaterial({
        uniforms: {
          ...UniformsLib.fog,
          ...paletteUniforms(),
          uTex: { value: bakeToTexture(bake) },
          uBox: { value: [...bake.box] },
          uRange: { value: [bake.depthMax, bake.distMax, bake.edgeMax] },
          uDepthRef: { value: kind === 'sea' ? 0.4 : kind === 'loch' ? 0.18 : 0.04 },
          uFreezeReach: { value: kind === 'sea' ? 0.55 : 6 },
          uFoamAmt: { value: kind === 'sea' ? 1 : kind === 'loch' ? 0.35 : 0 },
          uReed: { value: kind === 'sea' ? 0 : kind === 'loch' ? 1 : 0.15 },
          uAlpha: { value: kind === 'marsh' ? 0.6 : 1 },
          uTint: { value: [tint.r, tint.g, tint.b, kind === 'sea' ? 0 : kind === 'loch' ? 0.35 : 0.45] },
        },
        vertexShader: stillVert,
        fragmentShader: commonGlsl + stillFrag,
        fog: true,
        transparent: kind === 'marsh',
        depthWrite: kind !== 'marsh',
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      });
      out.push({
        region: r,
        level,
        geometry: polygonGeometry(r),
        material,
        renderOrder: kind === 'marsh' ? 2 : 0,
      });
    }
    return out;
  }, [hf]);

  return (
    <group name="water">
      {stills.map((s) => (
        <mesh
          key={s.region.id}
          geometry={s.geometry}
          material={s.material}
          rotation-x={-Math.PI / 2}
          position-y={s.level}
          renderOrder={s.renderOrder}
          frustumCulled={false}
        />
      ))}
      <mesh geometry={riverGeo} material={riverMat} frustumCulled={false} renderOrder={1} />
    </group>
  );
}
