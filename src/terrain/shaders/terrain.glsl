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

// Baked static noise fields (src/perf/bake.ts). One texel ~ 44 m over the whole terrain extent.
//   A: macro | macro2 | blotch | stroke          B: rock fbm | moss fbm | snow-edge fbm | bare-patch fbm
//   C: strata warp fbm | fine | tNoise(p*2.2) | tNoise(p*4.0)
uniform sampler2D uBakeA;
uniform sampler2D uBakeB;
uniform sampler2D uBakeC;
uniform vec4 uBakeBox; // minX, minZ, 1/sizeX, 1/sizeZ

vec3 pal(int i) {
  return mix(uPalS[i], uPalW[i], uSeason);
}

#if TERRAIN_DETAIL >= 1
vec3 paintTerrain() {
  vec2 p = vWPos.xz;
  float h = vWPos.y;
  vec3 N = normalize(vWNrm);
  float ny = N.y;

  // --- noise fields (baked, see uBake*) -----------------------------------------------------
  vec2 bk = (p - uBakeBox.xy) * uBakeBox.zw;
  vec4 bA = texture2D(uBakeA, bk);
  vec4 bB = texture2D(uBakeB, bk);
  vec4 bC = texture2D(uBakeC, bk);
  float macro = bA.x;   // 3-8 km colour drift
  float macro2 = bA.y;
  float blotch = bA.z;  // woodland / meadow patches
  float stroke = bA.w;  // ~0.3 km brush marks: two crossed, stretched noise layers (fixed axes, so no swirling)
  float fine = bC.y;

  // --- splat weights ------------------------------------------------------------------------
  vec4 A = vSplatA;
  vec4 B = vSplatB;
  // Canyon wall stone is exclusive (SurfaceChannels contract): where it is present it displaces the other
  // channels instead of being averaged with them. T01 also writes rock/grass on the walls, and plain
  // normalisation diluted the strata to ~50%, which read cream-grey from the overview (M1 integration).
  float wallRaw = B.z;
  A *= 1.0 - wallRaw;
  B.xyw *= 1.0 - wallRaw;
  float sum = dot(A, vec4(1.0)) + dot(B, vec4(1.0));
  if (sum < 0.01) {
    A = vec4(1.0, 0.0, 0.0, 0.0);
    B = vec4(0.0);
    sum = 1.0;
  }
  A /= sum;
  B /= sum;

  // --- per-surface colours ------------------------------------------------------------------
  // Highlands (splatB.a): moss and grass, rock only on real crags (p.166 "mossy hills ... U-shaped grassy glens").
  float rockKeep = 1.0 - B.w * 0.75 * smoothstep(0.70, 0.80, ny);
  float lost = A.z * (1.0 - rockKeep);
  A.z -= lost;
  B.w += lost;

  vec3 grass = mix(pal(0), pal(1), smoothstep(0.35, 0.7, macro2 * 0.65 + blotch * 0.35));
  grass *= 0.94 + 0.12 * fine;

  float mottle = smoothstep(0.3, 0.72, blotch);
  vec3 forest = pal(2) * mix(0.72, 1.28, mottle);
  forest = mix(forest, pal(2) * vec3(1.45, 1.4, 0.95), smoothstep(0.55, 0.8, 0.5 * fine + 0.5 * macro2) * 0.55);
#if TERRAIN_DETAIL >= 2
  forest *= 0.9 + 0.2 * tNoise(p * 7.0);
#endif

  float hi = smoothstep(2.0, 2.8, h);
  vec3 rock = mix(pal(4), pal(5), clamp(hi + (macro2 - 0.5) * 0.6, 0.0, 1.0));
  rock *= 0.88 + 0.24 * bB.x;
  rock = mix(rock, vec3(dot(rock, vec3(0.3, 0.55, 0.15))) * vec3(0.97, 0.99, 1.03), 0.5); // cooler grey-brown

  vec3 moss = mix(pal(3), pal(4), smoothstep(0.58, 0.8, bB.y) * 0.45);
  vec3 sand = pal(6) * (0.95 + 0.1 * fine);
  vec3 marsh = mix(pal(7), pal(7) * vec3(0.7, 0.8, 0.65), smoothstep(0.4, 0.75, blotch));
  vec3 sandstone = mix(pal(8), pal(8) * vec3(1.1, 0.95, 0.82), smoothstep(0.3, 0.7, macro2));
  vec3 wall = strataColorW(h, p, bC.x) * vec3(0.9, 0.66, 0.56); // push toward Martian red-ochre

  vec3 col = grass * A.x + forest * A.y + rock * A.z + sand * A.w + marsh * B.x + sandstone * B.y + wall * B.z + moss * B.w;

  // Walls: dark crevices and warm sun-catching highlights.
  float wallW = B.z;
  float lit = clamp(dot(N, uSunDirection), 0.0, 1.0);
#if TERRAIN_DETAIL >= 2
  float crev = tNoise(vec2((p.x + p.y) * 2.2, h * 0.9) + 3.0) * 0.6 + tNoise(p * 5.0) * 0.4;
  col *= 1.0 - wallW * 0.32 * smoothstep(0.55, 0.85, crev) * (1.0 - ny);
  col += wallW * vec3(0.10, 0.045, 0.0) * lit * smoothstep(0.45, 0.8, tNoise(p * 1.9 + h));
#endif

  // --- slope rock, high rock ------------------------------------------------------------------
  float rockAmt = 1.0 - smoothstep(mix(0.80, 0.70, B.w), mix(0.90, 0.77, B.w), ny + (macro2 - 0.5) * 0.08 + (fine - 0.5) * 0.04);
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
  float thr = mix(2.8 + wallW * 2.8, -0.6, s); // summer: walls only snow-capped above ~5.5 km
  float nz = (bB.z - 0.5) * 0.9 + (bC.w - 0.5) * 0.25;
  float above = smoothstep(0.0, 0.3, h + nz - thr);
  float lim = mix(0.5, 0.77, uSeason) + 0.18 * wallW; // summer: gentle-ish high slopes; winter: slope < ~40 deg
#if TERRAIN_DETAIL >= 2
  float stickN = (tNoise(p * 6.0) - 0.5) * 0.08;
#else
  float stickN = 0.0;
#endif
  float stick = smoothstep(lim - 0.1, lim + 0.03, ny + stickN);
  float snow = above * stick;
  snow *= 1.0 - smoothstep(0.2, 0.6, vWater);
  snow *= 1.0 - 0.65 * wetness;
  snow = smoothstep(0.12, 0.88, snow + (fine - 0.5) * 0.6 * snow * (1.0 - snow));
  snow *= 1.0 - 0.3 * A.y * smoothstep(0.35, 0.75, blotch); // woodland keeps a few dark gaps
  // Patchy low-elevation coverage: ~10-25% dull winter ground, more under trees and near water.
  // Lead M1 pass: larger, fewer patches (~2-3 km) so the overview doesn't read as camouflage; open plains stay
  // mostly white, bare ground gathers under woodland, near water and in the marsh.
  float bareN = bB.w * 0.8 + bC.z * 0.2;
  float bareT = 0.64 - 0.1 * A.y - 0.12 * wetness - 0.06 * B.x - 0.04 * blotch;
  float bare = smoothstep(bareT, bareT + 0.08, bareN) * (1.0 - smoothstep(1.0, 1.6, h));
  snow *= 1.0 - bare * 0.92;
  col *= 1.0 - 0.15 * bare * uSeason;
  // Cool blue-grey snow in shade / AO, warm white in sun, faint wind-drift streaks.
  float sunny = clamp(0.5 * lit + 0.6 * vAo - 0.1, 0.0, 1.0);
  vec3 snowCol = pal(9) * mix(vec3(0.8, 0.88, 1.0), vec3(1.0, 0.985, 0.94), smoothstep(0.35, 0.85, sunny));
  snowCol *= 0.94 + 0.1 * macro2;
#if TERRAIN_DETAIL >= 2
  snowCol *= 1.0 - 0.05 * smoothstep(0.45, 0.8, tNoise(vec2(p.x * 0.4 + p.y * 0.12, p.y * 5.5)));
#endif
  col = mix(col, snowCol, snow);

  return col;
}
#else
// Detail 0: the cheapest look. Baked fields only, no per-pixel noise, simplified snow and no wall crevices.
vec3 paintTerrain() {
  vec2 p = vWPos.xz;
  float h = vWPos.y;
  vec3 N = normalize(vWNrm);
  float ny = N.y;
  vec2 bk = (p - uBakeBox.xy) * uBakeBox.zw;
  vec4 bA = texture2D(uBakeA, bk);
  vec4 bB = texture2D(uBakeB, bk);
  vec4 bC = texture2D(uBakeC, bk);

  vec4 A = vSplatA;
  vec4 B = vSplatB;
  float wallRaw = B.z;
  A *= 1.0 - wallRaw;
  B.xyw *= 1.0 - wallRaw;
  float sum = dot(A, vec4(1.0)) + dot(B, vec4(1.0));
  if (sum < 0.01) {
    A = vec4(1.0, 0.0, 0.0, 0.0);
    B = vec4(0.0);
    sum = 1.0;
  }
  A /= sum;
  B /= sum;
  float rockKeep = 1.0 - B.w * 0.75 * smoothstep(0.70, 0.80, ny);
  float lost = A.z * (1.0 - rockKeep);
  A.z -= lost;
  B.w += lost;

  vec3 grass = mix(pal(0), pal(1), smoothstep(0.35, 0.7, bA.y * 0.65 + bA.z * 0.35));
  vec3 forest = pal(2) * mix(0.72, 1.28, smoothstep(0.3, 0.72, bA.z));
  vec3 rock = mix(pal(4), pal(5), smoothstep(2.0, 2.8, h)) * (0.88 + 0.24 * bB.x);
  vec3 wall = strataColorW(h, p, bC.x) * vec3(0.9, 0.66, 0.56);
  vec3 col = grass * A.x + forest * A.y + rock * A.z + pal(6) * A.w + pal(7) * B.x + pal(8) * B.y + wall * B.z + mix(pal(3), pal(4), 0.2) * B.w;

  float wallW = B.z;
  float rockAmt = (1.0 - smoothstep(mix(0.80, 0.70, B.w), mix(0.90, 0.77, B.w), ny)) * (1.0 - wallW);
  col = mix(col, rock, rockAmt);
  float hueShift = (bA.x - 0.5) * 0.12;
  col *= 1.0 + (bA.y - 0.5) * 0.12 + vec3(hueShift, 0.0, -hueShift) * 0.9;
  float wetness = smoothstep(0.08, 0.75, vWet);
  col *= mix(1.0, 0.6, wetness);
  col = mix(col, col * vec3(0.5, 0.68, 0.74), smoothstep(0.35, 0.9, vWater));

  float s = smoothstep(0.0, 1.0, uSeason);
  float thr = mix(2.8 + wallW * 2.8, -0.6, s);
  float above = smoothstep(0.0, 0.3, h + (bB.z - 0.5) * 0.9 - thr);
  float lim = mix(0.5, 0.77, uSeason) + 0.18 * wallW;
  float snow = above * smoothstep(lim - 0.1, lim + 0.03, ny);
  snow *= 1.0 - smoothstep(0.2, 0.6, vWater);
  snow *= 1.0 - 0.65 * wetness;
  float bareT = 0.64 - 0.1 * A.y - 0.12 * wetness - 0.06 * B.x;
  snow *= 1.0 - smoothstep(bareT, bareT + 0.08, bB.w) * (1.0 - smoothstep(1.0, 1.6, h)) * 0.92;
  float lit = clamp(dot(N, uSunDirection), 0.0, 1.0);
  float sunny = clamp(0.5 * lit + 0.6 * vAo - 0.1, 0.0, 1.0);
  vec3 snowCol = pal(9) * mix(vec3(0.8, 0.88, 1.0), vec3(1.0, 0.985, 0.94), smoothstep(0.35, 0.85, sunny));
  return mix(col, snowCol, snow);
}
#endif
