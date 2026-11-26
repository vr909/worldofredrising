uniform sampler2D uAtlas;
uniform float uSeason;
uniform vec2 uGrid;       // atlas columns, rows
varying vec2 vUv;
varying float vCell;
varying float vShade;
#include <fog_pars_fragment>
void main() {
  // swallow-tail notch cut from the hem
  float tail = 0.2 * (1.0 - abs(2.0 * vUv.x - 1.0));
  if (vUv.y < tail) discard;

  float col = mod(vCell, uGrid.x);
  float row = floor(vCell / uGrid.x);
  vec2 inset = vec2(0.5) / vec2(128.0, 256.0);  // keep samples inside the cell
  vec2 cuv = clamp(vUv, inset, 1.0 - inset);
  vec2 auv = vec2((col + cuv.x) / uGrid.x, 1.0 - (row + 1.0 - cuv.y) / uGrid.y);
  vec3 c = texture2D(uAtlas, auv).rgb * vShade;

  // winter: a thin dusting of snow along the top edge
  float tw = smoothstep(0.15, 0.85, uSeason);
  float dust = smoothstep(0.935 - 0.03 * sin(vUv.x * 23.0), 0.99, vUv.y) * tw;
  c = mix(c, vec3(0.9, 0.93, 0.96), dust * 0.85);

  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
