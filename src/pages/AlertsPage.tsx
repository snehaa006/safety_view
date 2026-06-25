import { useEffect, useState } from 'react';
import { fetchAlerts } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { PaginationNav } from '@/components/ui/pagination-nav';
import { LoadingScreen } from '@/components/ui/spinner';
import { severityMeta, formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types';

const PAGE_SIZE = 20;

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      try { setAlerts(await fetchAlerts(user)); }
      catch (err) { setError(err instanceof Error ? err.message : 'Failed to load alerts'); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const totalPages = Math.ceil(alerts.length / PAGE_SIZE) || 1;
  const paged = alerts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold">Alerts</h3>
        <p className="text-sm text-muted-foreground">Notifications raised from zone events in your scope</p>
      </div>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <Card className="p-5">
        {loading ? <LoadingScreen /> : alerts.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No alerts.</div>
        ) : (
          <div className="space-y-3">
            <ul className="flex flex-col gap-2">
              {paged.map((a) => {
                const sev = severityMeta(a.severity);
                return (
                  <li key={a.id} className="flex flex-col gap-1.5 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:gap-3">
                    <span className={cn('shrink-0 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold', sev.className)}>{sev.label}</span>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-sm font-medium">{a.type}</div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Building: <strong className="text-foreground">{a.building_name || `#${a.building_id}`}</strong></span>
                        {a.panel_name && <span>Panel: <strong className="text-foreground">{a.panel_name}</strong></span>}
                        <span>Zone: <strong className="text-foreground">{a.zone_name || `#${a.zone_id}`}</strong></span>
                        {a.location && <span>Location: {a.location}</span>}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
                  </li>
                );
              })}
            </ul>
            <PaginationNav page={page} totalPages={totalPages}
              onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)}
              showing={paged.length} total={alerts.length}
            />
          </div>
        )}
      </Card>
    </section>
  );
}
