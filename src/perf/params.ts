/**
 * Performance URL overrides (T14), parsed here so the lead-owned urlParams.ts stays untouched.
 *   ?software=1|0   force / forbid the "no GPU" cheap path (default: detected)
 *   ?demand=0       keep the frame loop on 'always' (used by `npm run perf` so rAF gaps measure render cost)
 *   ?adapt=1|0      runtime quality adaptation + slow-device detection (default: on, but OFF under automation)
 *   ?detail=0|1|2   force the terrain shader detail
 *   ?dpr=<n>  ?shadows=0|1  ?mist=0|1  ?ambient=<fps>
 */
import type { PerfFlags } from '../state/store';

export interface PerfOverrides {
  software: boolean | null;
  demand: boolean;
  adapt: boolean;
  flags: Partial<PerfFlags>;
}

const bool = (v: string | null): boolean | null => (v === '1' ? true : v === '0' ? false : null);

export function parsePerfOverrides(search: string, automated: boolean): PerfOverrides {
  const q = new URLSearchParams(search);
  const flags: Partial<PerfFlags> = {};
  const detail = q.get('detail');
  if (detail === '0' || detail === '1' || detail === '2') flags.detail = Number(detail) as 0 | 1 | 2;
  const dpr = Number(q.get('dpr'));
  if (q.get('dpr') !== null && dpr > 0 && dpr <= 3) flags.dpr = dpr;
  const shadows = bool(q.get('shadows'));
  if (shadows !== null) flags.shadows = shadows;
  const mist = bool(q.get('mist'));
  if (mist !== null) flags.mist = mist;
  const ambient = Number(q.get('ambient'));
  if (q.get('ambient') !== null && ambient >= 0 && ambient <= 120) flags.ambientFps = ambient;
  return {
    software: bool(q.get('software')),
    demand: q.get('demand') !== '0',
    adapt: bool(q.get('adapt')) ?? !automated,
    flags,
  };
}

/** Playwright / headless test drivers set navigator.webdriver. They get deterministic full-quality rendering. */
export function isAutomated(): boolean {
  return typeof navigator !== 'undefined' && navigator.webdriver === true;
}
