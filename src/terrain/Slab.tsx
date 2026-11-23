/**
 * Diorama slab: four strata skirts down to -slabDepth, a dark matte table below, and a soft
 * contact shadow under the block (DESIGN §5, "Diorama slab").
 */
import { useEffect, useMemo } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';
import { BOUNDS } from '../world/layout';
import { useHeightfield } from './HeightfieldContext';
import { buildSlabGeometry } from './terrainGeometry';
import { createSlabMaterial } from './terrainMaterial';

const SHADOW_MARGIN = 9; // km of soft falloff beyond the slab edge

/** Soft rounded-box falloff generated in code: alpha 0.55 under the block fading to 0 over the margin. */
function makeContactShadowTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const w = BOUNDS.maxX - BOUNDS.minX;
    const d = BOUNDS.maxZ - BOUNDS.minZ;
    const totalW = w + SHADOW_MARGIN * 2;
    const totalD = d + SHADOW_MARGIN * 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = ((x + 0.5) / size - 0.5) * totalW;
        const pz = ((y + 0.5) / size - 0.5) * totalD;
        const dx = Math.max(Math.abs(px) - w / 2, 0);
        const dz = Math.max(Math.abs(pz) - d / 2, 0);
        const dist = Math.hypot(dx, dz) / SHADOW_MARGIN;
        const t = Math.max(0, 1 - dist);
        const a = t * t * (3 - 2 * t) * 0.55;
        const i = (y * size + x) * 4;
        img.data[i] = 0;
        img.data[i + 1] = 0;
        img.data[i + 2] = 0;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  return tex;
}

export function Slab() {
  const hf = useHeightfield();
  const geometry = useMemo(() => buildSlabGeometry(hf), [hf]);
  const material = useMemo(() => createSlabMaterial(), []);
  const shadowTex = useMemo(() => makeContactShadowTexture(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => shadowTex.dispose(), [shadowTex]);

  const y = -BOUNDS.slabDepth;
  const shadowW = BOUNDS.maxX - BOUNDS.minX + SHADOW_MARGIN * 2;
  const shadowD = BOUNDS.maxZ - BOUNDS.minZ + SHADOW_MARGIN * 2;

  return (
    <group name="slab">
      <mesh geometry={geometry} material={material} receiveShadow name="slab-skirts" />
      {/* Dark matte table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y - 0.004, 0]} name="table">
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#1b1815" roughness={1} metalness={0} />
      </mesh>
      {/* Soft contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={1} name="table-contact-shadow">
        <planeGeometry args={[shadowW, shadowD]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
}
