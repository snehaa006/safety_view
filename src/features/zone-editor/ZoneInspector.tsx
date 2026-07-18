// ---------------------------------------------------------------------------
// Right-hand properties panel for the selected shape. Zone details are LIVE and
// read-only here (edit them in the building's Static/panel view); the mimic
// view only controls where the zone is drawn.
// ---------------------------------------------------------------------------

import { ArrowDownToLine, ArrowUpToLine, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Shape } from '@/graphics';
import type { Zone } from '@/types';
import { zoneColors } from './zoneStyle';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm">{value ?? '—'}</span>
    </div>
  );
}

export default function ZoneInspector({
  shape,
  zone,
  shapeCountForZone,
  onReassign,
  onDeleteShape,
  onBringToFront,
  onSendToBack,
}: {
  shape: Shape | null;
  zone: Zone | null;
  shapeCountForZone: number;
  onReassign: () => void;
  onDeleteShape: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  if (!shape) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Nothing selected</p>
        <p className="mt-1">Pick a tool and draw over the plan, or click a shape to see the zone it represents.</p>
      </div>
    );
  }

  const c = zoneColors(zone?.current_state);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c.fill, border: `1px solid ${c.stroke}` }} />
          <span className="text-sm font-semibold capitalize">{shape.type}</span>
          <span className="ml-auto text-xs text-muted-foreground">{zone ? `Zone ${zone.zone_number}` : 'Unlinked'}</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {zone ? (
          <>
            {shapeCountForZone > 1 && (
              <div className="rounded-md border border-water-border bg-water-bg px-3 py-2 text-xs text-water-text">
                This zone is drawn by {shapeCountForZone} shapes.
              </div>
            )}
            <div>
              <Row label="Zone" value={`Zone ${zone.zone_number}`} />
              <Row label="Name" value={zone.zone_name} />
              <Row label="Type" value={zone.zone_type} />
              <Row
                label="State"
                value={
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ background: c.stroke }}
                  >
                    {c.label}
                  </span>
                }
              />
              <Row label="Reading" value={zone.current_reading ?? '—'} />
            </div>
            <p className="text-xs text-muted-foreground">
              Zone status is live and read-only here. Edit zone details in the building’s panel view.
            </p>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            This shape isn’t linked to a zone yet.
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onReassign}>
            <Link2 className="h-4 w-4" /> {zone ? 'Change Zone' : 'Link Zone'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onBringToFront}>
              <ArrowUpToLine className="h-3.5 w-3.5" /> Front
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onSendToBack}>
              <ArrowDownToLine className="h-3.5 w-3.5" /> Back
            </Button>
          </div>
          <Button variant="destructive" size="sm" className="w-full justify-start gap-2" onClick={onDeleteShape}>
            <Trash2 className="h-4 w-4" /> Delete Shape
          </Button>
        </div>
      </div>
    </div>
  );
}
