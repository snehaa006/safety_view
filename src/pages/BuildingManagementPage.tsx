import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { fetchBuildings, locationLabel } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Building } from '@/types';

export default function BuildingManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState(searchParams.get('group') || '');

  useEffect(() => {
    fetchBuildings(user)
      .then(setBuildings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    return buildings.map((b) => b.group_name).filter((g): g is string => !!g && !seen.has(g) && !!seen.add(g)).sort();
  }, [buildings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return buildings.filter((b) => {
      if (groupFilter && b.group_name !== groupFilter) return false;
      if (q) {
        const hay = [b.building_name, b.group_name, locationLabel(b.location)].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [buildings, search, groupFilter]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Building Management</h3>
          <p className="text-sm text-muted-foreground">{filtered.length} of {buildings.length} building{buildings.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/building-management/new')}><Plus className="h-4 w-4" /> Add Building</Button>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, group, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-60 rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {groups.length > 1 && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All groups</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        {(search || groupFilter) && (
          <button onClick={() => { setSearch(''); setGroupFilter(''); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <Card>
        {loading ? <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Panels</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/building-management/${b.id}`)}>
                  <TableCell className="font-semibold">{b.building_name}</TableCell>
                  <TableCell className="text-muted-foreground">{b.group_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{locationLabel(b.location)}</TableCell>
                  <TableCell className="text-muted-foreground">{b.panelCount}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    {buildings.length === 0 ? 'No buildings yet.' : 'No buildings match your filters.'}
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
