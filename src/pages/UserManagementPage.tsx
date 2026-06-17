import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { fetchUsers, fetchGroups, toggleUserActive, deleteUser } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import Highlight from '@/components/common/Highlight';
import { formatDate } from '@/utils/format';
import { ROLE_OPTIONS, type Group, type ManagedUser } from '@/types';

const SEARCH_FIELDS = [
  { value: 'all', label: 'All fields' },
  { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'mobile_no', label: 'Mobile' },
  { value: 'name', label: 'Name' },
  { value: 'group_name', label: 'Group' },
  { value: 'organization_name', label: 'Organization' },
  { value: 'customer_id', label: 'User ID' },
] as const;

function roleBadgeVariant(role: string): 'destructive' | 'water' | 'off' {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return 'destructive';
  if (role === 'VIEWER') return 'off';
  return 'water';
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [confirmAck, setConfirmAck] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [u, g] = await Promise.all([fetchUsers(), fetchGroups()]);
      setUsers(u);
      setGroups(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  const filtersActive =
    query.trim() !== '' ||
    searchField !== 'all' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    groupFilter !== 'all';

  function clearFilters() {
    setQuery('');
    setSearchField('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setGroupFilter('all');
  }

  function fieldsOf(u: ManagedUser): Record<string, string> {
    return {
      username: u.username ?? '',
      email: u.email ?? '',
      role: u.role ?? '',
      mobile_no: u.mobile_no ?? '',
      name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      group_name: u.group_name ?? '',
      organization_name: u.organization_name ?? '',
      customer_id: u.customer_id ?? '',
    };
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;
      if (groupFilter !== 'all' && String(u.group_id ?? '') !== groupFilter) return false;
      if (!q) return true;
      const f = fieldsOf(u);
      if (searchField === 'all') return Object.values(f).some((v) => v.toLowerCase().includes(q));
      return (f[searchField] ?? '').toLowerCase().includes(q);
    });
  }, [users, query, searchField, roleFilter, statusFilter, groupFilter]);

  // Which cells to highlight: only the searched field (or all when 'all').
  function hq(field: string): string {
    if (!query.trim()) return '';
    if (searchField === 'all' || searchField === field) return query;
    return '';
  }

  async function handleToggleActive(u: ManagedUser) {
    try {
      await toggleUserActive(u.id, !u.is_active);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user.');
    }
  }

  function openDelete(u: ManagedUser) {
    setDeleteTarget(u);
    setConfirmName('');
    setConfirmAck(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  }

  const canDelete = !!deleteTarget && confirmName === deleteTarget.username && confirmAck;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">User Management</h3>
          <p className="text-sm text-muted-foreground">
            Search, filter and manage users, roles, organizations and device assignments
          </p>
        </div>
        <Button onClick={() => navigate('/users/new')}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>
      )}

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search users…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select value={searchField} onValueChange={setSearchField}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEARCH_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
              ))}
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
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Group" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All groups</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>{g.group_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={clearFilters} disabled={!filtersActive}>
            <X className="h-4 w-4" /> Clear filters
          </Button>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {users.length} users
          </span>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading users…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const deviceUuids = u.assigned_device_uuids.length
                  ? u.assigned_device_uuids
                  : u.device_uuid
                  ? [u.device_uuid]
                  : [];
                const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
                return (
                  <TableRow
                    key={u.id}
                    className={`cursor-pointer ${!u.is_active ? 'opacity-60' : ''}`}
                    onClick={() => navigate(`/users/${u.id}`)}
                  >
                    <TableCell className="text-muted-foreground">{u.id}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <Highlight text={u.customer_id || '—'} query={hq('customer_id')} />
                    </TableCell>
                    <TableCell className="font-semibold">
                      <Highlight text={u.username} query={hq('username')} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Highlight text={name || '—'} query={hq('name')} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Highlight text={u.email || '—'} query={hq('email')} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <Highlight text={u.mobile_no || '—'} query={hq('mobile_no')} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(u.role)}>{String(u.role).replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.hierarchy_level ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <Highlight text={u.group_name || '—'} query={hq('group_name')} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <Highlight text={u.organization_name || u.org_name || '—'} query={hq('organization_name')} />
                    </TableCell>
                    <TableCell className="text-muted-foreground" title={deviceUuids.join(', ')}>
                      {deviceUuids.length === 0 ? '—' : deviceUuids.length === 1 ? deviceUuids[0] : `${deviceUuids.length} devices`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDateTime(u.last_login)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <span className={u.is_active ? 'text-ok-text' : 'text-muted-foreground'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/users/${u.id}/edit`)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleToggleActive(u)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => openDelete(u)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={15} className="py-6 text-center text-muted-foreground">
                    No users match your search.
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
            <DialogTitle>Delete user permanently</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{deleteTarget?.username}</strong> and all of their device
              assignments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-name">
                Type the username <span className="font-mono text-foreground">{deleteTarget?.username}</span> to confirm
              </Label>
              <Input
                id="confirm-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={deleteTarget?.username}
                autoComplete="off"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={confirmAck} onCheckedChange={(v) => setConfirmAck(v === true)} />
              I understand this action is permanent.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!canDelete || deleting} onClick={confirmDelete}>
              {deleting ? 'Deleting…' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
