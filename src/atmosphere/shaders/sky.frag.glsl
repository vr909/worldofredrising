uniform float uTime;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform float uDip;   // radians: how far the "horizon" is lowered (diorama sky, see Atmosphere.tsx)
uniform vec3 uMoonA;  // Phobos direction (sky space)
uniform vec3 uMoonB;  // Deimos direction
varying vec3 vDir;

// NOISE

// Potato-shaped moon. m = moon direction, R = angular radius (rad). Returns rgb + coverage.
vec4 moon(vec3 d, vec3 m, float R, float seed, vec3 tint, float irregular) {
  vec3 u = normalize(cross(vec3(0.0, 1.0, 0.0), m));
  vec3 v = cross(m, u);
  if (dot(d, m) < 0.0) return vec4(0.0);
  vec2 p = vec2(dot(d, u), dot(d, v)) / R;
  float r = length(p);
  if (r > 1.6) return vec4(0.0);
  float a = atan(p.y, p.x);
  float edge = 1.0 + irregular * (0.55 * cos(2.0 * a + seed) + 0.35 * cos(3.0 * a + seed * 2.3) + 0.2 * cos(5.0 * a + seed * 4.1));
  float rr = r / edge;
  float cover = 1.0 - smoothstep(0.82, 1.0, rr);
  if (cover <= 0.0) return vec4(0.0);
  vec3 n = normalize(vec3(p / edge, sqrt(max(1.0 - rr * rr, 0.02))));
  vec3 nw = n.x * u + n.y * v + n.z * m;
  float lit = smoothstep(-0.2, 0.5, dot(nw, uSunDirection));
  // cratering: dark pits from two noise octaves
  float c1 = aNoise(p * 4.5 + seed);
  float c2 = aNoise(p * 9.0 - seed);
  float pits = smoothstep(0.6, 0.76, c1) * 0.3 + smoothstep(0.64, 0.8, c2) * 0.18;
  float mottled = 0.9 + 0.1 * aNoise(p * 2.5 + seed * 3.0);
  vec3 col = tint * mottled * (1.0 - pits) * (0.3 + 0.7 * lit);
  return vec4(col, cover);
}

void main() {
  vec3 d = normalize(vDir);
  // Diorama sky: the camera hovers high above a table-top valley, so every true elevation in view is
  // below the geometric horizon. Lift the horizon by uDip so a graded sky shows above the slab.
  float elev = min(asin(clamp(d.y, -1.0, 1.0)) + uDip, 1.5707);
  vec2 hz = normalize(d.xz + vec2(1e-5));
  vec3 s = vec3(hz.x * cos(elev), sin(elev), hz.y * cos(elev));

  float h = max(s.y, 0.0);
  float t = 1.0 - exp(-h * 5.5);
  vec3 col = mix(uHorizon, uZenith, pow(t, 0.9));
  // Mars's zenith leans blue-violet (DESIGN section 2)
  col = mix(col, col * vec3(0.9, 0.9, 1.14), smoothstep(0.1, 0.8, h));

  // below the horizon the table falls away to a deeper warm shade
  col *= 1.0 - 0.4 * smoothstep(0.0, 0.4, -s.y);

  // warm sun-side horizon glow
  float sd = max(dot(s, uSunDirection), 0.0);
  float band = exp(-h * 6.0);
  vec3 warm = uSunColor * vec3(1.0, 0.8, 0.5);
  col += warm * (pow(sd, 5.0) * 0.3 * band + pow(sd, 40.0) * 0.4 + pow(sd, 400.0) * 1.2);
  col = mix(col, col * vec3(1.06, 0.97, 0.88), pow(sd, 2.0) * band * 0.5);

  // faint high cloud streaks
  vec2 cp = s.xz / (s.y + 0.3);
  cp += vec2(aNoise(cp * 0.7), aNoise(cp * 0.7 + 3.1)) * 1.4; // warp so bands are not concentric arcs
  float cn = aFbm(vec2(cp.x * 0.45 + uTime * 0.004, cp.y * 1.6));
  float cn2 = aFbm(vec2(cp.x * 1.0 - uTime * 0.006, cp.y * 2.8) + 7.3);
  float streak = smoothstep(0.5, 0.82, cn * 0.7 + cn2 * 0.45);
  float cloudMask = smoothstep(0.03, 0.2, s.y) * (1.0 - smoothstep(0.6, 0.95, s.y));
  vec3 cloudCol = mix(uHorizon, vec3(1.0, 0.96, 0.9), 0.75) + warm * pow(sd, 3.0) * 0.25;
  col = mix(col, cloudCol, streak * cloudMask * 0.22);

  // Mars's moons (Red Rising p.217 "The moons glimmer bright"): Phobos larger, Deimos a dot
  vec4 mA = moon(s, uMoonA, 0.015, 1.3, vec3(0.62, 0.58, 0.54), 0.15);
  vec4 mB = moon(s, uMoonB, 0.005, 4.1, vec3(0.7, 0.67, 0.63), 0.06);
  float vis = 0.8 * smoothstep(0.03, 0.14, s.y);
  col = mix(col, mA.rgb, mA.a * vis);
  col = mix(col, mB.rgb, mB.a * vis);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
