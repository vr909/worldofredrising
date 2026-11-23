import { describe, expect, it } from 'vitest';
import { LANDMARKS, RIVERS } from '../world/layout';
import { indexLine, lineAt, nearestOnLine, type LinePoint, type Nearest } from './gen/sdf';
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

// ---------------------------------------------------------------------------------------------
// T01 terrain generator v2
// ---------------------------------------------------------------------------------------------

const CS = 0.25;
const fine = generateHeightfield({ cellSize: CS, seed: 1729 });
const lines = RIVERS.map((r) => ({ id: r.id, line: indexLine(r.points), w: r.width }));
const near: Nearest = { dist: 0, u: 0, seg: 0 };
const pt: LinePoint = { x: 0, z: 0, tx: 0, tz: 0 };

/** Smallest distance from (x, z) to a river channel's edge, over all rivers. */
function channelClearance(x: number, z: number): number {
  let best = Infinity;
  for (const r of lines) {
    nearestOnLine(r.line, x, z, near);
    best = Math.min(best, near.dist - 0.5 * (r.w[0] + (r.w[1] - r.w[0]) * near.u));
  }
  return best;
}

const cellIndex = (x: number, z: number) =>
  Math.round((z - fine.minZ) / CS) * fine.cols + Math.round((x - fine.minX) / CS);

describe('terrain generator v2', () => {
  it('is deterministic for a seed and differs between seeds', () => {
    const a = generateHeightfield({ cellSize: 0.5, seed: 7 });
    const b = generateHeightfield({ cellSize: 0.5, seed: 7 });
    const c = generateHeightfield({ cellSize: 0.5, seed: 8 });
    expect(Array.from(a.heights)).toEqual(Array.from(b.heights));
    expect(Array.from(a.surface.ao)).toEqual(Array.from(b.surface.ao));
    expect(Array.from(a.heights)).not.toEqual(Array.from(c.heights));
  });

  it('keeps plateau tops flat within 0.01 over site.radius (hill, flat, river sites)', () => {
    const sites = LANDMARKS.filter(
      (l) =>
        (l.site.ground === 'hill' || l.site.ground === 'flat' || l.site.ground === 'river') &&
        l.kind !== 'bridge',
    );
    expect(sites.length).toBeGreaterThan(10);
    for (const l of sites) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let ring = 0; ring <= 6; ring++) {
        const r = (ring / 6) * l.site.radius;
        const n = ring === 0 ? 1 : 8 * ring;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const x = l.position[0] + Math.cos(a) * r;
          const z = l.position[1] + Math.sin(a) * r;
          // The river channel itself is cut into a pad; the banks either side must be level.
          if (channelClearance(x, z) < 2 * CS + 0.15) continue;
          const h = fine.heightAt(x, z);
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
      }
      expect(hi - lo, `${l.id} pad flatness`).toBeLessThanOrEqual(0.01);
    }
  });

  it('lifts Mars above its glen with cliffs on N/E/S and a ramp on the west', () => {
    const mars = LANDMARKS.find((l) => l.id === 'castle-mars')!;
    const [cx, cz] = mars.position;
    const R = mars.site.radius;
    const top = fine.heightAt(cx, cz);
    const at = (dx: number, dz: number) => fine.heightAt(cx + dx, cz + dz);
    // Compass: north = -z, east = +x, south = +z, west = -x.
    const drop = (dx: number, dz: number) =>
      at(dx * (R - 0.1), dz * (R - 0.1)) - at(dx * (R + 0.55), dz * (R + 0.55));
    expect(drop(0, -1), 'north cliff').toBeGreaterThan(0.14);
    expect(drop(1, 0), 'east cliff').toBeGreaterThan(0.14);
    expect(drop(0, 1), 'south cliff').toBeGreaterThan(0.14);
    expect(drop(-1, 0), 'west ramp is gentle').toBeLessThan(0.08);
    expect(top).toBeGreaterThan(at(R + 0.8, 0) + 0.2);
    // Steep: a 45+ degree face somewhere on the north side.
    let steepest = 0;
    for (let dz = R - 0.2; dz < R + 0.6; dz += 0.05) {
      steepest = Math.max(steepest, Math.abs(at(0, -dz - 0.05) - at(0, -dz)) / 0.05);
    }
    expect(steepest).toBeGreaterThan(0.8);
  });

  it('rises continuously from the valley edge to the canyon walls, with no trough', () => {
    for (const z of [-30, -20, -10, 0, 10, 20, 30]) {
      let minH = Infinity;
      for (let x = -50; x <= -30; x += 0.25) minH = Math.min(minH, fine.heightAt(x, z));
      expect(minH, `west z=${z}`).toBeGreaterThan(1.0);
    }
    for (const z of [-30, -15, 0, 15, 30]) {
      let prev = -Infinity;
      for (let x = 44; x <= fine.maxX; x += 0.25) {
        const h = fine.heightAt(x, z);
        // Terraces are level ledges, never dips: allow only the rim's small noise.
        expect(h, `east z=${z} x=${x}`).toBeGreaterThan(prev - 0.12);
        prev = h;
      }
      expect(prev).toBeGreaterThan(5);
    }
  });

  it('keeps river banks above the water and beds below it, ribbons never buried', () => {
    for (const r of lines) {
      const hw = (u: number) => 0.5 * (r.w[0] + (r.w[1] - r.w[0]) * u);
      for (let u = 0.04; u <= 0.94; u += 0.02) {
        lineAt(r.line, u, pt);
        const surf = fine.riverSurfaceAt(r.id, u);
        expect(fine.heightAt(pt.x, pt.z), `${r.id} bed u=${u.toFixed(2)}`).toBeLessThan(surf);
        for (const o of [-0.9, 0.9]) {
          expect(
            fine.heightAt(pt.x - pt.tz * o * hw(u), pt.z + pt.tx * o * hw(u)),
            `${r.id} ribbon edge u=${u.toFixed(2)}`,
          ).toBeLessThan(surf);
        }
        for (const side of [-1, 1]) {
          // Banks are measured beyond the channel the grid can resolve (about 1.6 cells wide).
          const off = hw(u) + 1.6 * CS + 0.15;
          const bx = pt.x - pt.tz * side * off;
          const bz = pt.z + pt.tx * side * off;
          // Skip points that fall in another river's channel (confluences) or in water bodies.
          if (channelClearance(bx, bz) < 0.2 || fine.surface.water[cellIndex(bx, bz)]! > 0) continue;
          expect(fine.heightAt(bx, bz), `${r.id} bank u=${u.toFixed(2)} side ${side}`).toBeGreaterThan(surf);
        }
      }
    }
  });

  it('shapes rock, sand and wall splats as documented', () => {
    // Canyon wall stone on the walls, sand on the South Sea beach, no sand far inland.
    expect(fine.surface.splatB[cellIndex(48, 0) * 4 + 2]!).toBeGreaterThan(200);
    expect(fine.surface.splatA[cellIndex(-5, 18.9) * 4 + 3]!).toBeGreaterThan(100);
    expect(fine.surface.splatA[cellIndex(25, -20) * 4 + 3]!).toBe(0);
    // AO is bright on open plains.
    expect(fine.surface.ao[cellIndex(5, 0)]!).toBeGreaterThan(230);
  });
});
