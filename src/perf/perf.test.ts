import { describe, expect, it, vi } from 'vitest';
import { bakeSize, bakeUv } from './bake';
import { isSoftwareRenderer } from './detect';
import { parsePerfOverrides } from './params';
import { newRefine, refineStep, stillDpr } from './refine';

// settings.ts imports the zustand store, which reads the URL at import time.
vi.stubGlobal('window', { location: { search: '', hash: '' } });
const { degrade, isTooSlow, monitorStep, newMonitor, restore, startupFlags } = await import('./settings');

describe('isSoftwareRenderer', () => {
  it('flags CPU rasterisers', () => {
    expect(
      isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'),
    ).toBe(true);
    expect(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(isSoftwareRenderer('Microsoft Basic Render Driver')).toBe(true);
  });
  it('leaves real GPUs alone', () => {
    expect(isSoftwareRenderer('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)')).toBe(
      false,
    );
    expect(isSoftwareRenderer('Apple M2')).toBe(false);
    expect(isSoftwareRenderer('')).toBe(false);
  });
});

describe('startupFlags', () => {
  it('software gets the cheapest settings and demand rendering', () => {
    const f = startupFlags('medium', true);
    expect(f).toMatchObject({ software: true, detail: 0, shadows: false, mist: false, frameloop: 'demand' });
    expect(f.dpr).toBeLessThan(1);
  });
  it('real GPUs keep the tier look but cap the ambient tick', () => {
    const f = startupFlags('high', false);
    expect(f).toMatchObject({ software: false, detail: 2, shadows: true, mist: true, frameloop: 'demand' });
    expect(f.ambientFps).toBeLessThanOrEqual(30);
  });
  it('demand=0 keeps the always loop', () => {
    expect(startupFlags('medium', false, false).frameloop).toBe('always');
  });
});

describe('degrade / restore ladder', () => {
  it('walks down to a floor and back up to the start flags', () => {
    const start = startupFlags('high', false);
    let f = start;
    let steps = 0;
    for (let n = degrade(f); n; n = degrade(f)) {
      f = n;
      expect(++steps).toBeLessThan(30);
    }
    expect(f).toMatchObject({ dpr: 0.75, shadows: false, mist: false, detail: 0, ambientFps: 0 });
    for (let n = restore(f, start); n; n = restore(f, start)) {
      f = n;
      expect(++steps).toBeLessThan(60);
    }
    expect(f).toEqual(start);
  });
});

describe('monitorStep', () => {
  it('degrades after sustained slow frames, ignores idle gaps and idle ambient ticks', () => {
    const m = newMonitor();
    let acts = 0;
    for (let i = 0; i < 400; i++) if (monitorStep(m, 1 / 30, 30, i / 30, true) === 'degrade') acts++;
    expect(acts).toBe(0); // 30 fps at a 30 fps ambient tick is idle ticking, not stress
    const m2 = newMonitor();
    let degraded = false;
    for (let i = 0; i < 400; i++) degraded ||= monitorStep(m2, 0.06, 30, i * 0.06, true) === 'degrade';
    expect(degraded).toBe(true);
    const m3 = newMonitor();
    for (let i = 0; i < 100; i++) expect(monitorStep(m3, 2, 30, i, true)).toBe('none');
  });
  it('restores after a long run of fast frames', () => {
    const m = newMonitor();
    let restored = false;
    for (let i = 0; i < 1500; i++) restored ||= monitorStep(m, 1 / 120, 30, i / 120, true) === 'restore';
    expect(restored).toBe(true);
  });
});

describe('isTooSlow', () => {
  it('uses the median so a single compile hitch does not count', () => {
    expect(isTooSlow([0.016, 0.016, 0.9, 0.016, 0.016, 0.016])).toBe(false);
    expect(isTooSlow([0.4, 0.5, 0.45, 0.6, 0.5, 0.4])).toBe(true);
    expect(isTooSlow([0.5])).toBe(false);
  });
});

describe('overrides and bake geometry', () => {
  it('automation defaults to no adaptation, a real browser to adaptation', () => {
    expect(parsePerfOverrides('', true).adapt).toBe(false);
    expect(parsePerfOverrides('', false).adapt).toBe(true);
    expect(parsePerfOverrides('?software=1&demand=0&detail=1', false)).toMatchObject({
      software: true,
      demand: false,
      flags: { detail: 1 },
    });
  });
  it('maps terrain corners to the unit square with square texels', () => {
    expect(bakeUv(-45, -33)).toEqual([0, 0]);
    expect(bakeUv(45, 33)).toEqual([1, 1]);
    expect(bakeSize(2048)).toEqual({ width: 2048, height: 1502 });
  });
});

describe('progressive refinement', () => {
  const sw = startupFlags('medium', true);
  const gpu = startupFlags('medium', false);
  it('software stills go to dpr 1 and back to the interactive dpr on wake', () => {
    expect(stillDpr(sw, 1)).toBe(1);
    expect(stillDpr(sw, 1.5)).toBe(1.25);
    expect(stillDpr(sw, 3)).toBe(1.25);
    expect(stillDpr(sw, 0.5)).toBe(0.6); // never below the interactive dpr
    const a = refineStep(newRefine(), 'settled', 0.6, stillDpr(sw, 1));
    expect(a).toMatchObject({ dpr: 1, state: { active: true, base: 0.6 } });
    expect(refineStep(a.state, 'settled', 1, 1).dpr).toBeNull(); // no double refine
    const b = refineStep(a.state, 'wake', 1, 1);
    expect(b).toMatchObject({ dpr: 0.6, state: { active: false } });
    expect(refineStep(b.state, 'wake', 0.6, 1).dpr).toBeNull();
  });
  it('real GPUs only refine back up to the startup dpr after an adaptive drop', () => {
    expect(refineStep(newRefine(), 'settled', gpu.dpr, stillDpr(gpu)).dpr).toBeNull();
    const dropped = refineStep(newRefine(), 'settled', 0.75, stillDpr(gpu));
    expect(dropped.dpr).toBe(gpu.dpr);
    expect(dropped.state.base).toBe(0.75);
  });
});
