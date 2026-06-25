import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, LayoutGrid, List, Search, X } from 'lucide-react';
import { fetchBuildings, locationLabel } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Building } from '@/types';
import { LoadingScreen } from '@/components/ui/spinner';

type StatusFilter = 'all' | 'fire' | 'fault' | 'healthy';

export default function AllBuildingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupFilter, setGroupFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchBuildings(user);
        if (mounted) setBuildings(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load buildings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const b of buildings) {
      if (b.group_name && !seen.has(b.group_name)) {
        seen.add(b.group_name);
        result.push(b.group_name);
      }
    }
    return result.sort();
  }, [buildings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return buildings.filter((b) => {
      if (statusFilter === 'fire' && b.fire === 0) return false;
      if (statusFilter === 'fault' && b.fault === 0) return false;
      if (statusFilter === 'healthy' && (b.fire > 0 || b.fault > 0)) return false;
      if (groupFilter && b.group_name !== groupFilter) return false;
      if (q) {
        const loc = b.location;
        const haystack = [
          b.building_name,
          loc?.city,
          loc?.address,
          loc?.state,
          loc?.country,
          b.group_name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [buildings, search, statusFilter, groupFilter]);

  const hasFilters = search || statusFilter !== 'all' || groupFilter;

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setGroupFilter('');
  }

  if (loading) return <LoadingScreen />;
  if (error) return <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/buildings')}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" /> Overview
          </button>
          <div>
            <h3 className="text-lg font-semibold">All Buildings</h3>
            <p className="text-sm text-muted-foreground">
              {filtered.length} of {buildings.length} building{buildings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('rounded p-1.5 transition-colors', viewMode === 'grid' ? 'bg-water-bg text-water-strong' : 'text-muted-foreground hover:text-foreground')}
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('rounded p-1.5 transition-colors', viewMode === 'list' ? 'bg-water-bg text-water-strong' : 'text-muted-foreground hover:text-foreground')}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name, city, address…"
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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="fire">Has fire</option>
          <option value="fault">Has fault</option>
          <option value="healthy">Healthy</option>
        </select>

        {groups.length > 0 && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All groups</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          {buildings.length === 0 ? 'No buildings are assigned to your account yet.' : 'No buildings match your filters.'}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((b) => {
            const accent = b.fire > 0 ? 'border-l-crit-strong' : b.fault > 0 ? 'border-l-warn-strong' : 'border-l-ok-strong';
            return (
              <Card
                key={b.id}
                onClick={() => navigate(`/buildings/${b.id}`)}
                className={cn('flex cursor-pointer flex-col gap-2 border-l-4 p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md', accent)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  {b.group_name && <span className="text-xs text-muted-foreground">{b.group_name}</span>}
                </div>
                <div className="font-semibold">{b.building_name}</div>
                <div className="truncate text-xs text-muted-foreground">{locationLabel(b.location)}</div>
                <div className="mt-2 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">{b.panelCount}</strong> panels</span>
                  <span className={b.fire > 0 ? 'text-crit-text' : ''}><strong className={b.fire > 0 ? 'text-crit-strong' : 'text-foreground'}>{b.fire}</strong> fire</span>
                  <span className={b.fault > 0 ? 'text-warn-text' : ''}><strong className={b.fault > 0 ? 'text-warn-strong' : 'text-foreground'}>{b.fault}</strong> fault</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((b) => {
            const accent = b.fire > 0 ? 'border-l-crit-strong' : b.fault > 0 ? 'border-l-warn-strong' : 'border-l-ok-strong';
            return (
              <Card
                key={b.id}
                onClick={() => navigate(`/buildings/${b.id}`)}
                className={cn('flex cursor-pointer items-center gap-4 border-l-4 px-4 py-3 transition-transform hover:-translate-y-0.5 hover:shadow-md', accent)}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.building_name}</span>
                    {b.group_name && <Badge variant="water">{b.group_name}</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{locationLabel(b.location)}</div>
                </div>
                <div className="flex shrink-0 gap-4 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">{b.panelCount}</strong> panels</span>
                  <span className={b.fire > 0 ? 'text-crit-text' : ''}><strong className={b.fire > 0 ? 'text-crit-strong' : 'text-foreground'}>{b.fire}</strong> fire</span>
                  <span className={b.fault > 0 ? 'text-warn-text' : ''}><strong className={b.fault > 0 ? 'text-warn-strong' : 'text-foreground'}>{b.fault}</strong> fault</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
