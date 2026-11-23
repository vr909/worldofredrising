/**
 * The flat 2D map of the valley: an engraved-style SVG drawn from the layout data, with no WebGL.
 * Mounted by App when viewMode === '2d' (full) and reusable as the M3 minimap (variant 'mini').
 *
 * Coordinates: the SVG viewBox is in world km (x east, z south), so north is up without any flips.
 * Pan and zoom are pure viewBox maths (viewport.ts); the heavy drawing is memoised in StaticMap so
 * only the markers and lettering re-render while the view moves.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { PLACES } from '../content/places';
import { useStore } from '../state/store';
import { landmarkById } from '../world/layout';
import { Legend, MarsInset, ScaleBar, Tooltip, ZoomControls } from './Furniture';
import { MapLabels, MarkerLayer, MiniMarkers } from './Markers';
import { StaticMap } from './StaticMap';
import {
  EXTENT,
  clampView,
  fitView,
  fitWidth,
  panByPixels,
  scaleOf,
  viewHeight,
  worldToScreen,
  zoomAbout,
  type View,
} from './viewport';
import './map2d.css';

export interface Map2DProps {
  /** 'full' = interactive full-screen map; 'mini' = small, no labels or controls (the M3 minimap). */
  variant?: 'full' | 'mini';
  /** Mini variant width in px (height follows the valley's aspect). Default 220. */
  miniWidth?: number;
}

const NAMES: Record<string, string> = Object.fromEntries(PLACES.map((p) => [p.id, p.title]));
const PLACE_BY_ID = new Map(PLACES.map((p) => [p.id, p]));
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function Map2D({ variant = 'full', miniWidth = 220 }: Map2DProps) {
  const setReady = useStore((s) => s.setReady);
  useEffect(() => {
    setReady();
    document.body.dataset.ready = 'true';
  }, [setReady]);
  return variant === 'mini' ? <MiniMap width={miniWidth} /> : <FullMap />;
}

function MiniMap({ width }: { width: number }) {
  const selectedId = useStore((s) => s.selectedId);
  const layers = useStore((s) => s.layers);
  const season = useStore((s) => s.season);
  const ex = EXTENT;
  const height = (width * (ex.maxZ - ex.minZ)) / (ex.maxX - ex.minX);
  return (
    <div className={`map2d map2d-mini ${season}`} style={{ width, height }}>
      <svg
        viewBox={`${ex.minX} ${ex.minZ} ${ex.maxX - ex.minX} ${ex.maxZ - ex.minZ}`}
        aria-label="Minimap of the Institute valley"
        role="img"
      >
        <StaticMap uid="m2m" />
        <MiniMarkers selectedId={selectedId} inferred={layers.inferred} />
      </svg>
    </div>
  );
}

interface DragState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastT: number;
  vx: number;
  vy: number;
  moved: boolean;
}

