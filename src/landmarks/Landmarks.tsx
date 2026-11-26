/**
 * Landmarks (T05): procedural castles, towers, the Metas bridge and the Pass Fort, one merged mesh set
 * (stone / roof / trim = at most 3 draw calls) per landmark.
 *
 * Interaction contract: click -> store.select(id); hover -> store.hover(id | null) with stopPropagation and a
 * pointer cursor. Hovered / selected castles get a warm emissive lift (no outline). Hidden when the 'inferred'
 * layer is off and the landmark is inferred.
 */
import { useEffect, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { BufferGeometry, MeshStandardMaterial } from 'three';
import { useStore } from '../state/store';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { LANDMARKS } from '../world/layout';
import type { Landmark } from '../world/types';
import { buildLandmark } from './build';
import { makeCastleMaterial } from './materials';
import { Olympus } from './olympus/Olympus';

export function Landmarks() {
  const inferred = useStore((s) => s.layers.inferred);
  return (
    <group name="landmarks">
      {LANDMARKS.filter((l) => inferred || l.confidence !== 'inferred').map((l) =>
        l.kind === 'olympus' ? (
          <Olympus key={l.id} landmark={l} />
        ) : (
          <BuiltLandmark key={l.id} landmark={l} />
        ),
      )}
    </group>
  );
}

function useHandlers(id: string) {
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);
  return useMemo(
    () => ({
      onClick: (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(id);
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        hover(id);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        hover(null);
        document.body.style.cursor = '';
      },
    }),
    [id, select, hover],
  );
}

const EMISSIVE = '#ffb764';

function BuiltLandmark({ landmark: l }: { landmark: Landmark }) {
  const hf = useHeightfield();
  const handlers = useHandlers(l.id);
  const hovered = useStore((s) => s.hoveredId === l.id);
  const selected = useStore((s) => s.selectedId === l.id);
  const shadows = useStore((s) => s.perf.shadows);

  const built = useMemo(() => buildLandmark(hf, l), [hf, l]);
  const mats = useMemo(
    () => ({
      stone: makeCastleMaterial('stone'),
      roof: makeCastleMaterial('roof'),
      trim: makeCastleMaterial('trim'),
    }),
    [],
  );

  useEffect(
    () => () => {
      for (const g of [built.stone, built.roof, built.trim]) g?.dispose();
    },
    [built],
  );
  useEffect(
    () => () => {
      for (const m of Object.values(mats)) m.dispose();
    },
    [mats],
  );

  const lift = selected ? 0.34 : hovered ? 0.18 : 0;
  useEffect(() => {
    for (const m of Object.values(mats)) {
      m.emissive.set(EMISSIVE);
      m.emissiveIntensity = lift;
    }
  }, [mats, lift]);

  const parts: [BufferGeometry | null, MeshStandardMaterial][] = [
    [built.stone, mats.stone],
    [built.roof, mats.roof],
    [built.trim, mats.trim],
  ];

  return (
    <group
      name={l.id}
      position={[l.position[0], 0, l.position[1]]}
      rotation-y={(-l.facingDeg * Math.PI) / 180}
      {...handlers}
    >
      {parts.map(([g, m], i) =>
        g ? <mesh key={i} geometry={g} material={m} castShadow={shadows} receiveShadow /> : null,
      )}
    </group>
  );
}
