import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { LoadingScreen } from '@/components/ui/spinner';
import { formatDateTime } from '@/utils/format';
import { getLayoutStore } from '@/features/zone-editor/storage';
import { zoneColors } from '@/features/zone-editor/zoneStyle';
import type { BuildingLayout } from '@/features/zone-editor/types';

const store = getLayoutStore();

export default function BuildingLayoutsPage() {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState<BuildingLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<BuildingLayout | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    try {
      setLayouts(await store.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buildings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function create() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const layout = await store.create(newName.trim());
      setShowCreate(false);
      setNewName('');
      navigate(`/zone-editor/${layout.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create building.');
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await store.remove(toDelete.id);
      setToDelete(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingScreen text="Loading buildings…" />;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Zone Editor</h2>
          <p className="text-sm text-muted-foreground">
            Design building layouts by drawing zones over an uploaded floor plan.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => { setNewName(''); setShowCreate(true); }}>
          <Plus className="h-4 w-4" /> New Building
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>
      )}

      {layouts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed p-12 text-center">
          <LayoutGrid className="h-10 w-10 text-muted-foreground opacity-50" />
          <div>
            <p className="font-medium">No building layouts yet</p>
            <p className="text-sm text-muted-foreground">Create a building to start placing zones over its floor plan.</p>
          </div>
          <Button className="gap-1.5" onClick={() => { setNewName(''); setShowCreate(true); }}>
            <Plus className="h-4 w-4" /> New Building
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {layouts.map((l) => (
            <LayoutCard key={l.id} layout={l} onOpen={() => navigate(`/zone-editor/${l.id}`)} onDelete={() => setToDelete(l)} />
          ))}
        </div>
      )}

      {/* create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Building</DialogTitle>
            <DialogDescription>Give the building a name. You’ll upload its floor plan and draw zones next.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-building-name">Building name</Label>
            <Input
              id="new-building-name"
              value={newName}
              autoFocus
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void create(); }}
              placeholder="e.g. Ashram Station"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => void create()} disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create & Open'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title="Delete building layout?"
        description={toDelete ? `Delete “${toDelete.name}” and its ${toDelete.zones.length} zone(s)? This cannot be undone.` : ''}
        variant="destructive"
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function LayoutCard({ layout, onOpen, onDelete }: { layout: BuildingLayout; onOpen: () => void; onDelete: () => void }) {
  const zoneDots = useMemo(() => layout.zones.slice().sort((a, b) => a.number - b.number), [layout.zones]);
  const bg = layout.scene.background;

  return (
    <Card className="group flex flex-col overflow-hidden">
      <button
        onClick={onOpen}
        className="relative flex h-36 items-center justify-center overflow-hidden border-b border-border bg-secondary text-muted-foreground"
      >
        {bg ? (
          <img src={bg.src} alt="" className="h-full w-full object-cover opacity-90 transition-transform group-hover:scale-[1.03]" />
        ) : (
          <Layers className="h-8 w-8 opacity-40" />
        )}
        <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {layout.scene.shapes.length} shape{layout.scene.shapes.length !== 1 ? 's' : ''}
        </span>
      </button>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="text-left text-sm font-semibold hover:underline">{layout.name}</button>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onOpen} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="outline" size="icon" className="h-7 w-7 text-crit-text hover:bg-crit-bg" onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {zoneDots.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {zoneDots.map((z) => (
              <span
                key={z.id}
                title={`Zone ${z.number} — ${z.name} (${zoneColors(z.state).label})`}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1 text-[10px] font-bold text-white"
                style={{ background: zoneColors(z.state).stroke }}
              >
                {z.number}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No zones yet</p>
        )}
        <p className="mt-auto text-xs text-muted-foreground">Updated {formatDateTime(layout.updatedAt)}</p>
      </div>
    </Card>
  );
}
