/**
 * GRAYBOX landmarks — placeholder blocks so the skeleton is navigable and clickable.
 * Replaced by T05 (castle kit + per-House recipes) and T06 (Olympus).
 * Interaction contract (keep in the real versions): click → store.select(id); hover → store.hover(id).
 */
import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useStore } from '../state/store';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { HOUSES } from '../world/houses';
import { LANDMARKS } from '../world/layout';
import type { Landmark } from '../world/types';

export function Landmarks() {
  const inferred = useStore((s) => s.layers.inferred);
  return (
    <group name="landmarks">
      {LANDMARKS.filter((l) => inferred || l.confidence !== 'inferred').map((l) => (
        <GrayboxLandmark key={l.id} landmark={l} />
      ))}
    </group>
  );
}

function GrayboxLandmark({ landmark: l }: { landmark: Landmark }) {
  const hf = useHeightfield();
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);
  const hovered = useStore((s) => s.hoveredId === l.id);
  const selected = useStore((s) => s.selectedId === l.id);

  const color = l.house ? HOUSES[l.house].color : '#d8d2c4';
  const ground = useMemo(() => hf.heightAt(l.position[0], l.position[1]), [hf, l.position]);
  const r = l.site.radius;

  const handlers = {
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
  };

  const emissive = selected ? '#5a4310' : hovered ? '#2c2208' : '#000000';

  if (l.kind === 'olympus') {
    const y = hf.riverSurfaceAt('argos', 0.55) + (l.site.height ?? 2.6);
    return (
      <group position={[l.position[0], y, l.position[1]]} {...handlers}>
        <mesh rotation-x={Math.PI} position-y={-0.6} castShadow>
          <coneGeometry args={[r, 2.2, 9]} />
          <meshStandardMaterial color="#8d8478" emissive={emissive} flatShading />
        </mesh>
        <mesh position-y={0.9} castShadow>
          <cylinderGeometry args={[0.18, 0.35, 1.4, 8]} />
          <meshStandardMaterial color="#efe9dc" emissive={emissive} />
        </mesh>
      </group>
    );
  }

  const height = l.kind === 'tower' ? 0.45 : l.kind === 'bridge' ? 0.03 : l.kind === 'fort' ? 0.12 : 0.22;
  const width = l.kind === 'tower' ? r * 0.5 : l.kind === 'bridge' ? 0.12 : r * 0.9;
  const depth = l.kind === 'bridge' ? 0.5 : width;
  return (
    <group
      position={[l.position[0], ground, l.position[1]]}
      rotation-y={(-l.facingDeg * Math.PI) / 180}
      {...handlers}
    >
      <mesh position-y={height / 2} castShadow>
        {l.kind === 'tower' ? (
          <cylinderGeometry args={[width / 2, width / 2, height, 8]} />
        ) : (
          <boxGeometry args={[width, height, depth]} />
        )}
        <meshStandardMaterial color={color} emissive={emissive} roughness={0.8} />
      </mesh>
      {l.kind === 'castle' && (
        <mesh position={[0, height + 0.12, 0]} castShadow>
          <coneGeometry args={[width * 0.25, 0.25, 4]} />
          <meshStandardMaterial color={color} emissive={emissive} />
        </mesh>
      )}
    </group>
  );
}
