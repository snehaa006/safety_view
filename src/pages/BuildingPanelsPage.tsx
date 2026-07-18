import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Cpu, Search, X } from 'lucide-react';
import { fetchBuildingById, fetchPanelsByBuilding, locationLabel } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/spinner';
import { PANEL_STATUS_META } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Building, Panel, PanelStatus } from '@/types';

type ZoneFilter = 'all' | 'fire' | 'fault' | 'healthy';

const STATUS_OPTS: { value: PanelStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ALARM', label: 'Alarm' },
  { value: 'FAULT', label: 'Fault' },
  { value: 'OFFLINE', label: 'Offline' },
];

const ZONE_OPTS: { value: ZoneFilter; label: string }[] = [
  { value: 'all', label: 'All zones' },
  { value: 'fire', label: 'Has fire' },
  { value: 'fault', label: 'Has fault' },
  { value: 'healthy', label: 'Clean' },
];

export default function BuildingPanelsPage() {
  const { buildingId } = useParams();
  const id = Number(buildingId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [building, setBuilding] = useState<Building | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<PanelStatus | 'all'>((searchParams.get('status') as PanelStatus | 'all') || 'all');
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>((searchParams.get('zones') as ZoneFilter) || 'all');

  function updateUrl(patch: Record<string, string>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v && v !== 'all') next.set(k, v); else next.delete(k);
      }
      return next;
    }, { replace: true });
  }

  function setSearchAndUrl(v: string) { setSearch(v); updateUrl({ q: v }); }
  function setStatusAndUrl(v: PanelStatus | 'all') { setStatusFilter(v); updateUrl({ status: v }); }
  function setZoneAndUrl(v: ZoneFilter) { setZoneFilter(v); updateUrl({ zones: v }); }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [b, p] = await Promise.all([fetchBuildingById(id), fetchPanelsByBuilding(id)]);
        if (!mounted) return;
        setBuilding(b); setPanels(p);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load panels');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return panels.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (zoneFilter === 'fire' && p.fire === 0) return false;
      if (zoneFilter === 'fault' && p.fault === 0) return false;
      if (zoneFilter === 'healthy' && (p.fire > 0 || p.fault > 0)) return false;
      if (q && ![p.panel_name, p.panel_code].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [panels, search, statusFilter, zoneFilter]);

  const hasFilters = search || statusFilter !== 'all' || zoneFilter !== 'all';

  if (loading) return <LoadingScreen />;
  if (error) return <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>;

  return (
    <section className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <button onClick={() => navigate('/all-buildings')} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-secondary">
          <ChevronLeft className="h-4 w-4" /> Buildings
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold">{building?.building_name}</span>
          {building?.group_name && <Badge variant="water">{building.group_name}</Badge>}
          <span className="text-xs text-muted-foreground">{locationLabel(building?.location ?? null)}</span>
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Panels</h3>
            <p className="text-sm text-muted-foreground">{filtered.length} of {panels.length} panel{panels.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text" placeholder="Search by name or code…" value={search}
              onChange={(e) => setSearchAndUrl(e.target.value)}
              className="h-8 w-52 rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearchAndUrl('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusAndUrl(e.target.value as PanelStatus | 'all')}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={zoneFilter} onChange={(e) => setZoneAndUrl(e.target.value as ZoneFilter)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            {ZONE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setSearchAndUrl(''); setStatusAndUrl('all'); setZoneAndUrl('all'); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          {panels.length === 0 ? 'No panels in this building yet.' : 'No panels match your filters.'}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const meta = PANEL_STATUS_META[p.status] ?? PANEL_STATUS_META.NORMAL;
            const isOnline = p.status !== 'OFFLINE';
            const accent = p.fire > 0 ? 'border-l-red-500' : p.fault > 0 ? 'border-l-amber-500' : 'border-l-green-500';
            return (
              <Card key={p.id} onClick={() => navigate(`/panels/${p.id}`)}
                className={cn('flex cursor-pointer flex-col gap-2 border-l-4 p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md', accent)}>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-green-500' : 'bg-gray-400')} />
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                </div>
                <div className="font-semibold">{p.panel_name || p.panel_code}</div>
                <div className="font-mono text-xs text-muted-foreground">{p.panel_code}</div>
                <div className="mt-2 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">{p.zoneCount}</strong> zones</span>
                  <span className={p.fire > 0 ? 'text-red-700' : ''}><strong className={p.fire > 0 ? 'text-red-600' : 'text-foreground'}>{p.fire}</strong> fire</span>
                  <span className={p.fault > 0 ? 'text-amber-700' : ''}><strong className={p.fault > 0 ? 'text-amber-600' : 'text-foreground'}>{p.fault}</strong> fault</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
