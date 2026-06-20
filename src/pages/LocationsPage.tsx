import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchLocations, createLocation, updateLocation, deleteLocation } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { Location } from '@/types';

interface FormState {
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: string;
  longitude: string;
}
const EMPTY: FormState = { address: '', city: '', state: '', country: '', postal_code: '', latitude: '', longitude: '' };

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setLoading(true); setLocations(await fetchLocations()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  function openCreate() { setEditingId(null); setForm(EMPTY); setSuccess(''); setShowForm(true); }
  function openEdit(l: Location) {
    setEditingId(l.id);
    setForm({
      address: l.address || '', city: l.city || '', state: l.state || '', country: l.country || '',
      postal_code: l.postal_code || '', latitude: l.latitude?.toString() || '', longitude: l.longitude?.toString() || '',
    });
    setSuccess(''); setShowForm(true);
  }

  async function handleSubmit() {
    const payload = {
      address: form.address.trim() || null, city: form.city.trim() || null, state: form.state.trim() || null,
      country: form.country.trim() || null, postal_code: form.postal_code.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null, longitude: form.longitude ? Number(form.longitude) : null,
    };
    try {
      setSubmitting(true);
      if (editingId) { await updateLocation(editingId, payload); setSuccess('Location updated.'); }
      else { await createLocation(payload); setSuccess('Location created.'); }
      setShowForm(false); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deleteLocation(deleteTarget.id); setDeleteTarget(null); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); setDeleteTarget(null); }
  }

  const F = (k: keyof FormState, label: string, ph = '') => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph} />
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Locations</h3>
          <p className="text-sm text-muted-foreground">Physical addresses (one per building)</p>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {F('address', 'Address', 'Street / building no.')}
            {F('city', 'City')}
            {F('state', 'State')}
            {F('country', 'Country')}
            {F('postal_code', 'Postal Code')}
            <div className="grid grid-cols-2 gap-4">
              {F('latitude', 'Latitude')}
              {F('longitude', 'Longitude')}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Location'}</Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead><TableHead>Address</TableHead><TableHead>City</TableHead>
                <TableHead>State</TableHead><TableHead>Country</TableHead><TableHead>Postal</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-muted-foreground">{l.id}</TableCell>
                  <TableCell>{l.address || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{l.city || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{l.state || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{l.country || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{l.postal_code || '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(l)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(l)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {locations.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No locations yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete location?</DialogTitle>
            <DialogDescription>This may be in use by a building.</DialogDescription>
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
