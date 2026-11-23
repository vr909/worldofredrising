import { describe, expect, it } from 'vitest';
import { olympusAnchor, placeMist } from './mistPlacement';

const hf = {
  heightAt: (x: number, z: number) => 0.4 + 0.3 * Math.sin(x * 0.9) * Math.cos(z * 0.8),
  riverSurfaceAt: () => 0.2,
};

describe('placeMist', () => {
  const a = placeMist(hf);
  it('is deterministic and packs 4 floats per instance', () => {
    const b = placeMist(hf);
    expect(Array.from(b.pos)).toEqual(Array.from(a.pos));
    expect(a.pos.length).toBe(a.count * 4);
    expect(a.size.length).toBe(a.count * 4);
    expect(a.count).toBeGreaterThan(20);
  });
  it('keeps the Olympus collar clear of the ground', () => {
    const o = olympusAnchor(hf);
    const clouds = [...Array(a.count).keys()].filter((i) => a.size[i * 4 + 3] === 1);
    expect(clouds.length).toBeGreaterThan(10);
    for (const i of clouds) {
      const bottom = a.pos[i * 4 + 1]! - a.size[i * 4 + 1]! / 2;
      expect(bottom).toBeGreaterThan(o.y - 2.4); // ground is 2.6 below the island
    }
  });
});
