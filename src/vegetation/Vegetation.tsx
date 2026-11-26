/**
 * Forests, groves, orchards, vineyards and reeds (T07). One InstancedMesh per species (6 draw calls).
 * The scatter runs once per heightfield; perf changes only change `mesh.count` (instances are pre-shuffled, so
 * a lower count thins the whole valley evenly) and `castShadow`. Wind and winter live in the material.
 */
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { Color, Euler, Group, InstancedMesh, Object3D } from 'three';
import { useStore } from '../state/store';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { budgetFor, drawCounts, drawFraction, thinScale } from './budget';
import { buildSpeciesGeometry } from './geometry';
import { makeFoliageMaterial, type FoliageMaterial } from './material';
import { SPECIES, STRIDE, scatterVegetation, type Scatter, type SpeciesId } from './scatter';

/** Per-species instance colour jitter: [value spread, hue spread]. */
const JITTER: Record<SpeciesId, [number, number]> = {
  conifer: [0.2, 0.1],
  broadleaf: [0.28, 0.16],
  olive: [0.16, 0.1],
  orchard: [0.14, 0.1],
  vine: [0.18, 0.12],
  reed: [0.2, 0.14],
};

/** Species that are lit but never cast shadows (too small to matter): saves the shadow pass. */
const NO_SHADOW = new Set<SpeciesId>(['vine', 'reed']);

interface Rig {
  group: Group;
  meshes: Record<SpeciesId, InstancedMesh>;
  mats: Record<SpeciesId, FoliageMaterial>;
  scatter: Scatter;
  dispose: () => void;
}

const frac = (v: number) => v - Math.floor(v);

function buildRig(scatter: Scatter): Rig {
  const group = new Group();
  group.name = 'vegetation';
  const meshes = {} as Record<SpeciesId, InstancedMesh>;
  const mats = {} as Record<SpeciesId, FoliageMaterial>;
  const dummy = new Object3D();
  const euler = new Euler();
  const color = new Color();
  for (const id of SPECIES) {
    const n = scatter.counts[id];
    const geo = buildSpeciesGeometry(id);
    const fm = makeFoliageMaterial(id);
    const mesh = new InstancedMesh(geo, fm.material, Math.max(1, n));
    mesh.name = `veg-${id}`;
    mesh.frustumCulled = false; // one big draw per species; bounds would span the whole valley anyway
    mesh.receiveShadow = false;
    const d = scatter.data[id];
    const [vj, hj] = JITTER[id];
    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      const s = d[o + 3]!;
      const lean = d[o + 5]!;
      const ld = d[o + 6]!;
      dummy.position.set(d[o]!, d[o + 1]!, d[o + 2]!);
      euler.set(Math.cos(ld) * lean, d[o + 4]!, Math.sin(ld) * lean, 'YXZ');
      dummy.quaternion.setFromEuler(euler);
      const wide = id === 'vine' ? 1 : 0.92 + 0.16 * frac(d[o + 7]! * 31.7);
      dummy.scale.set(s * wide, s, s * wide);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const t = d[o + 7]!;
      const v = 1 + (frac(t * 7.31) - 0.5) * 2 * vj;
      const h = (frac(t * 13.17) - 0.5) * 2 * hj;
      color.setRGB(v * (1 + h * 0.8), v * (1 + h * 0.1), v * (1 - h));
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = n;
    meshes[id] = mesh;
    mats[id] = fm;
    group.add(mesh);
  }
  const dispose = () => {
    for (const id of SPECIES) {
      meshes[id].geometry.dispose();
      mats[id].material.dispose();
      meshes[id].dispose();
    }
  };
  return { group, meshes, mats, scatter, dispose };
}

export function Vegetation() {
  const hf = useHeightfield();
  const quality = useStore((s) => s.quality);
  const software = useStore((s) => s.perf.software);
  const shadows = useStore((s) => s.perf.shadows);
  const invalidate = useThree((s) => s.invalidate);

  const scatter = useMemo(() => scatterVegetation(hf), [hf]);
  const rig = useMemo(() => buildRig(scatter), [scatter]);
  useEffect(() => () => rig.dispose(), [rig]);

  // Density from quality + perf: only `count` changes, never the scatter.
  useEffect(() => {
    const budget = budgetFor(quality, software);
    const counts = drawCounts(rig.scatter.counts, budget);
    const fraction = drawFraction(rig.scatter.total, budget);
    for (const id of SPECIES) {
      rig.meshes[id].count = counts[id];
      rig.mats[id].thin.value = thinScale(fraction);
    }
    invalidate();
  }, [rig, quality, software, invalidate]);

  useEffect(() => {
    for (const id of SPECIES) rig.meshes[id].castShadow = shadows && !NO_SHADOW.has(id);
    invalidate();
  }, [rig, shadows, invalidate]);

  return <primitive object={rig.group} />;
}
