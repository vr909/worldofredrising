/**
 * Recipes for the inferred Houses (Vulcan, Bacchus, Venus, Mercury, Neptune), Pluto's cave mouth, the towers,
 * the Metas bridge and the Pass Fort. Inferred castles get a distinct but restrained character.
 */
import { Color } from 'three';
import { distanceToPolyline } from '../world/geometry';
import { RIVERS } from '../world/layout';
import { leanTo, palette, square } from './common';
import { Kit, type P } from './kit';
import { ringCastle } from './ring';

const TAU = Math.PI * 2;
const DARK = new Color('#14100c');

/** Vulcan (inferred): forge-fortress in basalt, long forge halls, chimneys, ember glow. */
export function vulcanCastle(k: Kit): void {
  const p = palette('vulcan', '#6e6760', '#3a342f');
  const base = k.gyLocal(0, 0);
  const ember = new Color('#ff9a3c');
  const R = 0.9;
  ringCastle(k, p, base, {
    n: 12,
    rMax: R,
    rimFit: true,
    wallH: 0.12,
    th: 0.09,
    gate: 9,
    towerR: 0.05,
    towerH: 0.17,
    towerRoof: 'crenel',
    gateOpts: { w: 0.28, towerR: 0.075, tall: 0.1, barbican: 0.2 },
  });
  // three long forge halls, each with a row of chimneys and glowing vents
  for (const [u, v, rot] of [
    [-0.45, 0.25, 0],
    [0.45, 0.25, 0],
    [0, 0.62, Math.PI / 2],
  ] as [number, number, number][]) {
    const len = rot === 0 ? 0.55 : 0.6;
    k.hall(u, v, 0.2, len, base, 0.07, 0.07, rot, { stone: p.stone2, roofC: p.roof });
    for (let i = 0; i < 3; i++) {
      const t = (i - 1) * len * 0.3;
      const cu = rot === 0 ? u : u + t;
      const cv = rot === 0 ? v + t : v;
      k.chimney(cu, cv, 0.035, base + 0.07, base + 0.24 + i * 0.02, p.stone2, p.trim);
      k.box('trim', cu, cv, 0.026, 0.026, base + 0.248 + i * 0.02, base + 0.254 + i * 0.02, 0, ember, {
        ao: 1,
        vary: 0.1,
      });
    }
    k.box(
      'trim',
      u,
      v + (rot === 0 ? -len / 2 - 0.002 : 0),
      rot === 0 ? 0.09 : 0.01,
      rot === 0 ? 0.008 : 0.09,
      base + 0.01,
      base + 0.05,
      0,
      ember,
      { ao: 1, vary: 0.1 },
    );
  }
  // the great forge: a squat keep crowned with a huge chimney tower
  k.squareTower(0, -0.2, 0.3, 0.26, base + 0.26, 0, { stone: p.stone, trim: p.trim, roof: 'crenel' });
  k.chimney(0, -0.2, 0.09, base + 0.26, base + 0.5, p.stone, p.trim);
  k.box('trim', 0, -0.2, 0.07, 0.07, base + 0.507, base + 0.514, 0, ember, { ao: 1, vary: 0.1 });
  k.pole(0.12, -0.2, base + 0.26, 0.22, p.trim);
  square(k, p, 0, -0.55, 0.16, 12);
}

