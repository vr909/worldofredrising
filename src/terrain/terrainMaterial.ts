/**
 * Painterly terrain + slab materials (DESIGN §5). Both extend MeshStandardMaterial via
 * onBeforeCompile, so shadows, fog, tone mapping and colour-space output come for free; only the
 * way `diffuseColor` is computed changes. All colours come from the palette and blend by the shared
 * `uSeason` uniform (passed by reference).
 */
import { Color, MeshStandardMaterial, ShaderChunk, type WebGLProgramParametersWithUniforms } from 'three';
import { CANYON_STRATA, SUMMER, WINTER, type SeasonPalette } from '../render/palette';
import { sharedUniforms } from '../render/uniforms';
import noiseGlsl from './shaders/noise.glsl?raw';
import slabGlsl from './shaders/slab.glsl?raw';
import strataGlsl from './shaders/strata.glsl?raw';
import terrainGlsl from './shaders/terrain.glsl?raw';

const paletteList = (p: SeasonPalette): Color[] => {
  const t = p.terrain;
  return [
    t.grass,
    t.meadow,
    t.forestFloor,
    t.highlandMoss,
    t.rock,
    t.highRock,
    t.sand,
    t.marsh,
    t.sandstone,
    t.snow,
  ].map((hex) => new Color(hex));
};

/** Soft "wrap" diffuse: lets light bleed a little past the terminator for a painterly look. */
function wrapLighting(): string {
  const chunk = ShaderChunk.lights_physical_pars_fragment;
  const needle = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
  if (!chunk.includes(needle)) return '#include <lights_physical_pars_fragment>';
  return chunk.replace(
    needle,
    'float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + 0.3 ) / 1.3 );',
  );
}

const WRAPPED_LIGHTS = wrapLighting();

function baseMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ roughness: 1, metalness: 0 });
}

export function createTerrainMaterial(): MeshStandardMaterial {
  const mat = baseMaterial();
  mat.name = 'terrain-painterly';
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSeason = sharedUniforms.uSeason;
    shader.uniforms.uSunDirection = sharedUniforms.uSunDirection;
    shader.uniforms.uPalS = { value: paletteList(SUMMER) };
    shader.uniforms.uPalW = { value: paletteList(WINTER) };
    shader.uniforms.uStrata = { value: CANYON_STRATA.map((c) => new Color(c)) };

    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        `attribute vec4 splatA;
attribute vec4 splatB;
attribute float ao;
attribute float water;
attribute float wet;
varying vec3 vWPos;
varying vec3 vWNrm;
varying vec4 vSplatA;
varying vec4 vSplatB;
varying float vAo;
varying float vWater;
varying float vWet;
void main() {`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
// The terrain mesh sits at the origin with an identity transform, so object space == world space.
vWPos = position;
vWNrm = normal;
vSplatA = splatA;
vSplatB = splatB;
vAo = ao;
vWater = water;
vWet = wet;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', WRAPPED_LIGHTS)
      .replace('void main() {', `${noiseGlsl}\n${strataGlsl}\n${terrainGlsl}\nvoid main() {`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.rgb = paintTerrain() * mix(0.5, 1.0, vAo);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  // Gentle rim brightening on ridges facing the sun.
  vec3 rn = normalize(vWNrm);
  vec3 rv = normalize(cameraPosition - vWPos);
  float rim = pow(1.0 - clamp(dot(rn, rv), 0.0, 1.0), 3.0) * clamp(dot(rn, uSunDirection) + 0.2, 0.0, 1.0);
  totalEmissiveRadiance += diffuseColor.rgb * rim * 0.12;
}`,
      );
  };
  mat.customProgramCacheKey = () => 'terrain-painterly-v1';
  return mat;
}

export function createSlabMaterial(): MeshStandardMaterial {
  const mat = baseMaterial();
  mat.name = 'slab-strata';
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uSeason = sharedUniforms.uSeason;
    shader.uniforms.uStrata = { value: CANYON_STRATA.map((c) => new Color(c)) };
    shader.uniforms.uSoil = { value: new Color('#4C3B2B') };
    shader.uniforms.uSnowCap = { value: new Color(WINTER.terrain.snow) };
    shader.uniforms.uWaterShallow = {
      value: new Color(SUMMER.water.shallow).lerp(new Color('#ffffff'), 0.12),
    };
    shader.uniforms.uWaterDeep = {
      value: new Color(SUMMER.water.deep).lerp(new Color(SUMMER.water.shallow), 0.35),
    };

    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        `attribute float aTop;
varying vec3 vWPos;
varying float vTop;
void main() {`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vWPos = position;
vTop = aTop;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', WRAPPED_LIGHTS)
      .replace('void main() {', `${noiseGlsl}\n${strataGlsl}\n${slabGlsl}\nvoid main() {`)
      .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb = paintSlab();`);
  };
  mat.customProgramCacheKey = () => 'slab-strata-v1';
  return mat;
}
