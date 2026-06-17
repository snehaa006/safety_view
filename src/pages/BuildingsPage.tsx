import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle2, WifiOff, Activity } from 'lucide-react';
import { fetchBuildings } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Building } from '@/types';

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Activity; tone: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

export default function BuildingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    return () => {
      mounted = false;
    };
  }, [user]);

  const scope = useMemo(
    () =>
      buildings.reduce(
        (acc, b) => ({
          healthy: acc.healthy + b.healthy,
          offline: acc.offline + b.offline,
          connected: acc.connected + b.connected,
        }),
        { healthy: 0, offline: 0, connected: 0 }
      ),
    [buildings]
  );

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading buildings…</div>;
  if (error)
    return <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>;

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Healthy Devices" value={scope.healthy} icon={CheckCircle2} tone="bg-ok-bg text-ok-strong" />
        <MetricCard label="Offline Devices" value={scope.offline} icon={WifiOff} tone="bg-crit-bg text-crit-strong" />
        <MetricCard label="Connected Devices" value={scope.connected} icon={Activity} tone="bg-water-bg text-water-strong" />
      </div>

      <div>
        <h3 className="text-lg font-semibold">Buildings in your scope</h3>
        <p className="text-sm text-muted-foreground">Open a building to see its devices and zones</p>
      </div>

      {buildings.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          No buildings are visible to your account yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {buildings.map((b) => {
            const accent = b.offline > 0 ? 'border-l-crit-strong' : 'border-l-ok-strong';
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
                  <span className="text-xs text-muted-foreground">{b.location_name || '—'}</span>
                </div>
                <div className="font-semibold">{b.building_name}</div>
                {b.address && <div className="truncate text-xs text-muted-foreground">{b.address}</div>}
                <div className="mt-2 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">{b.deviceCount}</strong> devices</span>
                  <span className="text-ok-text"><strong className="text-ok-strong">{b.healthy}</strong> healthy</span>
                  <span className={b.offline > 0 ? 'text-crit-text' : ''}>
                    <strong className={b.offline > 0 ? 'text-crit-strong' : 'text-foreground'}>{b.offline}</strong> offline
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
