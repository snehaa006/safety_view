import { useMemo, useState } from 'react';
import ZoneTile from './ZoneTile';
import ZoneDetailModal from './ZoneDetailModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Zone } from '@/types';

const FILTERS = [
  { key: 'all', label: 'All Zones' },
  { key: 'alerts', label: 'Alerts Only' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function ZoneGrid({
  zones,
  title = 'Zone Monitoring',
  showFilters = true,
}: {
  zones: Zone[];
  title?: string;
  showFilters?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const filteredZones = useMemo(() => {
    if (filter === 'alerts') return zones.filter((z) => z.status !== 'NORMAL');
    return zones;
  }, [zones, filter]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">Tap a zone to view full sensor details</p>
        </div>
        {showFilters && (
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {filteredZones.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No zones match this filter.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {filteredZones.map((zone) => (
            <ZoneTile key={zone.id} zone={zone} onClick={() => setSelectedZone(zone)} />
          ))}
        </div>
      )}

      <ZoneDetailModal zone={selectedZone} onClose={() => setSelectedZone(null)} />
    </Card>
  );
}
