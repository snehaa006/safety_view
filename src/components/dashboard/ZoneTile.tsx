import { Droplet } from 'lucide-react';
import { zoneStatusMeta } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Zone } from '@/types';

export default function ZoneTile({ zone, onClick }: { zone: Zone; onClick: () => void }) {
  const meta = zoneStatusMeta(zone.status);
  const { sensors } = zone;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-md border p-3 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md',
        meta.tile
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">{zone.zone_number}</span>
        <span className={cn('h-2.5 w-2.5 rounded-full', meta.dot)} />
      </div>
      <div className="truncate text-sm font-semibold">{zone.zone_name}</div>
      <div className="text-xs font-medium">{meta.label}</div>
      <div className="mt-1 flex items-center justify-between text-xs opacity-90">
        <span className="flex items-center gap-1">
          <Droplet className="h-3 w-3" />
          {sensors.waterLevel}%
        </span>
        <span>{sensors.pressure} bar</span>
      </div>
    </button>
  );
}
