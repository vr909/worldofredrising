/** Olympus rock material (T06): vertex-coloured, flat-shaded, with winter snow creeping down the upper slopes. */
import { Color, MeshStandardMaterial } from 'three';
import { sharedUniforms } from '../../render/uniforms';

const SNOW = new Color('#f0f2f5');

export function makeRockMaterial(): MeshStandardMaterial {
  const mat = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    flatShading: true,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSeason = sharedUniforms.uSeason;
    shader.uniforms.uSnowColor = { value: SNOW };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vNy;\nvarying vec3 vLp;')
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vNy = normalize(mat3(modelMatrix) * objectNormal).y;`,
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n        vLp = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uSeason;\nuniform vec3 uSnowColor;\nvarying float vNy;\nvarying vec3 vLp;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float n = fract(sin(dot(floor(vLp.xz * 5.0 + floor(vLp.y * 5.0)), vec2(12.9898, 78.233))) * 43758.5453);
          float line = mix(-0.3, -0.95, clamp(uSeason * 1.1, 0.0, 1.0));
          float cover = smoothstep(line - 0.12, line + 0.18, vLp.y + (n - 0.5) * 0.28);
          cover *= smoothstep(-0.1, 0.25, vNy);
          diffuseColor.rgb = mix(diffuseColor.rgb, uSnowColor, cover * clamp(uSeason * 1.2, 0.0, 1.0) * 0.9);
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'olympus-rock';
  return mat;
}
