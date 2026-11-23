uniform float uTime;
uniform vec3 uMistColor;
uniform vec3 uCloudLit;
uniform vec3 uCloudShade;
varying vec2 vUv;
varying vec4 vData;
varying float vDist;
#include <fog_pars_fragment>

// NOISE

void main() {
  float seed = vData.x;
  float kind = vData.z;
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float radial = 1.0 - smoothstep(0.2, 1.0, r);
  vec2 q = p * 1.5 + vec2(seed * 31.0, seed * 11.0) + vec2(uTime * 0.02, -uTime * 0.012) * mix(1.0, 0.4, kind);
  float n = aFbm(q);
  float n2 = aFbm(q * 2.3 + 5.0);
  float shape = smoothstep(0.1, 0.8, n * 0.75 + n2 * 0.4);
  float a = radial * shape;
  // soft lower edge: quads never show a hard line against the ground
  a *= mix(smoothstep(0.0, 0.45, vUv.y), smoothstep(0.0, 0.25, vUv.y), kind);
  // fade when the camera is close
  a *= mix(smoothstep(0.4, 2.8, vDist), smoothstep(1.0, 5.0, vDist), kind) * vData.y;
  if (a < 0.003) discard;
  vec3 mistCol = uMistColor * (0.92 + 0.08 * n);
  vec3 cloudCol = mix(uCloudShade, uCloudLit, smoothstep(0.1, 0.9, vUv.y + (n - 0.5) * 0.35));
  gl_FragColor = vec4(mix(mistCol, cloudCol, kind), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
