/**
 * Olympus geometry (T06): pure builders, no React. Local space: origin at the island's plateau level
 * (landmark x/z, y = river + site.height), y up, units = display km.
 *
 * Canon: an artificial floating mountain "nearly a mile above the Argos" (p.370), snow-covered slopes, a
 * bone-pale citadel that "strikes up out of the mountain like a marble sword" (p.370), high balconies and stone
 * terraces, golden suites (pp.370-380), no doors and no dock (p.370). The rock underside, the terrace layout
 * and the satellite blades are invented; the silhouette follows the text.
 *
 * Four merged meshes: rock, marble, gold, glow (windows).
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rngFor } from '../kit';

export interface OlympusGeometry {
  rock: BufferGeometry;
  marble: BufferGeometry;
  gold: BufferGeometry;
  glow: BufferGeometry;
  tris: number;
}

const ROCK_HI = new Color('#76736f');
const ROCK_LO = new Color('#22201f');
const SNOW = new Color('#eef1f4');
const MARBLE = new Color('#eee8d8');
const GOLD = new Color('#dba93a');
const WINDOW = new Color('#ffc46a');

/** Depth of the rock below the plateau (km). */
export const ROCK_DEPTH = 2.0;
/** Height of the summit mound above the plateau rim (km). */
export const MOUND = 1.3;
/** Height of the summit shelf (fraction of MOUND) where the citadel is planted. */
export const SHELF = 0.95;

type Rng = () => number;

/** Make a part flat-shaded, colour it (per-face jitter + darker toward its own bottom) and move it into place. */
function prep(
  geo: BufferGeometry,
  m: Matrix4,
  color: Color,
  rng: Rng,
  ao = 0.18,
  vary = 0.05,
): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.deleteAttribute('uv');
  g.deleteAttribute('uv1');
  g.applyMatrix4(m);
  g.computeBoundingBox();
  const y0 = g.boundingBox!.min.y;
  const h = Math.max(1e-4, g.boundingBox!.max.y - y0);
  const pos = g.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i += 3) {
    const f = 1 + (rng() - 0.5) * 2 * vary;
    for (let k = 0; k < 3; k++) {
      const t = (pos.getY(i + k) - y0) / h;
      c.copy(color).multiplyScalar(f * (1 - ao * (1 - t)));
      col[(i + k) * 3] = c.r;
      col[(i + k) * 3 + 1] = c.g;
      col[(i + k) * 3 + 2] = c.b;
    }
  }
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  return g;
}

const _q = new Quaternion();
const _e = new Euler();
function mat(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): Matrix4 {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  return new Matrix4().compose(new Vector3(x, y, z), _q, new Vector3(sx, sy, sz));
}

// ---------------------------------------------------------------------------------------------------------------------
// Rock

function rockColor(y: number, rng: Rng, ny: number): Color {
  const s = Math.min(1, Math.max(0, -y / ROCK_DEPTH));
  const c = ROCK_HI.clone().lerp(ROCK_LO, Math.pow(s, 0.7));
  // strata banding + face jitter
  c.multiplyScalar(0.88 + 0.12 * Math.sin(y * 17.0) + (rng() - 0.5) * 0.18);
  // snow band on the upper slopes (year-round); winter extends it in the shader
  const line = -0.1 + (rng() - 0.5) * 0.26;
  const snow = Math.min(1, Math.max(0, (y - line) / 0.22)) * (ny > -0.3 ? 1 : 0.4);
  return c.lerp(SNOW, snow * 0.92);
}

