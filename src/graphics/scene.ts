// ---------------------------------------------------------------------------
// Scene model helpers: immutable add / update / remove / reorder, plus
// (de)serialization. The scene is a plain, JSON-safe object so a host app can
// persist it anywhere (localStorage, a DB column, a file).
// ---------------------------------------------------------------------------

import { boundsOf, normalizeBounds } from './geometry';
import type { Bounds, Scene, Shape } from './types';

export function emptyScene(): Scene {
  return { shapes: [], background: null };
}

export function addShape(scene: Scene, shape: Shape): Scene {
  return { ...scene, shapes: [...scene.shapes, shape] };
}

export function updateShape(scene: Scene, id: string, patch: Partial<Shape> | ((s: Shape) => Shape)): Scene {
  return {
    ...scene,
    shapes: scene.shapes.map((s) => {
      if (s.id !== id) return s;
      return typeof patch === 'function' ? patch(s) : ({ ...s, ...patch } as Shape);
    }),
  };
}

export function removeShapes(scene: Scene, ids: Iterable<string>): Scene {
  const set = new Set(ids);
  return { ...scene, shapes: scene.shapes.filter((s) => !set.has(s.id)) };
}

export function findShape(scene: Scene, id: string): Shape | undefined {
  return scene.shapes.find((s) => s.id === id);
}

/** Topmost shape (last drawn = highest z) whose hit test passes. */
export function reorder(scene: Scene, id: string, to: 'front' | 'back'): Scene {
  const shape = findShape(scene, id);
  if (!shape) return scene;
  const rest = scene.shapes.filter((s) => s.id !== id);
  return { ...scene, shapes: to === 'front' ? [...rest, shape] : [shape, ...rest] };
}

/** Union bounds of every shape (and the background), for "fit to screen". */
export function sceneBounds(scene: Scene): Bounds | null {
  const boxes: Bounds[] = scene.shapes.map(boundsOf);
  if (scene.background) {
    const bg = scene.background;
    boxes.push({ x: bg.x, y: bg.y, width: bg.width, height: bg.height });
  }
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    const n = normalizeBounds(b);
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function serializeScene(scene: Scene): string {
  return JSON.stringify(scene);
}

export function deserializeScene(json: string): Scene {
  const parsed = JSON.parse(json) as Partial<Scene>;
  return {
    shapes: Array.isArray(parsed.shapes) ? (parsed.shapes as Shape[]) : [],
    background: parsed.background ?? null,
  };
}
