// ---------------------------------------------------------------------------
// GraphicsCanvas — the SVG render surface + pointer interaction controller.
//
// All hit testing is done in world space against the shape model (see
// geometry.ts), which keeps behaviour identical regardless of how the SVG
// happens to lay out. Selection chrome (outline + handles) is drawn in screen
// space so it stays a constant pixel size at any zoom, Figma-style.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { screenToWorld, worldToScreen, zoomAt } from './camera';
import {
  boundsOf,
  ellipseFromDrag,
  handlesForBounds,
  hitTest,
  lineFromDrag,
  makeId,
  normalizeBounds,
  polygonFromPoints,
  rectFromDrag,
  resizeBounds,
  setShapeBounds,
  translateShape,
} from './geometry';
import * as SceneOps from './scene';
import type { GraphicsEditor } from './useGraphicsEditor';
import type { Bounds, HandlePosition, Point, Scene, Shape, ShapeType } from './types';

const HANDLE_HIT_PX = 9; // screen-space grab radius for resize handles
const CLICK_SLOP_PX = 4; // movement under this = a click, not a drag
const MIN_SIZE = 6; // minimum shape size in world units
const POLY_CLOSE_PX = 12; // click within this of the first vertex closes a polygon

type Interaction =
  | { kind: 'none' }
  | { kind: 'creating'; shapeType: Exclude<ShapeType, 'polygon'>; id: string; start: Point; before: Scene; moved: boolean }
  | { kind: 'moving'; ids: string[]; start: Point; originals: Shape[]; before: Scene; moved: boolean }
  | { kind: 'resizing'; id: string; handle: HandlePosition; original: Shape; originalBounds: Bounds; before: Scene }
  | { kind: 'panning'; startScreen: Point; startX: number; startY: number };

export interface GraphicsCanvasProps {
  editor: GraphicsEditor;
  /** Fired after a shape is created by drawing. */
  onShapeCreated?: (shape: Shape) => void;
  /** Fired on double-click of an existing shape (select tool). */
  onShapeActivate?: (shape: Shape) => void;
  /** Optional in-shape content (zone info, labels …), rendered in world space. */
  renderShapeOverlay?: (shape: Shape, selected: boolean) => ReactNode;
  /** Per-shape visual style override. */
  styleForShape?: (shape: Shape, selected: boolean) => { fill?: string; stroke?: string; fillOpacity?: number; strokeWidth?: number };
  gridSize?: number;
  readOnly?: boolean;
  className?: string;
}

