/**
 * GRAYBOX water — placeholder owned by T03 (stylised water shader, shoreline foam, lochs, winter ice).
 */
import { useMemo } from 'react';
import { DoubleSide, Shape, ShapeGeometry, Vector2 } from 'three';
import { SUMMER } from '../render/palette';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { REGIONS, RIVERS, SEA_LEVEL } from '../world/layout';
import { buildRiverGeometry } from './riverGeometry';

export function Water() {
  const hf = useHeightfield();
  const rivers = useMemo(() => RIVERS.map((r) => ({ id: r.id, geometry: buildRiverGeometry(r, hf) })), [hf]);
  const bodies = useMemo(
    () =>
      REGIONS.filter((r) => r.kind === 'sea' || r.kind === 'lake').map((r) => {
        // Shape is built in x/(-z) so that rotating -90° about X maps it onto the x/z ground plane.
        const s = new Shape(r.polygon.map(([x, z]) => new Vector2(x, -z)));
        const level = r.kind === 'sea' ? SEA_LEVEL : hf.heightAt(...r.polygon[0]!) - 0.02;
        return { id: r.id, geometry: new ShapeGeometry(s), level };
      }),
    [hf],
  );
  return (
    <group name="water">
      {bodies.map((b) => (
        <mesh key={b.id} geometry={b.geometry} rotation-x={-Math.PI / 2} position-y={b.level}>
          <meshStandardMaterial
            color={SUMMER.water.shallow}
            roughness={0.15}
            metalness={0.1}
            side={DoubleSide}
          />
        </mesh>
      ))}
      {rivers.map((r) => (
        <mesh key={r.id} geometry={r.geometry}>
          <meshStandardMaterial color={SUMMER.water.shallow} roughness={0.2} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
