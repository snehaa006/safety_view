import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  fetchBuildings,
  fetchLocations,
  fetchUsers,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  resolveLocationPath,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Building, Location, ManagedUser } from '@/types';

interface FormState {
  building_name: string;
  address: string;
  country: string;
  state: string;
  district: string;
  supervisor_id: string;
}

const EMPTY: FormState = {
  building_name: '',
  address: '',
  country: '',
  state: '',
  district: '',
  supervisor_id: '',
};

export default function BuildingManagementPage() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Building | null>(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [b, l, u] = await Promise.all([fetchBuildings(user), fetchLocations().catch(() => []), fetchUsers()]);
      setBuildings(b);
      setLocations(l);
      setUsers(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buildings');
    } finally {
      setLoading(false);
    }
  }

  const locById = useMemo(() => {
    const m: Record<number, Location> = {};
    for (const l of locations) m[l.id] = l;
    return m;
  }, [locations]);

  const supervisors = useMemo(() => users.filter((u) => u.role === 'SUPERVISOR'), [users]);
  const countries = useMemo(() => locations.filter((l) => l.type === 'NATIONAL').map((l) => l.name), [locations]);
  const states = useMemo(() => locations.filter((l) => l.type === 'REGIONAL').map((l) => l.name), [locations]);
  const districts = useMemo(() => locations.filter((l) => l.type === 'DISTRICT').map((l) => l.name), [locations]);

  function pathOf(districtId: number | null): { country: string; state: string; district: string } {
    let country = '', state = '', district = '';
    let cur = districtId != null ? locById[districtId] : undefined;
    while (cur) {
      if (cur.type === 'DISTRICT') district = cur.name;
      else if (cur.type === 'REGIONAL') state = cur.name;
      else if (cur.type === 'NATIONAL') country = cur.name;
      cur = cur.parent_id != null ? locById[cur.parent_id] : undefined;
    }
    return { country, state, district };
  }

  function userName(id: number | null) {
    const u = users.find((x) => x.id === id);
    return u ? u.username : '—';
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  function openEdit(b: Building) {
    const p = pathOf(b.location_id);
    setEditingId(b.id);
    setForm({
      building_name: b.building_name,
      address: b.address || '',
      country: p.country,
      state: p.state,
      district: p.district,
      supervisor_id: b.supervisor_id ? String(b.supervisor_id) : '',
    });
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.building_name.trim()) return setFormError('Building name is required.');
    if (!form.country.trim() || !form.state.trim() || !form.district.trim())
      return setFormError('Country, State and District are all required.');
    try {
      setSubmitting(true);
      const locationId = await resolveLocationPath({
        country: form.country.trim(),
        state: form.state.trim(),
        district: form.district.trim(),
      });
      const payload = {
        building_name: form.building_name.trim(),
        address: form.address.trim(),
        location_id: locationId,
        supervisor_id: form.supervisor_id ? Number(form.supervisor_id) : null,
      };
      if (editingId) {
        await updateBuilding(editingId, payload);
        setSuccess('Building updated.');
      } else {
        await createBuilding(payload);
        setSuccess('Building created.');
      }
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save building.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBuilding(deleteTarget.id);
      setSuccess('Building deleted.');
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete building.');
      setDeleteTarget(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Building Management</h3>
          <p className="text-sm text-muted-foreground">
            Set a building's location (Country → State → District) and supervisor. Managers see it
            automatically based on their location.
          </p>
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
          <datalist id="dl-countries">{countries.map((c) => <option key={c} value={c} />)}</datalist>
          <datalist id="dl-states">{states.map((s) => <option key={s} value={s} />)}</datalist>
          <datalist id="dl-districts">{districts.map((d) => <option key={d} value={d} />)}</datalist>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Building Name</Label>
              <Input value={form.building_name} onChange={(e) => { setForm({ ...form, building_name: e.target.value }); setFormError(''); }} placeholder="e.g. Academic Block" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Country</Label>
              <Input list="dl-countries" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. India" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>State / Region</Label>
              <Input list="dl-states" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Haryana" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>District</Label>
              <Input list="dl-districts" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="e.g. Panipat" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Supervisor</Label>
              <Select value={form.supervisor_id || 'none'} onValueChange={(v) => setForm({ ...form, supervisor_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="No supervisor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No supervisor —</SelectItem>
                  {supervisors.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            New Country/State/District values are added to Locations automatically; existing ones are reused.
          </p>
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Building'}
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
                <TableHead>Building</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((b) => {
                const p = pathOf(b.location_id);
                const path = [p.country, p.state, p.district].filter(Boolean).join(' › ') || '—';
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-semibold">{b.building_name}</TableCell>
                    <TableCell className="text-muted-foreground">{path}</TableCell>
                    <TableCell className="text-muted-foreground">{userName(b.supervisor_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{b.deviceCount}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(b)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {buildings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No buildings yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete building?</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.building_name}</strong>? Devices in it will lose their building link.
            </DialogDescription>
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
