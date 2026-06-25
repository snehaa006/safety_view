import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/spinner';
import { fetchAllPanels } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PANEL_STATUS_META } from '@/utils/format';
import type { Panel, PanelStatus } from '@/types';

export default function PanelManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<PanelStatus | 'all'>((searchParams.get('status') as PanelStatus | 'all') || 'all');
  const [buildingFilter, setBuildingFilter] = useState(searchParams.get('building') || '');

  function updateUrl(patch: Record<string, string>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (v && v !== 'all') next.set(k, v); else next.delete(k);
      }
      return next;
    }, { replace: true });
  }

  useEffect(() => {
    fetchAllPanels()
      .then(setPanels)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const buildings = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of panels) {
      if (p.building_name && !seen.has(p.building_name)) seen.set(p.building_name, p.building_name);
    }
    return Array.from(seen.keys()).sort();
  }, [panels]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return panels.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (buildingFilter && p.building_name !== buildingFilter) return false;
      if (q && ![p.panel_code, p.panel_name, p.building_name].filter(Boolean).join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [panels, search, statusFilter, buildingFilter]);

  const hasFilters = search || statusFilter !== 'all' || buildingFilter;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Panel Management</h3>
          <p className="text-sm text-muted-foreground">{filtered.length} of {panels.length} panel{panels.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/panel-management/new')}><Plus className="h-4 w-4" /> Add Panel</Button>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search code, name, building…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); updateUrl({ q: e.target.value }); }}
            className="h-8 w-60 rounded-md border border-border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {search && (
            <button onClick={() => { setSearch(''); updateUrl({ q: '' }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as PanelStatus | 'all'); updateUrl({ status: e.target.value }); }}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All statuses</option>
          <option value="NORMAL">Normal</option>
          <option value="ALARM">Alarm</option>
          <option value="FAULT">Fault</option>
          <option value="OFFLINE">Offline</option>
        </select>
        {buildings.length > 1 && (
          <select
            value={buildingFilter}
            onChange={(e) => { setBuildingFilter(e.target.value); updateUrl({ building: e.target.value }); }}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All buildings</option>
            {buildings.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        {hasFilters && (
          <button onClick={() => { setSearch(''); setStatusFilter('all'); setBuildingFilter(''); updateUrl({ q: '', status: '', building: '' }); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      <Card>
        {loading ? <LoadingScreen /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const meta = PANEL_STATUS_META[p.status] ?? PANEL_STATUS_META.NORMAL;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-secondary/50" onClick={() => navigate(`/panel-management/${p.id}`)}>
                    <TableCell className="font-mono text-xs">{p.panel_code}</TableCell>
                    <TableCell className="font-semibold">{p.panel_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{p.building_name || '—'}</TableCell>
                    <TableCell><Badge variant={meta.variant}>{meta.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{p.zoneCount}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {panels.length === 0 ? 'No panels yet.' : 'No panels match your filters.'}
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
