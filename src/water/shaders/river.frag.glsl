uniform float uTime;
uniform float uSeason;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uDeepS;
uniform vec3 uDeepW;
uniform vec3 uShallowS;
uniform vec3 uShallowW;
uniform vec3 uFoamS;
uniform vec3 uFoamW;
uniform vec3 uIce;
uniform vec3 uSnow;
varying vec2 vUv;
varying float vLen;
varying float vWid;
varying float vMouth;
varying vec3 vWorld;
#include <fog_pars_fragment>
void main() {
  float tw = smoothstep(0.12, 0.92, uSeason);
  vec3 deep = mix(uDeepS, uDeepW, tw);
  vec3 shallow = mix(uShallowS, uShallowW, tw);
  vec3 foamCol = mix(uFoamS, uFoamW, tw);

  float s = vUv.x * vLen;                 // km along the river
  float across = (vUv.y - 0.5) * 2.0;     // -1 .. 1
  float side = across < 0.0 ? 1.0 : 2.0;
  float e = 1.0 - abs(across);            // 0 bank .. 1 centreline
  // ragged banks
  float rag = (wFbm(vec2(s * 4.0, side * 7.3)) - 0.5) * 0.3;
  e += rag;
  if (e < 0.0) discard;

  // frozen amount: edges first, noise-ragged front
  float nn = wFbm(vWorld.xz * 1.7);
  float front = (1.0 - clamp(e, 0.0, 1.0)) * 0.78 + nn * 0.17;
  float ice = (1.0 - smoothstep(tw - 0.06, tw + 0.03, front)) * smoothstep(0.0, 0.06, tw);

  float flowT = uTime * 0.28 * (1.0 - ice);
  float wAcross = across * vWid;           // km across
  // flow streaks, constant spacing in km
  float st1 = wFbm(vec2(s * 2.6 - flowT, wAcross * 20.0));
  float st2 = wNoise(vec2(s * 5.5 - flowT * 1.7, wAcross * 34.0 + 9.0));
  float streak = smoothstep(0.56, 0.86, st1) * 0.22 + smoothstep(0.7, 0.95, st2) * 0.18;

  float depthMix = smoothstep(0.0, 0.85, e) * (0.4 + 0.6 * vUv.x);
  vec3 col = mix(shallow, deep, depthMix);
  col *= 0.94 + 0.12 * wFbm(vec2(s * 1.3 - flowT * 0.3, wAcross * 8.0));
  col += streak * mix(vec3(0.55, 0.7, 0.72), foamCol, 0.5) * (1.0 - 0.3 * depthMix);

  // soft foam along both banks
  float foamN = wFbm(vec2(s * 7.0 - flowT * 1.3, side * 3.0 + wAcross * 10.0));
  float foam = smoothstep(0.26, 0.02, e) * (0.45 + 0.75 * foamN);
  foam = smoothstep(0.25, 0.7, foam);
  // river mouth: foamy plume where it meets the sea
  float mouth = vMouth * smoothstep(0.9, 1.0, vUv.x);
  foam += mouth * smoothstep(0.55, 0.9, wFbm(vec2(s * 5.0 - uTime * 0.15, wAcross * 9.0))) * 0.5;
  col = mix(col, foamCol, clamp(foam, 0.0, 1.0) * 0.85 * (1.0 - ice));

  // sparkle toward the sun
  vec2 q = vec2(s * 9.0 - flowT * 2.0, wAcross * 40.0);
  float e0 = wNoise(q);
  vec3 N = normalize(vec3((wNoise(q + vec2(0.07, 0.0)) - e0) * 7.0, 1.0, (wNoise(q + vec2(0.0, 0.07)) - e0) * 7.0));
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, N);
  float sp = pow(max(dot(R, uSunDirection), 0.0), 90.0);
  col += sp * uSunColor * 0.9 * (1.0 - ice) * smoothstep(0.05, 0.5, e);

  // ice
  vec3 iceCol = wIce(uIce, uSnow, vWorld.xz * 6.0, e);
  float rim = smoothstep(0.09, 0.0, abs(front - tw)) * smoothstep(0.0, 0.1, tw);
  iceCol = mix(iceCol, uSnow, rim * 0.5);
  col = mix(col, iceCol, ice);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