/** Bacchus (inferred): low, wide, terraced; cellar halls and vine trellises. */
export function bacchusCastle(k: Kit): void {
  const p = palette('bacchus', '#bba98f', '#5b4a3a');
  const base = k.gyLocal(0, 0);
  const vine = new Color('#5f7d45');
  ringCastle(k, p, base, {
    n: 8,
    rMax: 1.0,
    shape: 'square',
    wallH: 0.08,
    th: 0.06,
    gate: 6,
    towerR: 0.05,
    towerH: 0.12,
    towerRoof: 'cone',
    roofH: 0.09,
    gateOpts: { w: 0.26, towerR: 0.065, tall: 0.07, barbican: 0.2 },
  });
  // two terraces stepping up toward the back (local +z)
  k.box('stone', 0, 0.2, 1.4, 0.7, base - 0.02, base + 0.05, 0, p.stone, { ao: 0.7 });
  k.box('trim', 0, 0.2, 1.42, 0.72, base + 0.038, base + 0.048, 0, p.trim, { ao: 1 });
  k.box('stone', 0, 0.62, 1.1, 0.34, base + 0.05, base + 0.1, 0, p.stone, { ao: 0.8 });
  k.box('trim', 0, 0.62, 1.12, 0.36, base + 0.088, base + 0.098, 0, p.trim, { ao: 1 });
  // long cellar halls (the wine stores) and a round tasting tower
  k.hall(-0.35, 0.62, 0.4, 0.2, base + 0.1, 0.045, 0.06, Math.PI / 2, { stone: p.stone2, roofC: p.roof });
  k.hall(0.35, 0.62, 0.4, 0.2, base + 0.1, 0.045, 0.06, Math.PI / 2, { stone: p.stone2, roofC: p.roof });
  k.tower(0, 0.64, 0.07, base + 0.27, {
    stone: p.stone,
    roofC: p.roof,
    trim: p.trim,
    roof: 'dome',
    roofH: 0.1,
    slits: 4,
  });
  k.pole(0, 0.64, base + 0.4, 0.16, p.trim);
  // vine trellis rows
  for (let r = 0; r < 4; r++) {
    const v = -0.1 + r * 0.1;
    for (const sx of [-1, 1]) {
      k.box('trim', sx * 0.5, v, 0.52, 0.014, base + 0.055, base + 0.085, 0, vine, { ao: 0.8, vary: 0.12 });
    }
  }
  k.hall(-0.6, -0.5, 0.2, 0.14, base, 0.05, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(0.6, -0.5, 0.2, 0.14, base, 0.05, 0.05, 0, { stone: p.stone2, roofC: p.roof });
}

/** Venus (inferred): elegant rose-stone pavilion palace, slender domed towers, colonnade. */
export function venusCastle(k: Kit): void {
  const p = palette('venus', '#dcbcb2', '#8a5568');
  const base = k.gyLocal(0, 0);
  ringCastle(k, p, base, {
    n: 12,
    rMax: 0.85,
    wallH: 0.075,
    th: 0.045,
    gate: 9,
    towerR: 0.032,
    towerH: 0.3,
    towerRoof: 'dome',
    roofH: 0.07,
    merlons: false,
    gateOpts: { w: 0.24, towerR: 0.055, tall: 0.12, roofH: 0.14 },
  });
  // round pavilion with a ring of slender columns and a rose dome
  k.cyl('stone', 0, 0, 0.3, 0.28, base - 0.02, base + 0.04, 24, p.stone2);
  k.cyl('stone', 0, 0, 0.17, 0.16, base + 0.04, base + 0.2, 20, p.stone);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    k.cyl(
      'stone',
      Math.cos(a) * 0.24,
      Math.sin(a) * 0.24,
      0.011,
      0.009,
      base + 0.04,
      base + 0.19,
      6,
      p.stone,
    );
  }
  k.cyl('trim', 0, 0, 0.27, 0.25, base + 0.19, base + 0.21, 24, p.trim, { ao: 1 });
  k.dome('roof', 0, 0, 0.2, base + 0.21, 0.17, p.roof);
  k.cyl('trim', 0, 0, 0.004, 0.002, base + 0.38, base + 0.46, 4, p.trim, { ao: 1 });
  // two wings and dove-cote towers
  for (const sx of [-1, 1]) {
    k.hall(sx * 0.46, 0.15, 0.16, 0.4, base, 0.06, 0.06, 0, { stone: p.stone2, roofC: p.roof });
    k.tower(sx * 0.46, 0.4, 0.04, base + 0.24, {
      stone: p.stone,
      roofC: p.roof,
      trim: p.trim,
      roof: 'dome',
      roofH: 0.07,
      slits: 3,
    });
  }
  square(k, p, 0, -0.5, 0.2, 16);
}

