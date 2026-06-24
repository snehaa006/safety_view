import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchRoleById, createRole, updateRole } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RoleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    fetchRoleById(Number(id)).then((r) => {
      if (r) { setName(r.role_name); setDescription(r.description || ''); }
      setLoading(false);
    });
  }, [id, isEdit]);

  async function handleSubmit() {
    if (!name.trim()) return setError('Role name is required.');
    try {
      setSubmitting(true);
      if (isEdit) {
        await updateRole(Number(id), { role_name: name.trim(), description: description.trim() || null });
        navigate(`/roles/${id}`);
      } else {
        const result = await createRole({ role_name: name.trim(), description: description.trim() || null });
        navigate(`/roles/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={() => navigate(isEdit ? `/roles/${id}` : '/roles')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'Back to Role' : 'Back to Roles'}
      </button>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">{isEdit ? 'Edit Role' : 'New Role'}</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Role Name</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. Regional Manager" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-crit-text">{error}</span>}
          <Button variant="outline" onClick={() => navigate(isEdit ? `/roles/${id}` : '/roles')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}</Button>
        </div>
      </Card>
    </section>
  );
}
