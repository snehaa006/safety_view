import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, ImagePlus, LayoutGrid, Maximize, Minus, PenTool, Plus, RefreshCw, Redo2, Save, Trash2, Undo2, X,
} from 'lucide-react';
import {
  GraphicsCanvas, boundsOf, removeShapes, sceneOps, useGraphicsEditor, type Shape,
} from '@/graphics';
import { fetchPanelById, fetchZonesByPanel } from '@/services/api';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import ZoneEditorToolbar from '@/features/zone-editor/ZoneEditorToolbar';
import ZoneInspector from '@/features/zone-editor/ZoneInspector';
import ZoneOverlay from '@/features/zone-editor/ZoneOverlay';
import ZoneAssignDialog from '@/features/zone-editor/ZoneAssignDialog';
import { getMimicStore } from '@/features/zone-editor/storage';
import { zoneColors } from '@/features/zone-editor/zoneStyle';
import { zoneIdOf } from '@/features/zone-editor/types';
import type { Panel, Zone } from '@/types';

const store = getMimicStore();

function readImage(file: File): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => resolve({ src, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

type DialogState = { open: boolean; shapeId: string | null; mode: 'create-shape' | 'reassign' };

export default function MimicEditorPage() {
  const { panelId } = useParams();
  const id = Number(panelId);
  const navigate = useNavigate();
  const editor = useGraphicsEditor();
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ open: false, shapeId: null, mode: 'create-shape' });

  const baselineRef = useRef('');
  const fileRef = useRef<HTMLInputElement>(null);

  const zonesById = useMemo(() => {
    const map = new Map<number, Zone>();
    for (const z of zones) map.set(z.id, z);
    return map;
  }, [zones]);

  const placedZoneIds = useMemo(() => {
    const set = new Set<number>();
    for (const s of editor.scene.shapes) {
      const zid = zoneIdOf(s.data);
      if (zid != null) set.add(zid);
    }
    return set;
  }, [editor.scene]);

  // --- load ---------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([fetchPanelById(id), fetchZonesByPanel(id), store.get(id)])
      .then(([p, z, layout]) => {
        if (!alive) return;
        if (!p) {
          setError('Panel not found.');
          setLoading(false);
          return;
        }
        setPanel(p);
        setZones(z);
        if (layout) editor.loadScene(layout.scene);
        baselineRef.current = JSON.stringify(layout?.scene ?? editor.scene);
        setDirty(false);
        setLoading(false);
        requestAnimationFrame(() => {
          const el = canvasWrapRef.current;
          if (el) editor.fitToView({ width: el.clientWidth, height: el.clientHeight });
        });
      })
      .catch((err) => {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Failed to load panel.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- dirty tracking -----------------------------------------------------
  useEffect(() => {
    if (loading || !panel) return;
    setDirty(JSON.stringify(editor.scene) !== baselineRef.current);
  }, [editor.scene, loading, panel]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const selectedId = editor.selectedIds[0] ?? null;
  const selectedShape = selectedId ? sceneOps.findShape(editor.scene, selectedId) ?? null : null;
  const selectedZone = selectedShape ? zonesById.get(zoneIdOf(selectedShape.data) ?? -1) ?? null : null;
  const shapeCountForZone = selectedZone
    ? editor.scene.shapes.filter((s) => zoneIdOf(s.data) === selectedZone.id).length
    : 0;

  // --- shape creation → zone linking --------------------------------------
  const onShapeCreated = useCallback((shape: Shape) => {
    setDialog({ open: true, shapeId: shape.id, mode: 'create-shape' });
  }, []);

  const resolveDialog = useCallback(
    (zoneId: number) => {
      if (dialog.shapeId) editor.updateShape(dialog.shapeId, { data: { zoneId } });
      setDialog({ open: false, shapeId: null, mode: 'create-shape' });
    },
    [dialog.shapeId, editor],
  );

  const cancelDialog = useCallback(() => {
    if (dialog.mode === 'create-shape' && dialog.shapeId) {
      const sid = dialog.shapeId;
      editor.commitScene((prev) => removeShapes(prev, [sid]));
      editor.setSelection([]);
    }
    setDialog({ open: false, shapeId: null, mode: 'create-shape' });
  }, [dialog, editor]);

  // --- background ---------------------------------------------------------
  const onPickBackground = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const { src, width, height } = await readImage(file);
        editor.setBackground({ src, width, height, x: 0, y: 0, opacity: 1 });
        requestAnimationFrame(() => {
          const el = canvasWrapRef.current;
          if (el) editor.fitToView({ width: el.clientWidth, height: el.clientHeight });
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load image.');
      }
    },
    [editor],
  );

  const setBgOpacity = useCallback(
    (opacity: number) => {
      if (editor.scene.background) {
        editor.commitScene((prev) => ({ ...prev, background: prev.background ? { ...prev.background, opacity } : null }));
      }
    },
    [editor],
  );

  // --- live zone refresh --------------------------------------------------
  const refreshZones = useCallback(async () => {
    setRefreshing(true);
    try {
      setZones(await fetchZonesByPanel(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh zones.');
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  // --- save ---------------------------------------------------------------
  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await store.save(id, editor.scene);
      baselineRef.current = JSON.stringify(saved.scene);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [id, editor.scene]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void save();
      } else if (mod && e.key.toLowerCase() === 'z') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, editor]);

  const fitView = useCallback(() => {
    const el = canvasWrapRef.current;
    if (el) editor.fitToView({ width: el.clientWidth, height: el.clientHeight });
  }, [editor]);

  const zoomPivot = () => {
    const el = canvasWrapRef.current;
    return el ? { x: el.clientWidth / 2, y: el.clientHeight / 2 } : undefined;
  };

  const renderOverlay = useCallback(
    (shape: Shape) => {
      if (shape.type === 'line') return null;
      const zone = zonesById.get(zoneIdOf(shape.data) ?? -1) ?? null;
      const b = boundsOf(shape);
      return <ZoneOverlay zone={zone} compact={b.width < 110 || b.height < 60} />;
    },
    [zonesById],
  );

  const styleForShape = useCallback(
    (shape: Shape) => {
      const zone = zonesById.get(zoneIdOf(shape.data) ?? -1) ?? null;
      const c = zoneColors(zone?.current_state);
      return { fill: c.fill, stroke: c.stroke, fillOpacity: shape.type === 'line' ? 1 : 0.4 };
    },
    [zonesById],
  );

  if (loading) return <LoadingScreen text="Loading mimic view…" />;
  if (!panel) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">{error || 'Panel not found.'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/all-panels')}>Back to Panels</Button>
      </div>
    );
  }

  const bg = editor.scene.background;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => navigate(`/panels/${id}`)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> {panel.panel_name || panel.panel_code}
        </button>

        {/* Static / Mimic view toggle */}
        <div className="ml-1 flex items-center gap-0.5 rounded-md border border-border bg-secondary p-0.5 text-sm">
          <button
            onClick={() => navigate(`/panels/${id}`)}
            className="flex items-center gap-1.5 rounded px-2.5 py-1 font-medium text-muted-foreground hover:text-foreground"
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Static
          </button>
          <button className="flex items-center gap-1.5 rounded bg-background px-2.5 py-1 font-medium shadow-sm">
            <PenTool className="h-3.5 w-3.5" /> Mimic
          </button>
        </div>

        <span className="text-xs text-muted-foreground">
          {editor.scene.shapes.length} shape{editor.scene.shapes.length !== 1 ? 's' : ''} · {placedZoneIds.size}/{zones.length} zones placed
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void refreshZones()} disabled={refreshing} title="Refresh live zone status">
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /> Refresh
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { void onPickBackground(e.target.files?.[0]); e.target.value = ''; }}
          />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> {bg ? 'Replace' : 'Floor Plan'}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => void save()} disabled={saving || !dirty}>
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* editor body */}
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex flex-col gap-3">
          <ZoneEditorToolbar tool={editor.tool} onToolChange={editor.setTool} />
        </div>

        <div
          ref={canvasWrapRef}
          className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-[#f8fafc] dark:bg-[#0b1220]"
        >
          <GraphicsCanvas
            editor={editor}
            onShapeCreated={onShapeCreated}
            onShapeActivate={(s) => { editor.setSelection([s.id]); setDialog({ open: true, shapeId: s.id, mode: 'reassign' }); }}
            renderShapeOverlay={renderOverlay}
            styleForShape={styleForShape}
          />

          {editor.scene.shapes.length === 0 && !bg && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <ImagePlus className="h-8 w-8 opacity-50" />
              <p className="font-medium">Upload this panel’s floor plan, then draw its zones over it.</p>
              <p className="text-xs">Pick a shape tool on the left and drag on the canvas.</p>
            </div>
          )}

          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
            <IconBtn title="Zoom out" onClick={() => editor.zoomOut(zoomPivot())}><Minus className="h-4 w-4" /></IconBtn>
            <button
              className="min-w-[3.25rem] rounded px-1 text-xs font-semibold tabular-nums text-muted-foreground hover:text-foreground"
              onClick={editor.resetView}
              title="Reset zoom to 100%"
            >
              {Math.round(editor.viewport.zoom * 100)}%
            </button>
            <IconBtn title="Zoom in" onClick={() => editor.zoomIn(zoomPivot())}><Plus className="h-4 w-4" /></IconBtn>
            <div className="mx-1 h-5 w-px bg-border" />
            <IconBtn title="Fit to screen" onClick={fitView}><Maximize className="h-4 w-4" /></IconBtn>
            <div className="mx-1 h-5 w-px bg-border" />
            <IconBtn title="Undo (Ctrl+Z)" onClick={editor.undo} disabled={!editor.canUndo}><Undo2 className="h-4 w-4" /></IconBtn>
            <IconBtn title="Redo (Ctrl+Shift+Z)" onClick={editor.redo} disabled={!editor.canRedo}><Redo2 className="h-4 w-4" /></IconBtn>
          </div>

          {bg && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur">
              <span className="text-muted-foreground">Plan</span>
              <input
                type="range" min={0.1} max={1} step={0.05} value={bg.opacity}
                onChange={(e) => setBgOpacity(Number(e.target.value))}
                className="h-1 w-24 cursor-pointer"
                aria-label="Background opacity"
              />
              <button
                className="text-muted-foreground hover:text-crit-text"
                title="Remove floor plan"
                onClick={() => editor.setBackground(null)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="hidden w-72 shrink-0 overflow-hidden rounded-lg border border-border bg-card lg:block">
          <ZoneInspector
            shape={selectedShape}
            zone={selectedZone}
            shapeCountForZone={shapeCountForZone}
            onReassign={() => selectedShape && setDialog({ open: true, shapeId: selectedShape.id, mode: 'reassign' })}
            onDeleteShape={() => editor.removeSelected()}
            onBringToFront={() => selectedId && editor.commitScene((prev) => sceneOps.reorder(prev, selectedId, 'front'))}
            onSendToBack={() => selectedId && editor.commitScene((prev) => sceneOps.reorder(prev, selectedId, 'back'))}
          />
        </div>
      </div>

      <ZoneAssignDialog
        open={dialog.open}
        zones={zones}
        placedZoneIds={placedZoneIds}
        currentZoneId={dialog.mode === 'reassign' ? zoneIdOf(selectedShape?.data) : null}
        onCancel={cancelDialog}
        onAssign={resolveDialog}
      />
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}
