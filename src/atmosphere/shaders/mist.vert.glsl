// Instanced camera-facing soft quads.
// aPos = (x, y, z, seed); aSize = (width, height, alpha, kind: 0 mist / 1 cloud).
uniform float uTime;
attribute vec4 aPos;
attribute vec4 aSize;
attribute vec4 aDir; // (cos, sin) of the glen axis in the x/z plane
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
  vec4 cView = viewMatrix * vec4(c, 1.0);
  vDist = -cView.z;
  vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 camUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  // mist banks stretch along the glen axis (blended back to camera-facing when seen end-on); clouds are plain billboards
  vec3 axis = vec3(aDir.x, 0.0, aDir.y);
  float al = dot(axis, camRight);
  axis *= sign(al + 1e-4);
  float w = smoothstep(0.12, 0.6, abs(al)) * (1.0 - aSize.w);
  vec3 right = normalize(mix(camRight, axis, w));
  vec3 up = normalize(mix(camUp, vec3(0.0, 1.0, 0.0), 0.5 * (1.0 - aSize.w)));
  vec3 world = c + right * position.x * aSize.x + up * position.y * aSize.y;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  vUv = position.xy + 0.5;
  vData = vec4(s, aSize.z, aSize.w, 0.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
