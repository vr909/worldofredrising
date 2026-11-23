import { describe, expect, it } from 'vitest';
import { LANDMARKS, RIVERS } from '../world/layout';
import { generateHeightfield } from './heightfield';

// Coarse grid keeps the test fast; the contract must hold at any resolution.
const hf = generateHeightfield({ cellSize: 0.75, seed: 1729 });

describe('heightfield contract', () => {
  it('has consistent dimensions', () => {
    expect(hf.heights.length).toBe(hf.cols * hf.rows);
    expect(hf.surface.splatA.length).toBe(hf.cols * hf.rows * 4);
    expect(hf.surface.splatB.length).toBe(hf.cols * hf.rows * 4);
    expect(hf.surface.ao.length).toBe(hf.cols * hf.rows);
    expect(hf.surface.water.length).toBe(hf.cols * hf.rows);
  });

  it('produces finite heights within a sane range', () => {
    for (const h of hf.heights) {
      expect(Number.isFinite(h)).toBe(true);
      expect(h).toBeGreaterThan(-2);
      expect(h).toBeLessThan(8);
    }
  });

  it('raises canyon walls near 6 km at the east and west edges', () => {
    expect(hf.heightAt(hf.minX + 1, 0)).toBeGreaterThan(4.5);
    expect(hf.heightAt(hf.maxX - 1, 0)).toBeGreaterThan(4.5);
  });

  it('keeps the South Sea below sea level', () => {
    expect(hf.heightAt(0, 27)).toBeLessThan(0);
  });

  it('makes river surfaces flow downhill', () => {
    for (const r of RIVERS) {
      let prev = Infinity;
      for (let u = 0; u <= 1.0001; u += 0.05) {
        const s = hf.riverSurfaceAt(r.id, u);
        expect(s, `${r.id} at u=${u.toFixed(2)}`).toBeLessThanOrEqual(prev + 1e-6);
        prev = s;
      }
    }
  });

  it('puts the mountains above the plains and Mars on raised ground', () => {
    expect(hf.heightAt(-36, -12)).toBeGreaterThan(hf.heightAt(-5, 0) + 0.8);
    const mars = LANDMARKS.find((l) => l.id === 'castle-mars')!;
    expect(hf.heightAt(...mars.position)).toBeGreaterThan(hf.heightAt(-5, 0));
  });
});
