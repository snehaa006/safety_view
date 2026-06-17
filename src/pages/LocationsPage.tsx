import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchLocations, createLocation, updateLocation, deleteLocation } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Location } from '@/types';

const TYPES = ['NATIONAL', 'REGIONAL', 'DISTRICT'] as const;

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('DISTRICT');
  const [parentId, setParentId] = useState<string>('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setLocations(await fetchLocations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setName('');
    setType('DISTRICT');
    setParentId('');
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  function openEdit(l: Location) {
    setEditingId(l.id);
    setName(l.name);
    setType(l.type);
    setParentId(l.parent_id ? String(l.parent_id) : '');
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  function nameOf(id: number | null) {
    return locations.find((l) => l.id === id)?.name ?? '—';
  }

  async function handleSubmit() {
    if (!name.trim()) return setFormError('Name is required.');
    try {
      setSubmitting(true);
      const payload = { name: name.trim(), type, parent_id: parentId ? Number(parentId) : null };
      if (editingId) {
        await updateLocation(editingId, payload);
        setSuccess('Location updated.');
      } else {
        await createLocation(payload);
        setSuccess('Location created.');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save location.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLocation(deleteTarget.id);
      setSuccess('Location deleted.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location.');
      setDeleteTarget(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Locations</h3>
          <p className="text-sm text-muted-foreground">National → Regional → District hierarchy</p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Location</>}
        </Button>
      </div>

      {success && <div className="rounded-md border border-ok-border bg-ok-bg px-4 py-2 text-sm text-ok-text">{success}</div>}
      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      {showForm && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">{editingId ? 'Edit Location' : 'New Location'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setFormError(''); }} placeholder="e.g. Ghaziabad" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Parent</Label>
              <Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No parent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No parent —</SelectItem>
                  {locations.filter((l) => l.id !== editingId).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Location'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">{l.id}</TableCell>
                  <TableCell className="font-semibold">{l.name}</TableCell>
                  <TableCell><Badge variant="water">{l.type}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{nameOf(l.parent_id)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(l)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(l)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {locations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No locations yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete location?</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTarget?.name}</strong>? Child locations will lose this parent.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
