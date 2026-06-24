import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { fetchRoles } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Role } from '@/types';

export default function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter((r) => [r.role_name, r.description].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [roles, search]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Roles</h3>
          <p className="text-sm text-muted-foreground">{filtered.length} of {roles.length} role{roles.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/roles/new')}><Plus className="h-4 w-4" /> Add Role</Button>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-56 rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <Card>
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/roles/${r.id}`)}>
                  <TableCell className="font-semibold">{r.role_name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.description || '—'}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                    {roles.length === 0 ? 'No roles yet.' : 'No roles match your search.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}
