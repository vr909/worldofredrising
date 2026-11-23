// One-off bake of the terrain's STATIC noise fields (T14). Same hash/fbm as the old per-pixel terrain shader, evaluated once
// per texel instead of once per pixel per frame. Output is sampled by world xz in terrain.glsl.
uniform vec4 uBox; // minX, minZ, sizeX, sizeZ
varying vec2 vUv;

// NOISE

void main() {
  vec2 p = uBox.xy + vUv * uBox.zw;
#if BAKE_PASS == 0
  // macro (3-8 km drift) | macro2 | blotch (woodland / meadow patches) | stroke (~0.3 km brush marks, two crossed layers)
  const mat2 R1 = mat2(0.82, 0.57, -0.57, 0.82);
  const mat2 R2 = mat2(0.42, -0.91, 0.91, 0.42);
  float stroke = 0.5 * (tFbm(R1 * p * vec2(3.4, 1.2) + 5.0) + tFbm(R2 * p * vec2(1.3, 3.0) + 8.0));
  gl_FragColor = vec4(tFbm(p / 5.5 + 3.1), tFbm(p / 2.4 + 9.7), tFbm(p / 0.8 + 1.3), stroke);
#elif BAKE_PASS == 1
  // rock grain | moss patches | snow-edge wobble | winter bare-ground patches
  gl_FragColor = vec4(tFbm(p * 1.7 + 2.0), tFbm(p * 2.2), tFbm(p * 0.9 + 11.0), tFbm(p * 0.38 + 30.0));
#else
  // canyon strata warp | fine grain | bare-patch grain | snow-edge grain
  gl_FragColor = vec4(tFbm(p * 0.22 + 4.0), tNoise(p * 3.4), tNoise(p * 2.2), tNoise(p * 4.0));
#endif
}
