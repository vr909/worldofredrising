/**
 * The thirteen House sigils: ORIGINAL designs, one filled silhouette each on a 64-unit grid (no strokes),
 * meant to be drawn in parchment on the House's `colorDeep` shield. Briefs come from src/world/houses.ts.
 * Heraldic and blunt on purpose: they must read at 16 px. Keep the visual mass of all thirteen similar
 * (roughly a 44 x 50 unit footprint, tapering towards the bottom to sit inside the downward shield).
 */
import type { HouseId } from '../world/types';
import { H, P, S, SH, bar, blade, circ, mx, rot, type Pt } from './shapes';

const wolf = [
  // head: sharp ears, broad cheeks, narrow muzzle
  S([
    [32, 25],
    [37, 23],
    [42, 3],
    [53, 28],
    [56, 40],
    [48, 50],
    [40, 56],
    [36, 62],
    [32, 63],
  ]),
  // eyes (slanted slits) and nose
  H([
    [35, 34],
    [48, 30],
    [41, 40],
  ]),
  H([
    [29, 34],
    [16, 30],
    [23, 40],
  ]),
  SH([
    [35, 52],
    [32, 57],
  ]),
].join('');

const owl = [
  // body + ear tufts
  S([
    [32, 12],
    [37, 12],
    [42, 3],
    [45, 15],
    [53, 22],
    [55, 38],
    [49, 53],
    [41, 61],
    [32, 63],
  ]),
  // eye rings with pupils
  circ(41, 27, 7.5, false),
  circ(41, 27, 3, true),
  circ(23, 27, 7.5, false),
  circ(23, 27, 3, true),
  // folded-wing chevrons
  H([
    [22, 43],
    [32, 51],
    [42, 43],
    [42, 46.5],
    [32, 54.5],
    [22, 46.5],
  ]),
  H([
    [26, 52],
    [32, 57],
    [38, 52],
    [38, 54.5],
    [32, 59.5],
    [26, 54.5],
  ]),
].join('');

const stag = [
  // head
  S([
    [32, 33],
    [40, 35],
    [44, 44],
    [42, 54],
    [37, 60],
    [32, 62],
  ]),
  // ears
  P([
    [41, 40],
    [56, 35],
    [49, 49],
    [42, 48],
  ]),
  P([
    [23, 40],
    [8, 35],
    [15, 49],
    [22, 48],
  ]),
  // antlers: beam, brow tine and crowns each side
  bar(38, 35, 44, 22, 6.5),
  bar(44, 22, 50, 5, 6),
  bar(41, 28, 53, 27, 4.8),
  bar(46, 16, 57, 12, 4.8),
  bar(49, 9, 41, 4, 4.2),
  bar(26, 35, 20, 22, 6.5),
  bar(20, 22, 14, 5, 6),
  bar(23, 28, 11, 27, 4.8),
  bar(18, 16, 7, 12, 4.8),
  bar(15, 9, 23, 4, 4.2),
  // eyes
  circ(37, 46, 2, false),
  circ(27, 46, 2, false),
].join('');

function sunRays(): string {
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const r1 = i % 2 === 0 ? 31 : 25;
    const w = 0.2;
    out.push(
      P([
        [32 + Math.cos(a - w) * 18, 32 + Math.sin(a - w) * 18],
        [32 + Math.cos(a) * r1, 32 + Math.sin(a) * r1],
        [32 + Math.cos(a + w) * 18, 32 + Math.sin(a + w) * 18],
      ]),
    );
  }
  return out.join('');
}
const lyreArm: Pt[] = [
  [22, 18],
  [25, 18],
  [26, 30],
  [30, 36],
  [30, 38],
  [26, 36],
  [22, 30],
];
const apollo = [
  sunRays(),
  circ(32, 32, 17, true),
  // lyre cut from the disc: two curving arms, yoke, string, base
  H(lyreArm),
  H(mx(lyreArm)),
  bar(32, 20, 32, 36, 2.2, false),
  bar(26.5, 16.5, 37.5, 16.5, 2.8, false),
  bar(32, 36, 32, 45, 3.4, false),
  bar(27, 45, 37, 45, 3, false),
].join('');

