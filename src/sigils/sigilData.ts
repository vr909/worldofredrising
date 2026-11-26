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

const ceres = [
  // sickle: a broad crescent arching over the sheaf, handle at the right
  'M5 27A28 28 0 0 1 59 21L55 26A22 22 0 0 0 12 31Z',
  bar(54, 22, 60, 31, 4.5),
  // sheaf: five fanned ears and a tied waist
  ...[-34, -17, 0, 17, 34].map((a) => P(rot(blade(32, 64, 32, 26 + Math.abs(a) * 0.25, 5.6), a, 32, 64))),
  H([
    [20, 49],
    [44, 49],
    [43, 53],
    [21, 53],
  ]),
].join('');

const bolt: Pt[] = [
  [35, 0],
  [47, 0],
  [41, 26],
  [50, 26],
  [27, 64],
  [31, 37],
  [22, 37],
];
const jupiter = [P(rot(bolt, 24)), P(mx(rot(bolt, 24)))].join('');

const juno = [
  // crest
  circ(19, 5.5, 2, true),
  circ(14, 7, 2, true),
  circ(24, 7, 2, true),
  bar(19, 7, 19, 12, 1.6),
  bar(14, 8, 17, 12, 1.4),
  bar(24, 8, 21, 12, 1.4),
  // head, beak, neck, body
  circ(19, 15, 5, true),
  P([
    [14, 15],
    [5, 17],
    [14, 18],
  ]),
  P([
    [16, 18],
    [22, 18],
    [31, 31],
    [25, 34],
  ]),
  P([
    [24, 30],
    [40, 26],
    [52, 36],
    [46, 46],
    [34, 48],
    [26, 40],
  ]),
  // train: three long eyed feathers falling below the body
  P(blade(36, 40, 36, 64, 8)),
  P(blade(34, 40, 17, 58, 6.5)),
  P(blade(38, 40, 55, 58, 6.5)),
  circ(36, 55, 3.6, false),
  circ(36, 55, 1.3, true),
  circ(23, 53, 3, false),
  circ(49, 53, 3, false),
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
  // dove in flight, facing left: head, beak, body, tail, raised wing
  circ(16, 27, 6, true),
  P([
    [11, 26],
    [2, 29],
    [11, 31],
  ]),
  P([
    [14, 30],
    [24, 27],
    [38, 34],
    [60, 54],
    [44, 52],
    [28, 48],
    [18, 40],
  ]),
  P([
    [20, 34],
    [26, 12],
    [40, 2],
    [54, 3],
    [47, 16],
    [40, 30],
    [34, 46],
  ]),
  H([
    [38, 14],
    [44, 8],
    [46, 10],
    [41, 18],
  ]),
  H([
    [33, 24],
    [40, 18],
    [42, 20],
    [36, 28],
  ]),
  // myrtle sprig hanging from the beak
  bar(5, 31, 9, 56, 2),
  P(blade(5.6, 38, 15, 36, 3.2)),
  P(blade(5.6, 38, -1, 34, 3.2)),
  P(blade(7, 47, 17, 47, 3.2)),
  P(blade(7, 47, 0, 45, 3.2)),
  P(blade(9, 56, 15, 62, 3)),
  P(blade(9, 56, 3, 62, 3)),
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
