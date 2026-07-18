# `@/graphics` — interactive vector-graphics engine

A small, self-contained 2-D graphics engine used to build the Zone Editor.
It is deliberately **domain-agnostic** and dependency-free (React + SVG only) —
treat it like a third-party library. Nothing in this folder imports from the
rest of the app, so it can be lifted out into its own package unchanged.

## What it gives you

- **Primitives:** rectangle, ellipse/circle, line, polygon.
- **Interaction:** draw, select, drag/move, resize (8 bounding-box handles),
  delete, multi-select, undo/redo.
- **Camera:** pan and zoom-to-cursor with screen↔world conversion.
- **Hit testing** done in world space against the model (point-in-rect,
  point-in-ellipse, point-in-polygon via ray casting, distance-to-segment) so
  behaviour is independent of DOM layout.
- **Overlays:** render arbitrary content *inside* a shape (Figma-style) via a
  render prop — this is how zone info is drawn on top of each shape.
- **Serialization:** the `Scene` is plain JSON, so a host app can persist it
  anywhere (localStorage, a DB column, a file).

## Core concepts

| Concept | Type | Notes |
| --- | --- | --- |
| `Shape` | discriminated union | carries an opaque `data` payload for the host |
| `Scene` | `{ shapes, background }` | JSON-safe |
| `Viewport` | `{ x, y, zoom }` | applied as `translate(x,y) scale(zoom)` |
| `ToolType` | `select \| rectangle \| circle \| line \| polygon \| pan` | |

## Usage

```tsx
import { GraphicsCanvas, useGraphicsEditor, emptyScene } from '@/graphics';

function Editor() {
  const editor = useGraphicsEditor(emptyScene());

  return (
    <GraphicsCanvas
      editor={editor}
      onShapeCreated={(shape) => {
        // e.g. open a dialog to attach domain data to shape.id
      }}
      onShapeActivate={(shape) => {
        // double-click → edit
      }}
      renderShapeOverlay={(shape) => <MyLabel shape={shape} />}
      styleForShape={(shape, selected) => ({ fill: '#22c55e' })}
    />
  );
}
```

The `useGraphicsEditor` hook is the headless controller: it owns the scene,
viewport, active tool, selection and the undo/redo history, and exposes actions
(`setTool`, `addShape`, `updateShape`, `removeSelected`, `setBackground`,
`zoomIn/Out`, `resetView`, `fitToView`, `undo`, `redo`, `loadScene`). The
`GraphicsCanvas` is a controlled view over that state.

### Attaching domain data

Shapes carry a `data` field. The Zone Editor stores the assigned zone there and
uses `renderShapeOverlay` + `styleForShape` to colour the shape by zone state
and draw the zone number/name/reading inside it. The engine never needs to know
what a "zone" is.

## Navigation & keyboard

Pan/zoom follows Figma conventions:

- **Scroll / two-finger swipe** — pan the canvas
- **⌘/Ctrl + scroll**, or trackpad **pinch** — zoom to cursor
- hold **Space** and drag (or the Pan tool / middle-mouse) — pan

Keys:

- `V` select · `R` rectangle · `O` circle · `L` line · `P` polygon · `H` pan
- `Delete` / `Backspace` — delete selection
- `Esc` — cancel polygon draft / clear selection
- `Enter` — finish the current polygon

## Files

| File | Responsibility |
| --- | --- |
| `types.ts` | the shape / scene / viewport model |
| `geometry.ts` | pure geometry: bounds, hit testing, resize, transforms |
| `camera.ts` | screen↔world, zoom-at-cursor, fit-to-bounds |
| `scene.ts` | immutable scene ops + (de)serialization |
| `useGraphicsEditor.ts` | headless state controller with history |
| `GraphicsCanvas.tsx` | SVG renderer + pointer/keyboard interaction |
| `index.ts` | public API barrel |
