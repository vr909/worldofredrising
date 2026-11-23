/**
 * Provides the one Heightfield instance to the whole scene. Consumers call useHeightfield().
 * Generation happens once, in a Web Worker (see gen/worker.ts), behind the loading screen; the main
 * thread only rebuilds the cheap sampling functions from the transferred arrays.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Quality } from '../state/urlParams';
import type { Heightfield } from './heightfield';
import { generateHeightfieldAsync } from './gen/async';

/** Heightfield cell size per quality tier (ARCHITECTURE §7). */
const CELL_SIZE: Record<Quality, number> = { high: 0.125, medium: 0.2, low: 0.33 };

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
    let cancelled = false;
    void generateHeightfieldAsync({ cellSize: CELL_SIZE[quality], seed: 1729 }).then((result) => {
      if (!cancelled) setHf(result);
    });
    return () => {
      cancelled = true;
    };
  }, [quality]);
  return hf ? <Ctx.Provider value={hf}>{children}</Ctx.Provider> : <>{fallback}</>;
}
