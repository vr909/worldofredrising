/**
 * Castle kit (T05): modular procedural parts, built in castle-local space and merged into three geometries
 * (stone / roof / trim) per landmark. No React here; everything is pure and testable.
 *
 * Space: the castle group sits at the landmark position and is rotated by -facingDeg about Y, so castle-local
 * -z is the gate direction. Local +x is therefore to the LEFT of someone standing outside the gate looking in
 * ... (north for a west-facing gate). Y is ABSOLUTE world height (km), so parts can sit on sloping ground.
 * A sub-frame stack (push/pop) lets recipes build a part in its own (u, v) plan axes.
 *
 * Scale (DESIGN §4): landmarks are ~4x true size; vertical features are exaggerated a little more for legibility.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Matrix4,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Heightfield } from '../terrain/heightfield';
import type { Landmark } from '../world/types';

export type Bucket = 'stone' | 'roof' | 'trim';
export type P = readonly [number, number];

export interface PartOpts {
  /** Darkness at the bottom of the part (1 = none). Default 0.78. */
  ao?: number;
  /** Per-part brightness jitter. Default 0.07. */
  vary?: number;
}

const DARK = new Color('#1c1612');

/** Deterministic RNG (mulberry32) so castles look identical on every load. */
export function rngFor(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Frame {
  ou: number;
  ov: number;
  f: number;
}

const m4 = new Matrix4();
const v3 = new Vector3();

export class Kit {
  readonly parts: Record<Bucket, BufferGeometry[]> = { stone: [], roof: [], trim: [] };
  readonly rng: () => number;
  /** World position of the castle origin and rotation (castle-local -> world). */
  readonly px: number;
  readonly pz: number;
  private readonly ca: number;
  private readonly sa: number;
  private stack: Frame[] = [{ ou: 0, ov: 0, f: 0 }];

  constructor(
    readonly hf: Heightfield,
    readonly lm: Landmark,
  ) {
    this.rng = rngFor(lm.id);
    this.px = lm.position[0];
    this.pz = lm.position[1];
    const a = (-lm.facingDeg * Math.PI) / 180;
    this.ca = Math.cos(a);
    this.sa = Math.sin(a);
  }

  // ---------------------------------------------------------------- frames & ground
  private get fr(): Frame {
    return this.stack[this.stack.length - 1]!;
  }

  /** Enter a sub-frame: origin (u, v) in the current frame, rotated by f about Y. */
  push(u: number, v: number, f = 0): void {
    const c = this.fr;
    const cf = Math.cos(c.f);
    const sf = Math.sin(c.f);
    this.stack.push({ ou: c.ou + u * cf + v * sf, ov: c.ov - u * sf + v * cf, f: c.f + f });
  }
  pop(): void {
    this.stack.pop();
  }
  /** Run fn in a sub-frame. */
  at(u: number, v: number, f: number, fn: () => void): void {
    this.push(u, v, f);
    fn();
    this.pop();
  }
  /** Frame rotation that makes the sub-frame's -z axis point along castle-local direction n. */
  static faceOut(nx: number, nz: number): number {
    return Math.atan2(-nx, -nz);
  }

  /** current-frame (u, v) -> castle-local x */
  lx(u: number, v: number): number {
    const c = this.fr;
    return c.ou + u * Math.cos(c.f) + v * Math.sin(c.f);
  }
  lz(u: number, v: number): number {
    const c = this.fr;
    return c.ov - u * Math.sin(c.f) + v * Math.cos(c.f);
  }
  /** Ground height (world y) at current-frame (u, v). */
  gy(u: number, v: number): number {
    const x = this.lx(u, v);
    const z = this.lz(u, v);
    return this.hf.heightAt(this.px + x * this.ca + z * this.sa, this.pz - x * this.sa + z * this.ca);
  }
  /** Ground height at castle-local (x, z), ignoring sub-frames. */
  gyLocal(x: number, z: number): number {
    return this.hf.heightAt(this.px + x * this.ca + z * this.sa, this.pz - x * this.sa + z * this.ca);
  }
  /** Lowest ground under a ring of radius r (or a point when r = 0). */
  groundMin(u: number, v: number, r: number, n = 8): number {
    let m = this.gy(u, v);
    if (r <= 0) return m;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      m = Math.min(m, this.gy(u + Math.cos(a) * r, v + Math.sin(a) * r));
    }
    return m;
  }
  /** Highest ground under a ring. */
  groundMax(u: number, v: number, r: number, n = 8): number {
    let m = this.gy(u, v);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      m = Math.max(m, this.gy(u + Math.cos(a) * r, v + Math.sin(a) * r));
    }
    return m;
  }

  // ---------------------------------------------------------------- core placement
  /** Transform geo into castle space, bake vertex colours (AO + variation), and add to a bucket. */
  place(
    bucket: Bucket,
    geo: BufferGeometry,
    u: number,
    y: number,
    v: number,
    rot: number,
    color: Color,
    o: PartOpts = {},
  ): void {
    const c = this.fr;
    m4.makeRotationY(rot + c.f);
    m4.setPosition(v3.set(this.lx(u, v), y, this.lz(u, v)));
    geo.applyMatrix4(m4);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.deleteAttribute('uv');
    const pos = g.getAttribute('position');
    const n = pos.count;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const yy = pos.getY(i);
      if (yy < y0) y0 = yy;
      if (yy > y1) y1 = yy;
    }
    const span = Math.max(1e-6, y1 - y0);
    const ao0 = o.ao ?? 0.78;
    const jit = 1 + (this.rng() - 0.5) * 2 * (o.vary ?? 0.07);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = Math.min(1, ((pos.getY(i) - y0) / span) * 3);
      const k = (ao0 + (1 - ao0) * (t * t * (3 - 2 * t))) * jit;
      col[i * 3] = color.r * k;
      col[i * 3 + 1] = color.g * k;
      col[i * 3 + 2] = color.b * k;
    }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    this.parts[bucket].push(g);
  }

  // ---------------------------------------------------------------- primitives
  box(
    b: Bucket,
    u: number,
    v: number,
    w: number,
    d: number,
    y0: number,
    y1: number,
    rot: number,
    c: Color,
    o?: PartOpts,
  ): void {
    if (y1 <= y0) return;
    this.place(b, new BoxGeometry(w, y1 - y0, d), u, (y0 + y1) / 2, v, rot, c, o);
  }

  cyl(
    b: Bucket,
    u: number,
    v: number,
    rBot: number,
    rTop: number,
    y0: number,
    y1: number,
    seg: number,
    c: Color,
    o?: PartOpts,
  ): void {
    if (y1 <= y0) return;
    this.place(b, new CylinderGeometry(rTop, rBot, y1 - y0, seg, 1), u, (y0 + y1) / 2, v, 0, c, o);
  }

  cone(
    b: Bucket,
    u: number,
    v: number,
    r: number,
    y0: number,
    h: number,
    seg: number,
    c: Color,
    o?: PartOpts,
  ): void {
    this.place(b, new ConeGeometry(r, h, seg, 1), u, y0 + h / 2, v, 0, c, o);
  }

  /** Square-based pyramid; s = half side of the base. */
  pyramid(
    b: Bucket,
    u: number,
    v: number,
    s: number,
    y0: number,
    h: number,
    rot: number,
    c: Color,
    o?: PartOpts,
  ): void {
    this.place(b, new ConeGeometry(s * Math.SQRT2, h, 4, 1), u, y0 + h / 2, v, rot + Math.PI / 4, c, o);
  }

  dome(b: Bucket, u: number, v: number, r: number, y0: number, h: number, c: Color, o?: PartOpts): void {
    const g = new SphereGeometry(r, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, h / r, 1);
    this.place(b, g, u, y0, v, 0, c, o);
  }

  /** Flat disc / paving slab lying just above the ground. */
  disc(b: Bucket, u: number, v: number, r: number, y: number, seg: number, c: Color, thick = 0.004): void {
    this.place(b, new CylinderGeometry(r, r, thick, seg, 1), u, y + thick / 2, v, 0, c, {
      ao: 1,
      vary: 0.04,
    });
  }

  /** Thin dark slit / opening on a vertical face; out = direction angle (about Y) of the face normal. */
  slit(u: number, v: number, y: number, out: number, w = 0.007, h = 0.028): void {
    const nx = Math.sin(out);
    const nz = Math.cos(out);
    this.place('trim', new BoxGeometry(w, h, 0.01), u + nx * 0.002, y, v + nz * 0.002, out, DARK, {
      ao: 1,
      vary: 0,
    });
  }

  /** Arched doorway (dark), face pointing along `out` (angle about Y of the outward normal). */
  arch(u: number, v: number, w: number, h: number, y0: number, out: number, c: Color = DARK): void {
    const s = new Shape();
    const r = w / 2;
    s.moveTo(-r, 0);
    s.lineTo(-r, h - r);
    s.absarc(0, h - r, r, Math.PI, 0, true);
    s.lineTo(r, 0);
    s.closePath();
    const g = new ShapeGeometry(s, 8);
    this.place('trim', g, u + Math.sin(out) * 0.003, y0, v + Math.cos(out) * 0.003, out, c, {
      ao: 1,
      vary: 0,
    });
  }

  /** Vertical disc facing `out` (round window / rose). */
  roundel(u: number, v: number, r: number, y: number, out: number, c: Color = DARK): void {
    this.place(
      'trim',
      new CircleGeometry(r, 10),
      u + Math.sin(out) * 0.002,
      y,
      v + Math.cos(out) * 0.002,
      out,
      c,
      {
        ao: 1,
        vary: 0,
      },
    );
  }

  /** Arbitrary triangle soup (flat shaded). Triangles are wound to face away from `inside`. */
  tris(
    b: Bucket,
    verts: number[][],
    inside: readonly [number, number, number],
    c: Color,
    o?: PartOpts,
  ): void {
    const arr: number[] = [];
    for (const t of verts) {
      const a = [t[0]!, t[1]!, t[2]!];
      const bb = [t[3]!, t[4]!, t[5]!];
      const cc = [t[6]!, t[7]!, t[8]!];
      const e1 = [bb[0]! - a[0]!, bb[1]! - a[1]!, bb[2]! - a[2]!];
      const e2 = [cc[0]! - a[0]!, cc[1]! - a[1]!, cc[2]! - a[2]!];
      const nx = e1[1]! * e2[2]! - e1[2]! * e2[1]!;
      const ny = e1[2]! * e2[0]! - e1[0]! * e2[2]!;
      const nz = e1[0]! * e2[1]! - e1[1]! * e2[0]!;
      const cx = (a[0]! + bb[0]! + cc[0]!) / 3 - inside[0];
      const cy = (a[1]! + bb[1]! + cc[1]!) / 3 - inside[1];
      const cz = (a[2]! + bb[2]! + cc[2]!) / 3 - inside[2];
      const flip = nx * cx + ny * cy + nz * cz < 0;
      arr.push(...a, ...(flip ? cc : bb), ...(flip ? bb : cc));
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    this.place(b, g, 0, 0, 0, 0, c, o);
  }

  // ---------------------------------------------------------------- composite parts
  /**
   * Crenellated curtain wall along a polyline of (u, v) points. topY is the absolute wall-top height; the wall
   * foots itself into the ground along its whole length (it is cut into short pieces and each sinks to the lowest
   * ground under it), so it stands ON a cliff edge or ramp instead of floating.
   */
  wall(
    pts: readonly P[],
    o: {
      topY: number;
      th?: number;
      stone: Color;
      trim: Color;
      merlons?: boolean;
      sink?: number;
      inner?: boolean;
    },
  ): void {
    const th = o.th ?? 0.045;
    const sink = o.sink ?? 0.03;
    for (let i = 0; i < pts.length - 1; i++) {
      const A = pts[i]!;
      const B = pts[i + 1]!;
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 1e-4) continue;
      const n = Math.max(1, Math.ceil(L / 0.08));
      const dx = (B[0] - A[0]) / L;
      const dz = (B[1] - A[1]) / L;
      const rot = -Math.atan2(dz, dx);
      const nxp = -dz;
      const nzp = dx;
      for (let j = 0; j < n; j++) {
        const t0 = j / n;
        const t1 = (j + 1) / n;
        const ax = A[0] + (B[0] - A[0]) * t0;
        const az = A[1] + (B[1] - A[1]) * t0;
        const bx = A[0] + (B[0] - A[0]) * t1;
        const bz = A[1] + (B[1] - A[1]) * t1;
        const cx = (ax + bx) / 2;
        const cz = (az + bz) / 2;
        const len = (L / n) * 1.04;
        let bottom = Infinity;
        for (const [px, pz] of [
          [ax, az],
          [bx, bz],
          [cx, cz],
        ] as const) {
          for (const off of [-th * 0.6, 0, th * 0.6])
            bottom = Math.min(bottom, this.gy(px + nxp * off, pz + nzp * off));
        }
        bottom -= sink;
        this.box('stone', cx, cz, len, th, bottom, o.topY, rot, o.stone, { ao: 0.7 });
        // corbel band under the parapet
        this.box('trim', cx, cz, len, th + 0.012, o.topY - 0.014, o.topY - 0.005, rot, o.trim, {
          ao: 1,
          vary: 0.04,
        });
        if (o.merlons !== false) {
          const m = Math.max(1, Math.floor(len / 0.03));
          const rows = o.inner === false ? [1] : [1, -1];
          for (let q = 0; q < m; q++) {
            const s = ((q + 0.5) / m - 0.5) * len * 0.96;
            for (const side of rows) {
              const off = side * (th / 2 - 0.004);
              this.box(
                'stone',
                cx + dx * s + nxp * off,
                cz + dz * s + nzp * off,
                0.015,
                0.008,
                o.topY,
                o.topY + 0.014,
                rot,
                o.stone,
                { ao: 0.9, vary: 0.05 },
              );
            }
          }
        }
      }
    }
  }

  /** Ring of merlons around a circle (tower or drum top). */
  merlonRing(u: number, v: number, r: number, y: number, c: Color, h = 0.014): void {
    const n = Math.max(6, Math.round((Math.PI * 2 * r) / 0.026));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.box(
        'stone',
        u + Math.cos(a) * r,
        v + Math.sin(a) * r,
        0.015,
        0.009,
        y,
        y + h,
        -a - Math.PI / 2,
        c,
        {
          ao: 0.9,
          vary: 0.05,
        },
      );
    }
  }

  /** Round tower rising to topY with an optional cone/dome roof or crenellated top. */
  tower(
    u: number,
    v: number,
    r: number,
    topY: number,
    o: {
      stone: Color;
      roofC?: Color;
      trim: Color;
      roof?: 'cone' | 'dome' | 'crenel' | 'flat';
      roofH?: number;
      sink?: number;
      slits?: number;
      seg?: number;
    },
  ): void {
    const bottom = this.groundMin(u, v, r * 1.1) - (o.sink ?? 0.03);
    const seg = o.seg ?? 12;
    this.cyl('stone', u, v, r * 1.1, r, bottom, topY, seg, o.stone, { ao: 0.68 });
    this.cyl('trim', u, v, r * 1.22, r * 1.12, topY - 0.02, topY, seg, o.trim, { ao: 1, vary: 0.03 });
    const roof = o.roof ?? 'cone';
    const roofC = o.roofC ?? o.stone;
    if (roof === 'cone') {
      const h = o.roofH ?? r * 3.2;
      this.cone('roof', u, v, r * 1.38, topY, h, seg, roofC, { ao: 0.82 });
      this.cyl('trim', u, v, 0.005, 0.003, topY + h, topY + h + 0.03, 4, o.trim, { ao: 1 });
    } else if (roof === 'dome') {
      this.dome('roof', u, v, r * 1.2, topY, o.roofH ?? r * 1.4, roofC, { ao: 0.82 });
      this.cyl(
        'trim',
        u,
        v,
        0.005,
        0.003,
        topY + (o.roofH ?? r * 1.4),
        topY + (o.roofH ?? r * 1.4) + 0.035,
        4,
        o.trim,
        { ao: 1 },
      );
    } else if (roof === 'crenel') {
      this.merlonRing(u, v, r * 1.1, topY, o.stone);
    }
    const ns = o.slits ?? 0;
    for (let i = 0; i < ns; i++) {
      const a = (i / ns) * Math.PI * 2 + 0.4;
      const yy = bottom + (topY - bottom) * (0.5 + 0.28 * ((i % 2) - 0.5));
      this.slit(
        u + Math.cos(a) * r * 1.0,
        v + Math.sin(a) * r * 1.0,
        yy,
        Math.atan2(Math.cos(a), Math.sin(a)),
      );
    }
  }

  /** Square tower / keep rising to topY. */
  squareTower(
    u: number,
    v: number,
    w: number,
    d: number,
    topY: number,
    rot: number,
    o: {
      stone: Color;
      roofC?: Color;
      trim: Color;
      roof?: 'pyramid' | 'crenel' | 'flat';
      roofH?: number;
      sink?: number;
    },
  ): void {
    const rr = Math.hypot(w, d) / 2;
    const bottom = this.groundMin(u, v, rr) - (o.sink ?? 0.03);
    this.box('stone', u, v, w, d, bottom, topY, rot, o.stone, { ao: 0.68 });
    this.box('trim', u, v, w + 0.016, d + 0.016, topY - 0.022, topY - 0.008, rot, o.trim, {
      ao: 1,
      vary: 0.03,
    });
    const roof = o.roof ?? 'crenel';
    if (roof === 'pyramid') {
      this.pyramid(
        'roof',
        u,
        v,
        Math.max(w, d) / 2 + 0.012,
        topY - 0.008,
        o.roofH ?? w * 0.9,
        rot,
        o.roofC ?? o.stone,
        { ao: 0.82 },
      );
    } else if (roof === 'crenel') {
      const c = Math.cos(rot);
      const s = Math.sin(rot);
      const edge = (px: number, pz: number, pw: number, pd: number) => {
        const m = Math.max(1, Math.floor(pw / 0.028));
        for (let q = 0; q < m; q++) {
          const t = ((q + 0.5) / m - 0.5) * pw * 0.96;
          const ex = px + t * c;
          const ez = pz - t * s;
          this.box('stone', ex, ez, 0.015, pd, topY, topY + 0.014, rot, o.stone, { ao: 0.9, vary: 0.05 });
        }
      };
      // local axes after rotation: x axis -> (c, -s), z axis -> (s, c)
      const hw = w / 2 - 0.004;
      const hd = d / 2 - 0.004;
      edge(u + s * hd, v + c * hd, w, 0.008);
      edge(u - s * hd, v - c * hd, w, 0.008);
      for (const side of [1, -1]) {
        const px = u + c * hw * side;
        const pz = v - s * hw * side;
        const m = Math.max(1, Math.floor(d / 0.028));
        for (let q = 0; q < m; q++) {
          const t = ((q + 0.5) / m - 0.5) * d * 0.96;
          this.box('stone', px + t * s, pz + t * c, 0.008, 0.015, topY, topY + 0.014, rot, o.stone, {
            ao: 0.9,
            vary: 0.05,
          });
        }
      }
    }
  }

  /** Long gabled building (ridge along local z). */
  hall(
    u: number,
    v: number,
    w: number,
    d: number,
    y0: number,
    wallH: number,
    roofH: number,
    rot: number,
    o: { stone: Color; roofC: Color; trim?: Color; sink?: number; overhang?: number; door?: boolean },
  ): void {
    const rr = Math.hypot(w, d) / 2;
    const bottom = Math.min(y0, this.groundMin(u, v, rr * 0.9, 6)) - (o.sink ?? 0.02);
    this.box('stone', u, v, w, d, bottom, y0 + wallH, rot, o.stone, { ao: 0.7 });
    const ov = o.overhang ?? 0.012;
    const hw = w / 2 + ov;
    const hl = d / 2 + ov;
    const yb = y0 + wallH;
    const yr = yb + roofH;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const P = (x: number, y: number, z: number): [number, number, number] => [
      u + x * c + z * s,
      y,
      v - x * s + z * c,
    ];
    const A = P(-hw, yb, -hl);
    const B = P(hw, yb, -hl);
    const C = P(hw, yb, hl);
    const D = P(-hw, yb, hl);
    const R1 = P(0, yr, -hl);
    const R2 = P(0, yr, hl);
    const inside: [number, number, number] = [u, yb - 0.01, v];
    this.tris(
      'roof',
      [
        [...A, ...D, ...R2],
        [...A, ...R2, ...R1],
        [...B, ...R1, ...R2],
        [...B, ...R2, ...C],
      ],
      inside,
      o.roofC,
      { ao: 0.85 },
    );
    // gable triangles in stone, slightly inset so the roof overhang reads
    const gA = P(-w / 2, yb - 0.001, -d / 2);
    const gB = P(w / 2, yb - 0.001, -d / 2);
    const gR = P(0, yr - ov * 0.5, -d / 2);
    const hA = P(-w / 2, yb - 0.001, d / 2);
    const hB = P(w / 2, yb - 0.001, d / 2);
    const hR = P(0, yr - ov * 0.5, d / 2);
    this.tris(
      'stone',
      [
        [...gA, ...gB, ...gR],
        [...hA, ...hB, ...hR],
      ],
      [u, yb - 0.01, v],
      o.stone,
      { ao: 0.8 },
    );
    if (o.door) {
      this.arch(u + s * (d / 2), v + c * (d / 2), Math.min(0.03, w * 0.4), 0.034, y0, rot);
    }
  }

  /** Tall slender spire: thin shaft, balcony ring, long cone. */
  spire(
    u: number,
    v: number,
    r: number,
    topY: number,
    roofH: number,
    stone: Color,
    roofC: Color,
    trim: Color,
  ): void {
    const bottom = this.groundMin(u, v, r * 1.2) - 0.03;
    this.cyl('stone', u, v, r * 1.35, r, bottom, topY, 10, stone, { ao: 0.7 });
    this.cyl('trim', u, v, r * 1.6, r * 1.45, topY - 0.022, topY, 10, trim, { ao: 1, vary: 0.03 });
    this.cone('roof', u, v, r * 1.6, topY, roofH, 10, roofC, { ao: 0.85 });
    this.cyl('trim', u, v, 0.004, 0.002, topY + roofH, topY + roofH + 0.05, 4, trim, { ao: 1 });
    for (let i = 0; i < 3; i++) this.slit(u + r, v, topY - 0.06 - i * 0.06, Math.PI / 2, 0.006, 0.022);
  }

  /** Banner pole (cloth is added by the banner system, T08). */
  pole(u: number, v: number, y0: number, h: number, c: Color): void {
    this.cyl('trim', u, v, 0.0035, 0.0025, y0, y0 + h, 5, c, { ao: 1, vary: 0 });
  }

  /** Chimney stack. */
  chimney(u: number, v: number, w: number, y0: number, y1: number, stone: Color, trim: Color): void {
    this.box('stone', u, v, w, w, y0, y1, 0, stone, { ao: 0.75 });
    this.box('trim', u, v, w + 0.01, w + 0.01, y1 - 0.01, y1 + 0.006, 0, trim, { ao: 1 });
  }

  // ---------------------------------------------------------------- ground fitting
  /**
   * Radius of flat ground along a ray from the origin (in the current frame) before it falls away from the
   * base height. Used to put curtain walls right on a plateau rim.
   */
  rim(angle: number, base: number, rMax: number, drop = 0.05, step = 0.02): number {
    let r = 0.1;
    for (; r < rMax; r += step) {
      if (this.gy(Math.cos(angle) * r, Math.sin(angle) * r) < base - drop) break;
    }
    return Math.min(rMax, r - step);
  }

  // ---------------------------------------------------------------- output
  build(): {
    stone: BufferGeometry | null;
    roof: BufferGeometry | null;
    trim: BufferGeometry | null;
    tris: number;
  } {
    const out: {
      stone: BufferGeometry | null;
      roof: BufferGeometry | null;
      trim: BufferGeometry | null;
      tris: number;
    } = {
      stone: null,
      roof: null,
      trim: null,
      tris: 0,
    };
    for (const b of ['stone', 'roof', 'trim'] as const) {
      const list = this.parts[b];
      if (list.length === 0) continue;
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      list.length = 0;
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      out[b] = merged;
      out.tris += merged.getAttribute('position').count / 3;
    }
    return out;
  }
}

/** Smooth a ring of radii in place (neighbour average, keeping the minimum so walls never overshoot a rim). */
export function smoothRing(rs: number[], passes = 1): number[] {
  let cur = rs.slice();
  for (let p = 0; p < passes; p++) {
    const n = cur.length;
    cur = cur.map((r, i) =>
      Math.min(r, 0.25 * cur[(i + n - 1) % n]! + 0.5 * r + 0.25 * cur[(i + 1) % n]! + 0.02),
    );
  }
  return cur;
}
