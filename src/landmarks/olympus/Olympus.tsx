/**
 * Olympus (T06): the floating mountain. Four draw calls: rock, marble, gold, glowing windows.
 * Interaction matches the castles: click -> select, hover -> hover, warm emissive lift, shadows only if perf.shadows.
 */
import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { MeshBasicMaterial } from 'three';
import { useStore } from '../../state/store';
import { useHeightfield } from '../../terrain/HeightfieldContext';
import type { Landmark } from '../../world/types';
import { makeCastleMaterial } from '../materials';
import { buildOlympus } from './geometry';
import { makeRockMaterial } from './materials';

const EMISSIVE = '#ffb764';

export function Olympus({ landmark: l }: { landmark: Landmark }) {
  const hf = useHeightfield();
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);
  const hovered = useStore((s) => s.hoveredId === l.id);
  const selected = useStore((s) => s.selectedId === l.id);
  const shadows = useStore((s) => s.perf.shadows);

  const geo = useMemo(() => buildOlympus(l.site.radius), [l.site.radius]);
  const mats = useMemo(() => {
    const marble = makeCastleMaterial('stone');
    marble.roughness = 0.6;
    const gold = makeCastleMaterial('trim');
    gold.roughness = 0.38;
    gold.metalness = 0.35;
    return {
      rock: makeRockMaterial(),
      marble,
      gold,
      glow: new MeshBasicMaterial({ vertexColors: true }),
    };
  }, []);
  useEffect(
    () => () => {
      for (const g of [geo.rock, geo.marble, geo.gold, geo.glow]) g.dispose();
    },
    [geo],
  );
  useEffect(
    () => () => {
      for (const m of Object.values(mats)) m.dispose();
    },
    [mats],
  );

  const lift = selected ? 0.34 : hovered ? 0.18 : 0;
  useEffect(() => {
    for (const m of [mats.rock, mats.marble, mats.gold]) {
      m.emissive.set(EMISSIVE);
      m.emissiveIntensity = lift;
    }
  }, [mats, lift]);

  const handlers = useMemo(
    () => ({
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(l.id);
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(l.id);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        hover(null);
        document.body.style.cursor = '';
      },
    }),
    [l.id, select, hover],
  );

  const y = hf.riverSurfaceAt('argos', 0.55) + (l.site.height ?? 2.6);
  return (
    <group name={l.id} position={[l.position[0], y, l.position[1]]} {...handlers}>
      <mesh geometry={geo.rock} material={mats.rock} castShadow={shadows} receiveShadow />
      <mesh geometry={geo.marble} material={mats.marble} castShadow={shadows} receiveShadow />
      <mesh geometry={geo.gold} material={mats.gold} castShadow={shadows} receiveShadow />
      <mesh geometry={geo.glow} material={mats.glow} />
    </group>
  );
}
