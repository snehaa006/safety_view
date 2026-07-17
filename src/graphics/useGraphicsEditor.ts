// ---------------------------------------------------------------------------
// useGraphicsEditor — a headless controller hook. Owns the scene, viewport,
// active tool, selection and an undo/redo history. The <GraphicsCanvas> is a
// controlled component driven by this state; a host app can also drive it
// with its own state if it prefers.
// ---------------------------------------------------------------------------

import { useCallback, useMemo, useRef, useState } from 'react';
import { clampZoom, fitBounds, zoomAt } from './camera';
import { boundsOf } from './geometry';
import * as SceneOps from './scene';
import type { Background, Scene, Shape, ToolType, Viewport } from './types';

export interface GraphicsEditor {
  scene: Scene;
  viewport: Viewport;
  tool: ToolType;
  selectedIds: string[];
  canUndo: boolean;
  canRedo: boolean;

  setTool: (tool: ToolType) => void;
  setViewport: (vp: Viewport | ((prev: Viewport) => Viewport)) => void;
  setSelection: (ids: string[]) => void;

  /** Commit a scene change and push a history entry. */
  commitScene: (next: Scene | ((prev: Scene) => Scene)) => void;
  /** Update the scene *without* a new history entry (for live drags). */
  previewScene: (next: Scene | ((prev: Scene) => Scene)) => void;
  /**
   * Finalize an interaction: push `before` (the pre-drag snapshot) as the single
   * undo entry and set the scene to `after`. Used by the canvas so an entire
   * drag / resize collapses to one history step.
   */
  commitFrom: (before: Scene, after: Scene) => void;

  addShape: (shape: Shape) => void;
  updateShape: (id: string, patch: Partial<Shape> | ((s: Shape) => Shape)) => void;
  removeSelected: () => void;
  setBackground: (bg: Background | null) => void;

  undo: () => void;
  redo: () => void;

  zoomIn: (pivot?: { x: number; y: number }) => void;
  zoomOut: (pivot?: { x: number; y: number }) => void;
  resetView: () => void;
  fitToView: (size: { width: number; height: number }) => void;

  /** Replace the whole scene (e.g. after loading a saved layout). Clears history. */
  loadScene: (scene: Scene) => void;
}

const HISTORY_LIMIT = 100;

export function useGraphicsEditor(initial?: Scene): GraphicsEditor {
  const [scene, setScene] = useState<Scene>(initial ?? SceneOps.emptyScene());
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [tool, setTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const past = useRef<Scene[]>([]);
  const future = useRef<Scene[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  const commitScene = useCallback<GraphicsEditor['commitScene']>((next) => {
    setScene((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: Scene) => Scene)(prev) : next;
      if (resolved === prev) return prev;
      past.current = [...past.current.slice(-HISTORY_LIMIT + 1), prev];
      future.current = [];
      return resolved;
    });
    setHistoryTick((t) => t + 1);
  }, []);

  const previewScene = useCallback<GraphicsEditor['previewScene']>((next) => {
    setScene((prev) => (typeof next === 'function' ? (next as (p: Scene) => Scene)(prev) : next));
  }, []);

  const commitFrom = useCallback<GraphicsEditor['commitFrom']>((before, after) => {
    past.current = [...past.current.slice(-HISTORY_LIMIT + 1), before];
    future.current = [];
    setScene(after);
    setHistoryTick((t) => t + 1);
  }, []);

  const addShape = useCallback(
    (shape: Shape) => commitScene((prev) => SceneOps.addShape(prev, shape)),
    [commitScene],
  );

  const updateShape = useCallback<GraphicsEditor['updateShape']>(
    (id, patch) => commitScene((prev) => SceneOps.updateShape(prev, id, patch)),
    [commitScene],
  );

  const removeSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    commitScene((prev) => SceneOps.removeShapes(prev, selectedIds));
    setSelectedIds([]);
  }, [commitScene, selectedIds]);

  const setBackground = useCallback(
    (bg: Background | null) => commitScene((prev) => ({ ...prev, background: bg })),
    [commitScene],
  );

  const undo = useCallback(() => {
    setScene((prev) => {
      const previous = past.current[past.current.length - 1];
      if (previous === undefined) return prev;
      past.current = past.current.slice(0, -1);
      future.current = [prev, ...future.current];
      return previous;
    });
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    setScene((prev) => {
      const nextScene = future.current[0];
      if (nextScene === undefined) return prev;
      future.current = future.current.slice(1);
      past.current = [...past.current, prev];
      return nextScene;
    });
    setHistoryTick((t) => t + 1);
  }, []);

  const zoomIn = useCallback(
    (pivot?: { x: number; y: number }) =>
      setViewport((vp) => zoomAt(vp, 1.2, pivot ?? { x: vp.x, y: vp.y })),
    [],
  );
  const zoomOut = useCallback(
    (pivot?: { x: number; y: number }) =>
      setViewport((vp) => zoomAt(vp, 1 / 1.2, pivot ?? { x: vp.x, y: vp.y })),
    [],
  );
  const resetView = useCallback(() => setViewport({ x: 0, y: 0, zoom: 1 }), []);

  const fitToView = useCallback<GraphicsEditor['fitToView']>((size) => {
    setScene((current) => {
      const b = SceneOps.sceneBounds(current);
      if (b) setViewport(fitBounds(b, size));
      return current;
    });
  }, []);

  const loadScene = useCallback((next: Scene) => {
    past.current = [];
    future.current = [];
    setScene(next);
    setSelectedIds([]);
    setHistoryTick((t) => t + 1);
  }, []);

  const setViewportSafe = useCallback<GraphicsEditor['setViewport']>((next) => {
    setViewport((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: Viewport) => Viewport)(prev) : next;
      return { ...resolved, zoom: clampZoom(resolved.zoom) };
    });
  }, []);

  return useMemo<GraphicsEditor>(() => {
    void historyTick; // recompute flags when history mutates
    return {
      scene,
      viewport,
      tool,
      selectedIds,
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
      setTool,
      setViewport: setViewportSafe,
      setSelection: setSelectedIds,
      commitScene,
      previewScene,
      commitFrom,
      addShape,
      updateShape,
      removeSelected,
      setBackground,
      undo,
      redo,
      zoomIn,
      zoomOut,
      resetView,
      fitToView,
      loadScene,
    };
  }, [
    scene,
    viewport,
    tool,
    selectedIds,
    historyTick,
    setViewportSafe,
    commitScene,
    previewScene,
    commitFrom,
    addShape,
    updateShape,
    removeSelected,
    setBackground,
    undo,
    redo,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
    loadScene,
  ]);
}

/** Convenience: default bounds for a shape created by a bare click (no drag). */
export function defaultShapeSizeAt(): { width: number; height: number } {
  return { width: 140, height: 90 };
}

export { boundsOf };