export default function GraphicsCanvas({
  editor,
  onShapeCreated,
  onShapeActivate,
  renderShapeOverlay,
  styleForShape,
  gridSize = 40,
  readOnly = false,
  className,
}: GraphicsCanvasProps) {
  const { scene, viewport, tool, selectedIds } = editor;
  const svgRef = useRef<SVGSVGElement>(null);
  const interaction = useRef<Interaction>({ kind: 'none' });
  const spaceDown = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [polyDraft, setPolyDraft] = useState<Point[] | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  // --- measure the surface (for grid coverage + fit-to-view) ---------------
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: r.width, height: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toScreen = useCallback(
    (e: { clientX: number; clientY: number }): Point => {
      const rect = svgRef.current?.getBoundingClientRect();
      return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
    },
    [],
  );
  const toWorld = useCallback(
    (e: { clientX: number; clientY: number }): Point => screenToWorld(viewport, toScreen(e)),
    [toScreen, viewport],
  );

  // Keep the latest editor reachable from stable native listeners.
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // --- hit helpers ---------------------------------------------------------
  const topmostAt = useCallback(
    (world: Point): Shape | null => {
      const tol = 6 / viewport.zoom;
      for (let i = scene.shapes.length - 1; i >= 0; i--) {
        if (hitTest(scene.shapes[i], world, tol)) return scene.shapes[i];
      }
      return null;
    },
    [scene.shapes, viewport.zoom],
  );

  const handleAt = useCallback(
    (screen: Point): HandlePosition | null => {
      if (selectedIds.length !== 1) return null;
      const shape = SceneOps.findShape(scene, selectedIds[0]);
      if (!shape) return null;
      for (const h of handlesForBounds(boundsOf(shape))) {
        const hs = worldToScreen(viewport, h.point);
        if (Math.hypot(hs.x - screen.x, hs.y - screen.y) <= HANDLE_HIT_PX) return h.position;
      }
      return null;
    },
    [scene, selectedIds, viewport],
  );

  // --- interaction → scene computation -------------------------------------
  const clampBounds = (b: Bounds): Bounds => {
    const n = normalizeBounds(b);
    return { ...n, width: Math.max(MIN_SIZE, n.width), height: Math.max(MIN_SIZE, n.height) };
  };

  const computeCreating = (i: Extract<Interaction, { kind: 'creating' }>, world: Point): Shape => {
    const base = { id: i.id } as const;
    if (i.shapeType === 'rectangle') return { ...rectFromDrag(i.start, world), ...base };
    if (i.shapeType === 'circle') return { ...ellipseFromDrag(i.start, world), ...base };
    return { ...lineFromDrag(i.start, world), ...base };
  };

  // --- pointer handlers ----------------------------------------------------
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0 && e.button !== 1) return;
      svgRef.current?.setPointerCapture(e.pointerId);
      const screen = toScreen(e);
      const world = screenToWorld(viewport, screen);
      const wantPan = tool === 'pan' || spaceDown.current || e.button === 1;

      if (wantPan) {
        interaction.current = { kind: 'panning', startScreen: screen, startX: viewport.x, startY: viewport.y };
        setGrabbing(true);
        return;
      }

      // polygon drafting (click to add vertices)
      if (tool === 'polygon' && !readOnly) {
        setPolyDraft((prev) => {
          const pts = prev ?? [];
          if (pts.length >= 3) {
            const firstScreen = worldToScreen(viewport, pts[0]);
            if (Math.hypot(firstScreen.x - screen.x, firstScreen.y - screen.y) <= POLY_CLOSE_PX) {
              finalizePolygon(pts);
              return null;
            }
          }
          return [...pts, world];
        });
        return;
      }

      if (tool === 'select') {
        const handle = handleAt(screen);
        if (handle && !readOnly) {
          const shape = SceneOps.findShape(scene, selectedIds[0])!;
          interaction.current = {
            kind: 'resizing',
            id: shape.id,
            handle,
            original: shape,
            originalBounds: boundsOf(shape),
            before: scene,
          };
          return;
        }
        const hit = topmostAt(world);
        if (hit) {
          const ids = e.shiftKey
            ? Array.from(new Set([...selectedIds, hit.id]))
            : selectedIds.includes(hit.id)
              ? selectedIds
              : [hit.id];
          editor.setSelection(ids);
          if (!readOnly) {
            const originals = scene.shapes.filter((s) => ids.includes(s.id));
            interaction.current = { kind: 'moving', ids, start: world, originals, before: scene, moved: false };
          }
        } else {
          if (!e.shiftKey) editor.setSelection([]);
        }
        return;
      }

      // create rectangle / circle / line by dragging
      if (!readOnly && (tool === 'rectangle' || tool === 'circle' || tool === 'line')) {
        interaction.current = {
          kind: 'creating',
          shapeType: tool,
          id: makeId('shape'),
          start: world,
          before: scene,
          moved: false,
        };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tool, viewport, scene, selectedIds, readOnly, toScreen, handleAt, topmostAt, editor],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const screen = toScreen(e);
      const world = screenToWorld(viewport, screen);
      setCursorWorld(world);
      const i = interaction.current;

      switch (i.kind) {
        case 'panning': {
          editor.setViewport((vp) => ({ ...vp, x: i.startX + (screen.x - i.startScreen.x), y: i.startY + (screen.y - i.startScreen.y) }));
          return;
        }
        case 'creating': {
          if (Math.hypot(world.x - i.start.x, world.y - i.start.y) * viewport.zoom > CLICK_SLOP_PX) i.moved = true;
          const shape = computeCreating(i, world);
          editor.previewScene(SceneOps.addShape(i.before, shape));
          return;
        }
        case 'moving': {
          const dx = world.x - i.start.x;
          const dy = world.y - i.start.y;
          if (Math.hypot(dx, dy) * viewport.zoom > CLICK_SLOP_PX) i.moved = true;
          let next = i.before;
          for (const orig of i.originals) next = SceneOps.updateShape(next, orig.id, translateShape(orig, dx, dy));
          editor.previewScene(next);
          return;
        }
        case 'resizing': {
          const raw = resizeBounds(i.originalBounds, i.handle, world);
          const resized = setShapeBounds(i.original, clampBounds(raw));
          editor.previewScene(SceneOps.updateShape(i.before, i.id, resized));
          return;
        }
        default:
          return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewport, editor, toScreen],
  );

  const endInteraction = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const i = interaction.current;
      interaction.current = { kind: 'none' };
      if (i.kind === 'panning') setGrabbing(false);
      if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
      const world = screenToWorld(viewport, toScreen(e));

      switch (i.kind) {
        case 'creating': {
          let shape: Shape;
          if (!i.moved) {
            // bare click → default box (line needs a real drag, so ignore it)
            if (i.shapeType === 'line') {
              editor.previewScene(i.before);
              return;
            }
            const s = { width: 140, height: 90 };
            const b = { x: i.start.x - s.width / 2, y: i.start.y - s.height / 2, width: s.width, height: s.height };
            shape =
              i.shapeType === 'rectangle'
                ? { id: i.id, type: 'rectangle', ...b }
                : { id: i.id, type: 'circle', cx: i.start.x, cy: i.start.y, rx: s.width / 2, ry: s.height / 2 };
          } else {
            shape = computeCreating(i, world);
            const bb = boundsOf(shape);
            if (i.shapeType === 'line') {
              if (Math.hypot(bb.width, bb.height) < MIN_SIZE) {
                editor.previewScene(i.before);
                return;
              }
            } else if (bb.width < MIN_SIZE || bb.height < MIN_SIZE) {
              editor.previewScene(i.before);
              return;
            }
          }
          editor.commitFrom(i.before, SceneOps.addShape(i.before, shape));
          editor.setSelection([shape.id]);
          onShapeCreated?.(shape);
          return;
        }
        case 'moving': {
          if (!i.moved) return; // pure click: selection already handled
          const dx = world.x - i.start.x;
          const dy = world.y - i.start.y;
          let next = i.before;
          for (const orig of i.originals) next = SceneOps.updateShape(next, orig.id, translateShape(orig, dx, dy));
          editor.commitFrom(i.before, next);
          return;
        }
        case 'resizing': {
          const raw = resizeBounds(i.originalBounds, i.handle, world);
          const resized = setShapeBounds(i.original, clampBounds(raw));
          editor.commitFrom(i.before, SceneOps.updateShape(i.before, i.id, resized));
          return;
        }
        default:
          return;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewport, editor, toScreen, onShapeCreated],
  );

  const finalizePolygon = useCallback(
    (pts: Point[]) => {
      if (pts.length < 3) return;
      const shape: Shape = { ...polygonFromPoints(pts), id: makeId('shape') };
      editor.addShape(shape);
      editor.setSelection([shape.id]);
      onShapeCreated?.(shape);
    },
    [editor, onShapeCreated],
  );

  const onDoubleClick = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tool === 'polygon' && polyDraft) {
        finalizePolygon(polyDraft);
        setPolyDraft(null);
        return;
      }
      if (tool === 'select') {
        const hit = topmostAt(screenToWorld(viewport, toScreen(e)));
        if (hit) onShapeActivate?.(hit);
      }
    },
    [tool, polyDraft, finalizePolygon, topmostAt, viewport, toScreen, onShapeActivate],
  );

  // Wheel handling, Figma-style: two-finger trackpad scroll (and mouse wheel)
  // PANS; ⌘/Ctrl+scroll — and the pinch gesture, which the browser reports as a
  // wheel event with ctrlKey=true — ZOOMS to the cursor. Attached natively as a
  // non-passive listener so preventDefault stops the page from scrolling/zooming.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    function onWheelNative(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1; // lines / pages → px
      const dx = e.deltaX * unit;
      const dy = e.deltaY * unit;
      if (e.ctrlKey || e.metaKey) {
        const pivot = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const factor = Math.pow(1.0015, -dy);
        editorRef.current.setViewport((vp) => zoomAt(vp, factor, pivot));
      } else {
        editorRef.current.setViewport((vp) => ({ ...vp, x: vp.x - dx, y: vp.y - dy }));
      }
    }
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, []);

  // --- keyboard: delete / escape / enter -----------------------------------
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (ev.key === 'Escape') {
        if (polyDraft) setPolyDraft(null);
        else editor.setSelection([]);
        interaction.current = { kind: 'none' };
      } else if ((ev.key === 'Delete' || ev.key === 'Backspace') && !readOnly) {
        if (editor.selectedIds.length) {
          ev.preventDefault();
          editor.removeSelected();
        }
      } else if (ev.key === 'Enter' && tool === 'polygon' && polyDraft) {
        finalizePolygon(polyDraft);
        setPolyDraft(null);
      } else if (ev.key === ' ') {
        spaceDown.current = true;
      } else if (!ev.metaKey && !ev.ctrlKey && !ev.altKey) {
        // Figma-style single-key tool shortcuts
        const map: Record<string, typeof tool> = { v: 'select', r: 'rectangle', o: 'circle', l: 'line', p: 'polygon', h: 'pan' };
        const next = map[ev.key.toLowerCase()];
        if (next && !(readOnly && next !== 'select' && next !== 'pan')) editor.setTool(next);
      }
    }
    function onKeyUp(ev: KeyboardEvent) {
      if (ev.key === ' ') spaceDown.current = false;
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [editor, polyDraft, tool, readOnly, finalizePolygon]);

  // Cancel an in-progress polygon when the tool changes away from polygon.
  useEffect(() => {
    if (tool !== 'polygon' && polyDraft) setPolyDraft(null);
  }, [tool, polyDraft]);

  // --- rendering -----------------------------------------------------------
  const g = gridSize * viewport.zoom;
  const cursor = grabbing
    ? 'grabbing'
    : tool === 'pan' || spaceDown.current
      ? 'grab'
      : tool === 'select'
        ? 'default'
        : 'crosshair';

  const selectionUi = renderSelectionChrome(scene, selectedIds, viewport, readOnly);

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ touchAction: 'none', cursor, userSelect: 'none', display: 'block', width: '100%', height: '100%' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
      onDoubleClick={onDoubleClick}
    >
      {gridSize > 0 && (
        <>
          <defs>
            <pattern id="gfx-grid" x={viewport.x} y={viewport.y} width={g} height={g} patternUnits="userSpaceOnUse">
              <circle cx={1} cy={1} r={1} fill="currentColor" opacity={0.18} />
            </pattern>
          </defs>
          <rect x={0} y={0} width={size.width} height={size.height} fill="url(#gfx-grid)" className="text-muted-foreground" />
        </>
      )}

      <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
        {scene.background && (
          <image
            href={scene.background.src}
            x={scene.background.x}
            y={scene.background.y}
            width={scene.background.width}
            height={scene.background.height}
            opacity={scene.background.opacity}
            preserveAspectRatio="none"
          />
        )}

        {scene.shapes.map((shape) => (
          <ShapeView
            key={shape.id}
            shape={shape}
            selected={selectedIds.includes(shape.id)}
            style={styleForShape?.(shape, selectedIds.includes(shape.id))}
          />
        ))}

        {/* in-shape overlays (zone info, labels) */}
        {renderShapeOverlay &&
          scene.shapes.map((shape) => {
            const b = boundsOf(shape);
            if (b.width < 1 || b.height < 1) return null;
            const content = renderShapeOverlay(shape, selectedIds.includes(shape.id));
            if (!content) return null;
            return (
              <foreignObject
                key={`ov_${shape.id}`}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                style={{ pointerEvents: 'none', overflow: 'visible' }}
              >
                <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>{content}</div>
              </foreignObject>
            );
          })}

        {/* polygon draft preview */}
        {polyDraft && polyDraft.length > 0 && (
          <g>
            <polyline
              points={[...polyDraft, cursorWorld ?? polyDraft[polyDraft.length - 1]].map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
            {polyDraft.map((p, idx) => (
              <circle key={idx} cx={p.x} cy={p.y} r={4 / viewport.zoom} fill="#2563eb" />
            ))}
          </g>
        )}
      </g>

      {/* selection chrome in screen space (constant pixel size) */}
      {selectionUi}
    </svg>
  );
}