function ear(x: number, ang: number): string {
  const r = (pts: readonly Pt[]) => rot(pts, ang, x, 62);
  const top = r([[x, 28]])[0] as Pt;
  const parts = [bar(x, 63, top[0], top[1], 2.4)];
  for (let k = 0; k < 4; k++) {
    const y = 50 - k * 6;
    parts.push(P(r(blade(x, y, x - 5.5, y - 8, 2.5))), P(r(blade(x, y, x + 5.5, y - 8, 2.5))));
  }
  parts.push(P(r(blade(x, 31, x, 17, 2.8))));
  return parts.join('');
}
const ceres = [
  // sickle: crescent blade over the ear tips, handle at the right
  'M5 26A28 28 0 0 1 59 20L55 25A22 22 0 0 0 12 30Z',
  bar(54, 21, 60, 30, 4.5),
  // three distinct wheat ears (stalk + herringbone kernels), bound by a band near the base
  ear(19, -7),
  ear(32, 0),
  ear(45, 7),
  bar(11, 54, 53, 54, 4.6),
].join('');

// two fat zig-zag bolts crossed at +-35 degrees; each has two big kinks and pointed ends
const BOLT: Pt[] = [
  [38, 0],
  [12, 33],
  [27, 33],
  [19, 64],
  [52, 22],
  [35, 22],
];
const slim = (dy: number): Pt[] => BOLT.map(([x, y]): Pt => [32 + (x - 32) * 0.62, y + dy]);
// two slim bolts crossed at +-28 degrees; the crossing sits low on the thin tips so both kinks stay readable
const jupiter = [P(rot(slim(-4), 28, 32, 32)), P(mx(rot(slim(-4), 28, 32, 32)))].join('');

const trainRim: Pt[] = [];
for (let a = 38; a <= 142; a += 7) {
  const r = Math.round((a - 38) / 7) % 2 === 0 ? 25 : 21.5;
  const rad = (a * Math.PI) / 180;
  trainRim.push([40 + Math.cos(rad) * r, 38 + Math.sin(rad) * r]);
}
const eye = (a: number, r: number): string => {
  const rad = (a * Math.PI) / 180;
  const x = 40 + Math.cos(rad) * r;
  const y = 38 + Math.sin(rad) * r;
  return circ(x, y, 3.4, false) + circ(x, y, 1.3, true);
};
const juno = [
  // crest: three dots on short stalks
  circ(13, 3.5, 2, true),
  circ(18.5, 2, 2, true),
  circ(24, 3.5, 2, true),
  bar(13.6, 5, 16.5, 9, 1.3),
  bar(18.5, 4, 18.5, 8, 1.3),
  bar(23.4, 5, 20.5, 9, 1.3),
  // head, beak, S-neck, body
  circ(19, 12, 4.6, true),
  P([
    [14.8, 11],
    [6, 14],
    [14.8, 14.5],
  ]),
  bar(20, 15, 27, 25, 5.4),
  P([
    [26, 25],
    [34, 21],
    [46, 24],
    [52, 32],
    [46, 40],
    [34, 40],
    [27, 33],
  ]),
  // trailing fan with eyed feathers
  P([[40, 38], ...trainRim]),
  eye(64, 16),
  eye(90, 16),
  eye(116, 16),
].join('');

const pluto = [
  // bident: two prongs with barbs, shaft
  bar(32, 18, 32, 38, 4.5),
  bar(20, 18, 44, 18, 4.5),
  bar(22, 18, 22, 8, 4.5),
  bar(42, 18, 42, 8, 4.5),
  P([
    [17.5, 10],
    [22, 0.5],
    [26.5, 10],
  ]),
  P([
    [37.5, 10],
    [42, 0.5],
    [46.5, 10],
  ]),
  P([
    [17.5, 15],
    [10, 9],
    [18, 11],
  ]),
  P([
    [46.5, 15],
    [54, 9],
    [46, 11],
  ]),
  // closed door: arched, with a keyhole
  'M16 63V47A16 16 0 0 1 48 47V63Z',
  circ(32, 49, 2.6, false),
  H([
    [30.8, 50],
    [33.2, 50],
    [34, 57],
    [30, 57],
  ]),
].join('');

