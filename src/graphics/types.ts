// ---------------------------------------------------------------------------
// @/graphics — a small, self-contained interactive vector-graphics engine.
//
// The engine is deliberately domain-agnostic: it knows about *shapes* that
// carry an opaque `data` payload and an optional rendered overlay. The host
// app (e.g. the Zone Editor) layers its own semantics on top. Treat this
// folder like a third-party library — nothing in here imports from the rest
// of the app.
// ---------------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'polygon';

export interface ShapeStyle {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number; // in world units
  dashed?: boolean;
}

interface CommonShape extends ShapeStyle {
  id: string;
  /** Opaque payload owned by the host app (e.g. a Zone record). */
  data?: Record<string, unknown> | null;
}

export interface RectangleShape extends CommonShape {
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Stored as an ellipse so non-uniform resize is natural. */
export interface CircleShape extends CommonShape {
  type: 'circle';
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface LineShape extends CommonShape {
  type: 'line';
  points: [Point, Point];
}

export interface PolygonShape extends CommonShape {
  type: 'polygon';
  points: Point[];
}

export type Shape = RectangleShape | CircleShape | LineShape | PolygonShape;

/**
 * Camera / viewport. Rendering applies `translate(x, y) scale(zoom)` to a
 * world-space group, so a world point `w` lands at screen `x + w * zoom`.
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Background {
  /** Data URL (or any <image> href) of the floor plan / layout. */
  src: string;
  width: number;
  height: number;
  x: number;
  y: number;
  opacity: number;
}

export interface Scene {
  shapes: Shape[];
  background: Background | null;
}

export type ToolType = 'select' | 'rectangle' | 'circle' | 'line' | 'polygon' | 'pan';

/** The eight bounding-box resize anchors, plus polygon/line vertex handles. */
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export interface ResizeHandle {
  position: HandlePosition;
  point: Point; // world coordinates
}
