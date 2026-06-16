import { useState } from 'react';
import { severityMeta, formatRelativeTime } from '@/utils/format';
import { acknowledgeEvent } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SafetyEvent } from '@/types';

export default function EventsLog({
  events,
  onAcknowledge,
}: {
  events: SafetyEvent[];
  onAcknowledge?: (id: number) => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleAcknowledge(id: number) {
    setBusyId(id);
    try {
      await acknowledgeEvent(id);
      onAcknowledge?.(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Recent Events</h3>
        <span className="text-xs text-muted-foreground">
          {events.filter((e) => !e.is_acknowledged).length} unacknowledged
        </span>
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">No events recorded.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => {
            const sev = severityMeta(event.severity);
            return (
              <li
                key={event.id}
                className="flex items-center gap-3 rounded-md border border-border p-3"
              >
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', sev.className)}>
                  {sev.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{event.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.zone_name} · {event.event_type.replace(/_/g, ' ')} ·{' '}
                    {formatRelativeTime(event.created_at)}
                  </div>
                </div>
                {event.is_acknowledged ? (
                  <span className="text-xs font-medium text-ok-text">Acknowledged</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledge(event.id)}
                    disabled={busyId === event.id}
                  >
                    {busyId === event.id ? 'Saving…' : 'Acknowledge'}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
