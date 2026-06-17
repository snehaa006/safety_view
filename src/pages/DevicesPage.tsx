import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server } from 'lucide-react';
import { fetchDevices } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/lib/roles';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Device } from '@/types';

export default function DevicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminUser(user);

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchDevices(user);
        if (mounted) setDevices(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load devices');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading devices…</div>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-crit-border bg-crit-bg px-4 py-3 text-sm text-crit-text">
        {error}
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
        {isAdmin
          ? 'No devices yet. Add one from Device Management.'
          : 'No devices are available for your account yet. Please contact your administrator.'}
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">{isAdmin ? 'All Devices' : 'Your Devices'}</h3>
        <p className="text-sm text-muted-foreground">
          Tap a device to open its dashboard and view all 16 zones
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {devices.map((d) => {
          const fire = d.summary?.fireAlarms ?? 0;
          const fault = d.summary?.faults ?? 0;
          const accent = fire > 0 ? 'border-l-crit-strong' : fault > 0 ? 'border-l-warn-strong' : 'border-l-ok-strong';
          return (
            <Card
              key={d.id}
              onClick={() => navigate(`/devices/${d.id}`)}
              className={cn(
                'flex cursor-pointer flex-col gap-2 border-l-4 p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md',
                accent
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-primary">
                  <Server className="h-5 w-5" />
                </div>
                <Badge variant={d.status === 'ASSIGNED' ? 'ok' : 'off'}>
                  {d.status === 'ASSIGNED' ? 'Assigned' : 'Not assigned'}
                </Badge>
              </div>
              <div className="font-semibold">{d.device_remarks || d.device_uuid}</div>
              <div className="font-mono text-xs text-muted-foreground">{d.device_uuid}</div>
              {d.group_name && <div className="text-sm text-muted-foreground">{d.group_name}</div>}
              <div className="mt-2 flex gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">{d.summary?.totalZones ?? 0}</strong> zones
                </span>
                <span className={cn(fire > 0 && 'text-crit-text')}>
                  <strong className={cn(fire > 0 && 'text-crit-strong')}>{fire}</strong> fire
                </span>
                <span className={cn(fault > 0 && 'text-warn-text')}>
                  <strong className={cn(fault > 0 && 'text-warn-strong')}>{fault}</strong> fault
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
