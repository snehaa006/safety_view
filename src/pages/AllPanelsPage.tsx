import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Cpu, LayoutGrid, List } from 'lucide-react';
import { fetchPanelsForUser } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PANEL_STATUS_META } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Panel } from '@/types';

export default function AllPanelsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Group panels by building
  const grouped = useMemo(() => {
    const map = new Map<string, { buildingId: number; buildingName: string; panels: Panel[] }>();
    for (const p of panels) {
      const key = String(p.building_id);
      if (!map.has(key)) {
        map.set(key, { buildingId: p.building_id, buildingName: p.building_name ?? 'Unknown Building', panels: [] });
      }
      map.get(key)!.panels.push(p);
    }
    return Array.from(map.values()).sort((a, b) => a.buildingName.localeCompare(b.buildingName));
  }, [panels]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading panels…</div>;
  if (error) return <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>;

  return (
    <section className="space-y-6">
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
            <p className="text-sm text-muted-foreground">{panels.length} panel{panels.length !== 1 ? 's' : ''} across {grouped.length} building{grouped.length !== 1 ? 's' : ''}</p>
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

      {panels.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">No panels found in your scope.</Card>
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
