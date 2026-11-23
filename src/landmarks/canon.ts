/**
 * Recipes for the canon castles other than Mars (canon doc §4, §7): Apollo, Jupiter, Ceres, Minerva, Diana, Juno.
 * Each is a short script of kit calls in castle-local km; local -z is the gate direction.
 */
import { Color } from 'three';
import { distanceToPolyline } from '../world/geometry';
import { RIVERS } from '../world/layout';
import { pointAlong } from '../terrain/heightfield';
import { gatehouse, leanTo, palette, square } from './common';
import { Kit, type P } from './kit';
import { ringCastle, town } from './ring';

const TAU = Math.PI * 2;

/** Apollo: tall, white, ornate. Round plaza, six doorways to six spiralling towers, ~100 m parapet (p.340). */
export function apolloCastle(k: Kit): void {
  const p = palette('apollo', '#efe9dc', '#b8964a');
  const base = k.gyLocal(0, 0);
  const gold = p.roof;
  // outer terrace wall with the west gatehouse
  ringCastle(k, p, base, {
    n: 16,
    rMax: 1.0,
    rimFit: true,
    wallH: 0.12,
    th: 0.05,
    gate: 12,
    towerR: 0.045,
    towerH: 0.2,
    towerRoof: 'dome',
    roofH: 0.07,
    merlons: false,
    gateOpts: { w: 0.28, towerR: 0.07, tall: 0.14, roofH: 0.2, barbican: 0.2 },
  });
  // plaza: raised round dais with a balustraded parapet (~100 m, scaled), six doorways
  const R = 0.5;
  k.cyl('stone', 0, 0, R + 0.04, R + 0.02, base - 0.02, base + 0.04, 36, p.stone2);
  k.disc('trim', 0, 0, R, base + 0.04, 36, p.pave);
  const parapetTop = base + 0.2;
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * TAU + 0.2;
    const a1 = ((i + 1) / 6) * TAU - 0.2;
    const arc: P[] = [];
    for (let j = 0; j <= 4; j++) {
      const a = a0 + ((a1 - a0) * j) / 4;
      arc.push([Math.cos(a) * R, Math.sin(a) * R]);
    }
    k.wall(arc, { topY: parapetTop, th: 0.035, stone: p.stone, trim: p.trim, merlons: false });
  }
  // six spiralling towers, one beyond each doorway
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const u = Math.cos(a) * (R + 0.14);
    const v = Math.sin(a) * (R + 0.14);
    const g = k.groundMin(u, v, 0.06) - 0.03;
    // doorway on the parapet
    k.arch(
      Math.cos(a) * (R + 0.003),
      Math.sin(a) * (R + 0.003),
      0.045,
      0.07,
      base + 0.04,
      Math.atan2(Math.cos(a), Math.sin(a)),
    );
    // tiered, twisting shaft
    let y = g;
    let r = 0.062;
    for (let t = 0; t < 4; t++) {
      const h = t === 0 ? base + 0.26 - g : 0.12;
      k.cyl('stone', u, v, r * 1.06, r * 0.9, y, y + h, 10, p.stone);
      k.cyl('trim', u, v, r * 1.25, r * 1.12, y + h - 0.012, y + h + 0.004, 10, p.trim, { ao: 1 });
      // spiral band: a thin rotated slab per tier
      k.box(
        'trim',
        u + Math.cos(a + t) * r,
        v + Math.sin(a + t) * r,
        0.012,
        0.012,
        y + h * 0.2,
        y + h * 0.9,
        0,
        p.trim,
        { ao: 1 },
      );
      y += h;
      r *= 0.82;
    }
    k.cone('roof', u, v, r * 1.5, y, 0.26, 10, gold);
    k.cyl('trim', u, v, 0.004, 0.002, y + 0.26, y + 0.31, 4, p.trim, { ao: 1 });
  }
  // central domed rotunda
  k.cyl('stone', 0, 0, 0.17, 0.15, base + 0.04, base + 0.2, 20, p.stone);
  k.cyl('trim', 0, 0, 0.19, 0.17, base + 0.19, base + 0.215, 20, p.trim, { ao: 1 });
  k.dome('roof', 0, 0, 0.16, base + 0.215, 0.13, gold);
  k.cyl('trim', 0, 0, 0.005, 0.003, base + 0.34, base + 0.42, 4, p.trim, { ao: 1 });
  for (let i = 0; i < 8; i++)
    k.arch(
      Math.cos((i / 8) * TAU) * 0.166,
      Math.sin((i / 8) * TAU) * 0.166,
      0.03,
      0.06,
      base + 0.05,
      Math.atan2(Math.cos((i / 8) * TAU), Math.sin((i / 8) * TAU)),
    );
}

