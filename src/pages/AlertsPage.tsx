import { useEffect, useState } from 'react';
import { fetchAlerts } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { severityMeta, formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types';

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setAlerts(await fetchAlerts(user));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load alerts');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Alerts</h3>
        <p className="text-sm text-muted-foreground">Notifications raised from zone events in your scope</p>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <Card className="p-5">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No alerts.</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((a) => {
              const sev = severityMeta(a.severity);
              return (
                <li key={a.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', sev.className)}>{sev.label}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{a.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.building_name || `Building ${a.building_id}`} · {a.zone_name || `Zone ${a.zone_id}`}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
