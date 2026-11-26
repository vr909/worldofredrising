/**
 * Tiny path helpers for the sigil designs (64-unit grid). Everything is emitted as a single SVG path `d` that is
 * filled with the nonzero rule: solids wind clockwise (screen space), holes wind counter-clockwise, so overlapping
 * solids merge into one silhouette and holes punch through. No strokes anywhere.
 */
export type Pt = readonly [number, number];

const f = (n: number) => String(Math.round(n * 100) / 100);

function area(pts: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i] as Pt;
    const [x2, y2] = pts[(i + 1) % pts.length] as Pt;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function poly(pts: readonly Pt[], solid: boolean): string {
  const ordered = area(pts) > 0 === solid ? pts : [...pts].reverse();
  return `M${ordered.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`;
}

/** Solid polygon. */
export const P = (pts: readonly Pt[]) => poly(pts, true);
/** Hole polygon. */
export const H = (pts: readonly Pt[]) => poly(pts, false);

/** Mirror points across the vertical axis x = 32. */
export const mx = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [64 - x, y]);

/**
 * Full symmetric outline from its right half, listed top to bottom. Points on the axis (x = 32) at either end
 * are not duplicated.
 */
export function sym(right: readonly Pt[]): Pt[] {
  const left = mx(right).reverse();
  const first = right[0] as Pt;
  const last = right[right.length - 1] as Pt;
  const out: Pt[] = [...right];
  left.forEach((p, i) => {
    if (i === 0 && p[0] === last[0] && p[1] === last[1]) return;
    if (i === left.length - 1 && p[0] === first[0] && p[1] === first[1]) return;
    out.push(p);
  });
  return out;
}
/** Solid symmetric shape from its right half. */
export const S = (right: readonly Pt[]) => P(sym(right));
/** Symmetric hole from its right half. */
export const SH = (right: readonly Pt[]) => H(sym(right));

/** Straight bar of width w between two points. */
export function bar(x1: number, y1: number, x2: number, y2: number, w: number, solid = true): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * (w / 2);
  const ny = (dx / l) * (w / 2);
  return poly(
    [
      [x1 + nx, y1 + ny],
      [x2 + nx, y2 + ny],
      [x2 - nx, y2 - ny],
      [x1 - nx, y1 - ny],
    ],
    solid,
  );
}

/** Circle (solid) or circular hole. */
export function circ(cx: number, cy: number, r: number, solid = true): string {
  const s = solid ? 1 : 0;
  return `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 ${s} ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 ${s} ${f(cx - r)} ${f(cy)}Z`;
}

/** Rotate points about a centre (degrees, clockwise on screen). */
export function rot(pts: readonly Pt[], deg: number, cx = 32, cy = 32): Pt[] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}

/** Pointed leaf / blade from a base point to a tip, with a given half-width at the belly. */
export function blade(bx: number, by: number, tx: number, ty: number, w: number): Pt[] {
  const dx = tx - bx;
  const dy = ty - by;
  const l = Math.hypot(dx, dy) || 1;
  const nx = (-dy / l) * w;
  const ny = (dx / l) * w;
  const mxp = bx + dx * 0.4;
  const myp = by + dy * 0.4;
  return [
    [bx, by],
    [mxp + nx, myp + ny],
    [tx, ty],
    [mxp - nx, myp - ny],
  ];
}

/**
 * Thick polyline outline with mitred joins and pointed end caps (first and last point are the tips).
 * `w` is the full width at the interior vertices.
 */
export function zig(pts: readonly Pt[], w: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1] as Pt;
    const [x, y] = pts[i] as Pt;
    const [nx, ny] = pts[i + 1] as Pt;
    const d1 = Math.hypot(x - px, y - py) || 1;
    const d2 = Math.hypot(nx - x, ny - y) || 1;
    const n1: Pt = [-(y - py) / d1, (x - px) / d1];
    const n2: Pt = [-(ny - y) / d2, (nx - x) / d2];
    let mxv = n1[0] + n2[0];
    let myv = n1[1] + n2[1];
    const ml = Math.hypot(mxv, myv) || 1;
    mxv /= ml;
    myv /= ml;
    const cos = mxv * n1[0] + myv * n1[1];
    const k = w / 2 / Math.max(cos, 0.45);
    left.push([x + mxv * k, y + myv * k]);
    right.push([x - mxv * k, y - myv * k]);
  }
  return [pts[0] as Pt, ...left, pts[pts.length - 1] as Pt, ...right.reverse()];
}
