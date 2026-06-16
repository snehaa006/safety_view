import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  fetchDevices,
  fetchGroups,
  createDevice,
  updateDevice,
  deleteDevice,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { Device, Group } from '@/types';

interface DeviceForm {
  device_uuid: string;
  device_remarks: string;
  group_id: string;
}

const EMPTY: DeviceForm = { device_uuid: '', device_remarks: '', group_id: '' };

export default function DeviceManagementPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeviceForm>(EMPTY);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [d, g] = await Promise.all([fetchDevices(user), fetchGroups()]);
      setDevices(d);
      setGroups(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  function openEdit(d: Device) {
    setEditingId(d.id);
    setForm({
      device_uuid: d.device_uuid,
      device_remarks: d.device_remarks || '',
      group_id: d.group_id ? String(d.group_id) : '',
    });
    setFormError('');
    setSuccess('');
    setShowForm(true);
  }

  async function handleSubmit() {
    setFormError('');
    if (!form.device_uuid.trim()) return setFormError('Device UUID is required.');
    const payload = {
      device_remarks: form.device_remarks.trim(),
      group_id: form.group_id ? Number(form.group_id) : null,
    };
    try {
      setSubmitting(true);
      if (editingId) {
        await updateDevice(editingId, payload);
        setSuccess(`Device "${form.device_uuid}" updated.`);
      } else {
        await createDevice({ device_uuid: form.device_uuid.trim(), ...payload });
        setSuccess(`Device "${form.device_uuid}" created.`);
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditingId(null);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save device.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDevice(deleteTarget.id);
      setSuccess(`Device "${deleteTarget.device_uuid}" deleted.`);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete device.');
      setDeleteTarget(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Device Management</h3>
          <p className="text-sm text-muted-foreground">Add, assign and manage all fire-safety devices</p>
        </div>
        <Button onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add Device</>}
        </Button>
      </div>

      {success && (
        <div className="rounded-md border border-ok-border bg-ok-bg px-4 py-2 text-sm text-ok-text">{success}</div>
      )}
      {error && (
        <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>
      )}

      {showForm && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">{editingId ? 'Edit Device' : 'New Device'}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Device UUID</Label>
              <Input
                value={form.device_uuid}
                onChange={(e) => setForm({ ...form, device_uuid: e.target.value })}
                placeholder="e.g. b4e62dd99ff1"
                disabled={!!editingId}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Remarks</Label>
              <Input
                value={form.device_remarks}
                onChange={(e) => setForm({ ...form, device_remarks: e.target.value })}
                placeholder="e.g. Office Wifi Add On 1"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Group</Label>
              <Select
                value={form.group_id || 'none'}
                onValueChange={(v) => setForm({ ...form, group_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No group —</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Status is automatic: a device shows <strong>Assigned</strong> once a user is linked to it.
          </p>
          <div className="mt-4 flex items-center justify-end gap-3">
            {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Device'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading devices…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device UUID</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zones</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.device_uuid}</TableCell>
                  <TableCell>{d.device_remarks || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.group_name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'ASSIGNED' ? 'ok' : 'off'}>
                      {d.status === 'ASSIGNED' ? 'Assigned' : 'Not assigned'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{d.summary?.totalZones ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(d)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {devices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No devices found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete device?</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{deleteTarget?.device_uuid}</strong> and all of its zones,
              status and event history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
