/**
 * Terrain noise bake (T14). The painterly terrain shader used to evaluate ~8 four-octave fbm fields per pixel per frame
 * (about 80% of its cost). Those fields are static, so they are rendered ONCE into three RGBA8 textures covering the whole
 * terrain extent and sampled by world xz (terrain.glsl). One texel ~ 44 m at full size, bilinear + mipmapped.
 *
 * Contract: PerfManager calls bakeTerrainFields(gl, size) in a layout effect, before the first frame. terrainMaterial.ts
 * binds the textures by reference, so nothing else needs to know.
 */
import {
  BufferGeometry,
  ClampToEdgeWrapping,
  Float32BufferAttribute,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  OrthographicCamera,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector4,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import noiseGlsl from '../terrain/shaders/noise.glsl?raw';
import { BOUNDS } from '../world/layout';
import bakeFrag from './shaders/bake.glsl?raw';
import bakeVert from './shaders/bake.vert.glsl?raw';

export const BAKE_WIDTH_KM = BOUNDS.maxX - BOUNDS.minX;
export const BAKE_HEIGHT_KM = BOUNDS.maxZ - BOUNDS.minZ;

/** Texture size for a width in texels: keeps texels square over the terrain extent. */
export function bakeSize(widthTexels: number): { width: number; height: number } {
  return { width: widthTexels, height: Math.round((widthTexels * BAKE_HEIGHT_KM) / BAKE_WIDTH_KM) };
}

/** World xz (display km) to bake uv. Pure, so it is unit tested; the shader does the same arithmetic. */
export function bakeUv(x: number, z: number): [number, number] {
  return [(x - BOUNDS.minX) / BAKE_WIDTH_KM, (z - BOUNDS.minZ) / BAKE_HEIGHT_KM];
}

/** Shader uniform: minX, minZ, 1/sizeX, 1/sizeZ. */
export const bakeBox = new Vector4(BOUNDS.minX, BOUNDS.minZ, 1 / BAKE_WIDTH_KM, 1 / BAKE_HEIGHT_KM);

function makeTarget(width: number, height: number): WebGLRenderTarget {
  return new WebGLRenderTarget(width, height, {
    format: RGBAFormat,
    type: UnsignedByteType,
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
  });
}

const initial = bakeSize(1024);
const targets = [0, 1, 2].map(() => makeTarget(initial.width, initial.height));

/** The three baked textures: stable objects, bound once by the terrain material. */
export const bakedTextures: readonly [Texture, Texture, Texture] = [
  targets[0]!.texture,
  targets[1]!.texture,
  targets[2]!.texture,
];

let bakedWidth = 0;

export function isTerrainBaked(): boolean {
  return bakedWidth > 0;
}

/** Render the three static-noise textures. ~ms on a GPU; a second or two in software GL (use a smaller size there). */
export function bakeTerrainFields(gl: WebGLRenderer, widthTexels: number): void {
  const { width, height } = bakeSize(widthTexels);
  const prevTarget = gl.getRenderTarget();
  const prevAutoClear = gl.autoClear;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const scene = new Scene();
  const box = new Vector4(BOUNDS.minX, BOUNDS.minZ, BAKE_WIDTH_KM, BAKE_HEIGHT_KM);
  const materials = [0, 1, 2].map(
    (pass) =>
      new ShaderMaterial({
        defines: { BAKE_PASS: pass },
        uniforms: { uBox: { value: box } },
        vertexShader: bakeVert,
        fragmentShader: bakeFrag.replace('// NOISE', noiseGlsl),
        depthTest: false,
        depthWrite: false,
      }),
  );
  const mesh = new Mesh(geometry, materials[0]);
  mesh.frustumCulled = false;
  scene.add(mesh);
  try {
    gl.autoClear = false;
    targets.forEach((rt, i) => {
      if (rt.width !== width || rt.height !== height) rt.setSize(width, height);
      mesh.material = materials[i]!;
      gl.setRenderTarget(rt);
      gl.render(scene, camera);
    });
    bakedWidth = width;
  } finally {
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAutoClear;
    materials.forEach((m) => m.dispose());
    geometry.dispose();
  }
}