/** Mercury (inferred): slender and fast; tall thin towers, winged finials, a launch ramp. */
export function mercuryCastle(k: Kit): void {
  const p = palette('mercury', '#bcc6cc', '#4a5760');
  const base = k.gyLocal(0, 0);
  const wing = (u: number, v: number, y: number, s: number) => {
    for (const sg of [-1, 1]) {
      k.box('trim', u + sg * 0.045 * s, v, 0.1 * s, 0.014 * s, y, y + 0.006 * s, sg * 0.5, p.roof, {
        ao: 1,
        vary: 0.04,
      });
    }
  };
  ringCastle(k, p, base, {
    n: 8,
    rMax: 0.8,
    wallH: 0.08,
    th: 0.045,
    gate: 6,
    towerR: 0.032,
    towerH: 0.4,
    towerRoof: 'cone',
    roofH: 0.18,
    merlons: false,
    vertex: (_i, u, v) => {
      wing(u, v, base + 0.4 + 0.12, 1);
    },
    gateOpts: { w: 0.22, towerR: 0.05, tall: 0.14, roofH: 0.17 },
  });
  // central needle tower with big wings
  k.disc('trim', 0, 0, 0.28, base + 0.003, 20, p.pave);
  k.spire(0, 0, 0.05, base + 0.62, 0.26, p.stone, p.roof, p.trim);
  wing(0, 0, base + 0.62 + 0.14, 2);
  // low halls and a launch ramp (a long inclined slab) running out of the back
  k.hall(-0.35, 0.2, 0.16, 0.34, base, 0.05, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(0.35, 0.2, 0.16, 0.34, base, 0.05, 0.05, 0, { stone: p.stone2, roofC: p.roof });
  k.box('trim', 0, 0.55, 0.12, 0.34, base, base + 0.03, 0, p.pave, { ao: 1 });
  k.box('stone', 0, 0.55, 0.14, 0.36, base - 0.02, base + 0.01, 0, p.stone2);
}

/** Neptune (inferred): sea-castle on the headland, lighthouse and a sea gate with steps. */
export function neptuneCastle(k: Kit): void {
  const p = palette('neptune', '#cfd5d4', '#2d4f6b');
  const base = k.gyLocal(0, 0);
  const pts = ringCastle(k, p, base, {
    n: 12,
    rMax: 0.85,
    rimFit: true,
    wallH: 0.11,
    th: 0.06,
    gate: 9,
    towerR: 0.045,
    towerH: 0.18,
    towerRoof: 'mixed',
    roofH: 0.1,
    gateOpts: { w: 0.26, towerR: 0.07, tall: 0.1, barbican: 0.2 },
  });
  // seaward point = the vertex nearest the rim (smallest radius); lighthouse beside it, sea gate in the wall
  let sea = 0;
  let best = Infinity;
  pts.forEach((q, i) => {
    const r = Math.hypot(q[0], q[1]);
    if (i !== 9 && r < best) {
      best = r;
      sea = i;
    }
  });
  const [su, sv] = pts[sea]!;
  const sr = Math.hypot(su, sv);
  const nu = su / sr;
  const nv = sv / sr;
  k.tower(su - nu * 0.12, sv - nv * 0.12, 0.07, base + 0.5, {
    stone: new Color('#e8ecec'),
    roofC: p.roof,
    trim: p.trim,
    roof: 'dome',
    roofH: 0.07,
    slits: 4,
  });
  k.cyl(
    'trim',
    su - nu * 0.12,
    sv - nv * 0.12,
    0.085,
    0.085,
    base + 0.5 - 0.06,
    base + 0.5,
    10,
    new Color('#ffe9b0'),
    { ao: 1, vary: 0 },
  );
  k.pole(su - nu * 0.12, sv - nv * 0.12, base + 0.57, 0.14, p.trim);
  const out = Math.atan2(nu, nv);
  k.arch(su + nu * 0.034, sv + nv * 0.034, 0.06, 0.08, base - 0.01, out);
  for (let i = 0; i < 5; i++) {
    k.box(
      'stone',
      su + nu * (0.05 + i * 0.03),
      sv + nv * (0.05 + i * 0.03),
      0.09,
      0.03,
      base - 0.01 - i * 0.03,
      base - 0.005 - i * 0.03,
      -Math.atan2(nv, nu),
      p.stone2,
      { ao: 0.9 },
    );
  }
  // keep: a tall, slim hall-tower, plus quay buildings
  k.squareTower(0, 0.1, 0.24, 0.22, base + 0.3, 0, {
    stone: p.stone,
    trim: p.trim,
    roof: 'pyramid',
    roofC: p.roof,
    roofH: 0.16,
  });
  k.hall(-0.35, 0.3, 0.14, 0.36, base, 0.055, 0.055, 0, { stone: p.stone2, roofC: p.roof });
  k.hall(0.35, 0.3, 0.14, 0.36, base, 0.055, 0.055, 0, { stone: p.stone2, roofC: p.roof });
  k.pole(0, 0.1, base + 0.46, 0.16, p.trim);
  square(k, p, 0, -0.35, 0.18, 14);
}

/** Pluto (inferred): no castle; a cave mouth and a hidden gate in the hillside facing the gate direction. */
export function plutoCaves(k: Kit): void {
  const p = palette('pluto', '#9a94a4', '#c2bccb');
  const rock = new Color('#7d7787');
  const base = k.gyLocal(0, 0);
  const z = 0.8; // foot of the hillside (local +z is uphill)
  // ledge retaining wall in front of the mouth
  k.wall(
    [
      [-0.5, 0.42],
      [-0.2, 0.38],
      [0.2, 0.38],
      [0.5, 0.42],
    ],
    { topY: base + 0.05, th: 0.05, stone: p.stone, trim: p.trim, merlons: false },
  );
  // massive portal: jambs, lintel, dark mouth, tumbled boulders blending into the hill
  const gz = k.gy(0, z);
  k.box('stone', -0.15, z, 0.07, 0.12, gz - 0.04, gz + 0.26, 0, p.stone, { ao: 0.7 });
  k.box('stone', 0.15, z, 0.07, 0.12, gz - 0.04, gz + 0.26, 0, p.stone, { ao: 0.7 });
  k.box('trim', 0, z, 0.4, 0.12, gz + 0.24, gz + 0.31, 0, p.trim, { ao: 0.9 });
  k.arch(0, z - 0.062, 0.23, 0.25, gz - 0.005, Math.PI);
  k.box('trim', 0, z + 0.03, 0.23, 0.06, gz - 0.01, gz + 0.235, 0, DARK, { ao: 1, vary: 0 });
  for (let i = 0; i < 18; i++) {
    const u = (k.rng() - 0.5) * 0.7;
    const v = z + 0.06 + k.rng() * 0.16;
    if (Math.abs(u) < 0.2 && v < z + 0.1) continue;
    const r = 0.06 + k.rng() * 0.07;
    k.rock('stone', u, v, r, k.gy(u, v) - r * 0.35, rock, 0.85);
  }
  for (let i = 0; i < 6; i++) {
    const u = -0.2 + i * 0.08;
    k.rock('stone', u, z + 0.05, 0.1, gz + 0.26, rock, 0.6);
  }
  // the hidden gate: a small iron-banded door half-covered by a fallen slab, off to one side
  const hu = 0.42;
  k.box('stone', hu, z - 0.02, 0.1, 0.08, base - 0.02, base + 0.1, 0, p.stone, { ao: 0.7 });
  k.arch(hu, z - 0.065, 0.045, 0.065, base, Math.PI);
  k.rock('stone', hu - 0.05, z - 0.09, 0.05, k.gy(hu - 0.05, z - 0.09), rock, 1.2);
  k.rock('stone', hu + 0.05, z - 0.08, 0.04, k.gy(hu + 0.05, z - 0.08), rock, 1.0);
  k.pole(0.2, z - 0.1, base + 0.2, 0.1, p.trim);
}

/** Phobos tower: a slender stone tower on a rocky summit (p.168). */
export function phobosTower(k: Kit): void {
  const p = palette('mars', '#a09584', '#5f4e3e');
  const base = k.gyLocal(0, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.3;
    k.rock(
      'stone',
      Math.cos(a) * 0.14,
      Math.sin(a) * 0.14,
      0.05 + k.rng() * 0.04,
      base - 0.01,
      new Color('#8c8478'),
    );
  }
  k.cyl('stone', 0, 0, 0.1, 0.09, base - 0.02, base + 0.04, 10, p.stone2);
  k.tower(0, 0, 0.055, base + 0.36, {
    stone: p.stone,
    roofC: p.roof,
    trim: p.trim,
    roof: 'crenel',
    slits: 5,
  });
  k.cyl('stone', 0, 0, 0.07, 0.05, base + 0.31, base + 0.38, 10, p.stone, { ao: 0.9 });
  k.cone('roof', 0, 0, 0.075, base + 0.38, 0.12, 10, p.roof);
  k.pole(0, 0, base + 0.5, 0.12, p.trim);
}

/** Deimos tower: "massive" (p.168): a thick keep tower with buttresses and a ring wall. */
export function deimosTower(k: Kit): void {
  const p = palette('mars', '#9a8f80', '#5f4e3e');
  const base = k.gyLocal(0, 0);
  k.cyl('stone', 0, 0, 0.2, 0.19, base - 0.03, base + 0.03, 16, p.stone2);
  k.tower(0, 0, 0.13, base + 0.46, {
    stone: p.stone,
    roofC: p.roof,
    trim: p.trim,
    roof: 'crenel',
    slits: 6,
    seg: 16,
  });
  k.cone('roof', 0, 0, 0.1, base + 0.46, 0.14, 12, p.roof);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    k.cyl(
      'stone',
      Math.cos(a) * 0.15,
      Math.sin(a) * 0.15,
      0.05,
      0.035,
      k.gy(Math.cos(a) * 0.15, Math.sin(a) * 0.15) - 0.03,
      base + 0.3,
      8,
      p.stone,
      { ao: 0.7 },
    );
  }
  const ring: P[] = [];
  for (let i = 0; i <= 16; i++) ring.push([Math.cos((i / 16) * TAU) * 0.3, Math.sin((i / 16) * TAU) * 0.3]);
  k.wall(ring, { topY: base + 0.08, th: 0.04, stone: p.stone, trim: p.trim });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    k.tower(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.035, base + 0.14, {
      stone: p.stone,
      roofC: p.roof,
      trim: p.trim,
      roof: 'cone',
      roofH: 0.07,
    });
  }
  k.pole(0, 0, base + 0.6, 0.16, p.trim);
}

