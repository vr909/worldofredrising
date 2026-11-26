/**
 * House banners (T08): one cloth banner on every castle pole (bannerAnchors), all thirteen Houses in a single
 * InstancedMesh (1 draw call, one canvas texture atlas). The vertex shader billboards around Y, waves from
 * sharedUniforms.uTime and oversizes with distance so each House reads as a bright flag from the overview.
 * Click selects the castle; hover mirrors the castle hover. Respects layers.banners and layers.inferred.
 */
import { useEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import {
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  PlaneGeometry,
  Sphere,
  ShaderMaterial,
  UniformsLib,
  Vector2,
  Vector3,
  type Intersection,
  type Raycaster,
} from 'three';
import { bannerAnchors } from '../landmarks/build';
import { sharedUniforms } from '../render/uniforms';
import { useStore } from '../state/store';
import { useHeightfield } from '../terrain/HeightfieldContext';
import { LANDMARKS } from '../world/layout';
import { BANNER_ASPECT, COLS, ROWS, buildBannerAtlas, cellOf } from './atlas';
import fragmentShader from './shaders/banner.frag.glsl?raw';
import vertexShader from './shaders/banner.vert.glsl?raw';

/** Banner height in km at scale 1 (a banner on a main pole is ~scale 1.5). */
const BASE_HEIGHT = 0.11;
/** Minimum on-screen size: banner height >= FAR * camera distance (~25 px tall at 750 px). */
const FAR = 0.03;

interface Item {
  landmarkId: string;
  cell: number;
  anchor: Vector3;
  height: number;
  small: boolean;
}

/** Same oversizing as the vertex shader. */
function sizeFactor(dist: number, h0: number, small: boolean): number {
  let k = Math.max(1, (dist * FAR) / h0);
  if (small) {
    const t = Math.min(1, Math.max(0, (dist - 14) / 20));
    k *= 1 - t * t * (3 - 2 * t);
  }
  return k;
}

export function Banners() {
  const show = useStore((s) => s.layers.banners);
  const inferred = useStore((s) => s.layers.inferred);
  const hf = useHeightfield();

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const lm of LANDMARKS) {
      if (lm.kind !== 'castle' || !lm.house) continue;
      if (!inferred && lm.confidence === 'inferred') continue;
      const anchors = bannerAnchors(hf, lm);
      const biggest = Math.max(...anchors.map((a) => a.scale));
      for (const a of anchors) {
        out.push({
          landmarkId: lm.id,
          cell: cellOf(lm.house),
          anchor: new Vector3(...a.position),
          height: BASE_HEIGHT * a.scale,
          // secondary (turret) banners fade out at range; the castle's principal banner never does
          small: a.scale < biggest * 0.8,
        });
      }
    }
    return out;
  }, [hf, inferred]);

  if (!show || items.length === 0) return null;
  return <BannerMesh items={items} />;
}

function BannerMesh({ items }: { items: Item[] }) {
  const ref = useRef<InstancedMesh>(null);
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1, 1, 1);
    const anchor = new Float32Array(items.length * 4);
    const info = new Float32Array(items.length * 2);
    items.forEach((it, i) => {
      anchor.set([it.anchor.x, it.anchor.y, it.anchor.z, it.height], i * 4);
      info.set([it.cell, it.small ? 1 : 0], i * 2);
    });
    g.setAttribute('aAnchor', new InstancedBufferAttribute(anchor, 4));
    g.setAttribute('aInfo', new InstancedBufferAttribute(info, 2));
    return g;
  }, [items]);

  const atlas = useMemo(() => buildBannerAtlas(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          ...UniformsLib.fog,
          uTime: sharedUniforms.uTime,
          uSeason: sharedUniforms.uSeason,
          uAtlas: { value: atlas },
          uGrid: { value: new Vector2(COLS, ROWS) },
          uFar: { value: FAR },
          uAspect: { value: BANNER_ASPECT },
        },
        vertexShader,
        fragmentShader,
        fog: true,
        side: DoubleSide,
      }),
    [atlas],
  );

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(
    () => () => {
      material.dispose();
      atlas.dispose();
    },
    [material, atlas],
  );

  // The mesh is billboarded in the shader, so ray-test a sphere per banner instead of the flat quad.
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const sphere = new Sphere();
    const hit = new Vector3();
    mesh.raycast = (raycaster: Raycaster, intersects: Intersection[]) => {
      const cam = raycaster.camera.position;
      items.forEach((it, i) => {
        const k = sizeFactor(cam.distanceTo(it.anchor), it.height, it.small);
        const h = it.height * k;
        if (h < it.height * 0.05) return;
        sphere.center.set(it.anchor.x, it.anchor.y - it.height + h * 0.5, it.anchor.z);
        sphere.radius = h * 0.55;
        if (raycaster.ray.intersectSphere(sphere, hit)) {
          intersects.push({
            distance: hit.distanceTo(raycaster.ray.origin),
            point: hit.clone(),
            object: mesh,
            instanceId: i,
          });
        }
      });
    };
  }, [items]);

  const idOf = (e: ThreeEvent<MouseEvent | PointerEvent>) =>
    e.instanceId === undefined ? null : (items[e.instanceId]?.landmarkId ?? null);

  return (
    <instancedMesh
      ref={ref}
      name="banners"
      args={[geometry, material, items.length]}
      frustumCulled={false}
      onClick={(e) => {
        const id = idOf(e);
        if (!id) return;
        e.stopPropagation();
        select(id);
      }}
      onPointerOver={(e) => {
        const id = idOf(e);
        if (!id) return;
        e.stopPropagation();
        hover(id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = '';
      }}
    />
  );
}
