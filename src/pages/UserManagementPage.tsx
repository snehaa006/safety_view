import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { fetchUsers, fetchRoles, toggleUserActive, deleteUser } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import Highlight from '@/components/common/Highlight';
import { formatDate, formatDateTime } from '@/utils/format';
import type { ManagedUser, Role } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all');
  const [orgFilter, setOrgFilter] = useState(searchParams.get('org') || 'all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [confirmAck, setConfirmAck] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadAll(); }, []);
  async function loadAll() {
    try {
      setLoading(true);
      const [u, r] = await Promise.all([fetchUsers(), fetchRoles()]);
      setUsers(u); setRoles(r);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load users'); }
    finally { setLoading(false); }
  }

  const orgs = useMemo(() => {
    const seen = new Set<string>();
    return users.map((u) => u.organization_name).filter((n): n is string => !!n && !seen.has(n) && !!seen.add(n)).sort();
  }, [users]);

  const filtersActive = query.trim() !== '' || roleFilter !== 'all' || orgFilter !== 'all' || statusFilter !== 'all';
  function clearFilters() { setQuery(''); setRoleFilter('all'); setOrgFilter('all'); setStatusFilter('all'); }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && !u.roles.includes(roleFilter)) return false;
      if (orgFilter !== 'all' && u.organization_name !== orgFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (!q) return true;
      const hay = [u.username, u.email, u.first_name, u.last_name, u.mobile_no, u.organization_name, u.roles.join(' '), String(u.id)]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [users, query, roleFilter, orgFilter, statusFilter]);

  async function handleToggle(u: ManagedUser) {
    try { await toggleUserActive(u.id, !u.is_active); setUsers((p) => p.map((x) => x.id === u.id ? { ...x, is_active: !x.is_active } : x)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to update'); }
  }
  function openDelete(u: ManagedUser) { setDeleteTarget(u); setConfirmName(''); setConfirmAck(false); }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try { setDeleting(true); await deleteUser(deleteTarget.id); setUsers((p) => p.filter((x) => x.id !== deleteTarget.id)); setDeleteTarget(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete'); }
    finally { setDeleting(false); }
  }
  const canDelete = !!deleteTarget && confirmName === deleteTarget.username && confirmAck;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">User Management</h3>
          <p className="text-sm text-muted-foreground">People, roles, reporting line, organization and building access</p>
        </div>
        <Button onClick={() => navigate('/users/new')}><Plus className="h-4 w-4" /> Add User</Button>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search users…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => <SelectItem key={r.id} value={r.role_name}>{r.role_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger><SelectValue placeholder="Organization" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All organizations</SelectItem>
              {orgs.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={clearFilters} disabled={!filtersActive}><X className="h-4 w-4" /> Clear filters</Button>
          <span className="text-xs text-muted-foreground">{filtered.length} of {users.length} users</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <LoadingScreen /> : (
          <div className="max-h-[68vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-secondary">
                <tr className="border-b border-border [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                  <th>Id</th><th>Username</th><th>Name</th><th>Email</th><th>Mobile</th><th>Roles</th>
                  <th>Reports To</th><th>Organization</th><th>Buildings</th><th>Last Login</th><th>Created</th><th>Status</th>
                  <th className="sticky right-0 bg-secondary text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} onClick={() => navigate(`/users/${u.id}`)}
                    className={`cursor-pointer border-b border-border transition-colors hover:bg-muted/60 ${i % 2 ? 'bg-muted/20' : ''} ${!u.is_active ? 'opacity-60' : ''} [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-2.5`}>
                    <td className="text-muted-foreground">{u.id}</td>
                    <td className="font-semibold"><Highlight text={u.username} query={query} /></td>
                    <td><Highlight text={`${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—'} query={query} /></td>
                    <td><Highlight text={u.email || '—'} query={query} /></td>
                    <td className="text-muted-foreground">{u.mobile_no || '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length ? u.roles.map((r) => <Badge key={r} variant="water">{r}</Badge>) : <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="text-muted-foreground">{u.parent_username || '—'}</td>
                    <td className="text-muted-foreground">{u.organization_name || '—'}</td>
                    <td className="text-muted-foreground">{u.building_ids.length}</td>
                    <td className="text-muted-foreground">{formatDateTime(u.last_login)}</td>
                    <td className="text-muted-foreground">{formatDate(u.created_at)}</td>
                    <td><Badge variant={u.is_active ? 'ok' : 'off'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="sticky right-0 bg-card" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/users/${u.id}/edit`)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => handleToggle(u)}>{u.is_active ? 'Disable' : 'Enable'}</Button>
                        <Button variant="destructive" size="sm" onClick={() => openDelete(u)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={13} className="py-6 text-center text-muted-foreground">No users match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user permanently</DialogTitle>
            <DialogDescription>This permanently deletes <strong>{deleteTarget?.username}</strong> and their role/building assignments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cn">Type the username <span className="font-mono text-foreground">{deleteTarget?.username}</span> to confirm</Label>
              <Input id="cn" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={confirmAck} onCheckedChange={(v) => setConfirmAck(v === true)} /> I understand this is permanent.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!canDelete || deleting} onClick={confirmDelete}>{deleting ? 'Deleting…' : 'Delete user'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