/** The Metas bridge: a stone bridge across the Metas, deck just above the water, in line with the crossing. */
export function metasBridge(k: Kit): void {
  const p = palette(null, '#b0a898', '#6a5c4a');
  const river = RIVERS.find((r) => r.id === 'metas')!;
  const u = distanceToPolyline(k.lm.position, river.points).u;
  const water = k.hf.riverSurfaceAt('metas', u);
  const half = 0.27;
  const bank = Math.max(k.gy(0, -half), k.gy(0, half));
  const deck = Math.max(bank + 0.012, water + 0.06);
  // approach abutments driven into each bank, arched piers over the water
  for (const s of [-1, 1]) {
    k.box('stone', 0, s * (half - 0.02), 0.08, 0.08, k.gy(0, s * half) - 0.04, deck, 0, p.stone, { ao: 0.7 });
    k.box('stone', 0, s * 0.085, 0.07, 0.03, water - 0.04, deck, 0, p.stone, { ao: 0.7 });
    k.pole(0.04, s * (half - 0.02), deck, 0.07, p.trim);
  }
  k.box('stone', 0, 0, 0.07, 2 * half, deck - 0.022, deck, 0, p.stone2, { ao: 0.9 });
  for (const sx of [-1, 1]) {
    k.box('stone', sx * 0.032, 0, 0.012, 2 * half, deck, deck + 0.022, 0, p.stone, { ao: 0.95 });
    k.arch(sx * 0.036, 0, 0.14, Math.max(0.03, deck - water - 0.03), water, (sx * Math.PI) / 2);
  }
}

