import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  fetchAllPanels, fetchBuildings, createPanel, updatePanel, deletePanel,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PANEL_STATUS_META } from '@/utils/format';
import type { Building, Panel, PanelStatus } from '@/types';

const STATUSES: PanelStatus[] = ['NORMAL', 'ALARM', 'FAULT', 'OFFLINE'];

interface FormState { building_id: string; panel_code: string; panel_name: string; status: PanelStatus; notes: string; }
const EMPTY: FormState = { building_id: '', panel_code: '', panel_name: '', status: 'NORMAL', notes: '' };

export default function PanelManagementPage() {
  const { user } = useAuth();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Panel | null>(null);

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);
  async function loadAll() {
    try {
      setLoading(true);
      const [p, b] = await Promise.all([fetchAllPanels(), fetchBuildings(user)]);
      setPanels(p); setBuildings(b);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  function openCreate() { setEditingId(null); setForm(EMPTY); setFormError(''); setSuccess(''); setShowForm(true); }
  function openEdit(p: Panel) {
    setEditingId(p.id);
    setForm({ building_id: String(p.building_id), panel_code: p.panel_code, panel_name: p.panel_name || '', status: p.status, notes: p.notes || '' });
    setFormError(''); setSuccess(''); setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.panel_code.trim()) return setFormError('Panel code is required.');
    if (!form.building_id) return setFormError('Building is required.');
    try {
      setSubmitting(true);
      const payload = { panel_name: form.panel_name.trim() || null, status: form.status, notes: form.notes.trim() || null };
      if (editingId) {
        await updatePanel(editingId, { ...payload, building_id: Number(form.building_id) });
        setSuccess('Panel updated.');
      } else {
        await createPanel({ building_id: Number(form.building_id), panel_code: form.panel_code.trim(), ...payload });
        setSuccess('Panel created.');
      }
      setShowForm(false); await loadAll();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed to save panel.'); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deletePanel(deleteTarget.id); setDeleteTarget(null); await loadAll(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); setDeleteTarget(null); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Panel Management</h3>
          <p className="text-sm text-muted-foreground">Fire panels live inside a building and hold up to 20 zones</p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Panel</>}
        </Button>
      </div>

      {success && <div className="rounded-md border border-ok-border bg-ok-bg px-4 py-2 text-sm text-ok-text">{success}</div>}
      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      {showForm && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">{editingId ? 'Edit Panel' : 'New Panel'}</h4>
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
              <Input value={form.panel_code} onChange={(e) => { setForm({ ...form, panel_code: e.target.value }); setFormError(''); }} placeholder="e.g. FACP_001" disabled={!!editingId} />
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
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Panel'}</Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Building</TableHead>
                <TableHead>Status</TableHead><TableHead>Zones</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {panels.map((p) => {
                const meta = PANEL_STATUS_META[p.status] ?? PANEL_STATUS_META.NORMAL;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.panel_code}</TableCell>
                    <TableCell className="font-semibold">{p.panel_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.building_name || '—'}</TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{p.zoneCount}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(p)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {panels.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">No panels yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete panel?</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTarget?.panel_code}</strong> and its zones?</DialogDescription>
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
