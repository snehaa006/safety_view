import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fetchGroups, createGroup, updateGroup, deleteGroup } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Group } from '@/types';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      setGroups(await fetchGroups());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setName('');
    setDescription('');
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  function openEdit(g: Group) {
    setEditingId(g.id);
    setName(g.group_name);
    setDescription(g.description || '');
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!name.trim()) return setFormError('Group name is required.');
    try {
      setSubmitting(true);
      if (editingId) {
        await updateGroup(editingId, { group_name: name.trim(), description: description.trim() });
        setSuccess('Group updated.');
      } else {
        await createGroup({ group_name: name.trim(), description: description.trim() });
        setSuccess('Group created.');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save group.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteGroup(deleteTarget.id);
      setSuccess('Group deleted.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group.');
      setDeleteTarget(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Groups</h3>
          <p className="text-sm text-muted-foreground">Create and manage device groups</p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Group</>}
        </Button>
      </div>

      {success && <div className="rounded-md border border-ok-border bg-ok-bg px-4 py-2 text-sm text-ok-text">{success}</div>}
      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      {showForm && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">{editingId ? 'Edit Group' : 'New Group'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setFormError(''); }} placeholder="e.g. IIT Jammu Campus" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Group'}
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
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-muted-foreground">{g.id}</TableCell>
                  <TableCell className="font-semibold">{g.group_name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.description || '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(g)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(g)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {groups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No groups yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group?</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.group_name}</strong>? Devices and users linked to it will keep their
              record but lose the group reference.
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