function buildRock(rng: Rng, R: number): BufferGeometry[] {
  const N = 30;
  // profile: ledge rings, each followed by a recessed ring (layered strata)
  const ledges = 9;
  const rings: { y: number; r: number; ledge: boolean }[] = [];
  rings.push({ y: 0.03, r: R * 0.985, ledge: true }); // lip of the plateau
  const dy = (ROCK_DEPTH * 0.96) / ledges;
  for (let i = 0; i < ledges; i++) {
    const s = i / ledges;
    const yTop = -0.04 - s * ROCK_DEPTH * 0.96;
    const rr = R * Math.pow(1 - Math.pow(s, 1.5), 0.85);
    rings.push({ y: yTop, r: rr, ledge: true });
    rings.push({ y: yTop - dy * 0.55, r: rr * 0.9, ledge: false });
  }
  rings.push({ y: -ROCK_DEPTH, r: 0.02, ledge: false });

  const verts: Vector3[][] = rings.map((ring, ri) => {
    const row: Vector3[] = [];
    const last = ri === rings.length - 1;
    for (let k = 0; k < N; k++) {
      const a = ((k + (rng() - 0.5) * 0.7) / N) * Math.PI * 2;
      const j = last ? 1 : 1 + (rng() - 0.5) * (ring.ledge ? 0.34 : 0.2);
      const yy = ring.y + (last ? 0 : (rng() - 0.5) * 0.07);
      row.push(new Vector3(Math.cos(a) * ring.r * j, yy, Math.sin(a) * ring.r * j));
    }
    // the tip hangs slightly off-axis
    if (last) for (const v of row) v.add(new Vector3(0.12, 0, -0.08));
    return row;
  });

  const pos: number[] = [];
  const col: number[] = [];
  const ab = new Vector3();
  const ac = new Vector3();
  const tri = (a: Vector3, b: Vector3, c: Vector3) => {
    const n = ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize();
    const cy = (a.y + b.y + c.y) / 3;
    const base = rockColor(cy, rng, n.y);
    for (const v of [a, b, c]) {
      const cc = base.clone().multiplyScalar(1 - 0.08 * Math.min(1, Math.max(0, (cy - v.y) / 0.3)));
      pos.push(v.x, v.y, v.z);
      col.push(cc.r, cc.g, cc.b);
    }
  };
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      const a = verts[ri]![k]!;
      const b = verts[ri]![k2]!;
      const c = verts[ri + 1]![k]!;
      const d = verts[ri + 1]![k2]!;
      // outward-facing winding; alternate the diagonal for craggier facets
      if ((k + ri) % 2 === 0) {
        tri(a, c, b);
        tri(b, c, d);
      } else {
        tri(a, c, d);
        tri(a, d, b);
      }
    }
  }

  // summit: an irregular craggy peak with four ridges radiating from a small summit shelf for the citadel
  const topRings = [0.985, 0.88, 0.76, 0.64, 0.52, 0.4, 0.3, 0.2, 0.1, 0.0];
  const sstep = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const peakY = (f: number, a: number) => {
    const m = Math.pow(0.5 + 0.5 * Math.cos(4 * (a - 0.7) + 1.4 * Math.sin(2 * a + 0.5)), 1.4);
    const h = MOUND * Math.pow(1 - f, 1.15) * (0.4 + 0.85 * m);
    const w = 1 - sstep(0.14, 0.32, f);
    return 0.04 + h * (1 - w) + MOUND * SHELF * w;
  };
  const top: Vector3[][] = topRings.map((f, ri) => {
    const row: Vector3[] = [];
    const n = ri === topRings.length - 1 ? 1 : N;
    for (let k = 0; k < n; k++) {
      const a = (k / N) * Math.PI * 2;
      const rr = R * f * (1 + (ri === 0 ? 0 : (rng() - 0.5) * 0.16));
      const y = ri === 0 ? 0.03 : peakY(f, a) + (rng() - 0.5) * (f > 0.25 ? 0.26 : 0.04);
      row.push(new Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr));
    }
    return row;
  });
  const topTri = (a: Vector3, b: Vector3, c: Vector3) => {
    const n = ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize();
    // snow settles on gentle slopes, rock shows on the steep ones
    const rocky = Math.min(1, Math.max(0, (0.56 - n.y) / 0.2));
    const rock = ROCK_HI.clone().multiplyScalar(0.7 + rng() * 0.35);
    const base = SNOW.clone()
      .multiplyScalar(0.93 + rng() * 0.07)
      .lerp(rock, rocky);
    for (const v of [a, b, c]) {
      pos.push(v.x, v.y, v.z);
      col.push(base.r, base.g, base.b);
    }
  };
  for (let ri = 0; ri < topRings.length - 1; ri++) {
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      const a = top[ri]![k]!;
      const b = top[ri]![k2]!;
      if (ri === topRings.length - 2) {
        topTri(a, top[ri + 1]![0]!, b);
      } else {
        const c = top[ri + 1]![k]!;
        const d = top[ri + 1]![k2]!;
        if ((k + ri) % 2 === 0) {
          topTri(a, c, b);
          topTri(b, c, d);
        } else {
          topTri(a, c, d);
          topTri(a, d, b);
        }
      }
    }
  }

  const main = new BufferGeometry();
  main.setAttribute('position', new Float32BufferAttribute(pos, 3));
  main.setAttribute('color', new Float32BufferAttribute(col, 3));
  main.computeVertexNormals(); // non-indexed: flat facets
  const parts: BufferGeometry[] = [main];

  // hanging fragments below the island
  const frags: [number, number, number, number][] = [
    [1.05, -1.05, 0.5, 0.18],
    [-1.2, -1.45, -0.4, 0.14],
    [0.35, -1.9, 0.5, 0.1],
    [-0.5, -0.95, 1.05, 0.12],
    [0.7, -1.85, -0.25, 0.07],
    [-0.15, -1.95, 0.3, 0.05],
  ];
  for (const [fx, fy, fz, fr] of frags) {
    const s = 1 + (rng() - 0.5) * 0.3;
    parts.push(
      prep(
        new IcosahedronGeometry(fr, 0),
        mat(fx, fy, fz, rng() * 3, rng() * 6, rng() * 3, s, 1.35, s * 0.9),
        ROCK_LO.clone().lerp(ROCK_HI, 0.25),
        rng,
        0.3,
        0.12,
      ),
    );
  }
  return parts;
}

