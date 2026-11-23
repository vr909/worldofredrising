/**
 * Painterly terrain (DESIGN §5) plus the diorama slab. The mesh is named "terrain", receives
 * shadows and stays raycastable. Colour is computed per fragment from the heightfield's splat
 * channels (see terrainMaterial.ts).
 */
import { useEffect, useMemo } from 'react';
import { useHeightfield } from './HeightfieldContext';
import { Slab } from './Slab';
import { buildTerrainGeometry } from './terrainGeometry';
import { createTerrainMaterial } from './terrainMaterial';

export function Terrain() {
  const hf = useHeightfield();
  const geometry = useMemo(() => buildTerrainGeometry(hf), [hf]);
  const material = useMemo(() => createTerrainMaterial(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return (
    <>
      <mesh geometry={geometry} material={material} receiveShadow name="terrain" />
      <Slab />
    </>
  );
}
