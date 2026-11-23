/**
 * Deterministic start-up state from the URL, for deep links and for the screenshot tool.
 *   ?view=<shot id>   start at a named camera shot (see src/camera/shots.ts), e.g. view=castle-mars
 *   ?season=winter    start in winter
 *   ?intro=0          skip the intro flight and spoiler gate
 *   ?ui=0             hide the HUD (clean screenshots)
 *   ?quality=low|medium|high
 * The hash (#castle-mars) also selects a place, for shareable links.
 */
export type Quality = 'low' | 'medium' | 'high';

export interface StartParams {
  view: string | null;
  season: 'summer' | 'winter';
  intro: boolean;
  ui: boolean;
  quality: Quality | null;
  selected: string | null;
}

export function readStartParams(loc: Pick<Location, 'search' | 'hash'> = window.location): StartParams {
  const q = new URLSearchParams(loc.search);
  const quality = q.get('quality');
  return {
    view: q.get('view'),
    season: q.get('season') === 'winter' ? 'winter' : 'summer',
    intro: q.get('intro') !== '0',
    ui: q.get('ui') !== '0',
    quality: quality === 'low' || quality === 'medium' || quality === 'high' ? quality : null,
    selected: loc.hash.length > 1 ? decodeURIComponent(loc.hash.slice(1)) : null,
  };
}
