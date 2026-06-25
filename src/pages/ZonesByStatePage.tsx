import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Flame, LayoutGrid, List, Search, X } from 'lucide-react';
import { fetchZonesByState } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZONE_STATE_META } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { ZoneWithContext } from '@/services/api';
import { LoadingScreen } from '@/components/ui/spinner';

type State = 'FIRE' | 'FAULT';

interface GroupedPanel {
  panelId: number;
  panelCode: string;
  panelName: string | null;
  zones: ZoneWithContext[];
}

interface GroupedBuilding {
  buildingId: number;
  buildingName: string;
  panels: GroupedPanel[];
}

export default function ZonesByStatePage() {
  const { pathname } = useLocation();
  const zoneState = (pathname.includes('fault') ? 'FAULT' : 'FIRE') as State;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [zones, setZones] = useState<ZoneWithContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [zoneTypeFilter, setZoneTypeFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setSearch('');
    setBuildingFilter('');
    setZoneTypeFilter('');
    (async () => {
      try {
        const data = await fetchZonesByState(zoneState, user);
        if (mounted) setZones(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load zones');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [zoneState, user]);

  // Derive unique buildings and zone types for filter dropdowns
  const buildingOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const z of zones) {
      if (!seen.has(z.building_id)) seen.set(z.building_id, z.building_name);
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [zones]);

  const zoneTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const z of zones) if (z.zone_type) seen.add(z.zone_type);
    return Array.from(seen).sort();
  }, [zones]);

  const filteredZones = useMemo(() => {
    const q = search.toLowerCase().trim();
    return zones.filter((z) => {
      if (buildingFilter && String(z.building_id) !== buildingFilter) return false;
      if (zoneTypeFilter && z.zone_type !== zoneTypeFilter) return false;
      if (q) {
        const haystack = [z.zone_name, z.zone_type, z.building_name, z.panel_name, z.panel_code].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [zones, search, buildingFilter, zoneTypeFilter]);

  const grouped = useMemo((): GroupedBuilding[] => {
    const buildingMap = new Map<number, GroupedBuilding>();
    for (const z of filteredZones) {
      if (!buildingMap.has(z.building_id)) {
        buildingMap.set(z.building_id, { buildingId: z.building_id, buildingName: z.building_name, panels: [] });
      }
      const building = buildingMap.get(z.building_id)!;
      let panel = building.panels.find((p) => p.panelId === z.panel_id);
      if (!panel) {
        panel = { panelId: z.panel_id, panelCode: z.panel_code, panelName: z.panel_name, zones: [] };
        building.panels.push(panel);
      }
      panel.zones.push(z);
    }
    return Array.from(buildingMap.values()).sort((a, b) => a.buildingName.localeCompare(b.buildingName));
  }, [filteredZones]);

  const isFire = zoneState === 'FIRE';
  const Icon = isFire ? Flame : AlertTriangle;
  const accentColor = isFire ? 'border-l-crit-strong' : 'border-l-warn-strong';
  const stateMeta = ZONE_STATE_META[zoneState];
  const hasFilters = search || buildingFilter || zoneTypeFilter;

  function clearFilters() {
    setSearch('');
    setBuildingFilter('');
    setZoneTypeFilter('');
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
          <div className="flex items-center gap-2">
            <Icon className={cn('h-5 w-5', isFire ? 'text-crit-strong' : 'text-warn-strong')} />
            <div>
              <h3 className="text-lg font-semibold">{isFire ? 'Fire Zones' : 'Fault Zones'}</h3>
              <p className="text-sm text-muted-foreground">
                {filteredZones.length} of {zones.length} zone{zones.length !== 1 ? 's' : ''}
              </p>
            </div>
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
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by zone name, type…"
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

        {/* Building filter */}
        {buildingOptions.length > 1 && (
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All buildings</option>
            {buildingOptions.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
          </select>
        )}

        {/* Zone type filter */}
        {zoneTypeOptions.length > 1 && (
          <select
            value={zoneTypeFilter}
            onChange={(e) => setZoneTypeFilter(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All zone types</option>
            {zoneTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      {filteredZones.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          {zones.length === 0
            ? `No ${isFire ? 'fire' : 'fault'} zones found.`
            : 'No zones match your filters.'}
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map((building) => (
            <div key={building.buildingId} className="space-y-4">
              <div
                className="flex cursor-pointer items-center gap-2 hover:opacity-80"
                onClick={() => navigate(`/buildings/${building.buildingId}`)}
              >
                <h4 className="font-bold text-foreground">{building.buildingName}</h4>
                <span className="text-xs text-muted-foreground">
                  ({building.panels.reduce((s, p) => s + p.zones.length, 0)} zone{building.panels.reduce((s, p) => s + p.zones.length, 0) !== 1 ? 's' : ''})
                </span>
              </div>

              <div className="space-y-4 pl-4">
                {building.panels.map((panel) => (
                  <div key={panel.panelId} className="space-y-2">
                    <div
                      className="flex cursor-pointer items-center gap-2 hover:opacity-80"
                      onClick={() => navigate(`/panels/${panel.panelId}`)}
                    >
                      <span className="text-sm font-semibold text-muted-foreground">
                        {panel.panelName || panel.panelCode}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{panel.panelCode}</span>
                      <span className="text-xs text-muted-foreground">
                        · {panel.zones.length} zone{panel.zones.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {panel.zones.map((z) => (
                          <Card key={z.id} className={cn('flex flex-col gap-1.5 border-l-4 p-3', accentColor)}>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs text-muted-foreground">Zone {z.zone_number}</span>
                              <Badge className={stateMeta.badge}>{zoneState}</Badge>
                            </div>
                            <div className="text-sm font-semibold">{z.zone_name}</div>
                            <div className="text-xs text-muted-foreground">{z.zone_type}</div>
                            {z.current_reading != null && (
                              <div className="text-xs text-muted-foreground">Reading: {z.current_reading}</div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {panel.zones.map((z) => (
                          <Card key={z.id} className={cn('flex items-center gap-4 border-l-4 px-4 py-2.5', accentColor)}>
                            <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">Zone {z.zone_number}</span>
                            <span className="min-w-0 flex-1 text-sm font-semibold">{z.zone_name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{z.zone_type}</span>
                            {z.current_reading != null && (
                              <span className="shrink-0 text-xs text-muted-foreground">{z.current_reading}</span>
                            )}
                            <Badge className={stateMeta.badge}>{zoneState}</Badge>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
