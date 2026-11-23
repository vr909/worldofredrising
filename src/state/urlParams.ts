/**
 * Deterministic start-up state from the URL, for deep links and for the screenshot tool.
 *   ?view=<shot id>   start at a named camera shot (see src/camera/shots.ts), e.g. view=castle-mars
 *   ?season=winter    start in winter
 *   ?seasonT=0.5      DEBUG: pin the animated season value (0 summer … 1 winter), e.g. to inspect freezing
 *   ?intro=0          skip the intro flight and spoiler gate
 *   ?ui=0             hide the HUD (clean screenshots)
 *   ?quality=low|medium|high
 *   ?stats=1          show an FPS / frame-time overlay (for performance reports)
 *   ?mode=2d          start in the flat 2D map view instead of the 3D diorama
 * The hash (#castle-mars) also selects a place, for shareable links.
 */
export type Quality = 'low' | 'medium' | 'high';

export interface StartParams {
  view: string | null;
  season: 'summer' | 'winter';
  /** Debug: fixed uSeason value in [0,1], or null for normal animated behaviour. */
  seasonT: number | null;
  intro: boolean;
  ui: boolean;
  quality: Quality | null;
  stats: boolean;
  mode: '2d' | '3d';
  selected: string | null;
}

export function readStartParams(loc: Pick<Location, 'search' | 'hash'> = window.location): StartParams {
  const q = new URLSearchParams(loc.search);
  const quality = q.get('quality');
  return {
    view: q.get('view'),
    season: q.get('season') === 'winter' ? 'winter' : 'summer',
    seasonT: parseUnit(q.get('seasonT')),
    intro: q.get('intro') !== '0',
    ui: q.get('ui') !== '0',
    quality: quality === 'low' || quality === 'medium' || quality === 'high' ? quality : null,
    stats: q.get('stats') === '1',
    mode: q.get('mode') === '2d' ? '2d' : '3d',
    selected: loc.hash.length > 1 ? decodeURIComponent(loc.hash.slice(1)) : null,
  };
}

function parseUnit(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
}
