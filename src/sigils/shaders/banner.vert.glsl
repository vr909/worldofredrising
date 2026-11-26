// House banners: one instanced quad per pole. Cylindrical billboard (always faces the camera around Y) so the
// sigil is never mirrored, a flag-like wave stronger at the free (bottom) edge, and distance-driven oversizing so
// banners still read as small bright flags from the overview (legibility over literalism, DESIGN §1).
attribute vec4 aAnchor;   // xyz = pole top (world), w = banner height at close range (km)
attribute vec2 aInfo;     // x = atlas cell, y = 1 for small turret banners (fade out when far)
uniform float uTime;
uniform float uFar;       // screen-size factor: banner height >= uFar * camera distance
uniform float uAspect;    // width / height
varying vec2 vUv;
varying float vCell;
varying float vShade;
#include <fog_pars_vertex>
void main() {
  vec3 anchor = aAnchor.xyz;
  float h0 = aAnchor.w;
  vec3 toCam = cameraPosition - anchor;
  float dist = length(toCam);
  float k = max(1.0, dist * uFar / h0);
  k *= mix(1.0, 1.0 - smoothstep(14.0, 34.0, dist), aInfo.y);
  float h = h0 * k;
  float w = h * uAspect;

  vec3 hz = vec3(toCam.x, 0.0, toCam.z);
  float fl = length(hz);
  vec3 face = fl > 1e-4 ? hz / fl : vec3(0.0, 0.0, 1.0);
  vec3 right = vec3(face.z, 0.0, -face.x);

  float fr = 1.0 - uv.y;                       // 0 at the pole, 1 at the hem
  float phase = anchor.x * 7.3 + anchor.z * 5.1;
  float t = uTime * 2.6 + phase;
  float wave = sin(fr * 5.5 - t) + 0.45 * sin(fr * 11.0 - t * 1.7 + 1.3);
  float amp = (0.04 + 0.2 * fr * fr) * h * 0.55;
  vec3 world = anchor
    + vec3(0.0, -h0 + uv.y * h, 0.0)
    + right * ((uv.x - 0.5) * w + amp * 0.35 * sin(fr * 4.0 - t * 0.9 + 0.6) * fr)
    + face * (amp * wave * 0.6);
  vShade = 1.0 + 0.16 * cos(fr * 5.5 - t) * fr + 0.05 * (uv.x - 0.5);
  vUv = uv;
  vCell = aInfo.x;

  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
  vFogDepth *= 0.3; // banners punch through haze so each House stays spottable
}
