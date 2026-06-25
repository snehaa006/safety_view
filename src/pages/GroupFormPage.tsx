import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchGroupById, createGroup, updateGroup } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingScreen } from '@/components/ui/spinner';

export default function GroupFormPage() {
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
    fetchGroupById(Number(id)).then((g) => {
      if (g) { setName(g.group_name); setDescription(g.description || ''); }
      setLoading(false);
    });
  }, [id, isEdit]);

  async function handleSubmit() {
    if (!name.trim()) return setError('Group name is required.');
    try {
      setSubmitting(true);
      if (isEdit) {
        await updateGroup(Number(id), { group_name: name.trim(), description: description.trim() || null });
        navigate(`/groups/${id}`);
      } else {
        const result = await createGroup({ group_name: name.trim(), description: description.trim() || null });
        navigate(`/groups/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={() => navigate(isEdit ? `/groups/${id}` : '/groups')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'Back to Group' : 'Back to Groups'}
      </button>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">{isEdit ? 'Edit Group' : 'New Group'}</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="e.g. IIT Jammu Campus" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-crit-text">{error}</span>}
          <Button variant="outline" onClick={() => navigate(isEdit ? `/groups/${id}` : '/groups')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}</Button>
        </div>
      </Card>
    </section>
  );
}
