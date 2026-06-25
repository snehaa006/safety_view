import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Pencil, Save, X } from 'lucide-react';
import {
  fetchPanelById,
  fetchZonesByPanel,
  fetchZoneEvents,
  fetchActionLogs,
  performZoneAction,
  updateZoneName,
} from '@/services/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PaginationNav } from '@/components/ui/pagination-nav';
import { LoadingScreen } from '@/components/ui/spinner';
import { zoneStateMeta, PANEL_STATUS_META, formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { ActionLogEntry, ManualAction, Panel, Zone, ZoneEvent } from '@/types';

const PAGE_SIZE = 20;

const ACTION_LABEL: Record<ManualAction, string> = {
  TEST: 'Test',
  HOOTER_ON: 'Hooter On',
  HOOTER_OFF: 'Hooter Off',
  RESET: 'Reset',
};

function ZoneCard({
  zone, editMode, draftName, onDraftChange, busy, onAction,
}: {
  zone: Zone; editMode: boolean; draftName: string;
  onDraftChange: (v: string) => void; busy: string | null;
  onAction: (z: Zone, a: ManualAction) => void;
}) {
  const sm = zoneStateMeta(zone.current_state);
  return (
    <Card className={cn('flex flex-col gap-2 border-2 p-3', sm.tile)}>
      <div className="flex justify-end">
        <span className={cn('h-3 w-3 rounded-full shadow', sm.dot)} />
      </div>
      {editMode ? (
        <input
          value={draftName}
          onChange={(e) => onDraftChange(e.target.value)}
          className="rounded border border-current/20 bg-background/60 px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Zone name"
        />
      ) : (
        <div className="truncate text-sm font-semibold">{zone.zone_name}</div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{sm.label}</span>
        <span className="opacity-70">{zone.zone_type}</span>
      </div>
      {zone.current_reading != null && (
        <div className="text-xs opacity-70">Reading: <strong>{zone.current_reading}</strong></div>
      )}
      {!editMode && zone.available_actions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5 border-t border-current/20 pt-2">
          {zone.available_actions.map((a) => (
            <Button
              key={a} size="sm" variant="outline"
              className="h-7 bg-background/70 px-2 text-xs"
              disabled={busy === `${zone.id}:${a}`}
              onClick={() => onAction(zone, a)}
            >
              {busy === `${zone.id}:${a}` ? '…' : ACTION_LABEL[a]}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}

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
  const [eventsPage, setEventsPage] = useState(0);
  const [logsPage, setLogsPage] = useState(0);

  const [editMode, setEditMode] = useState(false);
  const [draftNames, setDraftNames] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [p, z, e, l] = await Promise.all([
      fetchPanelById(id),
      fetchZonesByPanel(id),
      fetchZoneEvents(id),
      fetchActionLogs(id),
    ]);
    setPanel(p); setZones(z); setEvents(e); setLogs(l);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await load(); }
      catch (err) { if (mounted) setError(err instanceof Error ? err.message : 'Failed to load panel'); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [load]);

  function enterEditMode() {
    const initial: Record<number, string> = {};
    for (const z of zones) initial[z.id] = z.zone_name;
    setDraftNames(initial);
    setEditMode(true);
  }

  function cancelEdit() { setEditMode(false); setDraftNames({}); }

  async function saveNames() {
    setSaving(true); setError('');
    try {
      const changed = zones.filter((z) => draftNames[z.id] !== z.zone_name);
      await Promise.all(changed.map((z) => updateZoneName(z.id, draftNames[z.id]?.trim() || z.zone_name)));
      await load();
      setEditMode(false); setDraftNames({});
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  async function runAction(zone: Zone, action: ManualAction) {
    setBusy(`${zone.id}:${action}`);
    try {
      await performZoneAction(zone.id, action);
      setLogs(await fetchActionLogs(id));
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed'); }
    finally { setBusy(null); }
  }

  if (loading) return <LoadingScreen text="Loading panel…" />;

  const meta = panel ? PANEL_STATUS_META[panel.status] ?? PANEL_STATUS_META.NORMAL : PANEL_STATUS_META.NORMAL;
  const isOnline = panel?.status !== 'OFFLINE';

  const digitalZones = zones.filter((z) => z.zone_number <= 4);
  const analogZones = zones.filter((z) => z.zone_number > 4);

  const lastEvent = events[0];

  const eventsTotal = events.length;
  const eventsPageCount = Math.ceil(eventsTotal / PAGE_SIZE) || 1;
  const pagedEvents = events.slice(eventsPage * PAGE_SIZE, (eventsPage + 1) * PAGE_SIZE);

  const logsTotal = logs.length;
  const logsPageCount = Math.ceil(logsTotal / PAGE_SIZE) || 1;
  const pagedLogs = logs.slice(logsPage * PAGE_SIZE, (logsPage + 1) * PAGE_SIZE);

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
          <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600')}>
            <span className={cn('h-2 w-2 rounded-full', isOnline ? 'bg-green-500' : 'bg-gray-400')} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {panel?.building_name && <span className="text-xs text-muted-foreground">{panel.building_name}</span>}
        </div>
      </Card>

      {error && <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-2 text-sm text-crit-text">{error}</div>}

      {/* Last alert banner */}
      {lastEvent && (
        <div className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm">
          <span className="font-semibold text-amber-900">Last Zone Event:</span>
          <span className="text-amber-800">
            <strong>{lastEvent.zone_name || `Zone ${lastEvent.zone_id}`}</strong>
            {' '}changed{' '}
            <span className="opacity-70">{lastEvent.previous_state}</span>
            {' → '}
            <strong>{lastEvent.new_state}</strong>
          </span>
          <span className="ml-auto text-xs text-amber-700">{formatDateTime(lastEvent.created_at)}</span>
        </div>
      )}

      {/* Zones header + edit toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Zones ({zones.length})</h3>
          <p className="text-sm text-muted-foreground">Digital zones 1–4 · Analog zones 5–20</p>
        </div>
        {!editMode ? (
          <Button variant="outline" size="sm" onClick={enterEditMode} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit Names
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={cancelEdit} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={saveNames} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save All'}
            </Button>
          </div>
        )}
      </div>

      {zones.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">No zones configured for this panel.</Card>
      ) : (
        <div className="space-y-6">
          {digitalZones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Digital Zones</h4>
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">{digitalZones.length} zone{digitalZones.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {digitalZones.map((z) => (
                  <ZoneCard key={z.id} zone={z} editMode={editMode}
                    draftName={editMode ? (draftNames[z.id] ?? z.zone_name) : z.zone_name}
                    onDraftChange={(v) => setDraftNames((prev) => ({ ...prev, [z.id]: v }))}
                    busy={busy} onAction={runAction}
                  />
                ))}
              </div>
            </div>
          )}
          {analogZones.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Analog Zones</h4>
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">{analogZones.length} zone{analogZones.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {analogZones.map((z) => (
                  <ZoneCard key={z.id} zone={z} editMode={editMode}
                    draftName={editMode ? (draftNames[z.id] ?? z.zone_name) : z.zone_name}
                    onDraftChange={(v) => setDraftNames((prev) => ({ ...prev, [z.id]: v }))}
                    busy={busy} onAction={runAction}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Card className="p-5">
        <div className="mb-4 flex gap-1.5 border-b border-border">
          {(['events', 'actions'] as const).map((t) => (
            <button
              key={t} onClick={() => setTab(t)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors',
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'events' ? `Zone Events (${eventsTotal})` : `Action Logs (${logsTotal})`}
            </button>
          ))}
        </div>

        {tab === 'events' ? (
          eventsTotal === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No state changes recorded.</div>
          ) : (
            <div className="space-y-3">
              <ul className="flex flex-col gap-2">
                {pagedEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                    <Badge variant="water">{e.zone_name}</Badge>
                    <span className="text-muted-foreground">{e.previous_state} → <strong className="text-foreground">{e.new_state}</strong></span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(e.created_at)}</span>
                  </li>
                ))}
              </ul>
              <PaginationNav
                page={eventsPage} totalPages={eventsPageCount}
                onPrev={() => setEventsPage((p) => p - 1)} onNext={() => setEventsPage((p) => p + 1)}
                showing={pagedEvents.length} total={eventsTotal}
              />
            </div>
          )
        ) : logsTotal === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No actions performed.</div>
        ) : (
          <div className="space-y-3">
            <ul className="flex flex-col gap-2">
              {pagedLogs.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
                  <Badge variant="secondary">{l.action}</Badge>
                  <span className="text-muted-foreground">{l.zone_name}</span>
                  <span className="text-muted-foreground">· by {l.username || `user ${l.user_id}`}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span>
                </li>
              ))}
            </ul>
            <PaginationNav
              page={logsPage} totalPages={logsPageCount}
              onPrev={() => setLogsPage((p) => p - 1)} onNext={() => setLogsPage((p) => p + 1)}
              showing={pagedLogs.length} total={logsTotal}
            />
          </div>
        )}
      </Card>
    </section>
  );
}
