// ---------------------------------------------------------------------------
// Camera math: convert between screen (pixel) space and world space, and
// zoom/pan the viewport. The render layer applies
// `translate(vp.x, vp.y) scale(vp.zoom)` to the world group.
// ---------------------------------------------------------------------------

import type { Bounds, Point, Viewport } from './types';

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 20;

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export function screenToWorld(vp: Viewport, screen: Point): Point {
  return { x: (screen.x - vp.x) / vp.zoom, y: (screen.y - vp.y) / vp.zoom };
}

export function worldToScreen(vp: Viewport, world: Point): Point {
  return { x: world.x * vp.zoom + vp.x, y: world.y * vp.zoom + vp.y };
}

/** Zoom by a factor while keeping the world point under `pivot` (screen px) fixed. */
export function zoomAt(vp: Viewport, factor: number, pivot: Point): Viewport {
  const zoom = clampZoom(vp.zoom * factor);
  const applied = zoom / vp.zoom;
  return {
    zoom,
    x: pivot.x - (pivot.x - vp.x) * applied,
    y: pivot.y - (pivot.y - vp.y) * applied,
  };
}

export function panBy(vp: Viewport, dx: number, dy: number): Viewport {
  return { ...vp, x: vp.x + dx, y: vp.y + dy };
}

/** Fit a world-space bounds into a viewport of `size` pixels, with padding. */
export function fitBounds(bounds: Bounds, size: { width: number; height: number }, padding = 40): Viewport {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return { x: size.width / 2, y: size.height / 2, zoom: 1 };
  }
  const zoom = clampZoom(
    Math.min((size.width - padding * 2) / bounds.width, (size.height - padding * 2) / bounds.height),
  );
  return {
    zoom,
    x: (size.width - bounds.width * zoom) / 2 - bounds.x * zoom,
    y: (size.height - bounds.height * zoom) / 2 - bounds.y * zoom,
  };
}
