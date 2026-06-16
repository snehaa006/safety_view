import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { zoneStatusMeta, formatRelativeTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Zone, ZoneStatus } from '@/types';

const STATUS_BADGE: Record<ZoneStatus, 'ok' | 'warn' | 'destructive' | 'off'> = {
  NORMAL: 'ok',
  FAULT: 'warn',
  ALARM: 'destructive',
  OFFLINE: 'off',
};

function Flag({ active, activeLabel, inactiveLabel, tone }: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={cn('h-2 w-2 rounded-full', active ? tone : 'bg-ok-strong')} />
      {active ? activeLabel : inactiveLabel}
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

export default function ZoneDetailModal({ zone, onClose }: { zone: Zone | null; onClose: () => void }) {
  if (!zone) return null;
  const meta = zoneStatusMeta(zone.status);
  const { sensors } = zone;

  return (
    <Dialog open={!!zone} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Zone {zone.zone_number} · {zone.floor_name}
          </div>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{zone.zone_name}</DialogTitle>
            <Badge variant={STATUS_BADGE[zone.status]}>{meta.label}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Water System</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Water Level</div>
                <div className="text-lg font-bold">{sensors.waterLevel}%</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-water-strong" style={{ width: `${sensors.waterLevel}%` }} />
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Line Pressure</div>
                <div className="text-lg font-bold">{sensors.pressure} bar</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-accent" style={{ width: `${(sensors.pressure / 10) * 100}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Fire Detection</h3>
            <div className="flex flex-col gap-2">
              <Flag active={sensors.fire} activeLabel="Fire detected" inactiveLabel="No fire detected" tone="bg-crit-strong" />
              <Flag active={sensors.fault} activeLabel="Sensor fault reported" inactiveLabel="No fault" tone="bg-warn-strong" />
              <Flag
                active={sensors.communicationStatus === 'OFFLINE'}
                activeLabel="Device offline"
                inactiveLabel="Communication online"
                tone="bg-off-text"
              />
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Environment &amp; Power</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <DataPoint label="Temperature" value={`${sensors.temperature}°C`} />
              <DataPoint label="Smoke Index" value={sensors.smokeLevel} />
              <DataPoint label="Battery Level" value={`${sensors.batteryLevel}%`} />
              <DataPoint label="Power Status" value={sensors.powerStatus} />
              <DataPoint label="Communication" value={sensors.communicationStatus} />
              <DataPoint label="Last Updated" value={formatRelativeTime(zone.lastUpdated)} />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
