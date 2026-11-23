// Standing water: sea, loch, marsh pools. Depth / shore-distance come from a baked texture.
uniform float uTime;
uniform float uSeason;
uniform vec3 uSunDirection;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform vec3 uDeepS;
uniform vec3 uDeepW;
uniform vec3 uShallowS;
uniform vec3 uShallowW;
uniform vec3 uFoamS;
uniform vec3 uFoamW;
uniform vec3 uIce;
uniform vec3 uSnow;
uniform sampler2D uTex;
uniform vec4 uBox;        // minX, minZ, sizeX, sizeZ
uniform vec3 uRange;      // depthMax, distMax, edgeMax
uniform float uDepthRef;  // depth at which water is fully "deep"
uniform float uFreezeReach;
uniform float uFoamAmt;
uniform float uReed;
uniform float uAlpha;     // 1 opaque; <1 enables soft marsh edges
uniform vec4 uTint;       // rgb, mix amount (linear)
varying vec3 vWorld;
#include <fog_pars_fragment>
void main() {
  vec2 p = vWorld.xz;
  vec4 tx = texture2D(uTex, (p - uBox.xy) / uBox.zw);
  float depth = tx.r * uRange.x;
  float d = tx.g * uRange.y;       // km from the nearest ground
  float edgeIn = tx.b * uRange.z;  // km inside the body's polygon
  float tw = smoothstep(0.1, 0.9, uSeason);

  vec3 deep = mix(uDeepS, uDeepW, tw);
  vec3 shallow = mix(uShallowS, uShallowW, tw);
  vec3 foamCol = mix(uFoamS, uFoamW, tw);

  float alpha = 1.0;
  if (uAlpha < 1.0) {
    if (depth < 0.001) discard;
    alpha = uAlpha * smoothstep(0.0, 0.02, depth) * smoothstep(0.0, 0.35, edgeIn);
  }

  // gentle ripples
  vec2 w1 = p * 4.5 + vec2(uTime * 0.07, uTime * 0.05);
  float h0 = wNoise(w1);
  vec3 N = normalize(vec3((wNoise(w1 + vec2(0.08, 0.0)) - h0) * 1.1, 1.0, (wNoise(w1 + vec2(0.0, 0.08)) - h0) * 1.1));
  vec3 V = normalize(cameraPosition - vWorld);

  // depth colour
  float dn = clamp(max(depth / uDepthRef, smoothstep(0.0, uRange.y, d) * 0.95), 0.0, 1.0);
  vec3 col = mix(shallow, deep, smoothstep(0.0, 1.0, pow(dn, 0.65)));
  vec3 lagoon = shallow * vec3(1.05, 1.12, 1.06);
  col = mix(col, lagoon, (1.0 - smoothstep(0.0, 0.45, d)) * 0.45 * (1.0 - uReed));
  col *= 0.95 + 0.1 * wFbm(p * 1.6 + uTime * 0.012);
  col = mix(col, uTint.rgb, uTint.a);
  // reed-edge darkening
  float reed = (1.0 - smoothstep(0.0, 0.16, d)) * (0.55 + 0.45 * wNoise(p * 22.0));
  col = mix(col, vec3(0.07, 0.13, 0.09) * (1.0 + 0.5 * tw), reed * uReed);

  // fresnel sky tint + glints
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
  col = mix(col, mix(uFogColor, shallow, 0.2), clamp(fres * 0.6, 0.0, 0.7));
  vec3 R = reflect(-V, N);
  float glint = pow(max(dot(R, uSunDirection), 0.0), 140.0) * smoothstep(0.02, 0.3, depth);
  col += glint * uSunColor * 0.8;

  // shoreline foam bands that slowly breathe
  float wob = wNoise(p * 3.0 + vec2(uTime * 0.04, 0.0));
  float foam = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float c = 0.02 + 0.085 * fi + 0.02 * sin(uTime * 0.45 + fi * 2.1 + wob * 4.0);
    float wd = 0.02 - 0.0045 * fi;
    float band = smoothstep(wd, 0.0, abs(d - c));
    float lace = smoothstep(0.2, 0.62, wNoise(p * (13.0 + 3.0 * fi) + fi * 7.0 + uTime * 0.02));
    foam += band * mix(1.0, lace, min(fi, 1.0) * 0.8) * (1.0 - 0.3 * fi);
  }
  foam += smoothstep(0.03, 0.0, d) * 0.7;
  foam = clamp(foam, 0.0, 1.0) * uFoamAmt;

  // winter: ice grows from the shore inwards
  float nn = wFbm(p * 3.2);
  float front = tw * uFreezeReach + (nn - 0.5) * 0.22;
  float ice = (1.0 - smoothstep(-0.03, 0.03, d - front)) * smoothstep(0.0, 0.06, tw);
  col = mix(col, foamCol, foam * 0.85 * (1.0 - ice));
  vec3 iceCol = wIce(uIce, uSnow, p * 6.0, clamp(d / max(uFreezeReach, 0.1), 0.0, 1.0));
  float rim = smoothstep(0.1, 0.0, abs(d - front)) * smoothstep(0.0, 0.1, tw);
  iceCol = mix(iceCol, uSnow, rim * 0.5);
  col = mix(col, iceCol, ice);

  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