const vulcan = [
  // anvil
  P([
    [6, 41],
    [58, 41],
    [52, 48],
    [41, 49],
    [38, 56],
    [46, 63],
    [18, 63],
    [26, 56],
    [23, 49],
    [14, 48],
  ]),
  // hammer: head tilted, handle rising up and left
  P(
    rot(
      [
        [10, 24],
        [42, 24],
        [42, 37],
        [10, 37],
      ],
      -18,
      26,
      30,
    ),
  ),
  bar(26, 30, 12, 1, 4.6),
  // sparks
  P([
    [8, 40],
    [11, 36],
    [14, 40],
    [11, 44],
  ]),
  P([
    [50, 33],
    [52.5, 29],
    [55, 33],
    [52.5, 37],
  ]),
  P([
    [44, 22],
    [46, 19],
    [48, 22],
    [46, 25],
  ]),
].join('');

const venus = [
  // one dove in flight, wings raised, myrtle sprig in the beak
  circ(15, 31, 5, true),
  P([
    [11, 30],
    [2, 32],
    [11, 34],
  ]),
  P([
    [14, 34],
    [25, 30],
    [42, 38],
    [60, 54],
    [43, 53],
    [27, 47],
    [17, 40],
  ]),
  P([
    [24, 37],
    [13, 20],
    [17, 5],
    [29, 10],
    [34, 26],
    [34, 40],
  ]),
  P([
    [34, 38],
    [36, 14],
    [47, 2],
    [57, 9],
    [53, 26],
    [45, 42],
  ]),
  H([
    [21, 11],
    [25, 20],
    [22, 21],
  ]),
  H([
    [47, 10],
    [50, 17],
    [47, 18],
  ]),
  // sprig hangs from the beak tip (joined to it)
  bar(3, 32, 4, 42, 2),
  P(blade(4, 36, 11, 38, 2.6)),
  P(blade(4, 40, 11, 44, 2.6)),
  P(blade(4, 43, 0, 49, 2.6)),
].join('');

const mercury = [
  // helm: dome with cheek guards
  S([
    [32, 15],
    [40, 16],
    [45, 24],
    [46, 40],
    [42, 52],
    [36, 56],
    [32, 56],
  ]),
  // face opening
  SH([
    [32, 33],
    [38, 33],
    [37, 49],
    [32, 49],
  ]),
  // wings: three feathers per side
  P(blade(44, 26, 62, 7, 4.2)),
  P(blade(45, 33, 63, 22, 4.2)),
  P(blade(45, 40, 61, 37, 4)),
  P(blade(20, 26, 2, 7, 4.2)),
  P(blade(19, 33, 1, 22, 4.2)),
  P(blade(19, 40, 3, 37, 4)),
  // crest ridge
  P([
    [29, 9],
    [35, 9],
    [36, 16],
    [28, 16],
  ]),
].join('');

const neptune = [
  // trident
  bar(32, 12, 32, 54, 5),
  bar(20, 24, 44, 24, 4.4),
  bar(20, 24, 20, 8, 4),
  bar(44, 24, 44, 8, 4),
  P([
    [16, 11],
    [20, 0.5],
    [24, 11],
  ]),
  P([
    [40, 11],
    [44, 0.5],
    [48, 11],
  ]),
  P([
    [28, 12],
    [32, 0.5],
    [36, 12],
  ]),
  // wave: two rolling crests at the base
  'M3 63V55Q6 45 16 47Q24 49 22 56Q26 47 35 48Q42 49 41 56Q45 49 54 52Q60 54 61 58V63Z',
].join('');

const grape: Pt[] = [];
(
  [
    [4, 31],
    [3, 40],
    [2, 49],
    [1, 58],
  ] as const
).forEach(([n, y]) => {
  for (let i = 0; i < n; i++) grape.push([32 + (i - (n - 1) / 2) * 11, y]);
});
const bacchus = [
  ...grape.map(([x, y]) => circ(x, y, 5, true)),
  // vine leaf and stem
  S([
    [32, 0],
    [37, 8],
    [47, 5],
    [44, 14],
    [55, 16],
    [46, 23],
    [38, 23],
    [34, 26],
    [32, 26],
  ]),
  bar(32, 24, 32, 28, 2.4),
].join('');

export const SIGILS: Record<HouseId, { path: string }> = {
  mars: { path: wolf },
  minerva: { path: owl },
  diana: { path: stag },
  apollo: { path: apollo },
  ceres: { path: ceres },
  jupiter: { path: jupiter },
  juno: { path: juno },
  pluto: { path: pluto },
  vulcan: { path: vulcan },
  venus: { path: venus },
  mercury: { path: mercury },
  neptune: { path: neptune },
  bacchus: { path: bacchus },
};
