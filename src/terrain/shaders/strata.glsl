// Canyon strata: horizontal bands from uStrata[6] (CANYON_STRATA, bottom -> top), driven by world
// height and bent by noise so the beds undulate like real sedimentary layers.
uniform vec3 uStrata[6];

vec3 strataColor(float y, vec2 xz) {
  float warp = (tFbm(xz * 0.22 + 4.0) - 0.5) * 1.6 + (tNoise(xz * 1.3 + y * 0.5) - 0.5) * 0.35;
  float b = y / 0.46 + warp;
  float i = floor(b);
  float f = fract(b);
  int ci = int(mod(i + 2.0 * floor(i / 6.0), 6.0));
  vec3 c = uStrata[ci];
  // Per-bed value jitter so repeated colours do not look stamped.
  c *= 0.9 + 0.2 * tHash(vec2(i, 7.7));
  // Darker joint at the bottom of each bed, warm lit lip at the top.
  c *= mix(0.62, 1.0, smoothstep(0.0, 0.16, f));
  c *= 1.0 + 0.1 * smoothstep(0.82, 1.0, f);
  // Vertical weathering streaks.
  float streak = tNoise(vec2((xz.x + xz.y) * 3.1, y * 0.7));
  c *= 1.0 - 0.22 * smoothstep(0.6, 0.85, streak);
  return c;
}
