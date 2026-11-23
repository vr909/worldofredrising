uniform float uSeason;
uniform vec3 uSoil;
uniform vec3 uSnowCap;
uniform vec3 uWaterShallow;
uniform vec3 uWaterDeep;
varying vec3 vWPos;
varying float vTop;

// Cross-section of the diorama block: soil cap, strata beds (same bands as the canyon walls),
// and a lighter water layer where the sea meets the cut.
vec3 paintSlab() {
  float y = vWPos.y;
  vec2 xz = vWPos.xz;
  float edgeNoise = (tNoise(xz * 6.0 + y * 3.0) - 0.5) * 0.03;

  // Water above the sea floor (y between the terrain top and sea level).
  if (y > vTop + 0.004 + edgeNoise * 0.3) {
    float depth = clamp(-y / 0.6, 0.0, 1.0);
    vec3 w = mix(uWaterShallow, uWaterDeep, depth);
    w *= 0.92 + 0.12 * tNoise(vec2((xz.x + xz.y) * 1.5, y * 9.0));
    w += vec3(0.1) * smoothstep(-0.03, 0.0, y); // bright meniscus line
    return w;
  }

  float d = vTop - y;
  float cap = 0.1 + edgeNoise;
  vec3 rock = strataColor(y, xz);
  // Beds fade a little darker toward the base of the block.
  rock *= mix(1.0, 0.68, smoothstep(0.0, 1.4, -y));
  vec3 soil = uSoil * (0.9 + 0.2 * tNoise(xz * 9.0 + y * 20.0));
  float snowCap = uSeason * step(0.0, vTop) * (1.0 - smoothstep(0.035, 0.06, d + edgeNoise));
  vec3 col = mix(rock, soil, 1.0 - smoothstep(cap - 0.012, cap + 0.012, d));
  // Thin dark line where soil meets rock.
  col *= 1.0 - 0.3 * (smoothstep(cap - 0.03, cap, d) * (1.0 - smoothstep(cap, cap + 0.018, d)));
  col = mix(col, uSnowCap, snowCap);
  return col;
}
