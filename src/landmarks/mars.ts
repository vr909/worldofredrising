/**
 * Mars Castle recipe: the reference castle every other recipe is held against.
 * Canon (p.166): three walls stand atop 80 m cliffs; walls rise 30 m; the gatehouse swells out as a turreted
 * fortress on the west; a square 50 m keep is built into the north-west wall; "four spires" (p.~190); long
 * dormitories, a kitchen, a square and a stone map room. Scale ~4x, verticals exaggerated for legibility.
 */
import { Color } from 'three';
import { gatehouse, leanTo, palette, square, tangentRot } from './common';
import { Kit, smoothRing, type P } from './kit';

export function marsCastle(k: Kit): void {
  const p = palette('mars', '#a89b8a', '#5f4e3e');
  const base = k.gyLocal(0, 0);
  const wallTop = base + 0.16;
  const N = 16;
  const GATE = 12; // angle 270 deg = local -z = west
  const KEEP = 14; // angle 315 deg = north-west
  const SPIRES = new Set([1, 4, 7, 10]);

  // --- fit the curtain wall to the plateau rim: walls stand ON the cliff edge ---------------
  const raw: number[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    raw.push(Math.min(1.12, k.rim(a, base, 1.3, 0.04) - 0.05));
  }
  const rs = smoothRing(raw, 2);
  const pt = (i: number): P => {
    const j = ((i % N) + N) % N;
    const a = (j / N) * Math.PI * 2;
    return [Math.cos(a) * rs[j]!, Math.sin(a) * rs[j]!];
  };

  // wall run from the right gate tower round the whole circuit to the left gate tower
  const run: P[] = [[0.15, pt(GATE)[1]]];
  for (let i = GATE + 1; i <= GATE + N - 1; i++) run.push(pt(i));
  run.push([-0.15, pt(GATE)[1]]);
  k.wall(run, { topY: wallTop, th: 0.065, stone: p.stone, trim: p.trim });

  // --- wall towers and the four spires -----------------------------------------------------
  for (let i = 0; i < N; i++) {
    if (i === GATE || i === KEEP) continue;
    const [u, v] = pt(i);
    if (SPIRES.has(i)) {
      k.spire(u, v, 0.042, wallTop + 0.36, 0.26, p.stone, p.roof, p.trim);
      k.pole(u, v, wallTop + 0.36 + 0.26 + 0.05, 0.1, p.trim);
    } else {
      k.tower(u, v, 0.055, wallTop + 0.06, {
        stone: p.stone,
        roofC: p.roof,
        trim: p.trim,
        roof: i % 2 ? 'cone' : 'crenel',
        roofH: 0.11,
        slits: 3,
      });
    }
  }

  // --- the square keep, 50 m, built into the NW wall ---------------------------------------
  {
    const a = (KEEP / N) * Math.PI * 2;
    const [wu, wv] = pt(KEEP);
    const inset = 0.13;
    const ku = wu - Math.cos(a) * inset;
    const kv = wv - Math.sin(a) * inset;
    const rot = tangentRot(a);
    const kTop = base + 0.5;
    k.squareTower(ku, kv, 0.3, 0.28, kTop, rot, { stone: p.stone, trim: p.trim, roof: 'crenel' });
    // buttress turrets at the four corners
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cu = ku + c * 0.15 * sx + s * 0.14 * sz;
        const cv = kv - s * 0.15 * sx + c * 0.14 * sz;
        k.tower(cu, cv, 0.03, kTop + 0.05, {
          stone: p.stone,
          roofC: p.roof,
          trim: p.trim,
          roof: 'cone',
          roofH: 0.1,
        });
      }
    }
    k.pyramid('roof', ku, kv, 0.085, kTop, 0.15, rot, p.roof);
    const nx = -Math.cos(a);
    const nz = -Math.sin(a);
    for (let i = 0; i < 3; i++) {
      k.slit(ku + nx * 0.14, kv + nz * 0.14, base + 0.14 + i * 0.1, Math.atan2(nx, nz), 0.012, 0.045);
    }
    k.pole(ku, kv, kTop + 0.15, 0.18, p.trim);
  }

  // --- west gatehouse: swells out as a turreted fortress -----------------------------------
  k.at(0, pt(GATE)[1], 0, () => gatehouse(k, p, { topY: wallTop, towerR: 0.095, w: 0.34 }));

  // --- inside: courtyard square, long dormitories, kitchen, map room ----------------------
  const g0 = base;
  square(k, p, 0, 0.05, 0.36);
  for (const sx of [-1, 1]) {
    k.hall(sx * 0.5, 0.1, 0.18, 0.82, g0, 0.075, 0.075, 0, { stone: p.stone2, roofC: p.roof });
    for (let i = 0; i < 6; i++)
      k.slit(sx * 0.5 - sx * 0.092, -0.22 + i * 0.13, g0 + 0.045, (-sx * Math.PI) / 2, 0.014, 0.02);
  }
  // kitchen with chimneys, across the courtyard from the gate
  k.hall(-0.14, 0.7, 0.2, 0.46, g0, 0.07, 0.07, Math.PI / 2, { stone: p.stone2, roofC: p.roof, door: true });
  k.chimney(-0.04, 0.7, 0.032, g0 + 0.07, g0 + 0.2, p.stone2, p.trim);
  k.chimney(-0.26, 0.7, 0.032, g0 + 0.07, g0 + 0.17, p.stone2, p.trim);
  // stone map room (cooler stone, flat roof with a small pyramid)
  const mapStone = new Color('#8f9296');
  k.squareTower(0.26, 0.62, 0.2, 0.2, g0 + 0.13, 0.2, {
    stone: mapStone,
    trim: p.trim,
    roof: 'pyramid',
    roofC: p.roofDeep,
    roofH: 0.08,
  });
  // barracks and stables along the inside of the wall
  for (const i of [0, 2, 3, 5, 6, 8, 9, 11]) {
    const a = (i / N) * Math.PI * 2;
    leanTo(k, p, a, rs[i]! - 0.15, 0.24, 0.08, g0, 0.055, 0.05);
  }
}