function FullMap() {
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);
  const selectedId = useStore((s) => s.selectedId);
  const hoveredId = useStore((s) => s.hoveredId);
  const layers = useStore((s) => s.layers);
  const season = useStore((s) => s.season);

  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => ({
    W: typeof window === 'undefined' ? 1440 : window.innerWidth,
    H: typeof window === 'undefined' ? 900 : window.innerHeight,
  }));
  const [view, setViewState] = useState<View>(() => fitView(size.W, size.H));
  const [dragging, setDragging] = useState(false);
  const sizeRef = useRef(size);
  const viewRef = useRef(view);
  const rafRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);

  const commit = useCallback((v: View) => {
    const c = clampView(v, sizeRef.current.W, sizeRef.current.H);
    viewRef.current = c;
    setViewState(c);
  }, []);

  const stopMotion = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  // Track the container size; keep the same world centre and clamp to the new aspect.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const W = el.clientWidth || window.innerWidth;
      const H = el.clientHeight || window.innerHeight;
      const prev = sizeRef.current;
      if (prev.W === W && prev.H === H) return;
      sizeRef.current = { W, H };
      setSize({ W, H });
      const keepFit = viewRef.current.w >= fitWidth(prev.W, prev.H) - 1e-6;
      commit(keepFit ? fitView(W, H) : viewRef.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [commit]);

  const animateTo = useCallback(
    (target: View, ms = 420) => {
      stopMotion();
      const from = viewRef.current;
      const to = clampView(target, sizeRef.current.W, sizeRef.current.H);
      if (prefersReducedMotion() || ms <= 0) return commit(to);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = easeInOut(t);
        commit({
          cx: from.cx + (to.cx - from.cx) * e,
          cz: from.cz + (to.cz - from.cz) * e,
          w: from.w * Math.pow(to.w / from.w, e),
        });
        rafRef.current = t < 1 ? requestAnimationFrame(step) : 0;
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [commit, stopMotion],
  );

  const zoomBy = useCallback(
    (factor: number, px?: number, py?: number, animate = false) => {
      const { W, H } = sizeRef.current;
      const next = zoomAbout(viewRef.current, factor, px ?? W / 2, py ?? H / 2, W, H);
      if (animate) animateTo(next, 220);
      else {
        stopMotion();
        commit(next);
      }
    },
    [animateTo, commit, stopMotion],
  );

  // Wheel zoom about the cursor. Registered natively so it can preventDefault (React's is passive).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      zoomBy(Math.exp(Math.max(-120, Math.min(120, dy)) * 0.0016), e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  useEffect(() => stopMotion, [stopMotion]);

  // Keep a newly selected place in the visible part of the screen (the placard covers the right side).
  useEffect(() => {
    if (!selectedId) return;
    const l = landmarkById(selectedId);
    if (!l) return;
    const { W, H } = sizeRef.current;
    const v = viewRef.current;
    const [sx, sy] = worldToScreen(v, l.position, W, H);
    const right = W > 760 ? W - 430 : W - 40;
    const dx = sx < 70 ? 70 - sx : sx > right ? right - sx : 0;
    const dy = sy < 110 ? 110 - sy : sy > H - 110 ? H - 110 - sy : 0;
    if (dx === 0 && dy === 0) return;
    const k = v.w / W;
    animateTo({ ...v, cx: v.cx - dx * k, cz: v.cz - dy * k });
  }, [selectedId, animateTo]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as Element).closest('.m2-zoom, .m2-cartouche')) return;
    stopMotion();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      dragRef.current = null;
    } else {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        lastT: performance.now(),
        vx: 0,
        vy: 0,
        moved: false,
      };
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    const rect = rootRef.current!.getBoundingClientRect();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinchDist.current > 0 && dist > 0) {
        zoomBy(pinchDist.current / dist, (a!.x + b!.x) / 2 - rect.left, (a!.y + b!.y) / 2 - rect.top);
      }
      pinchDist.current = dist;
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 5) return;
      d.moved = true;
      setDragging(true);
      // Capture only once a real drag starts, so plain clicks still reach the markers.
      rootRef.current?.setPointerCapture(e.pointerId);
      hover(null);
    }
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.vx = 0.8 * d.vx + 0.2 * (dx / dt);
    d.vy = 0.8 * d.vy + 0.2 * (dy / dt);
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.lastT = now;
    const { W, H } = sizeRef.current;
    commit(panByPixels(viewRef.current, dx, dy, W, H));
  };

  const endPointer = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    pinchDist.current = 0;
    const d = dragRef.current;
    if (pointers.current.size === 0) dragRef.current = null;
    if (!d?.moved) return;
    setDragging(false);
    if (prefersReducedMotion() || Math.hypot(d.vx, d.vy) < 0.15 || performance.now() - d.lastT > 80) return;
    // A little inertia: glide and decay.
    let vx = d.vx;
    let vy = d.vy;
    let last = performance.now();
    const glide = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const { W, H } = sizeRef.current;
      commit(panByPixels(viewRef.current, vx * dt, vy * dt, W, H));
      const decay = Math.exp(-dt / 220);
      vx *= decay;
      vy *= decay;
      rafRef.current = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(glide) : 0;
    };
    rafRef.current = requestAnimationFrame(glide);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const { W, H } = sizeRef.current;
    const step = 90;
    const pan = (dx: number, dy: number) => {
      e.preventDefault();
      stopMotion();
      commit(panByPixels(viewRef.current, dx, dy, W, H));
    };
    switch (e.key) {
      case 'ArrowLeft':
        return pan(step, 0);
      case 'ArrowRight':
        return pan(-step, 0);
      case 'ArrowUp':
        return pan(0, step);
      case 'ArrowDown':
        return pan(0, -step);
      case '+':
      case '=':
        e.preventDefault();
        return zoomBy(0.7, undefined, undefined, true);
      case '-':
      case '_':
        e.preventDefault();
        return zoomBy(1 / 0.7, undefined, undefined, true);
      case '0':
        e.preventDefault();
        return animateTo(fitView(W, H));
    }
  };

  const onSelect = useCallback(
    (id: string) => {
      select(id);
    },
    [select],
  );

  const { W, H } = size;
  const h = viewHeight(view, W, H);
  const scale = scaleOf(view, W);
  const viewBox = `${(view.cx - view.w / 2).toFixed(3)} ${(view.cz - h / 2).toFixed(3)} ${view.w.toFixed(3)} ${h.toFixed(3)}`;

  const hovered = hoveredId && !dragging ? landmarkById(hoveredId) : undefined;
  const tip = useMemo(() => {
    if (!hovered) return null;
    const [sx, sy] = worldToScreen(view, hovered.position, W, H);
    return { x: Math.min(W - 150, Math.max(150, sx)), y: sy - 44, l: hovered };
  }, [hovered, view, W, H]);

  return (
    <div
      ref={rootRef}
      className={`map2d ${season}${dragging ? ' dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onKeyDown={onKeyDown}
      tabIndex={0}
      aria-label="Map of the Institute valley. Arrow keys pan, plus and minus zoom, Tab visits places from north to south."
      data-testid="map2d"
    >
      <svg viewBox={viewBox} aria-labelledby="m2-title m2-desc" role="group">
        <title id="m2-title">Map of the Institute valley</title>
        <desc id="m2-desc">
          A flat map with north at the top: the Argos river runs south through the valley to the South Sea, with
          mountains to the west, woods and highlands to the north and east, and a castle for each House.
        </desc>
        <StaticMap uid="m2f" />
        <MapLabels scale={scale} labels={layers.labels} inferred={layers.inferred} />
        <MarkerLayer
          scale={scale}
          selectedId={selectedId}
          hoveredId={dragging ? null : hoveredId}
          labels={layers.labels}
          inferred={layers.inferred}
          names={NAMES}
          onSelect={onSelect}
          onHover={hover}
        />
      </svg>

      <div className="m2-cartouche">
        <MarsInset />
        <div className="m2-cartouche-body">
          <ScaleBar scale={scale} />
          <Legend />
        </div>
      </div>
      <ZoomControls
        onZoomIn={() => zoomBy(0.62, undefined, undefined, true)}
        onZoomOut={() => zoomBy(1 / 0.62, undefined, undefined, true)}
        onReset={() => animateTo(fitView(W, H))}
      />
      {tip && (
        <Tooltip
          x={tip.x}
          y={tip.y}
          place={PLACE_BY_ID.get(tip.l.id)}
          title={tip.l.name}
          inferred={tip.l.confidence !== 'canon'}
        />
      )}
    </div>
  );
}
