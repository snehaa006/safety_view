import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  fetchGroups,
  fetchDevices,
  fetchUserById,
  createUser,
  updateUser,
  setUserDevices,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Device, Group, Role } from '@/types';

const ROLES: Role[] = ['ADMIN', 'FIRE_OFFICER', 'BUILDING_MANAGER', 'VIEWER'];

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  mobile_no: string;
  role: string;
  group_id: string;
  deviceIds: number[];
}

const EMPTY: FormState = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  first_name: '',
  last_name: '',
  mobile_no: '',
  role: 'VIEWER',
  group_id: '',
  deviceIds: [],
};

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isEditing = !!id;

  const [groups, setGroups] = useState<Group[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [g, d] = await Promise.all([fetchGroups(), fetchDevices(currentUser)]);
        setGroups(g);
        setDevices(d);
        if (isEditing) {
          const u = await fetchUserById(Number(id));
          if (u) {
            setForm({
              username: u.username,
              email: u.email || '',
              password: '',
              confirmPassword: '',
              first_name: u.first_name || '',
              last_name: u.last_name || '',
              mobile_no: u.mobile_no || '',
              role: u.role,
              group_id: u.group_id ? String(u.group_id) : '',
              deviceIds: u.assigned_device_ids.length
                ? u.assigned_device_ids
                : u.device_id
                ? [u.device_id]
                : [],
            });
          }
        }
      } catch (err) {
        setFormError(err instanceof Error ? err.message : 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const devicesForGroup = useMemo(() => {
    if (!form.group_id) return [];
    return devices.filter((d) => String(d.group_id) === form.group_id);
  }, [devices, form.group_id]);

  function setGroup(value: string) {
    setForm((prev) => {
      const groupDevIds = devices.filter((d) => String(d.group_id) === value).map((d) => d.id);
      return { ...prev, group_id: value, deviceIds: prev.deviceIds.filter((x) => groupDevIds.includes(x)) };
    });
  }

  function toggleDevice(deviceId: number) {
    setForm((prev) => ({
      ...prev,
      deviceIds: prev.deviceIds.includes(deviceId)
        ? prev.deviceIds.filter((x) => x !== deviceId)
        : [...prev.deviceIds, deviceId],
    }));
  }

  async function handleSubmit() {
    setFormError('');
    if (!form.username.trim()) return setFormError('Username is required.');
    if (!form.email.trim()) return setFormError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setFormError('Enter a valid email.');
    if (!isEditing) {
      if (form.password.length < 8) return setFormError('Password must be at least 8 characters.');
      if (form.password !== form.confirmPassword) return setFormError('Passwords do not match.');
    }

    const primaryDevice = form.deviceIds[0] ?? null;
    const groupId = form.group_id ? Number(form.group_id) : null;

    try {
      setSubmitting(true);
      let userId = isEditing ? Number(id) : undefined;

      if (isEditing) {
        await updateUser(Number(id), {
          role: form.role,
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          mobile_no: form.mobile_no.trim(),
          group_id: groupId,
          device_id: primaryDevice,
        });
      } else {
        const created = await createUser({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          mobile_no: form.mobile_no.trim(),
          group_id: groupId,
          device_id: primaryDevice,
        });
        userId = created.id;
      }

      if (userId != null) await setUserDevices(userId, form.deviceIds);
      navigate('/users');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <button
        onClick={() => navigate('/users')}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to Users
      </button>

      <Card className="p-6">
        <h3 className="mb-5 text-lg font-bold">{isEditing ? `Edit User · ${form.username}` : 'New User'}</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. rajesh.sharma"
              disabled={isEditing}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@company.com"
            />
          </Field>
          <Field label="First Name">
            <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </Field>
          <Field label="Last Name">
            <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </Field>
          <Field label="Mobile No.">
            <Input value={form.mobile_no} onChange={(e) => setForm({ ...form, mobile_no: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Group (grants device access)">
            <Select value={form.group_id || 'none'} onValueChange={(v) => setGroup(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No group —</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.group_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Label>Assigned Devices</Label>
            {!form.group_id ? (
              <div className="mt-1.5 text-sm text-muted-foreground">Select a group first to choose devices.</div>
            ) : devicesForGroup.length === 0 ? (
              <div className="mt-1.5 text-sm text-muted-foreground">No devices in this group yet.</div>
            ) : (
              <div className="mt-1.5 flex max-h-44 flex-col gap-2 overflow-y-auto rounded-md border border-border bg-background p-3">
                {devicesForGroup.map((d) => (
                  <label key={d.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.deviceIds.includes(d.id)}
                      onCheckedChange={() => toggleDevice(d.id)}
                    />
                    <span className="flex flex-col leading-tight">
                      {d.device_remarks || d.device_uuid}
                      <span className="font-mono text-xs text-muted-foreground">{d.device_uuid}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {!isEditing && (
            <>
              <Field label="Password">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 8 characters"
                />
              </Field>
              <Field label="Confirm Password">
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
              </Field>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {formError && <span className="text-sm font-medium text-crit-text">{formError}</span>}
          <Button variant="outline" onClick={() => navigate('/users')}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </Card>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
