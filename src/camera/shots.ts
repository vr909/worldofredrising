/**
 * Named camera shots. A shot = where the camera sits + what it looks at.
 * Every place id (landmark, region, river) resolves to a shot automatically; T10 adds hand-tuned
 * overrides in SHOT_OVERRIDES for the hero views. Positions/targets are world units (display km).
 */
import type { Heightfield } from '../terrain/heightfield';
import { pointAlong } from '../terrain/heightfield';
import { centroid } from '../world/geometry';
import { landmarkById, regionById, riverById } from '../world/layout';

export type Vec3 = [number, number, number];
export interface Shot {
  position: Vec3;
  target: Vec3;
}

/** The establishing view: the whole valley from the south, canyon walls framing it. */
export const OVERVIEW: Shot = { position: [0, 62, 88], target: [0, 0, 2] };
/** Where the intro flight starts: high above the South Sea, looking up-canyon. */
export const INTRO_START: Shot = { position: [0, 140, 190], target: [0, 0, -10] };

export const SHOT_OVERRIDES: Record<string, Shot> = {
  overview: OVERVIEW,
  'intro-start': INTRO_START,
};

/** Orbit a target from a compass bearing (deg, 0 = camera south of target looking north). */
function orbit(target: Vec3, distance: number, bearingDeg: number, elevationDeg: number): Shot {
  const b = (bearingDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  const horiz = Math.cos(e) * distance;
  return {
    target,
    position: [
      target[0] - Math.sin(b) * horiz,
      target[1] + Math.sin(e) * distance,
      target[2] + Math.cos(b) * horiz,
    ],
  };
}

export function resolveShot(id: string, hf: Heightfield): Shot {
  const override = SHOT_OVERRIDES[id];
  if (override) return override;

  const l = landmarkById(id);
  if (l) {
    const [x, z] = l.position;
    if (l.kind === 'olympus') {
      const y = hf.riverSurfaceAt('argos', 0.55) + (l.site.height ?? 2.6);
      return orbit([x, y + 0.3, z], 11, 0, 18);
    }
    const ground = hf.heightAt(x, z);
    // Stand in front of the main gate: facingDeg is where the gate looks, so the camera sits there.
    const bearing = (l.facingDeg + 180) % 360;
    const dist = Math.max(3.5, l.site.radius * 4.5);
    return orbit([x, ground + l.site.radius * 0.2, z], dist, bearing, 26);
  }

  const region = regionById(id);
  if (region) {
    const [x, z] = region.labelAt ?? centroid(region.polygon);
    return orbit([x, hf.heightAt(x, z), z], 32, 0, 38);
  }

  const river = riverById(id);
  if (river) {
    const [x, z] = pointAlong(river.points, 0.5);
    return orbit([x, hf.heightAt(x, z), z], 22, 0, 34);
  }

  return OVERVIEW;
}
