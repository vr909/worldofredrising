/**
 * Instance budget per tier (TASKS T07): ~60 k high, 25 k medium, 8 k low, ~3 k on software GL. Pure and tested.
 * The scatter is built once; the budget only chooses how many of the (shuffled) instances are drawn.
 */
import type { Quality } from '../state/urlParams';
import { SPECIES, type SpeciesId } from './scatter';

export const TIER_BUDGET = { high: 60000, medium: 25000, low: 8000, software: 3000 } as const;

export function budgetFor(quality: Quality, software: boolean): number {
  return software ? TIER_BUDGET.software : TIER_BUDGET[quality];
}

/** Fraction of the scattered instances to draw (0..1). */
export function drawFraction(total: number, budget: number): number {
  return total <= 0 ? 1 : Math.min(1, budget / total);
}

/** Per-species draw counts for a budget: proportional, so thinning stays even across species. */
export function drawCounts(counts: Record<SpeciesId, number>, budget: number): Record<SpeciesId, number> {
  const total = SPECIES.reduce((s, id) => s + counts[id], 0);
  const f = drawFraction(total, budget);
  const out = {} as Record<SpeciesId, number>;
  for (const id of SPECIES) out[id] = Math.min(counts[id], Math.round(counts[id] * f));
  return out;
}

/** Thinned forests plant slightly bigger trees so the valley still reads as wooded. */
export function thinScale(fraction: number): number {
  return Math.min(1.7, Math.pow(1 / Math.max(fraction, 0.05), 0.28));
}
