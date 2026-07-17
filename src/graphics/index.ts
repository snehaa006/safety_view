// ---------------------------------------------------------------------------
// @/graphics — public API surface. Import from '@/graphics', never from the
// individual files, so the internal layout can change freely.
// ---------------------------------------------------------------------------

export { default as GraphicsCanvas } from './GraphicsCanvas';
export type { GraphicsCanvasProps } from './GraphicsCanvas';

export { useGraphicsEditor } from './useGraphicsEditor';
export type { GraphicsEditor } from './useGraphicsEditor';

export * as camera from './camera';
export * as geometry from './geometry';
export * as sceneOps from './scene';

export {
  boundsOf,
  centerOf,
  hitTest,
  makeId,
  normalizeBounds,
  translateShape,
  setShapeBounds,
} from './geometry';

export {
  emptyScene,
  serializeScene,
  deserializeScene,
  sceneBounds,
  addShape,
  updateShape,
  removeShapes,
  findShape,
} from './scene';

export type {
  Background,
  Bounds,
  CircleShape,
  HandlePosition,
  LineShape,
  Point,
  PolygonShape,
  RectangleShape,
  ResizeHandle,
  Scene,
  Shape,
  ShapeStyle,
  ShapeType,
  ToolType,
  Viewport,
} from './types';
