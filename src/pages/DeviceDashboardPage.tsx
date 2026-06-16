import { useEffect, useState } from 'react';
import { NavLink, Outlet, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import {
  fetchDeviceById,
  fetchZonesByDevice,
  fetchEventsByDevice,
  summariseZones,
  type DeviceInfo,
} from '@/services/api';
import SummaryCards from '@/components/dashboard/SummaryCards';
import ZoneGrid from '@/components/dashboard/ZoneGrid';
import EventsLog from '@/components/dashboard/EventsLog';
import { WaterLevelChart, PressureChart } from '@/components/dashboard/ZoneCharts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SafetyEvent, Zone, ZoneSummary } from '@/types';

interface DeviceCtx {
  zones: Zone[];
  events: SafetyEvent[];
  summary: ZoneSummary;
  acknowledge: (id: number) => void;
}

export function useDeviceCtx() {
  return useOutletContext<DeviceCtx>();
}

const TABS = [
  { to: '', label: 'Overview', end: true },
  { to: 'fire', label: 'Fire Safety', end: false },
  { to: 'water', label: 'Water Systems', end: false },
  { to: 'events', label: 'Events Log', end: false },
];

export default function DeviceDashboardPage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const id = Number(deviceId);

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [events, setEvents] = useState<SafetyEvent[]>([]);
  const [summary, setSummary] = useState<ZoneSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const [dev, zonesData, eventsData] = await Promise.all([
          fetchDeviceById(id),
          fetchZonesByDevice(id),
          fetchEventsByDevice(id),
        ]);
        if (!mounted) return;
        setDevice(dev);
        setZones(zonesData);
        setEvents(eventsData);
        setSummary(summariseZones(zonesData));
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load device data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  function acknowledge(eventId: number) {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, is_acknowledged: true } : e)));
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading device data…</div>;
  if (error)
    return (
      <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>
    );

  const ctx: DeviceCtx = { zones, events, summary: summary!, acknowledge };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <button
          onClick={() => navigate('/devices')}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4" /> All Devices
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold">{device?.device_remarks || device?.device_uuid}</span>
          <span className="font-mono text-xs text-muted-foreground">{device?.device_uuid}</span>
          {device?.group_name && <Badge variant="water">{device.group_name}</Badge>}
        </div>
      </Card>

      <div className="flex gap-1.5 border-b border-border">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>

      <Outlet context={ctx} />
    </div>
  );
}

export function DeviceOverview() {
  const { zones, events, summary, acknowledge } = useDeviceCtx();
  return (
    <div className="space-y-5">
      <SummaryCards summary={summary} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WaterLevelChart zones={zones} />
        <PressureChart zones={zones} />
      </div>
      <EventsLog events={events.slice(0, 3)} onAcknowledge={acknowledge} />
      <ZoneGrid zones={zones} title="All Zones (16)" />
    </div>
  );
}

export function DeviceFire() {
  const { zones, summary } = useDeviceCtx();
  return (
    <div className="space-y-5">
      <SummaryCards summary={summary} />
      <ZoneGrid zones={zones} title="Fire Detection — Zones 1–16" />
    </div>
  );
}

export function DeviceWater() {
  const { zones } = useDeviceCtx();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WaterLevelChart zones={zones} />
        <PressureChart zones={zones} />
      </div>
      <ZoneGrid zones={zones} title="Water Systems — Zones (1-16)" />
    </div>
  );
}

export function DeviceEvents() {
  const { events, acknowledge } = useDeviceCtx();
  return <EventsLog events={events} onAcknowledge={acknowledge} />;
}
