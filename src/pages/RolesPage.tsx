import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchRoles, createRole, updateRole, deleteRole } from '@/services/api';
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
import type { Role } from '@/types';

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    try { setLoading(true); setRoles(await fetchRoles()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load'); }
    finally { setLoading(false); }
  }

  function openCreate() { setEditingId(null); setName(''); setDescription(''); setFormError(''); setShowForm(true); }
  function openEdit(r: Role) { setEditingId(r.id); setName(r.role_name); setDescription(r.description || ''); setFormError(''); setShowForm(true); }

  async function handleSubmit() {
    if (!name.trim()) return setFormError('Role name is required.');
    try {
      setSubmitting(true);
      if (editingId) await updateRole(editingId, { role_name: name.trim(), description: description.trim() });
      else await createRole({ role_name: name.trim(), description: description.trim() });
      setShowForm(false); await load();
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Failed to save role.'); }
    finally { setSubmitting(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deleteRole(deleteTarget.id); setDeleteTarget(null); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); setDeleteTarget(null); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Roles</h3>
          <p className="text-sm text-muted-foreground">Designation lookup — assigned to users in User Management</p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Role</>}
        </Button>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      {showForm && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">{editingId ? 'Edit Role' : 'New Role'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Role Name</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setFormError(''); }} placeholder="e.g. Regional Manager" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Role'}</Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground">{r.id}</TableCell>
                  <TableCell className="font-semibold">{r.role_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.description || '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(r)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {roles.length === 0 && <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No roles yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete role?</DialogTitle>
            <DialogDescription>Delete <strong>{deleteTarget?.role_name}</strong>?</DialogDescription>
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
