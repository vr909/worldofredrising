// HEIGHT FOG chunk (T04). Reusable by any ShaderMaterial; built-in materials keep FogExp2.
//
// Usage in a fragment shader (after the final colour is computed, before tonemapping):
//
//   uniform vec3  uFogColor;         // sharedUniforms.uFogColor
//   uniform float uFogDensity;       // sharedUniforms.uFogDensity (per display km, squared form)
//   uniform float uHeightFogBase;    // world y (km) at/below which air is thickest; ~0.0
//   uniform float uHeightFogFalloff; // 1/km; ~0.9 -> thickness fades over roughly a kilometre of altitude
//   uniform float uHeightFogBoost;   // extra density multiplier in the valley floor; ~1.2
//   varying vec3  vWorldPos;
//   ...
//   // paste this file's contents (import src from './heightFog.glsl?raw'), then:
//   gl_FragColor.rgb = applyHeightFog(gl_FragColor.rgb, vWorldPos, cameraPosition);
//
// Model: distance fog exp(-(d*k)^2) with k = uFogDensity * (0.75 + boost * 0.35 * h), where h in [0,1] is
// an altitude falloff of the mid point between camera and fragment, so low valleys are thicker than
// ridges and the canyon rim stays crisp. At h = 0 and boost = 1.2 it is roughly FogExp2 * 1.17.
float heightFogFactor(vec3 worldPos, vec3 camPos) {
  float d = distance(worldPos, camPos);
  float midY = 0.5 * (worldPos.y + camPos.y);
  float h = exp(-max(midY - uHeightFogBase, 0.0) * uHeightFogFalloff);
  float k = uFogDensity * (0.75 + uHeightFogBoost * 0.35 * h);
  return 1.0 - exp(-k * k * d * d);
}
vec3 applyHeightFog(vec3 color, vec3 worldPos, vec3 camPos) {
  return mix(color, uFogColor, clamp(heightFogFactor(worldPos, camPos), 0.0, 1.0));
}
