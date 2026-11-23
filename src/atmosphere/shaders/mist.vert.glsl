// Instanced camera-facing soft quads.
// aPos = (x, y, z, seed); aSize = (width, height, alpha, kind: 0 mist / 1 cloud).
uniform float uTime;
attribute vec4 aPos;
attribute vec4 aSize;
varying vec2 vUv;
varying vec4 vData;
varying float vDist;
#include <fog_pars_vertex>
void main() {
  float s = aPos.w;
  float drift = mix(1.0, 0.35, aSize.w); // clouds drift slower than mist
  vec3 c = aPos.xyz + vec3(
    sin(uTime * 0.045 + s * 40.0) * 0.55 * drift,
    sin(uTime * 0.03 + s * 17.0) * 0.04 * drift,
    cos(uTime * 0.038 + s * 29.0) * 0.4 * drift);
  vec4 mvPosition = viewMatrix * vec4(c, 1.0);
  vDist = -mvPosition.z;
  mvPosition.xy += position.xy * aSize.xy;
  vUv = position.xy + 0.5;
  vData = vec4(s, aSize.z, aSize.w, 0.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