/** Pass Fort: weatherworn stone fort on a low hill, ruined at the corners (p.183). */
export function passFort(k: Kit): void {
  const p = palette(null, '#8f887c', '#5c5448');
  const base = k.gyLocal(0, 0);
  const h = 0.24;
  const top = base + 0.075;
  // four wall runs with breaches
  const wallRun = (a: P, b: P) => k.wall([a, b], { topY: top, th: 0.045, stone: p.stone, trim: p.trim });
  wallRun([-h, -h], [-0.06, -h]);
  wallRun([0.06, -h], [h, -h]);
  wallRun([h, -h], [h, 0.02]);
  wallRun([h, 0.12], [h, h]);
  wallRun([-h, h], [0.1, h]);
  wallRun([-h, -h], [-h, 0.05]);
  const towers: [number, number, number][] = [
    [-h, -h, 0.14],
    [h, -h, 0.11],
    [h, h, 0.17],
    [-h, h, 0.08],
  ];
  for (const [u, v, t] of towers) {
    k.tower(u, v, 0.05, base + t, {
      stone: p.stone,
      roofC: p.roofDeep,
      trim: p.trim,
      roof: t > 0.12 ? 'crenel' : 'flat',
      slits: 2,
    });
  }
  k.hall(0.05, 0.02, 0.18, 0.14, base, 0.05, 0.04, 0.3, { stone: p.stone2, roofC: p.roofDeep });
  for (let i = 0; i < 6; i++)
    k.rock('stone', (k.rng() - 0.5) * 0.7, (k.rng() - 0.5) * 0.7, 0.025, base, new Color('#8a8378'));
  leanTo(k, p, 0.8, 0.2, 0.12, 0.05, base, 0.04, 0.03);
}
