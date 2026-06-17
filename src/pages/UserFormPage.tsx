import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  fetchGroups,
  fetchDevices,
  fetchOrganizations,
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
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROLE_OPTIONS, type Device, type Group, type Organization } from '@/types';

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
  organization_id: string;
  remarks: string;
  customer_id: string;
  deviceIds: number[];
}

type Errors = Partial<Record<keyof FormState, string>>;

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
  organization_id: '',
  remarks: '',
  customer_id: '',
  deviceIds: [],
};

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isEditing = !!id;

  const [groups, setGroups] = useState<Group[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const initialRef = useRef<string>(JSON.stringify(EMPTY));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [g, o, d] = await Promise.all([fetchGroups(), fetchOrganizations().catch(() => []), fetchDevices(currentUser)]);
        setGroups(g);
        setOrgs(o);
        setDevices(d);

        let next: FormState;
        if (isEditing) {
          const u = await fetchUserById(Number(id));
          next = u
            ? {
                username: u.username,
                email: u.email || '',
                password: '',
                confirmPassword: '',
                first_name: u.first_name || '',
                last_name: u.last_name || '',
                mobile_no: u.mobile_no || '',
                role: u.role,
                group_id: u.group_id ? String(u.group_id) : '',
                organization_id: u.organization_id ? String(u.organization_id) : '',
                remarks: u.remarks || '',
                customer_id: u.customer_id || '',
                deviceIds: u.assigned_device_ids.length ? u.assigned_device_ids : u.device_id ? [u.device_id] : [],
              }
            : EMPTY;
        } else {
          // Auto-generate a UUID "user id" for new accounts (stored in customer_id).
          next = { ...EMPTY, customer_id: crypto.randomUUID() };
        }
        setForm(next);
        initialRef.current = JSON.stringify(next);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to load form data');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isDirty = JSON.stringify(form) !== initialRef.current;

  const devicesForGroup = useMemo(() => {
    if (!form.group_id) return [];
    return devices.filter((d) => String(d.group_id) === form.group_id);
  }, [devices, form.group_id]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear that field's error as the user corrects it.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setSubmitError('');
  }

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

  function validate(): boolean {
    const e: Errors = {};
    if (!form.username.trim()) e.username = 'Username is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email.';
    if (!isEditing) {
      if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    setSubmitError('');
    if (!validate()) return;

    const primaryDevice = form.deviceIds[0] ?? null;
    const groupId = form.group_id ? Number(form.group_id) : null;
    const orgId = form.organization_id ? Number(form.organization_id) : null;

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
          organization_id: orgId,
          remarks: form.remarks.trim(),
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
          organization_id: orgId,
          customer_id: form.customer_id || null,
          remarks: form.remarks.trim() || null,
        });
        userId = created.id;
      }

      if (userId != null) await setUserDevices(userId, form.deviceIds);
      navigate('/users');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save user.');
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
          <Field label="Username" error={errors.username}>
            <Input
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              placeholder="e.g. rajesh.sharma"
              disabled={isEditing}
              aria-invalid={!!errors.username}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="user@company.com"
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field label="First Name">
            <Input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
          </Field>
          <Field label="Last Name">
            <Input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
          </Field>
          <Field label="Mobile No.">
            <Input value={form.mobile_no} onChange={(e) => update('mobile_no', e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={form.role} onValueChange={(v) => update('role', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Organization">
            <Select value={form.organization_id || 'none'} onValueChange={(v) => update('organization_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No organization" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No organization —</SelectItem>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.organization_name}</SelectItem>
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

          <Field label="User ID (auto)">
            <Input value={form.customer_id} readOnly className="font-mono text-xs" />
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
                    <Checkbox checked={form.deviceIds.includes(d.id)} onCheckedChange={() => toggleDevice(d.id)} />
                    <span className="flex flex-col leading-tight">
                      {d.device_remarks || d.device_uuid}
                      <span className="font-mono text-xs text-muted-foreground">{d.device_uuid}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <Label>Notes (private)</Label>
            <textarea
              className="mt-1.5 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.remarks}
              onChange={(e) => update('remarks', e.target.value)}
              placeholder="Internal notes — only visible to admins / authorised accounts"
            />
          </div>

          {!isEditing && (
            <>
              <Field label="Password" error={errors.password}>
                <PasswordInput
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  aria-invalid={!!errors.password}
                />
              </Field>
              <Field label="Confirm Password" error={errors.confirmPassword}>
                <PasswordInput
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  aria-invalid={!!errors.confirmPassword}
                />
              </Field>
            </>
          )}
        </div>

        {submitError && (
          <div className="mt-4 rounded-md border border-crit-border bg-crit-bg px-3 py-2 text-sm text-crit-text">
            {submitError}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/users')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !isDirty}>
            {submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create User'}
          </Button>
        </div>
      </Card>
    </section>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <span className="text-xs font-medium text-crit-text">{error}</span>}
    </div>
  );
}
