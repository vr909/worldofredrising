/**
 * Procedural low-poly species geometry (T07): stylised, slightly tall and slim (.37g), 8-40 triangles each.
 * Authored in display km with the origin at the foot of the plant. Everything is non-indexed with hand-written
 * normals (rounded crowns, soft cones) and vertex colours = species colour x shade (darker underside, lighter top).
 *
 * Extra per-vertex attribute `aMeta` (vec3), read by the material (material.ts):
 *   x = height fraction 0..1 within the plant (wind sway grows with it),
 *   y = foliage flag (1 = leaves/needles, 0 = trunk/posts): winter bare-down and tint apply to foliage only,
 *   z = snow weight (conifer tier tops hold snow in winter).
 */
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  OctahedronGeometry,
} from 'three';
import { SUMMER } from '../render/palette';
import type { SpeciesId } from './scatter';

type V3 = [number, number, number];

class Builder {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  meta: number[] = [];
  constructor(private readonly height: number) {}

  vert(p: V3, n: V3, rgb: Color, shade: number, foliage: number, snow: number) {
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0] / l, n[1] / l, n[2] / l);
    this.col.push(rgb.r * shade, rgb.g * shade, rgb.b * shade);
    this.meta.push(Math.min(1, Math.max(0, p[1] / this.height)), foliage, snow);
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3));
    g.setAttribute('aMeta', new Float32BufferAttribute(this.meta, 3));
    return g;
  }
}

const TRUNK = new Color('#5b4733');
const col = (hex: string) => new Color(hex);

/** Hash a position to a stable 0..1 so shared corners of a lumpy crown stay together. */
function hashV(x: number, y: number, z: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.19) * 43758.5453;
  return s - Math.floor(s);
}

/** Tapered prism (trunk, post): n sides, bottom radius r0 at y0, top radius r1 at y1. */
function prism(
  b: Builder,
  n: number,
  r0: number,
  r1: number,
  y0: number,
  y1: number,
  rgb: Color,
  cx = 0,
  cz = 0,
) {
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const p00: V3 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0];
    const p10: V3 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
    const p01: V3 = [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1];
    const p11: V3 = [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1];
    const n0: V3 = [Math.cos(a0), 0.1, Math.sin(a0)];
    const n1: V3 = [Math.cos(a1), 0.1, Math.sin(a1)];
    b.vert(p00, n0, rgb, 0.7, 0, 0);
    b.vert(p10, n1, rgb, 0.7, 0, 0);
    b.vert(p11, n1, rgb, 1, 0, 0);
    b.vert(p00, n0, rgb, 0.7, 0, 0);
    b.vert(p11, n1, rgb, 1, 0, 0);
    b.vert(p01, n0, rgb, 1, 0, 0);
  }
}

/** A cone tier: skirt ring of radius r at y0, apex at y0 + h. Cone normals tilt up so crowns light softly. */
function cone(
  b: Builder,
  seg: number,
  r: number,
  y0: number,
  h: number,
  rgb: Color,
  rot: number,
  shade0: number,
  shade1: number,
) {
  const k = r / h;
  for (let i = 0; i < seg; i++) {
    const a0 = rot + (i / seg) * Math.PI * 2;
    const a1 = rot + ((i + 1) / seg) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    const p0: V3 = [Math.cos(a0) * r, y0, Math.sin(a0) * r];
    const p1: V3 = [Math.cos(a1) * r, y0, Math.sin(a1) * r];
    const apex: V3 = [0, y0 + h, 0];
    const n = (a: number): V3 => [Math.cos(a), k * 0.9 + 0.35, Math.sin(a)];
    b.vert(p0, n(a0), rgb, shade0, 1, 0.3);
    b.vert(p1, n(a1), rgb, shade0, 1, 0.3);
    b.vert(apex, n(am), rgb, shade1, 1, 1);
  }
}

/** A lumpy rounded crown from a low-poly polyhedron; normals follow the ellipsoid so it shades like a puff. */
function blob(
  b: Builder,
  shape: 'ico' | 'octa',
  c: V3,
  radii: V3,
  rgb: Color,
  seed: number,
  lump = 0.18,
  shadeLo = 0.56,
  shadeHi = 0.98,
) {
  const g = shape === 'ico' ? new IcosahedronGeometry(1, 0) : new OctahedronGeometry(1, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    const l = Math.hypot(x, y, z);
    x /= l;
    y /= l;
    z /= l;
    const j = 1 + (hashV(x, y, z, seed) - 0.5) * 2 * lump;
    const q: V3 = [c[0] + x * radii[0] * j, c[1] + y * radii[1] * j, c[2] + z * radii[2] * j];
    // normal of an ellipsoid, nudged upward for a sky-lit top
    const nrm: V3 = [x / radii[0], y / radii[1] + 0.35, z / radii[2]];
    const t = (y + 1) / 2; // 0 underside .. 1 top
    b.vert(q, nrm, rgb, shadeLo + (shadeHi - shadeLo) * t * t * (3 - 2 * t), 1, 0);
  }
  g.dispose();
}

