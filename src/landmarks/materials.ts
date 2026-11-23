/**
 * Castle materials: MeshStandardMaterial with vertex colours, plus a snow cap on up-facing surfaces driven by
 * the shared season uniform (passed by reference, so one per-frame update reaches every castle).
 */
import { Color, MeshStandardMaterial } from 'three';
import { sharedUniforms } from '../render/uniforms';

export type MatKind = 'stone' | 'roof' | 'trim';

const SNOW = new Color('#f2f3f4');

// Snow thresholds on world-space normal.y: roofs hold snow on gentler and steeper slopes; stone only on flat tops.
const SNOW_RANGE: Record<MatKind, [number, number, number]> = {
  stone: [0.9, 0.98, 0.8],
  roof: [0.35, 0.7, 0.95],
  trim: [0.9, 0.98, 0.6],
};

export function makeCastleMaterial(kind: MatKind): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const [lo, hi, amt] = SNOW_RANGE[kind];
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSeason = sharedUniforms.uSeason;
    shader.uniforms.uSnowColor = { value: SNOW };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vNy;\nvarying vec3 vWp;')
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vNy = normalize(mat3(modelMatrix) * objectNormal).y;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uSeason;\nuniform vec3 uSnowColor;\nvarying float vNy;\nvarying vec3 vWp;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float n = fract(sin(dot(floor(vWp.xz * 90.0), vec2(12.9898, 78.233))) * 43758.5453);
          float cover = smoothstep(${lo.toFixed(2)}, ${hi.toFixed(2)}, vNy + (n - 0.5) * 0.08);
          float s = clamp(uSeason * 1.15 - 0.1, 0.0, 1.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, cover * s * ${amt.toFixed(2)});
        }`,
      );
  };
  mat.customProgramCacheKey = () => `castle-snow-${kind}`;
  return mat;
}
