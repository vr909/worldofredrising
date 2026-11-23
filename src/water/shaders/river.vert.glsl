attribute float aLen;
attribute float aWid;
attribute float aMouth;
varying vec2 vUv;
varying float vLen;
varying float vWid;
varying float vMouth;
varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vLen = aLen;
  vWid = aWid;
  vMouth = aMouth;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
