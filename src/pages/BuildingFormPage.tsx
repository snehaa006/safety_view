import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  fetchBuildingById, fetchGroups, createBuilding, updateBuilding,
  createLocation, updateLocation,
} from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Group } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface FormState {
  building_name: string; group_id: string;
  address: string; city: string; state: string; country: string; postal_code: string;
}
const EMPTY: FormState = { building_name: '', group_id: '', address: '', city: '', state: '', country: '', postal_code: '' };

export default function BuildingFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [groups, setGroups] = useState<Group[]>([]);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const gs = await fetchGroups();
      setGroups(gs);
      if (isEdit) {
        const b = await fetchBuildingById(Number(id));
        if (b) {
          setForm({
            building_name: b.building_name, group_id: String(b.group_id),
            address: b.location?.address || '', city: b.location?.city || '',
            state: b.location?.state || '', country: b.location?.country || '',
            postal_code: b.location?.postal_code || '',
          });
          setLocationId(b.location_id);
        }
      }
      setLoading(false);
    })();
  }, [id, isEdit]);

  function inp(k: keyof FormState, label: string) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{label}</Label>
        <Input value={form[k]} onChange={(e) => { setForm({ ...form, [k]: e.target.value }); setError(''); }} />
      </div>
    );
  }

  function handleSaveClick() {
    if (!form.building_name.trim()) { setError('Building name is required.'); return; }
    if (!form.group_id) { setError('Group is required.'); return; }
    setShowConfirm(true);
  }

  async function handleSubmit() {
    setShowConfirm(false);
    if (!form.building_name.trim()) return setError('Building name is required.');
    if (!form.group_id) return setError('Group is required.');
    const locFields = {
      address: form.address.trim() || null, city: form.city.trim() || null,
      state: form.state.trim() || null, country: form.country.trim() || null,
      postal_code: form.postal_code.trim() || null, latitude: null, longitude: null,
    };
    try {
      setSubmitting(true);
      if (isEdit) {
        if (locationId) await updateLocation(locationId, locFields);
        await updateBuilding(Number(id), { building_name: form.building_name.trim(), group_id: Number(form.group_id) });
        navigate(`/building-management/${id}`);
      } else {
        const loc = await createLocation(locFields);
        const result = await createBuilding({ building_name: form.building_name.trim(), group_id: Number(form.group_id), location_id: loc.id });
        navigate(`/building-management/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={() => navigate(isEdit ? `/building-management/${id}` : '/building-management')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'Back to Building' : 'Back to Building Management'}
      </button>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">{isEdit ? 'Edit Building' : 'New Building'}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {inp('building_name', 'Building Name')}
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
          {inp('address', 'Address')}
          {inp('city', 'City')}
          {inp('state', 'State')}
          {inp('country', 'Country')}
          {inp('postal_code', 'Postal Code')}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-crit-text">{error}</span>}
          <Button variant="outline" onClick={() => navigate(isEdit ? `/building-management/${id}` : '/building-management')}>Cancel</Button>
          <Button onClick={handleSaveClick} disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Building'}</Button>
        </div>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={isEdit ? 'Save changes?' : 'Create building?'}
        description={isEdit ? `Save changes to "${form.building_name.trim()}"?` : `Create a new building named "${form.building_name.trim()}"?`}
        confirmLabel={isEdit ? 'Save Changes' : 'Create Building'}
        onConfirm={handleSubmit}
        loading={submitting}
      />
    </section>
  );
}
