import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchLocationById, createLocation, updateLocation } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/spinner';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface FormState {
  address: string; city: string; state: string; country: string; postal_code: string;
  latitude: string; longitude: string;
}
const EMPTY: FormState = { address: '', city: '', state: '', country: '', postal_code: '', latitude: '', longitude: '' };

export default function LocationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    fetchLocationById(Number(id)).then((l) => {
      if (l) setForm({
        address: l.address || '', city: l.city || '', state: l.state || '',
        country: l.country || '', postal_code: l.postal_code || '',
        latitude: l.latitude?.toString() || '', longitude: l.longitude?.toString() || '',
      });
      setLoading(false);
    });
  }, [id, isEdit]);

  function field(k: keyof FormState, label: string, placeholder = '') {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{label}</Label>
        <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={placeholder} />
      </div>
    );
  }

  function handleSaveClick() {
    setShowConfirm(true);
  }

  async function handleSubmit() {
    setShowConfirm(false);
    const payload = {
      address: form.address.trim() || null, city: form.city.trim() || null,
      state: form.state.trim() || null, country: form.country.trim() || null,
      postal_code: form.postal_code.trim() || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    try {
      setSubmitting(true);
      if (isEdit) {
        await updateLocation(Number(id), payload);
        navigate(`/locations/${id}`);
      } else {
        const result = await createLocation(payload);
        navigate(`/locations/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={() => navigate(isEdit ? `/locations/${id}` : '/locations')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'Back to Location' : 'Back to Locations'}
      </button>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">{isEdit ? 'Edit Location' : 'New Location'}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field('address', 'Address', 'Street / building no.')}
          {field('city', 'City')}
          {field('state', 'State')}
          {field('country', 'Country')}
          {field('postal_code', 'Postal Code')}
          <div className="grid grid-cols-2 gap-3">
            {field('latitude', 'Latitude')}
            {field('longitude', 'Longitude')}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-crit-text">{error}</span>}
          <Button variant="outline" onClick={() => navigate(isEdit ? `/locations/${id}` : '/locations')}>Cancel</Button>
          <Button onClick={handleSaveClick} disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Location'}</Button>
        </div>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={isEdit ? 'Save changes?' : 'Create location?'}
        description={isEdit ? 'Save changes to this location?' : 'Create this new location?'}
        confirmLabel={isEdit ? 'Save Changes' : 'Create Location'}
        onConfirm={handleSubmit}
        loading={submitting}
      />
    </section>
  );
}
