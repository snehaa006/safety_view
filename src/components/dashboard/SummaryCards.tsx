import { LayoutGrid, Flame, AlertTriangle, Droplet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ZoneSummary } from '@/types';

interface CardDef {
  label: string;
  value: string | number;
  sub: string;
  icon: typeof LayoutGrid;
  iconClass: string;
}

export default function SummaryCards({ summary }: { summary: ZoneSummary }) {
  const cards: CardDef[] = [
    {
      label: 'Total Zones',
      value: summary.totalZones,
      sub: 'Monitored across the device',
      icon: LayoutGrid,
      iconClass: 'bg-water-bg text-water-strong',
    },
    {
      label: 'Active Fire Alarms',
      value: summary.fireAlarms,
      sub: summary.fireAlarms > 0 ? 'Requires immediate attention' : 'All clear',
      icon: Flame,
      iconClass: summary.fireAlarms > 0 ? 'bg-crit-bg text-crit-strong' : 'bg-ok-bg text-ok-strong',
    },
    {
      label: 'Sensor Faults',
      value: summary.faults,
      sub: summary.faults > 0 ? 'Check device connectivity' : 'No faults reported',
      icon: AlertTriangle,
      iconClass: summary.faults > 0 ? 'bg-warn-bg text-warn-strong' : 'bg-ok-bg text-ok-strong',
    },
    {
      label: 'Avg. Water Level',
      value: `${summary.avgWaterLevel}%`,
      sub: `Avg. pressure ${summary.avgPressure} bar`,
      icon: Droplet,
      iconClass: 'bg-water-bg text-water-strong',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="flex items-start gap-4 p-5">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-md', card.iconClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-sm font-medium text-foreground">{card.label}</div>
              <div className="text-xs text-muted-foreground">{card.sub}</div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
