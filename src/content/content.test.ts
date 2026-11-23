import { describe, expect, it } from 'vitest';
import { LANDMARKS, REGIONS, RIVERS } from '../world/layout';
import { HOUSES } from '../world/houses';
import { HOUSE_LORE } from './houses';
import { PLACES } from './places';
import { HouseContent, PlaceContent } from './schema';

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

  it('covers every landmark, labelled region, marsh, loch and named river', () => {
    const have = new Set(PLACES.map((p) => p.id));
    const need = [
      ...LANDMARKS.map((l) => l.id),
      ...REGIONS.filter((r) => r.labelled || r.id === 'southern-marshes' || r.id === 'highland-loch').map(
        (r) => r.id,
      ),
      'argos',
      'furor',
      'metas',
    ];
    for (const id of need) expect(have.has(id), id).toBe(true);
  });

  it('agrees with the layout on confidence for regions and rivers too', () => {
    for (const p of PLACES) {
      const x = [...REGIONS, ...RIVERS].find((r) => r.id === p.id);
      if (x) expect(p.confidence, p.id).toBe(x.confidence);
    }
  });

  it('lists the page of every quote in pages', () => {
    for (const p of PLACES)
      for (const q of p.quotes) expect(p.pages.includes(q.page), `${p.id} p.${q.page}`).toBe(true);
  });
});

describe('house lore', () => {
  it('validates against the schema', () => {
    for (const h of Object.values(HOUSE_LORE)) {
      const r = HouseContent.safeParse(h);
      expect(r.success, `${h.id}: ${r.success ? '' : r.error.message}`).toBe(true);
    }
  });

  it('has an entry for each of the 13 houses, keyed by its own id', () => {
    const ids = Object.keys(HOUSES).sort();
    expect(ids).toHaveLength(13);
    expect(Object.keys(HOUSE_LORE).sort()).toEqual(ids);
    for (const [key, h] of Object.entries(HOUSE_LORE)) expect(h.id).toBe(key);
  });

  it('cites a page for every student that is also listed in the house pages', () => {
    for (const h of Object.values(HOUSE_LORE))
      for (const s of h.students) expect(h.pages.includes(s.page), `${h.id}/${s.name}`).toBe(true);
  });
});
