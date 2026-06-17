import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  fetchOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { formatDate } from '@/utils/format';
import type { Organization } from '@/types';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setOrgs(await fetchOrganizations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setName('');
    setLogo('');
    setActive(true);
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  function openEdit(o: Organization) {
    setEditingId(o.id);
    setName(o.organization_name);
    setLogo(o.logo_path || '');
    setActive(o.is_active);
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!name.trim()) return setFormError('Organization name is required.');
    try {
      setSubmitting(true);
      if (editingId) {
        await updateOrganization(editingId, { organization_name: name.trim(), logo_path: logo.trim(), is_active: active });
        setSuccess('Organization updated.');
      } else {
        await createOrganization({ organization_name: name.trim(), logo_path: logo.trim(), is_active: active });
        setSuccess('Organization created.');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save organization.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteOrganization(deleteTarget.id);
      setSuccess('Organization deleted.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization.');
      setDeleteTarget(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Organizations</h3>
          <p className="text-sm text-muted-foreground">Create and manage organizations</p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Organization</>}
        </Button>
      </div>

      {success && <div className="rounded-md border border-ok-border bg-ok-bg px-4 py-2 text-sm text-ok-text">{success}</div>}
      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      {showForm && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">{editingId ? 'Edit Organization' : 'New Organization'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setFormError(''); }} placeholder="e.g. Agnicomm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Logo Path (optional)</Label>
              <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Organization'}
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
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-muted-foreground">{o.id}</TableCell>
                  <TableCell className="font-semibold">{o.organization_name}</TableCell>
                  <TableCell>
                    <Badge variant={o.is_active ? 'ok' : 'off'}>{o.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(o)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(o)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No organizations yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organization?</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.organization_name}</strong>? Users linked to it will keep their record
              but lose the organization reference.
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
