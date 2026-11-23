/**
 * Painterly terrain + slab materials (DESIGN §5). Both extend MeshStandardMaterial via
 * onBeforeCompile, so shadows, fog, tone mapping and colour-space output come for free; only the
 * way `diffuseColor` is computed changes. All colours come from the palette and blend by the shared
 * `uSeason` uniform (passed by reference).
 */
import { Color, MeshStandardMaterial, ShaderChunk, type WebGLProgramParametersWithUniforms } from 'three';
import { CANYON_STRATA, SUMMER, WINTER, type SeasonPalette } from '../render/palette';
import { bakeBox, bakedTextures } from '../perf/bake';
import { sharedUniforms } from '../render/uniforms';
import { useStore } from '../state/store';
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
  // T14: shader detail (perf.detail) is a compile-time define; a change recompiles this one material.
  let detail = useStore.getState().perf.detail;
  const unsubscribe = useStore.subscribe((s) => {
    if (s.perf.detail === detail) return;
    detail = s.perf.detail;
    mat.needsUpdate = true;
  });
  mat.addEventListener('dispose', unsubscribe);
  mat.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uBakeA = { value: bakedTextures[0] };
    shader.uniforms.uBakeB = { value: bakedTextures[1] };
    shader.uniforms.uBakeC = { value: bakedTextures[2] };
    shader.uniforms.uBakeBox = { value: bakeBox };
    const defines = `#define TERRAIN_DETAIL ${detail}\n#define STRATA_DETAIL ${detail >= 2 ? 1 : 0}\n`;
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
      .replace('void main() {', `${defines}${noiseGlsl}\n${strataGlsl}\n${terrainGlsl}\nvoid main() {`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
diffuseColor.rgb = paintTerrain() * mix(0.68, 1.0, vAo); // lead M2: softer AO so cliffs facing away from the sun stay readable`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
// Matte painted ground: no specular (it produced bright outlines on grazing crests).
reflectedLight.directSpecular = vec3(0.0);
reflectedLight.indirectSpecular = vec3(0.0);`,
      );
  };
  mat.customProgramCacheKey = () => `terrain-painterly-v3-d${detail}`;
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
      .replace('#include <color_fragment>', `#include <color_fragment>\ndiffuseColor.rgb = paintSlab();`)
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
// Matte painted ground: no specular (it produced bright outlines on grazing crests).
reflectedLight.directSpecular = vec3(0.0);
reflectedLight.indirectSpecular = vec3(0.0);`,
      );
  };
  mat.customProgramCacheKey = () => 'slab-strata-v1';
  return mat;
}