// ---------------------------------------------------------------------------------------------------------------------
// Citadel

/** Width of the main blade at height y above its base (tapering sword blade, pointed tip). */
function bladeWidth(y: number, H: number, w0: number, w1: number): number {
  const shoulder = H * 0.78;
  if (y <= shoulder) return w0 + (w1 - w0) * (y / shoulder);
  return w1 * Math.max(0, 1 - (y - shoulder) / (H - shoulder));
}

function bladeGeometry(H: number, w0: number, w1: number, thick: number): BufferGeometry {
  const sh = H * 0.78;
  const s = new Shape();
  s.moveTo(-w0 / 2, 0);
  s.lineTo(w0 / 2, 0);
  s.lineTo(w1 / 2, sh);
  s.lineTo(0, H);
  s.lineTo(-w1 / 2, sh);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  g.translate(0, 0, -thick / 2);
  return g;
}

interface Bucket {
  marble: BufferGeometry[];
  gold: BufferGeometry[];
  glow: BufferGeometry[];
}

function buildCitadel(rng: Rng, out: Bucket, baseY: number): void {
  const M = (g: BufferGeometry, m: Matrix4, ao = 0.16, vary = 0.035) =>
    out.marble.push(prep(g, m, MARBLE, rng, ao, vary));
  const G = (g: BufferGeometry, m: Matrix4) => out.gold.push(prep(g, m, GOLD, rng, 0.12, 0.05));
  const W = (g: BufferGeometry, m: Matrix4) => out.glow.push(prep(g, m, WINDOW, rng, 0, 0.12));
  const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);

  const yaw = 0.2; // the citadel is turned a little so the overview shows blade and profile together
  const root = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
    mat(0, baseY, 0, 0, yaw, 0).multiply(mat(x, y, z, rx, ry, rz));

  // plinth: broad octagonal foundation + gold collar (the sword's guard)
  M(new CylinderGeometry(0.42, 0.5, 0.14, 8), root(0, 0.0, 0), 0.3);
  // crossguard: a wide gold-trimmed terrace across the blade's base
  M(box(1.4, 0.05, 0.36), root(0, 0.12, 0), 0.25, 0.02);
  G(box(1.5, 0.03, 0.4), root(0, 0.16, 0));
  for (const sx of [-1, 1])
    G(new ConeGeometry(0.03, 0.08, 4), root(sx * 0.77, 0.16, 0, Math.PI / 4, 0, (-sx * Math.PI) / 2));

  // main blade
  const H = 2.15;
  const w0 = 0.5;
  const w1 = 0.28;
  const T = 0.17;
  M(bladeGeometry(H, w0, w1, T), root(0, 0.15, 0), 0.22);
  // spine ridge: a thin raised fin, giving the blade its sword section
  M(bladeGeometry(H * 0.97, 0.08, 0.05, T + 0.05), root(0, 0.15, 0), 0.05, 0.02);
  for (const by of [0.45, 0.95, 1.45]) {
    const w = bladeWidth(by, H, w0, w1);
    G(box(w + 0.012, 0.014, T + 0.012), root(0, 0.15 + by, 0));
  }
  G(new ConeGeometry(0.022, 0.2, 4), root(0, 0.15 + H + 0.08, 0, Math.PI / 4));

  // flanking blades (hilt-wing silhouette) and lesser blades
  const wings: [number, number, number, number, number][] = [
    // x, height, width, lean, thickness
    [-0.42, 0.42, 0.2, 0.12, 0.12],
    [0.42, 0.46, 0.2, -0.12, 0.12],
    [-0.72, 0.2, 0.18, 0.25, 0.1],
    [0.72, 0.22, 0.18, -0.25, 0.1],
  ];
  for (const [x, h, w, lean, t] of wings) {
    M(bladeGeometry(h, w, w * 0.7, t), root(x, 0.15, 0, 0, 0, lean), 0.25);
    G(
      new ConeGeometry(0.016, 0.15, 4),
      root(x - Math.sin(lean) * (h + 0.07), 0.15 + h + 0.07, 0, Math.PI / 4, 0, lean),
    );
    void t;
  }

  // dining hall and baths: small and low, clustered at the base
  M(box(0.55, 0.12, 0.2), root(0.05, 0.15 + 0.06, 0.4), 0.25);
  G(box(0.6, 0.025, 0.24), root(0.05, 0.15 + 0.13, 0.4));
  M(box(0.5, 0.1, 0.2), root(-0.05, 0.15 + 0.05, -0.4), 0.25);
  G(box(0.55, 0.025, 0.24), root(-0.05, 0.15 + 0.11, -0.4));

  // slender minarets
  const minarets: [number, number, number, number][] = [
    [-0.55, 0.3, 0.4, 0.022],
    [0.55, -0.3, 0.35, 0.02],
  ];
  for (const [x, z, h, r] of minarets) {
    M(new CylinderGeometry(r * 0.8, r, h, 6), root(x, 0.14 + h / 2, z), 0.25);
    G(new ConeGeometry(r * 1.5, h * 0.2, 6), root(x, 0.14 + h + h * 0.1, z));
  }

  // cantilevered terraces on both faces with gold rails, struts and small pavilions
  const terraces: [number, number, number, number, number][] = [
    // y above base, side (+1/-1), centre x, width, depth
    [0.7, 1, -0.05, 0.62, 0.36],
    [1.15, -1, 0.06, 0.5, 0.32],
    [1.55, 1, 0.04, 0.38, 0.26],
  ];
  for (const [ty, side, cx, tw, td] of terraces) {
    const y = 0.15 + ty;
    const zc = side * (T / 2 + td / 2 - 0.03);
    M(box(tw, 0.028, td), root(cx, y, zc), 0.1, 0.02);
    const zf = side * (T / 2 + td - 0.03 - 0.005);
    G(box(tw, 0.026, 0.008), root(cx, y + 0.04, zf));
    for (const s of [-1, 1]) G(box(0.008, 0.026, td - 0.03), root(cx + s * (tw / 2 - 0.004), y + 0.04, zc));
    for (let i = 0; i <= 4; i++) G(box(0.006, 0.04, 0.006), root(cx - tw / 2 + (tw * i) / 4, y + 0.02, zf));
    for (const s of [-1, 1])
      M(box(0.025, 0.1, td * 0.8), root(cx + s * tw * 0.36, y - 0.065, zc - side * td * 0.1), 0.4, 0.02);
    if (tw > 0.3) {
      M(box(tw * 0.38, 0.09, td * 0.4), root(cx + tw * 0.12, y + 0.059, zc + side * td * 0.1), 0.2);
      G(
        new ConeGeometry(tw * 0.3, 0.1, 4),
        root(cx + tw * 0.12, y + 0.16, zc + side * td * 0.1, Math.PI / 4),
      );
    }
  }

  // highest balcony: a round gold-railed disc jutting from the top of the blade
  M(new CylinderGeometry(0.085, 0.07, 0.025, 10), root(0, 0.15 + 1.8, T / 2 + 0.07), 0.1, 0.02);
  G(new CylinderGeometry(0.088, 0.088, 0.012, 10), root(0, 0.15 + 1.835, T / 2 + 0.07));

  // windows: warm specks on both faces of the main blade, wings and halls (no doors anywhere, p.370)
  const win = box(0.017, 0.03, 0.006);
  for (let wy = 0.22; wy < H - 0.25; wy += 0.075) {
    const w = bladeWidth(wy, H, w0, w1);
    const cols = Math.max(1, Math.floor(w / 0.075));
    for (let c = 0; c < cols; c++) {
      if (rng() < 0.4) continue;
      const x = (c - (cols - 1) / 2) * 0.062;
      for (const side of [-1, 1]) W(win, root(x, 0.15 + wy, side * (T / 2 + 0.003)));
    }
  }
  const win2 = box(0.014, 0.026, 0.006);
  for (const [x, h, w, lean, t] of wings) {
    for (let wy = 0.15; wy < h * 0.7; wy += 0.08) {
      if (rng() < 0.45) continue;
      for (const side of [-1, 1]) {
        W(
          win2,
          root(
            x - Math.sin(lean) * wy + (rng() - 0.5) * w * 0.4,
            0.15 + wy,
            side * (t / 2 + 0.003),
            0,
            0,
            lean,
          ),
        );
      }
    }
  }
  for (let i = 0; i < 9; i++) {
    for (const [hx, hz, hw, hy] of [
      [0.05, 0.4, 0.55, 0.12],
      [-0.05, -0.4, 0.5, 0.1],
    ] as const) {
      if (rng() < 0.3) continue;
      const x = hx + (i / 8 - 0.5) * (hw - 0.1);
      W(win2, root(x, 0.15 + hy * 0.5, hz + (hz > 0 ? 0.103 : -0.103)));
    }
  }
  for (let i = 0; i < 3; i++) W(box(0.02, 0.03, 0.006), root(-0.02 + i * 0.03, 0.15 + 1.77, T / 2 + 0.003));
}

// ---------------------------------------------------------------------------------------------------------------------

export function buildOlympus(radius: number): OlympusGeometry {
  const rng = rngFor('olympus');
  const rockParts = buildRock(rng, radius * 0.8);
  const out: Bucket = { marble: [], gold: [], glow: [] };
  buildCitadel(rng, out, 0.04 + MOUND * SHELF); // base of the citadel: the summit of the mound
  const merge = (parts: BufferGeometry[]) => {
    const g = mergeGeometries(parts, false);
    if (!g) throw new Error('olympus merge failed');
    for (const p of parts) p.dispose();
    return g;
  };
  const rock = merge(rockParts);
  const marble = merge(out.marble);
  const gold = merge(out.gold);
  const glow = merge(out.glow);
  const count = (g: BufferGeometry) => g.getAttribute('position').count / 3;
  return { rock, marble, gold, glow, tris: count(rock) + count(marble) + count(gold) + count(glow) };
}
