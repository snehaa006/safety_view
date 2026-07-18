// ---------------------------------------------------------------------------
// Assign a drawn shape to one of the building's REAL zones. Zones come from the
// operational model (panels → zones); this dialog only links a shape to one of
// them. A zone may be linked by more than one shape (e.g. a zone spanning
// several areas of a plan), so already-placed zones are marked but still
// selectable.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ZoneWithContext } from '@/services/api';
import { zoneColors } from './zoneStyle';

export default function ZoneAssignDialog({
  open,
  zones,
  placedZoneIds,
  currentZoneId,
  onCancel,
  onAssign,
}: {
  open: boolean;
  zones: ZoneWithContext[];
  placedZoneIds: Set<number>;
  currentZoneId?: number | null;
  onCancel: () => void;
  onAssign: (zoneId: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(currentZoneId ?? null);
  const [seeded, setSeeded] = useState(false);
  if (open && !seeded) {
    setSelected(currentZoneId ?? null);
    setSeeded(true);
  }
  if (!open && seeded) setSeeded(false);

  const groups = useMemo(() => {
    const byPanel = new Map<string, ZoneWithContext[]>();
    for (const z of zones) {
      const key = z.panel_name || z.panel_code;
      const arr = byPanel.get(key) ?? [];
      arr.push(z);
      byPanel.set(key, arr);
    }
    return Array.from(byPanel.entries());
  }, [zones]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent onEscapeKeyDown={onCancel} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Link this shape to a zone</DialogTitle>
          <DialogDescription>
            Pick the zone this shape represents. It will show that zone’s live status and update automatically.
          </DialogDescription>
        </DialogHeader>

        {zones.length === 0 ? (
          <div className="rounded-md border border-warn-border bg-warn-bg px-4 py-3 text-sm text-warn-text">
            This building has no zones yet. Add panels and zones first, then draw the mimic view over them.
          </div>
        ) : (
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {groups.map(([panel, panelZones]) => (
              <div key={panel} className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{panel}</div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {panelZones.map((z) => {
                    const c = zoneColors(z.current_state);
                    const isSel = selected === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setSelected(z.id)}
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                          isSel ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-secondary',
                        )}
                      >
                        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: c.fill, border: `1px solid ${c.stroke}` }} />
                        <span className="min-w-0 flex-1">
                          <span className="font-semibold">Zone {z.zone_number}</span>
                          <span className="ml-1 truncate text-muted-foreground">{z.zone_name}</span>
                        </span>
                        {placedZoneIds.has(z.id) && z.id !== currentZoneId && (
                          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">placed</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => selected != null && onAssign(selected)} disabled={selected == null}>
            Link Zone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
