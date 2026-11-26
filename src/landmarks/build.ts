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

export interface BannerAnchor {
  /** World-space top of a banner pole. */
  position: [number, number, number];
  /** Banner size hint relative to the castle (keep ~1.5, corner turrets ~0.7). */
  scale: number;
}

const anchorCache = new WeakMap<Heightfield, Map<string, BannerAnchor[]>>();

export function buildLandmark(hf: Heightfield, lm: Landmark): Built {
  const k = new Kit(hf, lm);
  const recipe = RECIPES[lm.id];
  if (recipe) recipe(k);
  const built = k.build();
  let list = k.anchors;
  if (list.length === 0) {
    // no pole in the recipe: anchor on the highest vertex of the built geometry
    let best = { x: 0, y: -Infinity, z: 0 };
    for (const g of [built.stone, built.roof]) {
      const pos = g?.getAttribute('position');
      if (!pos) continue;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) > best.y) best = { x: pos.getX(i), y: pos.getY(i), z: pos.getZ(i) };
      }
    }
    if (best.y > -Infinity) list = [{ ...best, scale: 1 }];
  }
  const out: BannerAnchor[] = list.map((a) => ({
    position: [k.px + a.x * k.ca + a.z * k.sa, a.y, k.pz - a.x * k.sa + a.z * k.ca],
    scale: a.scale,
  }));
  let m = anchorCache.get(hf);
  if (!m) anchorCache.set(hf, (m = new Map()));
  m.set(lm.id, out);
  return built;
}

/**
 * World-space tops of the banner poles of a landmark (same transform as the built geometry), at least one per
 * castle. Pure; cached per heightfield after the first build.
 */
export function bannerAnchors(hf: Heightfield, lm: Landmark): BannerAnchor[] {
  const hit = anchorCache.get(hf)?.get(lm.id);
  if (hit) return hit;
  const b = buildLandmark(hf, lm);
  for (const g of [b.stone, b.roof, b.trim]) g?.dispose();
  return anchorCache.get(hf)?.get(lm.id) ?? [];
}
