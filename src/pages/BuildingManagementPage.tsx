import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  fetchBuildings,
  fetchLocations,
  fetchUsers,
  createBuilding,
  updateBuilding,
  deleteBuilding,
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
  location_id: string;
  national_manager_id: string;
  regional_manager_id: string;
  district_manager_id: string;
  supervisor_id: string;
}

const EMPTY: FormState = {
  building_name: '',
  address: '',
  location_id: '',
  national_manager_id: '',
  regional_manager_id: '',
  district_manager_id: '',
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

  const byRole = useMemo(() => {
    const f = (role: string) => users.filter((u) => u.role === role);
    return {
      national: f('NATIONAL_MANAGER'),
      regional: f('REGIONAL_MANAGER'),
      district: f('DISTRICT_MANAGER'),
      supervisor: f('SUPERVISOR'),
    };
  }, [users]);

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
    setEditingId(b.id);
    setForm({
      building_name: b.building_name,
      address: b.address || '',
      location_id: b.location_id ? String(b.location_id) : '',
      national_manager_id: b.national_manager_id ? String(b.national_manager_id) : '',
      regional_manager_id: b.regional_manager_id ? String(b.regional_manager_id) : '',
      district_manager_id: b.district_manager_id ? String(b.district_manager_id) : '',
      supervisor_id: b.supervisor_id ? String(b.supervisor_id) : '',
    });
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  function num(v: string) {
    return v ? Number(v) : null;
  }

  async function handleSubmit() {
    if (!form.building_name.trim()) return setFormError('Building name is required.');
    const payload = {
      building_name: form.building_name.trim(),
      address: form.address.trim(),
      location_id: num(form.location_id),
      national_manager_id: num(form.national_manager_id),
      regional_manager_id: num(form.regional_manager_id),
      district_manager_id: num(form.district_manager_id),
      supervisor_id: num(form.supervisor_id),
    };
    try {
      setSubmitting(true);
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

  function UserSelect({ value, onChange, options, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    options: ManagedUser[];
    placeholder: string;
  }) {
    return (
      <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— None —</SelectItem>
          {options.map((u) => (
            <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Building Management</h3>
          <p className="text-sm text-muted-foreground">
            Create buildings, place them in a location and assign the management chain
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
              <Label>Location (District)</Label>
              <Select value={form.location_id || 'none'} onValueChange={(v) => setForm({ ...form, location_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="No location" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No location —</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name} ({l.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Supervisor</Label>
              <UserSelect value={form.supervisor_id} onChange={(v) => setForm({ ...form, supervisor_id: v })} options={byRole.supervisor} placeholder="No supervisor" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>District Manager</Label>
              <UserSelect value={form.district_manager_id} onChange={(v) => setForm({ ...form, district_manager_id: v })} options={byRole.district} placeholder="No district manager" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Regional Manager</Label>
              <UserSelect value={form.regional_manager_id} onChange={(v) => setForm({ ...form, regional_manager_id: v })} options={byRole.regional} placeholder="No regional manager" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>National Manager</Label>
              <UserSelect value={form.national_manager_id} onChange={(v) => setForm({ ...form, national_manager_id: v })} options={byRole.national} placeholder="No national manager" />
            </div>
          </div>
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
                <TableHead>District Mgr</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-semibold">{b.building_name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.location_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{userName(b.supervisor_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{userName(b.district_manager_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{b.deviceCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(b)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(b)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {buildings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No buildings yet.</TableCell>
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
