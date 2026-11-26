import { HOUSES } from '../world/houses';
import type { HouseId } from '../world/types';
import { SIGILS } from './sigilData';

export const PARCHMENT = '#EFE3C6';
/** Downward-pointing House shield on the 64-grid (viewBox 0 0 64 72). */
export const SHIELD_PATH = 'M3 3H61L32 69Z';
/** Where the 64-grid glyph sits inside the shield. */
export const GLYPH_TRANSFORM = 'translate(12.3 7) scale(0.62)';

/** Full shield (House colour-deep triangle + parchment glyph) as a standalone SVG. */
export function Sigil({ id, size = 48, title }: { id: HouseId; size?: number; title?: string }) {
  const house = HOUSES[id];
  return (
    <svg
      viewBox="0 0 64 72"
      width={size}
      height={(size * 72) / 64}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <path d={SHIELD_PATH} fill={house.color} />
      <path d="M7.4 6.4H56.6L32 61.5Z" fill={house.colorDeep} />
      <path d={SIGILS[id].path} fill={PARCHMENT} fillRule="nonzero" transform={GLYPH_TRANSFORM} />
    </svg>
  );
}
