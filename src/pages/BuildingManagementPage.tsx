import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  fetchBuildings, fetchGroups, createBuilding, updateBuilding, deleteBuilding,
  createLocation, updateLocation, locationLabel,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Building, Group } from '@/types';

interface FormState {
  building_name: string;
  group_id: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}
const EMPTY: FormState = { building_name: '', group_id: '', address: '', city: '', state: '', country: '', postal_code: '' };

export default function BuildingManagementPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLocId, setEditingLocId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Building | null>(null);

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);
  async function loadAll() {
    try {
      setLoading(true);
      const [b, g] = await Promise.all([fetchBuildings(user), fetchGroups()]);
      setBuildings(b); setGroups(g);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  function openCreate() { setEditingId(null); setEditingLocId(null); setForm(EMPTY); setFormError(''); setSuccess(''); setShowForm(true); }
  function openEdit(b: Building) {
    setEditingId(b.id); setEditingLocId(b.location_id);
    setForm({
      building_name: b.building_name, group_id: String(b.group_id),
      address: b.location?.address || '', city: b.location?.city || '', state: b.location?.state || '',
      country: b.location?.country || '', postal_code: b.location?.postal_code || '',
    });
    setFormError(''); setSuccess(''); setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.building_name.trim()) return setFormError('Building name is required.');
    if (!form.group_id) return setFormError('Group is required.');
    const locFields = {
      address: form.address.trim() || null, city: form.city.trim() || null, state: form.state.trim() || null,
      country: form.country.trim() || null, postal_code: form.postal_code.trim() || null, latitude: null, longitude: null,
    };
    try {
      setSubmitting(true);
      if (editingId) {
        if (editingLocId) await updateLocation(editingLocId, locFields);
        await updateBuilding(editingId, { building_name: form.building_name.trim(), group_id: Number(form.group_id) });
        setSuccess('Building updated.');
      } else {
        const loc = await createLocation(locFields);
        await createBuilding({ building_name: form.building_name.trim(), group_id: Number(form.group_id), location_id: loc.id });
        setSuccess('Building created.');
      }
      setShowForm(false); await loadAll();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed to save building.'); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deleteBuilding(deleteTarget.id); setDeleteTarget(null); await loadAll(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); setDeleteTarget(null); }
  }

  const F = (k: keyof FormState, label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={form[k]} onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setFormError(''); }} />
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Building Management</h3>
          <p className="text-sm text-muted-foreground">A building belongs to one group and one location</p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Building</>}
        </Button>
      </div>

      {success && <div className="rounded-md border border-ok-border bg-ok-bg px-4 py-2 text-sm text-ok-text">{success}</div>}
      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      {showForm && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">{editingId ? 'Edit Building' : 'New Building'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {F('building_name', 'Building Name')}
            <div className="flex flex-col gap-1.5">
              <Label>Group</Label>
              <Select value={form.group_id || 'none'} onValueChange={(v) => setForm({ ...form, group_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select group —</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={String(g.id)}>{g.group_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {F('address', 'Address')}
            {F('city', 'City')}
            {F('state', 'State')}
            {F('country', 'Country')}
            {F('postal_code', 'Postal Code')}
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Building'}</Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building</TableHead><TableHead>Group</TableHead><TableHead>Location</TableHead>
                <TableHead>Panels</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-semibold">{b.building_name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.group_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{locationLabel(b.location)}</TableCell>
                  <TableCell className="text-muted-foreground">{b.panelCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(b)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {buildings.length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No buildings yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete building?</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTarget?.building_name}</strong>? Its panels/zones lose their building link.</DialogDescription>
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
