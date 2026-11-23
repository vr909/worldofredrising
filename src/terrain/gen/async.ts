/**
 * Off-main-thread terrain generation. Falls back to a deferred synchronous run where Workers are
 * unavailable (Node, very old browsers) or fail to start.
 */
import type { Heightfield, HeightfieldOptions } from '../heightfield';
import { buildHeightfield } from './build';
import { generateTerrainData, type TerrainData } from './generate';

export function generateHeightfieldAsync(opts: HeightfieldOptions): Promise<Heightfield> {
  const fallback = () =>
    new Promise<Heightfield>((resolve) => {
      setTimeout(() => resolve(buildHeightfield(generateTerrainData(opts))), 0);
    });
  if (typeof Worker === 'undefined') return fallback();
  return new Promise<Heightfield>((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch {
      void fallback().then(resolve);
      return;
    }
    worker.onmessage = (e: MessageEvent<TerrainData>) => {
      worker.terminate();
      resolve(buildHeightfield(e.data));
    };
    worker.onerror = () => {
      worker.terminate();
      void fallback().then(resolve);
    };
    worker.postMessage({ cellSize: opts.cellSize, seed: opts.seed });
  });
}