function conifer(): BufferGeometry {
  const H = 0.27;
  const b = new Builder(H);
  const c = col(SUMMER.foliage.conifer);
  prism(b, 3, 0.011, 0.007, 0, 0.05, TRUNK);
  cone(b, 7, 0.06, 0.035, 0.115, c, 0.3, 0.66, 1.0);
  cone(b, 7, 0.048, 0.1, 0.1, c, 0.9, 0.72, 1.06);
  cone(b, 6, 0.034, 0.17, 0.1, c, 0.1, 0.78, 1.16);
  return b.build();
}

function broadleaf(): BufferGeometry {
  const H = 0.23;
  const b = new Builder(H);
  const c = col(SUMMER.foliage.broadleaf);
  prism(b, 3, 0.014, 0.009, 0, 0.07, TRUNK);
  blob(b, 'ico', [0, 0.12, 0], [0.062, 0.078, 0.062], c, 1);
  blob(b, 'octa', [0.022, 0.185, 0.012], [0.04, 0.045, 0.04], c, 2, 0.12, 0.66, 1.0);
  return b.build();
}

function olive(): BufferGeometry {
  const H = 0.11;
  const b = new Builder(H);
  const c = col(SUMMER.foliage.olive);
  prism(b, 3, 0.016, 0.01, 0, 0.04, TRUNK);
  blob(b, 'ico', [0, 0.07, 0], [0.08, 0.042, 0.072], c, 3, 0.22, 0.62, 1.12);
  blob(b, 'octa', [0.028, 0.09, -0.018], [0.04, 0.03, 0.035], c, 4, 0.12, 0.8, 1.18);
  return b.build();
}

function orchard(): BufferGeometry {
  const H = 0.11;
  const b = new Builder(H);
  const c = col('#6f8f48'); // a touch fresher and lighter than wild broadleaf
  prism(b, 3, 0.012, 0.009, 0, 0.04, TRUNK);
  blob(b, 'ico', [0, 0.07, 0], [0.043, 0.045, 0.043], c, 5, 0.1, 0.62, 1.12);
  return b.build();
}

/** One vine-row segment along local +x: a tapered hedge on two posts. */
function vine(): BufferGeometry {
  const H = 0.05;
  const b = new Builder(H);
  const c = col('#6f8a3c');
  const hl = 0.065;
  const wb = 0.016;
  const wt = 0.009;
  const ht = 0.036;
  const quad = (a: V3, bb: V3, cc: V3, d: V3, n: V3, s0: number, s1: number, foliage = 1) => {
    b.vert(a, n, c, s0, foliage, 0);
    b.vert(bb, n, c, s0, foliage, 0);
    b.vert(cc, n, c, s1, foliage, 0);
    b.vert(a, n, c, s0, foliage, 0);
    b.vert(cc, n, c, s1, foliage, 0);
    b.vert(d, n, c, s1, foliage, 0);
  };
  // +z side, -z side, top
  quad([-hl, 0, wb], [hl, 0, wb], [hl, ht, wt], [-hl, ht, wt], [0, 0.4, 1], 0.6, 1);
  quad([hl, 0, -wb], [-hl, 0, -wb], [-hl, ht, -wt], [hl, ht, -wt], [0, 0.4, -1], 0.6, 1);
  quad([-hl, ht, wt], [hl, ht, wt], [hl, ht, -wt], [-hl, ht, -wt], [0, 1, 0], 1.12, 1.12);
  prism(b, 3, 0.004, 0.003, 0, H, TRUNK, -hl, 0);
  prism(b, 3, 0.004, 0.003, 0, H, TRUNK, hl, 0);
  return b.build();
}

/** A reed clump: seven blades fanning out, double-sided in the material. */
function reed(): BufferGeometry {
  const H = 0.09;
  const b = new Builder(H);
  const c = col('#7f9657');
  const blades = 7;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + hashV(i, 1, 2, 9) * 0.8;
    const lean = 0.012 + hashV(i, 2, 3, 9) * 0.02;
    const h = 0.06 + hashV(i, 3, 4, 9) * 0.03;
    const r = 0.004 + hashV(i, 4, 5, 9) * 0.01;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    const w = 0.006;
    const px = -Math.sin(a) * w;
    const pz = Math.cos(a) * w;
    const n: V3 = [Math.cos(a), 0.5, Math.sin(a)];
    b.vert([cx - px, 0, cz - pz], n, c, 0.6, 1, 0);
    b.vert([cx + px, 0, cz + pz], n, c, 0.6, 1, 0);
    b.vert([cx + Math.cos(a) * lean, h, cz + Math.sin(a) * lean], n, c, 1.15, 1, 0);
  }
  return b.build();
}

export function buildSpeciesGeometry(id: SpeciesId): BufferGeometry {
  switch (id) {
    case 'conifer':
      return conifer();
    case 'broadleaf':
      return broadleaf();
    case 'olive':
      return olive();
    case 'orchard':
      return orchard();
    case 'vine':
      return vine();
    case 'reed':
      return reed();
  }
}

/** Triangles per species, for reports and tests. */
export function triangleCount(g: BufferGeometry): number {
  return g.getAttribute('position').count / 3;
}
