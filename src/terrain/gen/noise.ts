/**
 * Seeded 2D gradient noise with analytic derivatives, allocation-free.
 * The derivative is what lets us damp octaves on steep ground, which gives the "eroded" look
 * (smooth slopes, detailed flats and gulches) without running a real erosion simulation.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Noise2 {
  /** Noise value in roughly [-1, 1]. Derivatives of the last call are in dx / dz. */
  sample(x: number, z: number): number;
  dx: number;
  dz: number;
}

export function createNoise(seed: number): Noise2 {
  const rnd = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j]!, p[i]!];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;
  const GX = new Float64Array(16);
  const GZ = new Float64Array(16);
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.37) / 16) * Math.PI * 2;
    GX[i] = Math.cos(a);
    GZ[i] = Math.sin(a);
  }

  const n: Noise2 = {
    dx: 0,
    dz: 0,
    sample(x: number, z: number): number {
      const xf = Math.floor(x);
      const zf = Math.floor(z);
      const xi = xf & 255;
      const zi = zf & 255;
      const fx = x - xf;
      const fz = z - zf;
      const a = perm[xi]! + zi;
      const b = perm[xi + 1]! + zi;
      const h00 = perm[a]! & 15;
      const h10 = perm[b]! & 15;
      const h01 = perm[a + 1]! & 15;
      const h11 = perm[b + 1]! & 15;
      const gx00 = GX[h00]!;
      const gz00 = GZ[h00]!;
      const gx10 = GX[h10]!;
      const gz10 = GZ[h10]!;
      const gx01 = GX[h01]!;
      const gz01 = GZ[h01]!;
      const gx11 = GX[h11]!;
      const gz11 = GZ[h11]!;
      const g00 = gx00 * fx + gz00 * fz;
      const g10 = gx10 * (fx - 1) + gz10 * fz;
      const g01 = gx01 * fx + gz01 * (fz - 1);
      const g11 = gx11 * (fx - 1) + gz11 * (fz - 1);
      const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
      const v = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
      const du = 30 * fx * fx * (fx - 1) * (fx - 1);
      const dv = 30 * fz * fz * (fz - 1) * (fz - 1);
      const k1 = g10 - g00;
      const k2 = g01 - g00;
      const k3 = g00 - g10 - g01 + g11;
      const S = 1.45;
      n.dx =
        S *
        (gx00 +
          u * (gx10 - gx00) +
          v * (gx01 - gx00) +
          u * v * (gx00 - gx10 - gx01 + gx11) +
          du * (k1 + v * k3));
      n.dz =
        S *
        (gz00 +
          u * (gz10 - gz00) +
          v * (gz01 - gz00) +
          u * v * (gz00 - gz10 - gz01 + gz11) +
          dv * (k2 + u * k3));
      return S * (g00 + u * k1 + v * k2 + u * v * k3);
    },
  };
  return n;
}
