// Shared helpers for all water shaders (prepended in JS).
float wHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 wHash2(vec2 p) {
  float n = wHash(p);
  return vec2(n, wHash(p + n * 17.17));
}
float wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = wHash(i);
  float b = wHash(i + vec2(1.0, 0.0));
  float c = wHash(i + vec2(0.0, 1.0));
  float d = wHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float wFbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * wNoise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return s / 0.9375;
}
// Worley F2 - F1: small along crack lines.
float wCracks(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = wHash2(i + g);
      float d = length(g + o - f);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return f2 - f1;
}
// Pale winter ice with faint cracks and drifted snow. edge: 0 at shore/bank .. 1 inside.
vec3 wIce(vec3 iceCol, vec3 snowCol, vec2 p, float edge) {
  float crack = 1.0 - smoothstep(0.0, 0.07, wCracks(p * 1.6));
  float crack2 = 1.0 - smoothstep(0.0, 0.05, wCracks(p * 4.1 + 3.3));
  float mott = wFbm(p * 2.5);
  vec3 c = iceCol * (0.86 + 0.16 * mott);
  c = mix(c, iceCol * vec3(0.6, 0.74, 0.86), crack * 0.8 + crack2 * 0.4);
  float drift = smoothstep(0.52, 0.85, wFbm(p * 0.9 + 5.0)) * mix(0.85, 0.35, smoothstep(0.0, 0.6, edge));
  return mix(c, snowCol, drift * 0.6);
}
