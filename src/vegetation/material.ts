/**
 * Foliage material (T07): MeshStandardMaterial + vertex colours + per-instance colour, with onBeforeCompile adding
 *   - wind sway: vertex offset grows with height^2, driven by sharedUniforms.uTime (advances on ambient ticks),
 *   - winter: foliage tints toward the winter palette, broadleaf/olive/orchard crowns shrink to bare-branch
 *     size, conifer tier tops take snow. All driven by the shared uSeason (passed by reference).
 */
import { Color, DoubleSide, MeshStandardMaterial, type IUniform } from 'three';
import { SUMMER, WINTER } from '../render/palette';
import { sharedUniforms } from '../render/uniforms';
import type { SpeciesId } from './scatter';

interface Params {
  /** World-space sway at the very top of the plant, km. */
  sway: number;
  /** Radians per second of the main sway. */
  freq: number;
  /** 0..1: how far foliage shrinks toward the trunk in deep winter. */
  bare: number;
  /** 0..1: how much of the snow weight shows. */
  snow: number;
  /** Summer -> winter colour multiplier (linear). */
  winter: Color;
  doubleSided?: boolean;
}

const ratio = (a: string, b: string): Color => {
  const s = new Color(a);
  const w = new Color(b);
  return new Color(w.r / s.r, w.g / s.g, w.b / s.b);
};

const PARAMS: Record<SpeciesId, Params> = {
  conifer: {
    sway: 0.009,
    freq: 1.3,
    bare: 0,
    snow: 1,
    winter: ratio(SUMMER.foliage.conifer, WINTER.foliage.conifer),
  },
  broadleaf: {
    sway: 0.012,
    freq: 1.5,
    bare: 0.5,
    snow: 0,
    winter: ratio(SUMMER.foliage.broadleaf, WINTER.foliage.broadleaf).multiplyScalar(0.85),
  },
  olive: {
    sway: 0.006,
    freq: 1.8,
    bare: 0.25,
    snow: 0,
    winter: ratio(SUMMER.foliage.olive, WINTER.foliage.olive),
  },
  orchard: {
    sway: 0.006,
    freq: 1.7,
    bare: 0.5,
    snow: 0,
    winter: new Color(0.95, 0.8, 0.7),
  },
  vine: { sway: 0.001, freq: 1.2, bare: 0.55, snow: 0, winter: new Color(1.2, 0.85, 0.5) },
  reed: { sway: 0.012, freq: 2.0, bare: 0.1, snow: 0, winter: new Color(1.5, 1.2, 0.7), doubleSided: true },
};

const SNOW = new Color('#f2f3f4');

export interface FoliageMaterial {
  material: MeshStandardMaterial;
  /** Scale-up factor applied when the forest is thinned for performance (shared by reference). */
  thin: IUniform<number>;
}

export function makeFoliageMaterial(id: SpeciesId): FoliageMaterial {
  const p = PARAMS[id];
  const mat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    ...(p.doubleSided ? { side: DoubleSide } : {}),
  });
  const thin: IUniform<number> = { value: 1 };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uSeason = sharedUniforms.uSeason;
    shader.uniforms.uThin = thin;
    shader.uniforms.uSway = { value: p.sway };
    shader.uniforms.uFreq = { value: p.freq };
    shader.uniforms.uBare = { value: p.bare };
    shader.uniforms.uSnowAmt = { value: p.snow };
    shader.uniforms.uWinterMul = { value: p.winter };
    shader.uniforms.uSnowColor = { value: SNOW };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec3 aMeta;
        uniform float uTime;
        uniform float uSeason;
        uniform float uThin;
        uniform float uSway;
        uniform float uFreq;
        uniform float uBare;
        varying float vWin;
        varying float vSnow;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float sW = clamp(uSeason * 1.15 - 0.1, 0.0, 1.0);
          transformed *= uThin;
          // bare-down: foliage shrinks toward the trunk axis in winter
          transformed.xz *= 1.0 - uBare * sW * aMeta.y;
          vec2 ip = instanceMatrix[3].xz;
          float ph = ip.x * 7.1 + ip.y * 5.3;
          float gust = 0.65 + 0.35 * sin(uTime * 0.45 - ip.x * 0.4 + ip.y * 0.15);
          float amp = uSway * aMeta.x * aMeta.x * gust;
          float w1 = sin(uTime * uFreq + ph);
          float w2 = sin(uTime * uFreq * 2.1 + ph * 1.7);
          transformed.x += amp * (w1 + 0.35 * w2);
          transformed.z += amp * 0.6 * (cos(uTime * uFreq * 0.8 + ph * 0.6) + 0.3 * w2);
          vWin = aMeta.y * sW;
          vSnow = aMeta.z * sW;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uWinterMul;
        uniform vec3 uSnowColor;
        uniform float uSnowAmt;
        varying float vWin;
        varying float vSnow;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb *= mix(vec3(1.0), uWinterMul, vWin);
        diffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, clamp(vSnow * uSnowAmt * 0.9, 0.0, 1.0));`,
      );
  };
  mat.customProgramCacheKey = () => `veg-${id}`;
  return { material: mat, thin };
}
