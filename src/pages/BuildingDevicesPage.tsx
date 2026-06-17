import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Server } from 'lucide-react';
import { fetchBuildingById, fetchDevices, type DeviceInfo } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Building, Device } from '@/types';

export default function BuildingDevicesPage() {
  const { buildingId } = useParams();
  const id = Number(buildingId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [building, setBuilding] = useState<Building | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [b, d] = await Promise.all([fetchBuildingById(id), fetchDevices(user, id)]);
        if (!mounted) return;
        setBuilding(b);
        setDevices(d);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load building');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id, user]);

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (error)
    return <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">{error}</div>;

  return (
    <section className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <button
          onClick={() => navigate('/buildings')}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-secondary"
        >
          <ChevronLeft className="h-4 w-4" /> All Buildings
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold">{building?.building_name}</span>
          {building?.location_name && <Badge variant="water">{building.location_name}</Badge>}
          {building?.address && <span className="text-xs text-muted-foreground">{building.address}</span>}
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-semibold">Devices in this building</h3>
        <p className="text-sm text-muted-foreground">Open a device to view its 16 zones</p>
      </div>

      {devices.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          No devices assigned to this building yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {devices.map((d) => {
            const fire = d.summary?.fireAlarms ?? 0;
            const fault = d.summary?.faults ?? 0;
            const accent = fire > 0 ? 'border-l-crit-strong' : fault > 0 ? 'border-l-warn-strong' : 'border-l-ok-strong';
            return (
              <Card
                key={d.id}
                onClick={() => navigate(`/devices/${d.id}`)}
                className={cn('flex cursor-pointer flex-col gap-2 border-l-4 p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md', accent)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
                    <Server className="h-5 w-5" />
                  </div>
                  <Badge variant={d.health_status === 'OFFLINE' ? 'off' : d.health_status === 'FAULT' ? 'destructive' : 'ok'}>
                    {d.health_status || 'HEALTHY'}
                  </Badge>
                </div>
                <div className="font-semibold">{d.device_remarks || d.device_uuid}</div>
                <div className="font-mono text-xs text-muted-foreground">{d.device_uuid}</div>
                <div className="mt-2 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">{d.summary?.totalZones ?? 0}</strong> zones</span>
                  <span className={fire > 0 ? 'text-crit-text' : ''}><strong className={fire > 0 ? 'text-crit-strong' : 'text-foreground'}>{fire}</strong> fire</span>
                  <span className={fault > 0 ? 'text-warn-text' : ''}><strong className={fault > 0 ? 'text-warn-strong' : 'text-foreground'}>{fault}</strong> fault</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
