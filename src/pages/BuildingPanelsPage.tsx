import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Cpu } from 'lucide-react';
import { fetchBuildingById, fetchPanelsByBuilding, locationLabel } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PANEL_STATUS_META } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Building, Panel } from '@/types';

export default function BuildingPanelsPage() {
  const { buildingId } = useParams();
  const id = Number(buildingId);
  const navigate = useNavigate();
  const [building, setBuilding] = useState<Building | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [b, p] = await Promise.all([fetchBuildingById(id), fetchPanelsByBuilding(id)]);
        if (!mounted) return;
        setBuilding(b);
        setPanels(p);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load panels');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
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

      <div>
        <h3 className="text-lg font-semibold">Panels</h3>
        <p className="text-sm text-muted-foreground">Open a panel to view its 20 zones</p>
      </div>

      {panels.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">No panels in this building yet.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {panels.map((p) => {
            const meta = PANEL_STATUS_META[p.status] ?? PANEL_STATUS_META.NORMAL;
            const accent = p.fire > 0 ? 'border-l-crit-strong' : p.fault > 0 ? 'border-l-warn-strong' : 'border-l-ok-strong';
            return (
              <Card key={p.id} onClick={() => navigate(`/panels/${p.id}`)} className={cn('flex cursor-pointer flex-col gap-2 border-l-4 p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md', accent)}>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary"><Cpu className="h-5 w-5" /></div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <div className="font-semibold">{p.panel_name || p.panel_code}</div>
                <div className="font-mono text-xs text-muted-foreground">{p.panel_code}</div>
                <div className="mt-2 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">{p.zoneCount}</strong> zones</span>
                  <span className={p.fire > 0 ? 'text-crit-text' : ''}><strong className={p.fire > 0 ? 'text-crit-strong' : 'text-foreground'}>{p.fire}</strong> fire</span>
                  <span className={p.fault > 0 ? 'text-warn-text' : ''}><strong className={p.fault > 0 ? 'text-warn-strong' : 'text-foreground'}>{p.fault}</strong> fault</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
