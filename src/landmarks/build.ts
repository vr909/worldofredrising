/** Landmark builder: picks the recipe for a landmark id and returns merged geometry. Pure; used by tests too. */
import type { BufferGeometry } from 'three';
import type { Heightfield } from '../terrain/heightfield';
import type { Landmark } from '../world/types';
import { apolloCastle, ceresCastle, dianaCastle, jupiterCastle, junoCastle, minervaCastle } from './canon';
import { Kit } from './kit';
import { marsCastle } from './mars';
import {
  bacchusCastle,
  deimosTower,
  mercuryCastle,
  metasBridge,
  neptuneCastle,
  passFort,
  phobosTower,
  plutoCaves,
  venusCastle,
  vulcanCastle,
} from './others';

export interface Built {
  stone: BufferGeometry | null;
  roof: BufferGeometry | null;
  trim: BufferGeometry | null;
  /** Triangle count over all three meshes. */
  tris: number;
}

/** One recipe per landmark id (castle-local km; local -z = gate direction). Olympus is T06's. */
export const RECIPES: Record<string, (k: Kit) => void> = {
  'castle-mars': marsCastle,
  'castle-apollo': apolloCastle,
  'castle-jupiter': jupiterCastle,
  'castle-ceres': ceresCastle,
  'castle-minerva': minervaCastle,
  'castle-diana': dianaCastle,
  'castle-juno': junoCastle,
  'castle-vulcan': vulcanCastle,
  'castle-bacchus': bacchusCastle,
  'castle-venus': venusCastle,
  'castle-mercury': mercuryCastle,
  'castle-neptune': neptuneCastle,
  'castle-pluto': plutoCaves,
  'tower-phobos': phobosTower,
  'tower-deimos': deimosTower,
  'metas-bridge': metasBridge,
  'pass-fort': passFort,
};

export function buildLandmark(hf: Heightfield, lm: Landmark): Built {
  const k = new Kit(hf, lm);
  const recipe = RECIPES[lm.id];
  if (recipe) recipe(k);
  return k.build();
}
