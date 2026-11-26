/**
 * Shared composite parts and palette helpers for the per-House recipes (T05).
 */
import { Color } from 'three';
import { HOUSES } from '../world/houses';
import type { HouseId } from '../world/types';
import { Kit, type P } from './kit';

export interface Palette {
  stone: Color;
  stone2: Color;
  roof: Color;
  roofDeep: Color;
  trim: Color;
  pave: Color;
}

export function palette(house: HouseId | null, stone = '#a39888', trim = '#6a5a48'): Palette {
  const h = house ? HOUSES[house] : null;
  return {
    stone: new Color(stone),
    stone2: new Color(stone).multiplyScalar(0.86),
    roof: new Color(h ? h.color : '#7d7468'),
    roofDeep: new Color(h ? h.colorDeep : '#4a443c'),
    trim: new Color(trim),
    pave: new Color(stone).multiplyScalar(1.12),
  };
}

/** Points on a ring (castle-local x/z), index i at angle (i/n)*2pi measured from +x toward +z. */
export function ringPoint(r: number, i: number, n: number): P {
  const a = (i / n) * Math.PI * 2;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/** Rotation (about Y) that aligns a box's local x axis with the ring tangent at angle a. */
export function tangentRot(a: number): number {
  return -a - Math.PI / 2;
}

/** Barbican-style gatehouse built in a frame whose -z axis points outward (use k.at(...)). */
export function gatehouse(
  k: Kit,
  p: Palette,
  o: {
    topY: number;
    towerR?: number;
    w?: number;
    barbican?: number;
    turrets?: boolean;
    roofH?: number;
    tall?: number;
  },
): void {
  const tr = o.towerR ?? 0.075;
  const w = o.w ?? 0.3;
  const hw = w / 2;
  const top = o.topY;
  const tall = o.tall ?? 0.1;
  // gate block with crenellated top, built into the wall line
  k.squareTower(0, -0.01, w, 0.2, top + 0.05, 0, { stone: p.stone, trim: p.trim, roof: 'crenel' });
  // swelling front drum towers
  for (const s of [-1, 1]) {
    k.tower(s * hw, -0.1, tr, top + tall, {
      stone: p.stone,
      roofC: p.roof,
      trim: p.trim,
      roof: 'cone',
      roofH: o.roofH ?? tr * 3.4,
      slits: 3,
    });
    if (o.turrets !== false) {
      k.tower(s * hw, 0.09, tr * 0.45, top + tall + 0.07, {
        stone: p.stone,
        roofC: p.roof,
        trim: p.trim,
        roof: 'cone',
        roofH: tr * 2.2,
        slits: 2,
      });
    }
  }
  // gate arch + portcullis shadow
  k.arch(0, -0.112, 0.075, 0.105, k.gy(0, -0.112), Math.PI);
  k.box('trim', 0, -0.112, 0.095, 0.02, k.gy(0, -0.112) + 0.1, k.gy(0, -0.112) + 0.114, 0, p.trim, { ao: 1 });
  // barbican funnel walls
  const b = o.barbican ?? 0.34;
  for (const s of [-1, 1]) {
    k.wall(
      [
        [s * (hw + 0.02), -0.16],
        [s * (hw + 0.1), -0.16 - b],
      ],
      { topY: top - 0.03, th: 0.04, stone: p.stone, trim: p.trim },
    );
  }
  // banner poles on the towers
  for (const s of [-1, 1]) k.pole(s * hw, -0.1, top + tall + (o.roofH ?? tr * 3.4) + 0.03, 0.12, p.trim, 0.7);
}

/** Paved courtyard / square. */
export function square(k: Kit, p: Palette, u: number, v: number, r: number, seg = 20): void {
  k.disc('trim', u, v, r, k.gy(u, v) + 0.003, seg, p.pave);
}

/** Wall-hugging lean-to hall inside a ring wall at ring angle a, radius r. */
export function leanTo(
  k: Kit,
  p: Palette,
  a: number,
  r: number,
  len: number,
  wid: number,
  y0: number,
  wallH = 0.045,
  roofH = 0.045,
): void {
  const u = Math.cos(a) * r;
  const v = Math.sin(a) * r;
  // hall ridge runs along local z; align ridge with the tangent
  k.hall(u, v, wid, len, y0, wallH, roofH, -a, {
    stone: p.stone2,
    roofC: p.roof,
  });
}
