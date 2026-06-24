import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, LayoutGrid, List } from 'lucide-react';
import { fetchBuildings, locationLabel } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Building } from '@/types';

export default function AllBuildingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading buildings…</div>;
  if (error) return <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>;

  return (
    <section className="space-y-5">
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
            <p className="text-sm text-muted-foreground">{buildings.length} building{buildings.length !== 1 ? 's' : ''} in your scope</p>
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

      {buildings.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          No buildings are assigned to your account yet.
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {buildings.map((b) => {
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
          {buildings.map((b) => {
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