// ---------------------------------------------------------------------------

function ShapeView({
  shape,
  selected,
  style,
}: {
  shape: Shape;
  selected: boolean;
  style?: { fill?: string; stroke?: string; fillOpacity?: number; strokeWidth?: number };
}) {
  const fill = style?.fill ?? shape.fill ?? '#3b82f6';
  const stroke = style?.stroke ?? shape.stroke ?? '#1d4ed8';
  const fillOpacity = style?.fillOpacity ?? shape.fillOpacity ?? 0.35;
  const strokeWidth = style?.strokeWidth ?? shape.strokeWidth ?? 2;
  const common = {
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    vectorEffect: 'non-scaling-stroke' as const,
    strokeDasharray: shape.dashed ? '8 5' : undefined,
    opacity: selected ? 1 : 0.98,
  };

  switch (shape.type) {
    case 'rectangle':
      return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={2} {...common} />;
    case 'circle':
      return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
    case 'line':
      return (
        <line
          x1={shape.points[0].x}
          y1={shape.points[0].y}
          x2={shape.points[1].x}
          y2={shape.points[1].y}
          {...common}
          fill="none"
          strokeWidth={Math.max(3, strokeWidth)}
          strokeLinecap="round"
        />
      );
    case 'polygon':
      return <polygon points={shape.points.map((p) => `${p.x},${p.y}`).join(' ')} {...common} />;
  }
}

function renderSelectionChrome(scene: Scene, selectedIds: string[], vp: { x: number; y: number; zoom: number }, readOnly: boolean) {
  if (selectedIds.length === 0) return null;
  const nodes: ReactNode[] = [];
  for (const id of selectedIds) {
    const shape = SceneOps.findShape(scene, id);
    if (!shape) continue;
    const b = boundsOf(shape);
    const tl = worldToScreen(vp, { x: b.x, y: b.y });
    const w = b.width * vp.zoom;
    const h = b.height * vp.zoom;
    nodes.push(
      <rect
        key={`sel_${id}`}
        x={tl.x - 1}
        y={tl.y - 1}
        width={w + 2}
        height={h + 2}
        fill="none"
        stroke="#2563eb"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />,
    );
    if (selectedIds.length === 1 && !readOnly) {
      for (const handle of handlesForBounds(b)) {
        const hs = worldToScreen(vp, handle.point);
        nodes.push(
          <rect key={`h_${id}_${handle.position}`} x={hs.x - 4} y={hs.y - 4} width={8} height={8} fill="#fff" stroke="#2563eb" strokeWidth={1.5} rx={1} />,
        );
      }
    }
  }
  return <g>{nodes}</g>;
}