/** Jupiter: dark basalt, between two rock faces, three-tiered walls bowing outward, postern gate (p.353). */
export function jupiterCastle(k: Kit): void {
  const p = palette('jupiter', '#9399a6', '#c0c8d8');
  const base = k.gyLocal(0, 0);
  const paving = p.pave.clone().multiplyScalar(1.3);
  const span = 1.3; // wall ends are driven into the rock faces at +-x
  const tiers = [
    { z: -0.78, bow: 0.28, h: 0.13 },
    { z: -0.28, bow: 0.26, h: 0.26 },
    { z: 0.22, bow: 0.24, h: 0.4 },
  ];
  for (const t of tiers) {
    const arc: P[] = [];
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const x = -span + (2 * span * i) / n;
      arc.push([x, t.z - t.bow * (1 - (x / span) ** 2)]);
    }
    // terrace fill behind the wall, strip by strip, so each tier reads as a raised shelf
    for (let i = 0; i < n; i++) {
      const x = (arc[i]![0] + arc[i + 1]![0]) / 2;
      const zf = (arc[i]![1] + arc[i + 1]![1]) / 2;
      const zb = t.z + 0.5;
      k.box(
        'stone',
        x,
        (zf + zb) / 2,
        (2 * span) / n + 0.01,
        zb - zf,
        base - 0.03,
        base + t.h - 0.02,
        0,
        paving,
        { ao: 0.9, vary: 0.05 },
      );
    }
    k.wall(arc, { topY: base + t.h, th: 0.07, stone: p.stone, trim: p.trim, sink: 0.05 });
    // buttress towers at the ends and middle of each tier
    for (const x of [-span + 0.12, 0, span - 0.12]) {
      const z = t.z - t.bow * (1 - (x / span) ** 2);
      k.tower(x, z, 0.055, base + t.h + 0.06, {
        stone: p.stone,
        roofC: p.roof,
        trim: p.trim,
        roof: x === 0 ? 'cone' : 'crenel',
        roofH: 0.12,
        slits: 3,
      });
    }
  }
  // main gate on the lowest tier
  const gz = tiers[0]!.z - tiers[0]!.bow;
  k.at(0, gz + 0.02, 0, () => gatehouse(k, p, { topY: base + 0.13, w: 0.26, towerR: 0.07, barbican: 0.15 }));
  // postern: a small arched door low in the south end of the second tier
  const px = 1.0;
  const pzz = tiers[1]!.z - tiers[1]!.bow * (1 - (px / span) ** 2) - 0.045;
  k.box('trim', px, pzz + 0.02, 0.07, 0.04, base + 0.13, base + 0.145, 0, p.trim, { ao: 1 });
  k.arch(px, pzz - 0.002, 0.032, 0.05, base + 0.135, Math.PI);
  // buildings on the terraces
  k.hall(-0.55, -0.55, 0.22, 0.12, base + 0.13, 0.05, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(0.55, -0.55, 0.22, 0.12, base + 0.13, 0.05, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(-0.5, -0.06, 0.26, 0.14, base + 0.26, 0.06, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(0.5, -0.06, 0.26, 0.14, base + 0.26, 0.06, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  // keep on the top tier, with tall spires
  k.squareTower(0, 0.5, 0.34, 0.3, base + 0.76, 0, { stone: p.stone, trim: p.trim, roof: 'crenel' });
  k.pyramid('roof', 0, 0.5, 0.1, base + 0.76, 0.2, 0, p.roof);
  for (const sx of [-1, 1]) {
    k.spire(sx * 0.23, 0.5, 0.04, base + 0.8, 0.3, p.stone, p.roof, p.trim);
    k.spire(sx * 0.8, 0.35, 0.035, base + 0.55, 0.22, p.stone, p.roof, p.trim);
  }
  k.pole(0, 0.5, base + 0.96, 0.18, p.trim);
}

/** Ceres: spans the river; long walls; courtyard; huge keep where the bread bakes (p.309). */
export function ceresCastle(k: Kit): void {
  const p = palette('ceres', '#b99d6f', '#6e4a22');
  const river = RIVERS.find((r) => r.id === 'highland-river')!;
  const here = distanceToPolyline(k.lm.position, river.points);
  const a = pointAlong(river.points, Math.max(0, here.u - 0.02));
  const b = pointAlong(river.points, Math.min(1, here.u + 0.02));
  const [tx, tz] = k.worldToLocal(b[0] - a[0], b[1] - a[1]);
  // river frame: u axis along the river (pointing downstream)
  const f = -Math.atan2(tz, tx);
  const halfW = (river.width[0] + (river.width[1] - river.width[0]) * here.u) / 2;
  k.push(0, 0, f);
  const bank = Math.max(k.gy(0, 0.55), k.gy(0, -0.55));
  const top = bank + 0.13;
  const L = 1.15; // half-length along the river
  const W = 1.0; // half-width across it
  const gap = halfW + 0.08;
  // long walls: two halves, each a rectangle running up to the water gates
  for (const s of [-1, 1]) {
    const pts: P[] = [
      [-L, s * gap],
      [-L, s * W],
      [-0.18 * 0, s * W],
      [L, s * W],
      [L, s * gap],
    ];
    if (s === -1) {
      // south wall has the main gate in the middle
      k.wall([pts[0]!, pts[1]!, [-0.15, s * W]], { topY: top, th: 0.06, stone: p.stone, trim: p.trim });
      k.wall([[0.15, s * W], pts[3]!, pts[4]!], { topY: top, th: 0.06, stone: p.stone, trim: p.trim });
    } else k.wall(pts, { topY: top, th: 0.06, stone: p.stone, trim: p.trim });
    for (const [u, v] of [pts[0]!, pts[1]!, pts[3]!, pts[4]!] as P[]) {
      k.tower(u, v, 0.055, top + 0.06, {
        stone: p.stone,
        roofC: p.roof,
        trim: p.trim,
        roof: Math.abs(v) > W - 0.01 ? 'cone' : 'crenel',
        roofH: 0.11,
        slits: 3,
      });
    }
  }
  k.at(0, -W, 0, () => gatehouse(k, p, { topY: top, towerR: 0.07, w: 0.28, barbican: 0.18 }));
  // water gates: arched bridge-walls across the river at both ends
  for (const s of [-1, 1]) {
    const u = s * L;
    const y0 = k.gy(u, 0);
    const water = Math.min(k.gy(u, 0), bank - 0.07) + 0.07;
    k.box('stone', u, 0, 0.07, 2 * gap, water + 0.02, top, 0, p.stone, { ao: 0.7 });
    k.box('trim', u, 0, 0.082, 2 * gap, top - 0.014, top - 0.005, 0, p.trim, { ao: 1 });
    k.arch(u - s * 0.0, 0, 2 * halfW * 0.9, 0.06, water - 0.01, s > 0 ? Math.PI / 2 : -Math.PI / 2);
    void y0;
  }
  // the bridge-hall: a long hall carried on two piers straight over the river
  const hallY = bank + 0.005;
  for (const s of [-1, 1]) {
    k.box('stone', 0, s * (halfW + 0.04), 0.3, 0.08, k.gy(0, s * (halfW + 0.2)) - 0.04, hallY, 0, p.stone2, {
      ao: 0.7,
    });
  }
  k.hall(0, 0, 0.3, 2 * halfW + 0.28, hallY, 0.07, 0.08, 0, { stone: p.stone, roofC: p.roof });
  k.arch(0.15, 0, 0.1, 0.05, hallY - 0.07 + 0.02, Math.PI / 2, new Color('#14100c'));
  // north half: courtyard, huge keep with the ovens
  square(k, p, -0.5, 0.45, 0.22);
  k.squareTower(0.45, 0.62, 0.42, 0.34, bank + 0.34, 0, { stone: p.stone, trim: p.trim, roof: 'crenel' });
  k.hall(0.45, 0.62, 0.3, 0.24, bank + 0.34, 0.05, 0.1, 0, { stone: p.stone2, roofC: p.roof });
  for (const [cu, cv] of [
    [0.3, 0.7],
    [0.45, 0.7],
    [0.6, 0.7],
  ] as P[])
    k.chimney(cu, cv, 0.035, bank + 0.34, bank + 0.52, p.stone2, p.trim);
  k.hall(-0.7, 0.55, 0.14, 0.5, bank, 0.06, 0.06, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(-0.2, 0.75, 0.4, 0.14, bank, 0.06, 0.06, 0, { stone: p.stone2, roofC: p.roof });
  // south half: stables, granaries, orchard yard left open (trees are T07's)
  k.hall(-0.7, -0.5, 0.14, 0.4, bank, 0.06, 0.06, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(0.7, -0.5, 0.14, 0.4, bank, 0.06, 0.06, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(0.45, -0.75, 0.3, 0.14, bank, 0.06, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  k.pole(0.45, 0.62, bank + 0.52, 0.18, p.trim);
  k.pop();
}

/** Minerva: sprawling sandstone fortress with a city inside, 30 m walls, olive country (pp.217-218, 254). */
export function minervaCastle(k: Kit): void {
  const p = palette('minerva', '#cdae7c', '#7a5c36');
  const base = k.gyLocal(0, 0);
  const R = 1.42;
  const pts = ringCastle(k, p, base, {
    n: 16,
    rMax: R,
    shape: 'square',
    wallH: 0.14,
    th: 0.07,
    gate: 12,
    towerR: 0.065,
    towerH: 0.2,
    towerRoof: 'crenel',
    gateOpts: { w: 0.36, towerR: 0.095, tall: 0.12, barbican: 0.35 },
  });
  // the city: dense gabled houses, avoiding the citadel and the two avenues
  const inside = (u: number, v: number) =>
    Math.abs(u) < R - 0.2 && Math.abs(v) < R - 0.2 && Math.abs(u) > 0.09;
  town(k, p, base, R - 0.2, 0.17, [[0.3, 0.25, 0.4]], inside);
  // central citadel: three stacked terraces (the war room with the atlas is on the third level, p.259)
  const cu = 0.3;
  const cv = 0.25;
  k.box('stone', cu, cv, 0.62, 0.55, base - 0.03, base + 0.07, 0, p.stone, { ao: 0.7 });
  k.box('trim', cu, cv, 0.64, 0.57, base + 0.058, base + 0.068, 0, p.trim, { ao: 1 });
  k.box('stone', cu, cv, 0.44, 0.38, base + 0.07, base + 0.15, 0, p.stone, { ao: 0.8 });
  k.box('trim', cu, cv, 0.46, 0.4, base + 0.138, base + 0.148, 0, p.trim, { ao: 1 });
  k.squareTower(cu, cv, 0.26, 0.22, base + 0.3, 0, {
    stone: p.stone,
    trim: p.trim,
    roof: 'pyramid',
    roofC: p.roof,
    roofH: 0.13,
  });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1])
      k.tower(cu + sx * 0.3, cv + sz * 0.26, 0.04, base + 0.15, {
        stone: p.stone,
        roofC: p.roof,
        trim: p.trim,
        roof: 'dome',
        roofH: 0.05,
      });
  }
  k.pole(cu, cv, base + 0.43, 0.16, p.trim);
  // wall-top towers beyond the gate road, and tall corner towers with house roofs
  for (const [u, v] of [pts[0]!, pts[4]!, pts[8]!] as P[]) {
    k.spire(u, v, 0.04, base + 0.36, 0.2, p.stone, p.roof, p.trim);
  }
  square(k, p, -0.55, 0.0, 0.18);
}

/** Diana: forest fortress, palisade and timber towers; walkways and treetop platforms are invented. */
export function dianaCastle(k: Kit): void {
  const p = palette('diana', '#70604a', '#4a3a28');
  const base = k.gyLocal(0, 0);
  const bark = new Color('#5a4630');
  const R = 0.85;
  const N = 12;
  const GATE = 9;
  const logC = new Color('#6b5336');
  const pts: P[] = [];
  for (let i = 0; i < N; i++) pts.push([Math.cos((i / N) * TAU) * R, Math.sin((i / N) * TAU) * R]);
  // chunky log palisade with pointed tops, walkway gallery behind it (a covered fighting gallery on the front arc)
  const logH = 0.12;
  for (let i = 0; i < N; i++) {
    const A = pts[i]!;
    const B = pts[(i + 1) % N]!;
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.floor(L / 0.03);
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      const u = A[0] + (B[0] - A[0]) * t;
      const v = A[1] + (B[1] - A[1]) * t;
      if (Math.hypot(u - pts[GATE]![0], v - pts[GATE]![1]) < 0.17) continue;
      const h = logH * (0.9 + k.rng() * 0.2);
      const g = k.gy(u, v) - 0.02;
      k.cyl('stone', u, v, 0.015, 0.014, g, base + h, 6, logC, { ao: 0.7, vary: 0.12 });
      k.cone('stone', u, v, 0.015, base + h, 0.028, 6, logC, { ao: 1, vary: 0.1 });
    }
    const mu = (A[0] + B[0]) / 2;
    const mv = (A[1] + B[1]) / 2;
    const ang = -Math.atan2(B[1] - A[1], B[0] - A[0]);
    const inx = -mu / R;
    const inz = -mv / R;
    k.box('trim', mu + inx * 0.045, mv + inz * 0.045, L, 0.05, base + 0.075, base + 0.085, ang, p.trim, {
      ao: 1,
    });
    if (i >= 6 && i <= 8) {
      // covered gallery: posts and a pitched roof strip over the walkway
      k.box('roof', mu + inx * 0.045, mv + inz * 0.045, L, 0.075, base + 0.15, base + 0.158, ang, p.roof, {
        ao: 1,
      });
      for (const s of [0.25, 0.75]) {
        const px = A[0] + (B[0] - A[0]) * s + inx * 0.06;
        const pz = A[1] + (B[1] - A[1]) * s + inz * 0.06;
        k.cyl('trim', px, pz, 0.008, 0.008, base + 0.085, base + 0.15, 5, p.trim, { ao: 1 });
      }
    }
  }
  for (let i = 0; i < N; i++) {
    if (i === GATE) continue;
    const [u, v] = pts[i]!;
    const g = k.groundMin(u, v, 0.04) - 0.02;
    if (i % 2 === 0) {
      // stout timber corner tower
      const top = base + 0.2;
      k.cyl('stone', u, v, 0.048, 0.042, g, top, 8, logC, { ao: 0.7 });
      k.cyl('trim', u, v, 0.058, 0.058, top, top + 0.016, 8, p.trim, { ao: 1 });
      k.cone('roof', u, v, 0.062, top + 0.016, 0.12, 8, p.roof);
    } else {
      // tall stilted lookout on a trunk
      const top = base + 0.42;
      k.cyl('stone', u, v, 0.034, 0.026, g, top, 7, bark);
      k.cyl('trim', u, v, 0.07, 0.07, top, top + 0.014, 8, p.trim, { ao: 1 });
      k.cone('roof', u, v, 0.075, top + 0.014, 0.12, 8, p.roof);
    }
  }
  const gp = pts[GATE]!;
  k.at(gp[0], gp[1], 0, () =>
    gatehouse(k, p, { topY: base + 0.1, w: 0.24, towerR: 0.06, tall: 0.1, roofH: 0.16 }),
  );
  // invented: treetop platforms on short sturdy posts (the tree-climbing soldiers), inside and just outside the palisade
  for (const [u, v] of [
    [-0.5, -0.35],
    [0.55, -0.4],
    [0.1, 1.0],
  ] as P[]) {
    const top = base + 0.22;
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      const pu = u + dx * 0.035;
      const pv = v + dz * 0.035;
      k.cyl('stone', pu, pv, 0.012, 0.01, k.gy(pu, pv) - 0.02, top, 6, bark, { ao: 0.7 });
    }
    k.box('trim', u, v, 0.12, 0.12, top, top + 0.012, 0, p.trim, { ao: 1 });
    k.box('trim', u, v - 0.06, 0.12, 0.008, top + 0.012, top + 0.04, 0, p.trim, { ao: 1 });
    k.box('trim', u, v + 0.06, 0.12, 0.008, top + 0.012, top + 0.04, 0, p.trim, { ao: 1 });
    k.cone('roof', u, v, 0.085, top + 0.07, 0.07, 6, p.roof);
    k.cyl('trim', u + 0.05, v, 0.004, 0.004, top + 0.012, top + 0.07, 4, p.trim, { ao: 1 });
  }
  // great timber hall with a steep roof and a tall central tower
  k.hall(0, 0.1, 0.34, 0.6, base, 0.09, 0.15, 0, { stone: p.stone2, roofC: p.roof, door: true });
  k.squareTower(0, 0.1, 0.16, 0.16, base + 0.3, 0, {
    stone: p.stone2,
    trim: p.trim,
    roof: 'pyramid',
    roofC: p.roof,
    roofH: 0.18,
  });
  k.pole(0, 0.1, base + 0.46, 0.16, p.trim);
  for (const sx of [-1, 1])
    k.hall(sx * 0.5, 0.15, 0.14, 0.34, base, 0.05, 0.08, 0, { stone: p.stone2, roofC: p.roof });
  square(k, p, 0, -0.4, 0.2, 14);
  for (const i of [1, 4, 7]) leanTo(k, p, (i / 12) * TAU, R - 0.14, 0.2, 0.07, base, 0.04, 0.05);
}

/** Juno: deep cellars, so low, solid and thick-walled; teal domes; framed by mountains (p.320). */
export function junoCastle(k: Kit): void {
  const p = palette('juno', '#bfc3ba', '#5d6b68');
  const base = k.gyLocal(0, 0);
  const R = 0.9;
  ringCastle(k, p, base, {
    n: 8,
    rMax: R,
    shape: 'square',
    wallH: 0.1,
    th: 0.12,
    gate: 6,
    towerR: 0.085,
    towerH: 0.13,
    towerRoof: 'dome',
    roofH: 0.1,
    gateOpts: { w: 0.3, towerR: 0.09, tall: 0.07, roofH: 0.2, barbican: 0.2 },
  });
  // low thick central palace with a colonnaded court
  k.box('stone', 0, 0.1, 0.62, 0.5, base - 0.02, base + 0.1, 0, p.stone, { ao: 0.7 });
  k.box('trim', 0, 0.1, 0.64, 0.52, base + 0.088, base + 0.098, 0, p.trim, { ao: 1 });
  k.dome('roof', 0, 0.1, 0.17, base + 0.104, 0.15, p.roof);
  k.cyl('trim', 0, 0.1, 0.004, 0.002, base + 0.254, base + 0.3, 4, p.trim, { ao: 1 });
  for (let i = 0; i < 9; i++) {
    const x = -0.28 + i * 0.07;
    k.cyl('stone', x, -0.18, 0.012, 0.01, base, base + 0.09, 7, p.stone2);
  }
  k.box('trim', 0, -0.18, 0.62, 0.03, base + 0.088, base + 0.1, 0, p.trim, { ao: 1 });
  // sunken stair down to the cellars (dark mouth) behind the palace
  k.box('trim', 0.45, 0.55, 0.12, 0.1, base, base + 0.002, 0, new Color('#1c1612'), { ao: 1, vary: 0 });
  k.box('stone', 0.45, 0.6, 0.16, 0.04, base, base + 0.04, 0, p.stone2);
  for (const sx of [-1, 1])
    k.hall(sx * 0.55, -0.35, 0.15, 0.3, base, 0.05, 0.05, 0, { stone: p.stone2, roofC: p.roof });
}
