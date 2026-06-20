import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  fetchPanelById,
  fetchZonesByPanel,
  fetchZoneEvents,
  fetchActionLogs,
  performZoneAction,
} from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { zoneStateMeta, PANEL_STATUS_META, formatRelativeTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { ActionLogEntry, ManualAction, Panel, Zone, ZoneEvent } from '@/types';

const ACTION_LABEL: Record<ManualAction, string> = {
  TEST: 'Test',
  HOOTER_ON: 'Hooter On',
  HOOTER_OFF: 'Hooter Off',
  RESET: 'Reset',
};

export default function PanelZonesPage() {
  const { panelId } = useParams();
  const id = Number(panelId);
  const navigate = useNavigate();

  const [panel, setPanel] = useState<Panel | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [events, setEvents] = useState<ZoneEvent[]>([]);
  const [logs, setLogs] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<'events' | 'actions'>('events');

  const load = useCallback(async () => {
    const [p, z, e, l] = await Promise.all([
      fetchPanelById(id),
      fetchZonesByPanel(id),
      fetchZoneEvents(id),
      fetchActionLogs(id),
    ]);
    setPanel(p);
    setZones(z);
    setEvents(e);
    setLogs(l);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load panel');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [load]);

  async function runAction(zone: Zone, action: ManualAction) {
    setBusy(`${zone.id}:${action}`);
    try {
      await performZoneAction(zone.id, action);
      setLogs(await fetchActionLogs(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading panel…</div>;

  const meta = panel ? PANEL_STATUS_META[panel.status] ?? PANEL_STATUS_META.NORMAL : PANEL_STATUS_META.NORMAL;

  return (
    <section className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <button
          onClick={() => panel && navigate(`/buildings/${panel.building_id}`)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4" /> Panels
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold">{panel?.panel_name || panel?.panel_code}</span>
          <span className="font-mono text-xs text-muted-foreground">{panel?.panel_code}</span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {panel?.building_name && <span className="text-xs text-muted-foreground">{panel.building_name}</span>}
        </div>
      </Card>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      <div>
        <h3 className="text-lg font-semibold">Zones ({zones.length})</h3>
        <p className="text-sm text-muted-foreground">Digital 1–4 · Analog 5–20 — use the controls available on each zone</p>
      </div>

      {zones.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">No zones configured for this panel.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {zones.map((z) => {
            const sm = zoneStateMeta(z.current_state);
            return (
              <Card key={z.id} className={cn('flex flex-col gap-2 border p-3', sm.tile)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Zone {z.zone_number}</span>
                  <span className={cn('h-2.5 w-2.5 rounded-full', sm.dot)} />
                </div>
                <div className="truncate text-sm font-semibold">{z.zone_name}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{sm.label}</span>
                  <span className="opacity-80">{z.zone_type}</span>
                </div>
                {z.current_reading != null && (
                  <div className="text-xs opacity-80">Reading: <strong>{z.current_reading}</strong></div>
                )}
                {z.available_actions.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5 border-t border-current/10 pt-2">
                    {z.available_actions.map((a) => (
                      <Button
                        key={a}
                        size="sm"
                        variant="outline"
                        className="h-7 bg-background/70 px-2 text-xs"
                        disabled={busy === `${z.id}:${a}`}
                        onClick={() => runAction(z, a)}
                      >
                        {busy === `${z.id}:${a}` ? '…' : ACTION_LABEL[a]}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <div className="mb-4 flex gap-1.5 border-b border-border">
          {(['events', 'actions'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors',
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'events' ? 'Zone Events' : 'Action Logs'}
            </button>
          ))}
        </div>

        {tab === 'events' ? (
          events.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No state changes recorded.</div>
          ) : (
            <ul className="flex flex-col gap-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Badge variant="water">{e.zone_name}</Badge>
                  <span className="text-muted-foreground">{e.previous_state} → <strong className="text-foreground">{e.new_state}</strong></span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(e.created_at)}</span>
                </li>
              ))}
            </ul>
          )
        ) : logs.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No actions performed.</div>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                <Badge variant="secondary">{l.action}</Badge>
                <span className="text-muted-foreground">{l.zone_name}</span>
                <span className="text-muted-foreground">· by {l.username || `user ${l.user_id}`}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatRelativeTime(l.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
