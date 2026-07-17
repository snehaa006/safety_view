// ---------------------------------------------------------------------------
// Pure computational-geometry helpers. No React, no DOM — just math on the
// shape model. This is where the "computer graphics" lives: bounding boxes,
// hit testing per primitive, and generic bounds-based resizing.
// ---------------------------------------------------------------------------

import type {
  Bounds,
  CircleShape,
  HandlePosition,
  LineShape,
  Point,
  PolygonShape,
  RectangleShape,
  ResizeHandle,
  Shape,
} from './types';

export const HANDLE_ORDER: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Axis-aligned bounding box of any shape, in world units. */
export function boundsOf(shape: Shape): Bounds {
  switch (shape.type) {
    case 'rectangle':
      return normalizeBounds({ x: shape.x, y: shape.y, width: shape.width, height: shape.height });
    case 'circle':
      return { x: shape.cx - shape.rx, y: shape.cy - shape.ry, width: shape.rx * 2, height: shape.ry * 2 };
    case 'line':
    case 'polygon': {
      const pts = shape.points;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
  }
}

/** Force a bounds to have non-negative width/height (flips origin if needed). */
export function normalizeBounds(b: Bounds): Bounds {
  return {
    x: b.width < 0 ? b.x + b.width : b.x,
    y: b.height < 0 ? b.y + b.height : b.y,
    width: Math.abs(b.width),
    height: Math.abs(b.height),
  };
}

export function boundsCenter(b: Bounds): Point {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export function centerOf(shape: Shape): Point {
  return boundsCenter(boundsOf(shape));
}

// --- Hit testing -----------------------------------------------------------

function pointInRect(p: Point, b: Bounds): boolean {
  return p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(p: Point, pts: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    const intersects = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Shortest distance from point `p` to segment `a`–`b`. */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/**
 * Does the world point `p` hit the shape? `tolerance` (world units) widens
 * thin primitives (lines, polygon edges) so they are grabbable.
 */
export function hitTest(shape: Shape, p: Point, tolerance = 4): boolean {
  switch (shape.type) {
    case 'rectangle':
      return pointInRect(p, boundsOf(shape));
    case 'circle': {
      const nx = (p.x - shape.cx) / (shape.rx || 1e-6);
      const ny = (p.y - shape.cy) / (shape.ry || 1e-6);
      return nx * nx + ny * ny <= 1;
    }
    case 'line':
      return distanceToSegment(p, shape.points[0], shape.points[1]) <= tolerance + (shape.strokeWidth ?? 2) / 2;
    case 'polygon': {
      if (pointInPolygon(p, shape.points)) return true;
      // also accept a near-edge hit for un-filled / thin polygons
      for (let i = 0; i < shape.points.length; i++) {
        const a = shape.points[i];
        const b = shape.points[(i + 1) % shape.points.length];
        if (distanceToSegment(p, a, b) <= tolerance) return true;
      }
      return false;
    }
  }
}

// --- Resize handles --------------------------------------------------------

export function handlesForBounds(b: Bounds): ResizeHandle[] {
  const { x, y, width: w, height: h } = b;
  const mid = { x: x + w / 2, y: y + h / 2 };
  const map: Record<HandlePosition, Point> = {
    nw: { x, y },
    n: { x: mid.x, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: mid.y },
    se: { x: x + w, y: y + h },
    s: { x: mid.x, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: mid.y },
  };
  return HANDLE_ORDER.map((position) => ({ position, point: map[position] }));
}

/** Apply a handle drag to a bounds, returning the resulting (raw) bounds. */
export function resizeBounds(b: Bounds, handle: HandlePosition, pointer: Point): Bounds {
  let { x, y, width, height } = b;
  const right = x + width;
  const bottom = y + height;

  if (handle.includes('w')) {
    x = pointer.x;
    width = right - pointer.x;
  }
  if (handle.includes('e')) {
    width = pointer.x - x;
  }
  if (handle.includes('n')) {
    y = pointer.y;
    height = bottom - pointer.y;
  }
  if (handle.includes('s')) {
    height = pointer.y - y;
  }
  return { x, y, width, height };
}

// --- Geometry transforms ---------------------------------------------------

export function translateShape<T extends Shape>(shape: T, dx: number, dy: number): T {
  switch (shape.type) {
    case 'rectangle':
      return { ...shape, x: shape.x + dx, y: shape.y + dy };
    case 'circle':
      return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy };
    case 'line':
    case 'polygon':
      return { ...shape, points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
}

/**
 * Re-fit a shape from its current bounds onto `next` bounds via a linear map.
 * Works generically for every primitive (rect, ellipse, line, polygon).
 */
export function setShapeBounds<T extends Shape>(shape: T, next: Bounds): T {
  const cur = boundsOf(shape);
  const norm = normalizeBounds(next);
  const sx = cur.width === 0 ? 1 : norm.width / cur.width;
  const sy = cur.height === 0 ? 1 : norm.height / cur.height;
  const mapX = (px: number) => norm.x + (px - cur.x) * sx;
  const mapY = (py: number) => norm.y + (py - cur.y) * sy;

  switch (shape.type) {
    case 'rectangle':
      return { ...shape, x: norm.x, y: norm.y, width: norm.width, height: norm.height };
    case 'circle':
      return {
        ...shape,
        cx: norm.x + norm.width / 2,
        cy: norm.y + norm.height / 2,
        rx: norm.width / 2,
        ry: norm.height / 2,
      };
    case 'line':
      return {
        ...shape,
        points: [
          { x: mapX(shape.points[0].x), y: mapY(shape.points[0].y) },
          { x: mapX(shape.points[1].x), y: mapY(shape.points[1].y) },
        ],
      };
    case 'polygon':
      return { ...shape, points: shape.points.map((p) => ({ x: mapX(p.x), y: mapY(p.y) })) };
  }
}

// --- Factories -------------------------------------------------------------

let idCounter = 0;
export function makeId(prefix = 'shape'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function rectFromDrag(a: Point, b: Point): Omit<RectangleShape, 'id'> {
  const n = normalizeBounds({ x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y });
  return { type: 'rectangle', x: n.x, y: n.y, width: n.width, height: n.height };
}

export function ellipseFromDrag(a: Point, b: Point): Omit<CircleShape, 'id'> {
  const n = normalizeBounds({ x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y });
  return { type: 'circle', cx: n.x + n.width / 2, cy: n.y + n.height / 2, rx: n.width / 2, ry: n.height / 2 };
}

export function lineFromDrag(a: Point, b: Point): Omit<LineShape, 'id'> {
  return { type: 'line', points: [clonePoint(a), clonePoint(b)] };
}

export function polygonFromPoints(points: Point[]): Omit<PolygonShape, 'id'> {
  return { type: 'polygon', points: points.map(clonePoint) };
}
