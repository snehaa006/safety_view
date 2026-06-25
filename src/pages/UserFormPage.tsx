import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  fetchRoles, fetchOrganizations, fetchBuildings, fetchUsers, fetchUserById,
  createUser, updateUser, setUserRoles, setUserBuildings,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Building, ManagedUser, Organization, Role } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';
import ConfirmDialog from '@/components/ui/confirm-dialog';

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  mobile_no: string;
  organization_id: string;
  parent_user_id: string;
  remarks: string;
  roleIds: number[];
  buildingIds: number[];
}
type Errors = Partial<Record<keyof FormState, string>>;
const EMPTY: FormState = {
  username: '', email: '', password: '', confirmPassword: '', first_name: '', last_name: '', mobile_no: '',
  organization_id: '', parent_user_id: '', remarks: '', roleIds: [], buildingIds: [],
};

export default function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isEditing = !!id;

  const [roles, setRoles] = useState<Role[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const initialRef = useRef(JSON.stringify(EMPTY));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [r, o, b, u] = await Promise.all([
          fetchRoles(), fetchOrganizations().catch(() => []), fetchBuildings(currentUser), fetchUsers(),
        ]);
        setRoles(r); setOrgs(o); setBuildings(b); setUsers(u);
        let next = EMPTY;
        if (isEditing) {
          const mu = await fetchUserById(Number(id));
          if (mu) next = {
            username: mu.username, email: mu.email || '', password: '', confirmPassword: '',
            first_name: mu.first_name || '', last_name: mu.last_name || '', mobile_no: mu.mobile_no || '',
            organization_id: mu.organization_id ? String(mu.organization_id) : '',
            parent_user_id: mu.parent_user_id ? String(mu.parent_user_id) : '',
            remarks: mu.remarks || '', roleIds: mu.role_ids, buildingIds: mu.building_ids,
          };
        }
        setForm(next); initialRef.current = JSON.stringify(next);
      } catch (err) { setSubmitError(err instanceof Error ? err.message : 'Failed to load'); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line
  }, [id]);

  const isDirty = JSON.stringify(form) !== initialRef.current;
  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => (p[k] ? { ...p, [k]: undefined } : p));
    setSubmitError('');
  }
  function toggle(list: 'roleIds' | 'buildingIds', val: number) {
    setForm((p) => ({ ...p, [list]: p[list].includes(val) ? p[list].filter((x) => x !== val) : [...p[list], val] }));
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

  function handleSaveClick() {
    setSubmitError('');
    if (!validate()) return;
    setShowConfirm(true);
  }

  async function handleSubmit() {
    setShowConfirm(false);
    const orgId = form.organization_id ? Number(form.organization_id) : null;
    const parentId = form.parent_user_id ? Number(form.parent_user_id) : null;
    try {
      setSubmitting(true);
      let userId = isEditing ? Number(id) : undefined;
      if (isEditing) {
        await updateUser(Number(id), {
          email: form.email.trim(), first_name: form.first_name.trim(), last_name: form.last_name.trim(),
          mobile_no: form.mobile_no.trim(), organization_id: orgId, parent_user_id: parentId, remarks: form.remarks.trim(),
        });
        await setUserRoles(Number(id), form.roleIds);
        await setUserBuildings(Number(id), form.buildingIds);
      } else {
        const created = await createUser({
          username: form.username.trim(), email: form.email.trim(), password: form.password,
          first_name: form.first_name.trim(), last_name: form.last_name.trim(), mobile_no: form.mobile_no.trim(),
          organization_id: orgId, parent_user_id: parentId, remarks: form.remarks.trim() || null,
          role_ids: form.roleIds, building_ids: form.buildingIds,
        });
        userId = created.id;
      }
      navigate('/users');
    } catch (err) { setSubmitError(err instanceof Error ? err.message : 'Failed to save user.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <LoadingScreen />;

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <button onClick={() => navigate('/users')} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to Users
      </button>
      <Card className="p-6">
        <h3 className="mb-5 text-lg font-bold">{isEditing ? `Edit User · ${form.username}` : 'New User'}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username" error={errors.username}>
            <Input value={form.username} onChange={(e) => update('username', e.target.value)} disabled={isEditing} />
          </Field>
          <Field label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </Field>
          <Field label="First Name"><Input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} /></Field>
          <Field label="Last Name"><Input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} /></Field>
          <Field label="Mobile No."><Input value={form.mobile_no} onChange={(e) => update('mobile_no', e.target.value)} /></Field>
          <Field label="Organization">
            <Select value={form.organization_id || 'none'} onValueChange={(v) => update('organization_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No organization" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No organization —</SelectItem>
                {orgs.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.organization_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reports To">
            <Select value={form.parent_user_id || 'none'} onValueChange={(v) => update('parent_user_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No manager —</SelectItem>
                {users.filter((u) => String(u.id) !== id).map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-4">
          <Label>Roles</Label>
          <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-md border border-border bg-background p-3 sm:grid-cols-3">
            {roles.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={form.roleIds.includes(r.id)} onCheckedChange={() => toggle('roleIds', r.id)} /> {r.role_name}
              </label>
            ))}
            {roles.length === 0 && <span className="text-sm text-muted-foreground">No roles defined.</span>}
          </div>
        </div>

        <div className="mt-4">
          <Label>Building Access</Label>
          <div className="mt-1.5 flex max-h-44 flex-col gap-2 overflow-y-auto rounded-md border border-border bg-background p-3">
            {buildings.map((b) => (
              <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={form.buildingIds.includes(b.id)} onCheckedChange={() => toggle('buildingIds', b.id)} />
                {b.building_name}{b.group_name ? <span className="text-xs text-muted-foreground">· {b.group_name}</span> : null}
              </label>
            ))}
            {buildings.length === 0 && <span className="text-sm text-muted-foreground">No buildings available.</span>}
          </div>
        </div>

        <div className="mt-4">
          <Label>Notes</Label>
          <textarea className="mt-1.5 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={form.remarks} onChange={(e) => update('remarks', e.target.value)} placeholder="Internal notes" />
        </div>

        {!isEditing && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Password" error={errors.password}>
              <PasswordInput value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min. 8 characters" />
            </Field>
            <Field label="Confirm Password" error={errors.confirmPassword}>
              <PasswordInput value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} />
            </Field>
          </div>
        )}

        {submitError && <div className="mt-4 rounded-md border border-crit-border bg-crit-bg px-3 py-2 text-sm text-crit-text">{submitError}</div>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/users')}>Cancel</Button>
          <Button onClick={handleSaveClick} disabled={submitting || !isDirty}>{submitting ? 'Saving…' : isEditing ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </Card>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title={isEditing ? 'Save changes?' : 'Create user?'}
        description={isEditing ? `Save changes to user "${form.username}"?` : `Create a new user "${form.username.trim()}"?`}
        confirmLabel={isEditing ? 'Save Changes' : 'Create User'}
        onConfirm={handleSubmit}
        loading={submitting}
      />
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
