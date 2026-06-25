import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchOrganizationById, createOrganization, updateOrganization } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/spinner';
import ConfirmDialog from '@/components/ui/confirm-dialog';

export default function OrganizationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    fetchOrganizationById(Number(id)).then((o) => {
      if (o) { setName(o.organization_name); setLogo(o.logo_path || ''); setActive(o.is_active); }
      setLoading(false);
    });
  }, [id, isEdit]);

  function handleSaveClick() {
    if (!name.trim()) { setError('Organization name is required.'); return; }
    setShowConfirm(true);
  }

  async function handleSubmit() {
    setShowConfirm(false);
    try {
      setSubmitting(true);
      if (isEdit) {
        await updateOrganization(Number(id), { organization_name: name.trim(), logo_path: logo.trim() || null, is_active: active });
        navigate(`/organizations/${id}`);
      } else {
        const result = await createOrganization({ organization_name: name.trim(), logo_path: logo.trim() || null, is_active: active });
        navigate(`/organizations/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={() => navigate(isEdit ? `/organizations/${id}` : '/organizations')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'Back to Organization' : 'Back to Organizations'}
      </button>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">{isEdit ? 'Edit Organization' : 'New Organization'}</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Agnicomm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Logo Path (optional)</Label>
            <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
            Active
          </label>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-crit-text">{error}</span>}
          <Button variant="outline" onClick={() => navigate(isEdit ? `/organizations/${id}` : '/organizations')}>Cancel</Button>
          <Button onClick={handleSaveClick} disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Organization'}</Button>
        </div>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={isEdit ? 'Save changes?' : 'Create organization?'}
        description={isEdit ? `Save changes to "${name.trim()}"?` : `Create a new organization named "${name.trim()}"?`}
        confirmLabel={isEdit ? 'Save Changes' : 'Create Organization'}
        onConfirm={handleSubmit}
        loading={submitting}
      />
    </section>
  );
}
