uniform float uSeason;
uniform vec3 uSunDirection;
// Palette index: 0 grass 1 meadow 2 forest 3 moss 4 rock 5 highRock 6 sand 7 marsh 8 sandstone 9 snow
uniform vec3 uPalS[10];
uniform vec3 uPalW[10];
varying vec3 vWPos;
varying vec3 vWNrm;
varying vec4 vSplatA;
varying vec4 vSplatB;
varying float vAo;
varying float vWater;
varying float vWet;

vec3 pal(int i) {
  return mix(uPalS[i], uPalW[i], uSeason);
}

vec3 paintTerrain() {
  vec2 p = vWPos.xz;
  float h = vWPos.y;
  vec3 N = normalize(vWNrm);
  float ny = N.y;

  // --- noise fields -------------------------------------------------------------------------
  float macro = tFbm(p / 5.5 + 3.1);   // 3-8 km colour drift
  float macro2 = tFbm(p / 2.4 + 9.7);
  float blotch = tFbm(p / 0.8 + 1.3);   // woodland / meadow patches
  float fine = tNoise(p * 3.4);
  // ~0.3 km brush marks: two crossed, stretched noise layers (fixed axes, so no swirling).
  const mat2 R1 = mat2(0.82, 0.57, -0.57, 0.82);
  const mat2 R2 = mat2(0.42, -0.91, 0.91, 0.42);
  float stroke = 0.5 * (tFbm(R1 * p * vec2(3.4, 1.2) + 5.0) + tFbm(R2 * p * vec2(1.3, 3.0) + 8.0));

  // --- splat weights ------------------------------------------------------------------------
  vec4 A = vSplatA;
  vec4 B = vSplatB;
  float sum = dot(A, vec4(1.0)) + dot(B, vec4(1.0));
  if (sum < 0.01) {
    A = vec4(1.0, 0.0, 0.0, 0.0);
    B = vec4(0.0);
    sum = 1.0;
  }
  A /= sum;
  B /= sum;

  // --- per-surface colours ------------------------------------------------------------------
  vec3 grass = mix(pal(0), pal(1), smoothstep(0.35, 0.7, macro2 * 0.65 + blotch * 0.35));
  grass *= 0.94 + 0.12 * fine;

  float mottle = smoothstep(0.3, 0.72, blotch);
  vec3 forest = pal(2) * mix(0.72, 1.28, mottle);
  forest = mix(forest, pal(2) * vec3(1.45, 1.4, 0.95), smoothstep(0.55, 0.8, 0.5 * fine + 0.5 * macro2) * 0.55);
  forest *= 0.9 + 0.2 * tNoise(p * 7.0);

  float hi = smoothstep(2.0, 2.8, h);
  vec3 rock = mix(pal(4), pal(5), clamp(hi + (macro2 - 0.5) * 0.6, 0.0, 1.0));
  rock *= 0.88 + 0.24 * tFbm(p * 1.7 + 2.0);

  vec3 moss = mix(pal(3), pal(4), smoothstep(0.58, 0.8, tFbm(p * 2.2)) * 0.45);
  vec3 sand = pal(6) * (0.95 + 0.1 * fine);
  vec3 marsh = mix(pal(7), pal(7) * vec3(0.7, 0.8, 0.65), smoothstep(0.4, 0.75, blotch));
  vec3 sandstone = mix(pal(8), pal(8) * vec3(1.1, 0.95, 0.82), smoothstep(0.3, 0.7, macro2));
  vec3 wall = strataColor(h, p);

  vec3 col = grass * A.x + forest * A.y + rock * A.z + sand * A.w + marsh * B.x + sandstone * B.y + wall * B.z + moss * B.w;

  // Walls: dark crevices and warm sun-catching highlights.
  float wallW = B.z;
  float crev = tNoise(vec2((p.x + p.y) * 2.2, h * 0.9) + 3.0) * 0.6 + tNoise(p * 5.0) * 0.4;
  col *= 1.0 - wallW * 0.32 * smoothstep(0.55, 0.85, crev) * (1.0 - ny);
  float lit = clamp(dot(N, uSunDirection), 0.0, 1.0);
  col += wallW * vec3(0.10, 0.045, 0.0) * lit * smoothstep(0.45, 0.8, tNoise(p * 1.9 + h));

  // --- slope rock, high rock ------------------------------------------------------------------
  float rockAmt = 1.0 - smoothstep(0.80, 0.90, ny + (macro2 - 0.5) * 0.08 + (fine - 0.5) * 0.04);
  rockAmt *= (1.0 - wallW);
  col = mix(col, rock, rockAmt);
  col = mix(col, pal(5) * (0.9 + 0.2 * fine), smoothstep(2.4, 3.1, h) * 0.5 * (1.0 - wallW));

  // --- macro colour variation (about +-6%) and brush strokes (about +-4%) ---------------------
  float hueShift = (macro - 0.5) * 0.12;
  col *= 1.0 + (macro2 - 0.5) * 0.12 + vec3(hueShift, 0.0, -hueShift) * 0.9;
  float wetness = smoothstep(0.08, 0.75, vWet);
  col *= 1.0 + (stroke - 0.5) * 0.14 * (1.0 - 0.7 * wetness);

  // --- wet shoreline: darker, more saturated, smoother -----------------------------------------
  float lum = dot(col, vec3(0.3, 0.55, 0.15));
  col = mix(col, mix(vec3(lum), col, 1.25), wetness * 0.6);
  col *= mix(1.0, 0.6, wetness);
  col = mix(col, col * vec3(0.5, 0.68, 0.74), smoothstep(0.35, 0.9, vWater));

  // --- snow -------------------------------------------------------------------------------------
  // Snowline sweeps DOWN from the peaks as the season rises (2.8 km in summer -> below sea level).
  float s = smoothstep(0.0, 1.0, uSeason);
  float thr = mix(2.8, -0.6, s);
  float nz = (tFbm(p * 0.9 + 11.0) - 0.5) * 0.9 + (tNoise(p * 4.0) - 0.5) * 0.25;
  float above = smoothstep(0.0, 0.3, h + nz - thr);
  float lim = mix(0.5, 0.77, uSeason) + 0.18 * wallW; // summer: gentle-ish high slopes; winter: slope < ~40 deg
  float stick = smoothstep(lim - 0.1, lim + 0.03, ny + (tNoise(p * 6.0) - 0.5) * 0.08);
  float snow = above * stick;
  snow *= 1.0 - smoothstep(0.2, 0.6, vWater);
  snow *= 1.0 - 0.65 * wetness;
  snow = smoothstep(0.12, 0.88, snow + (fine - 0.5) * 0.6 * snow * (1.0 - snow));
  snow *= 1.0 - 0.3 * A.y * smoothstep(0.35, 0.75, blotch); // woodland keeps a few dark gaps
  vec3 snowCol = pal(9) * (0.94 + 0.1 * macro2 + 0.04 * tNoise(p * 2.5));
  col = mix(col, snowCol, snow);

  return col;
}
