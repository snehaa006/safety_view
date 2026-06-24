import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { fetchPanelById, fetchBuildings, createPanel, updatePanel } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Building, PanelStatus } from '@/types';

const STATUSES: PanelStatus[] = ['NORMAL', 'ALARM', 'FAULT', 'OFFLINE'];

interface FormState { building_id: string; panel_code: string; panel_name: string; status: PanelStatus; notes: string; }
const EMPTY: FormState = { building_id: '', panel_code: '', panel_name: '', status: 'NORMAL', notes: '' };

export default function PanelAdminFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const bs = await fetchBuildings(user);
      setBuildings(bs);
      if (isEdit) {
        const p = await fetchPanelById(Number(id));
        if (p) setForm({
          building_id: String(p.building_id), panel_code: p.panel_code,
          panel_name: p.panel_name || '', status: p.status, notes: p.notes || '',
        });
      }
      setLoading(false);
    })();
  }, [id, isEdit, user]);

  async function handleSubmit() {
    if (!form.panel_code.trim()) return setError('Panel code is required.');
    if (!form.building_id) return setError('Building is required.');
    const payload = { panel_name: form.panel_name.trim() || null, status: form.status, notes: form.notes.trim() || null };
    try {
      setSubmitting(true);
      if (isEdit) {
        await updatePanel(Number(id), { ...payload, building_id: Number(form.building_id) });
        navigate(`/panel-management/${id}`);
      } else {
        const result = await createPanel({ building_id: Number(form.building_id), panel_code: form.panel_code.trim(), ...payload });
        navigate(`/panel-management/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <button onClick={() => navigate(isEdit ? `/panel-management/${id}` : '/panel-management')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {isEdit ? 'Back to Panel' : 'Back to Panel Management'}
      </button>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-bold">{isEdit ? 'Edit Panel' : 'New Panel'}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Building</Label>
            <Select value={form.building_id || 'none'} onValueChange={(v) => setForm({ ...form, building_id: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Select building —</SelectItem>
                {buildings.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.building_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Panel Code</Label>
            <Input value={form.panel_code} onChange={(e) => { setForm({ ...form, panel_code: e.target.value }); setError(''); }} placeholder="e.g. FACP_001" disabled={isEdit} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Panel Name</Label>
            <Input value={form.panel_name} onChange={(e) => setForm({ ...form, panel_name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PanelStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          {error && <span className="text-sm text-crit-text">{error}</span>}
          <Button variant="outline" onClick={() => navigate(isEdit ? `/panel-management/${id}` : '/panel-management')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Panel'}</Button>
        </div>
      </Card>
    </section>
  );
}
