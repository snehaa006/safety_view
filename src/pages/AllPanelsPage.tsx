import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Cpu, LayoutGrid, List, Search, X } from 'lucide-react';
import { fetchPanelsForUser } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PANEL_STATUS_META } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Panel, PanelStatus } from '@/types';

type ZoneFilter = 'all' | 'fire' | 'fault' | 'healthy';

export default function AllPanelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PanelStatus | 'all'>('all');
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all');
  const [buildingFilter, setBuildingFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchPanelsForUser(user);
        if (mounted) setPanels(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load panels');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const buildings = useMemo(() => {
    const seen = new Map<number, string>();
    for (const p of panels) {
      if (!seen.has(p.building_id)) seen.set(p.building_id, p.building_name ?? 'Unknown');
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [panels]);

  const filteredPanels = useMemo(() => {
    const q = search.toLowerCase().trim();
    return panels.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (zoneFilter === 'fire' && p.fire === 0) return false;
      if (zoneFilter === 'fault' && p.fault === 0) return false;
      if (zoneFilter === 'healthy' && (p.fire > 0 || p.fault > 0)) return false;
      if (buildingFilter && String(p.building_id) !== buildingFilter) return false;
      if (q) {
        const haystack = [p.panel_name, p.panel_code, p.building_name].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [panels, search, statusFilter, zoneFilter, buildingFilter]);

  // Group filtered panels by building
  const grouped = useMemo(() => {
    const map = new Map<string, { buildingId: number; buildingName: string; panels: Panel[] }>();
    for (const p of filteredPanels) {
      const key = String(p.building_id);
      if (!map.has(key)) {
        map.set(key, { buildingId: p.building_id, buildingName: p.building_name ?? 'Unknown Building', panels: [] });
      }
      map.get(key)!.panels.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.buildingName.localeCompare(b.buildingName));
  }, [filteredPanels]);

  const hasFilters = search || statusFilter !== 'all' || zoneFilter !== 'all' || buildingFilter;

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
    setZoneFilter('all');
    setBuildingFilter('');
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading panels…</div>;
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
            <h3 className="text-lg font-semibold">All Panels</h3>
            <p className="text-sm text-muted-foreground">
              {filteredPanels.length} of {panels.length} panel{panels.length !== 1 ? 's' : ''}
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
            placeholder="Search name, code, building…"
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
          onChange={(e) => setStatusFilter(e.target.value as PanelStatus | 'all')}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="NORMAL">Normal</option>
          <option value="ALARM">Alarm</option>
          <option value="FAULT">Fault</option>
          <option value="OFFLINE">Offline</option>
        </select>

        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value as ZoneFilter)}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All zones</option>
          <option value="fire">Has fire</option>
          <option value="fault">Has fault</option>
          <option value="healthy">Clean</option>
        </select>

        {buildings.length > 1 && (
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All buildings</option>
            {buildings.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
        )}

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      {filteredPanels.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          {panels.length === 0 ? 'No panels found in your scope.' : 'No panels match your filters.'}
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.buildingId} className="space-y-3">
              <div
                className="flex cursor-pointer items-center gap-2 hover:opacity-80"
                onClick={() => navigate(`/buildings/${group.buildingId}`)}
              >
                <h4 className="font-semibold text-foreground">{group.buildingName}</h4>
                <span className="text-xs text-muted-foreground">({group.panels.length} panel{group.panels.length !== 1 ? 's' : ''})</span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.panels.map((p) => {
                    const meta = PANEL_STATUS_META[p.status] ?? PANEL_STATUS_META.NORMAL;
                    const accent = p.fire > 0 ? 'border-l-crit-strong' : p.fault > 0 ? 'border-l-warn-strong' : 'border-l-ok-strong';
                    return (
                      <Card key={p.id} onClick={() => navigate(`/panels/${p.id}`)} className={cn('flex cursor-pointer flex-col gap-2 border-l-4 p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md', accent)}>
                        <div className="flex items-center justify-between">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary"><Cpu className="h-4 w-4" /></div>
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </div>
                        <div className="font-semibold">{p.panel_name || p.panel_code}</div>
                        <div className="font-mono text-xs text-muted-foreground">{p.panel_code}</div>
                        <div className="mt-1 flex gap-4 border-t border-border pt-2 text-xs text-muted-foreground">
                          <span><strong className="text-foreground">{p.zoneCount}</strong> zones</span>
                          <span className={p.fire > 0 ? 'text-crit-text' : ''}><strong className={p.fire > 0 ? 'text-crit-strong' : 'text-foreground'}>{p.fire}</strong> fire</span>
                          <span className={p.fault > 0 ? 'text-warn-text' : ''}><strong className={p.fault > 0 ? 'text-warn-strong' : 'text-foreground'}>{p.fault}</strong> fault</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {group.panels.map((p) => {
                    const meta = PANEL_STATUS_META[p.status] ?? PANEL_STATUS_META.NORMAL;
                    const accent = p.fire > 0 ? 'border-l-crit-strong' : p.fault > 0 ? 'border-l-warn-strong' : 'border-l-ok-strong';
                    return (
                      <Card key={p.id} onClick={() => navigate(`/panels/${p.id}`)} className={cn('flex cursor-pointer items-center gap-4 border-l-4 px-4 py-3 transition-transform hover:-translate-y-0.5 hover:shadow-md', accent)}>
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{p.panel_name || p.panel_code}</span>
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">{p.panel_code}</div>
                        </div>
                        <div className="flex shrink-0 gap-4 text-xs text-muted-foreground">
                          <span><strong className="text-foreground">{p.zoneCount}</strong> zones</span>
                          <span className={p.fire > 0 ? 'text-crit-text' : ''}><strong className={p.fire > 0 ? 'text-crit-strong' : 'text-foreground'}>{p.fire}</strong> fire</span>
                          <span className={p.fault > 0 ? 'text-warn-text' : ''}><strong className={p.fault > 0 ? 'text-warn-strong' : 'text-foreground'}>{p.fault}</strong> fault</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
