/**
 * Provides the one Heightfield instance to the whole scene. Consumers call useHeightfield().
 * Generation happens once, before the Canvas mounts, behind the loading screen.
 * (T01 may move generation into a Web Worker; consumers do not change.)
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Quality } from '../state/urlParams';
import { generateHeightfield, type Heightfield } from './heightfield';

const CELL_SIZE: Record<Quality, number> = { high: 0.25, medium: 0.33, low: 0.5 };

const Ctx = createContext<Heightfield | null>(null);

export function useHeightfield(): Heightfield {
  const hf = useContext(Ctx);
  if (!hf) throw new Error('useHeightfield() must be used inside <HeightfieldProvider> after generation');
  return hf;
}

export function HeightfieldProvider({
  quality,
  fallback,
  children,
}: {
  quality: Quality;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const [hf, setHf] = useState<Heightfield | null>(null);
  useEffect(() => {
    // Yield one frame so the loading screen paints before the synchronous generation blocks.
    const id = window.setTimeout(
      () => setHf(generateHeightfield({ cellSize: CELL_SIZE[quality], seed: 1729 })),
      30,
    );
    return () => window.clearTimeout(id);
  }, [quality]);
  return hf ? <Ctx.Provider value={hf}>{children}</Ctx.Provider> : <>{fallback}</>;
}
