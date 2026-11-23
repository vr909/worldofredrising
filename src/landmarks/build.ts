/** Landmark builder: picks the recipe for a landmark id and returns merged geometry. Pure; used by tests too. */
import type { BufferGeometry } from 'three';
import type { Heightfield } from '../terrain/heightfield';
import type { Landmark } from '../world/types';
import { Kit } from './kit';
import { marsCastle } from './mars';

export interface Built {
  stone: BufferGeometry | null;
  roof: BufferGeometry | null;
  trim: BufferGeometry | null;
  /** Triangle count over all three meshes. */
  tris: number;
}

const RECIPES: Record<string, (k: Kit) => void> = {
  'castle-mars': marsCastle,
};

export function buildLandmark(hf: Heightfield, lm: Landmark): Built {
  const k = new Kit(hf, lm);
  const recipe = RECIPES[lm.id];
  if (recipe) recipe(k);
  return k.build();
}
