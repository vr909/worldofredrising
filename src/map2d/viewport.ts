/**
 * Pure pan/zoom maths for the 2D map. The SVG viewBox is in world km (x east, z south, so north is up),
 * and a View is just the centre plus the visible width in km; height follows the screen aspect.
 */
import type { Vec2 } from '../world/types';
import { BOUNDS } from '../world/layout';

export interface View {
  cx: number;
  cz: number;
  /** Visible width in km. */
  w: number;
}

/** Everything the map draws: the valley, both canyon walls and a margin for the frame. */
const MARGIN = 2;
export const EXTENT = {
  minX: BOUNDS.minX - BOUNDS.wallDepth - MARGIN,
  maxX: BOUNDS.maxX + BOUNDS.wallDepth + MARGIN,
  minZ: BOUNDS.minZ - MARGIN,
  maxZ: BOUNDS.maxZ + MARGIN,
};
const EXTENT_W = EXTENT.maxX - EXTENT.minX;
const EXTENT_H = EXTENT.maxZ - EXTENT.minZ;

/** Smallest visible width (most zoomed in), km. */
export const MIN_W = 8;

/** Width that shows the whole extent on a W x H screen. */
export function fitWidth(W: number, H: number): number {
  return Math.max(EXTENT_W, (EXTENT_H * W) / Math.max(1, H));
}

export function fitView(W: number, H: number): View {
  return { cx: (EXTENT.minX + EXTENT.maxX) / 2, cz: (EXTENT.minZ + EXTENT.maxZ) / 2, w: fitWidth(W, H) };
}

export const viewHeight = (v: View, W: number, H: number): number => (v.w * H) / Math.max(1, W);

/** Pixels per km. */
export const scaleOf = (v: View, W: number): number => W / v.w;

function clampAxis(c: number, half: number, lo: number, hi: number): number {
  if (half * 2 >= hi - lo) return (lo + hi) / 2;
  return Math.min(hi - half, Math.max(lo + half, c));
}

export function clampView(v: View, W: number, H: number): View {
  const w = Math.min(fitWidth(W, H), Math.max(MIN_W, v.w));
  const h = (w * H) / Math.max(1, W);
  return {
    w,
    cx: clampAxis(v.cx, w / 2, EXTENT.minX, EXTENT.maxX),
    cz: clampAxis(v.cz, h / 2, EXTENT.minZ, EXTENT.maxZ),
  };
}

export function screenToWorld(v: View, px: number, py: number, W: number, H: number): Vec2 {
  const h = viewHeight(v, W, H);
  return [v.cx - v.w / 2 + (px / W) * v.w, v.cz - h / 2 + (py / H) * h];
}

export function worldToScreen(v: View, p: Vec2, W: number, H: number): Vec2 {
  const h = viewHeight(v, W, H);
  return [((p[0] - (v.cx - v.w / 2)) / v.w) * W, ((p[1] - (v.cz - h / 2)) / h) * H];
}

/** Zoom by `factor` (>1 zooms out) keeping the world point under screen (px, py) fixed. */
export function zoomAbout(v: View, factor: number, px: number, py: number, W: number, H: number): View {
  const [wx, wz] = screenToWorld(v, px, py, W, H);
  const w = Math.min(fitWidth(W, H), Math.max(MIN_W, v.w * factor));
  const h = (w * H) / Math.max(1, W);
  return clampView({ w, cx: wx - (px / W - 0.5) * w, cz: wz - (py / H - 0.5) * h }, W, H);
}

/** Move the view so the content follows a drag of (dx, dy) screen pixels. */
export function panByPixels(v: View, dx: number, dy: number, W: number, H: number): View {
  const k = v.w / Math.max(1, W);
  return clampView({ ...v, cx: v.cx - dx * k, cz: v.cz - dy * k }, W, H);
}
