import { describe, expect, it } from 'vitest';
import { LANDMARKS, REGIONS, RIVERS } from '../world/layout';
import { PLACES } from './places';
import { PlaceContent } from './schema';

const knownIds = new Set([...LANDMARKS, ...REGIONS, ...RIVERS].map((x) => x.id));

describe('lore content', () => {
  it('validates against the schema', () => {
    for (const p of PLACES) {
      const r = PlaceContent.safeParse(p);
      expect(r.success, `${p.id}: ${r.success ? '' : r.error.message}`).toBe(true);
    }
  });

  it('only describes places that exist in the layout, once each', () => {
    const ids = PLACES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(knownIds.has(id), id).toBe(true);
    for (const p of PLACES) for (const r of p.related) expect(knownIds.has(r), `${p.id} → ${r}`).toBe(true);
  });

  it('explains every inferred placement', () => {
    for (const p of PLACES) if (p.confidence === 'inferred') expect(p.inference, p.id).toBeTruthy();
  });

  it('agrees with the layout on confidence', () => {
    for (const p of PLACES) {
      const l = LANDMARKS.find((x) => x.id === p.id);
      if (l) expect(p.confidence, p.id).toBe(l.confidence);
    }
  });
});
