// ---------------------------------------------------------------------------
// Right-hand properties panel for the selected shape's zone. Editing here
// mutates the zone record, which every shape referencing that zone reflects
// immediately (dynamic display requirement).
// ---------------------------------------------------------------------------

import { ArrowDownToLine, ArrowUpToLine, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ZoneState } from '@/types';
import type { Shape } from '@/graphics';
import { ZONE_STATES, ZONE_TYPES, type EditorZone } from './types';
import { zoneColors } from './zoneStyle';

export default function ZoneInspector({
  shape,
  zone,
  shapeCountForZone,
  onZoneChange,
  onReassign,
  onDeleteShape,
  onBringToFront,
  onSendToBack,
}: {
  shape: Shape | null;
  zone: EditorZone | null;
  shapeCountForZone: number;
  onZoneChange: (patch: Partial<EditorZone>) => void;
  onReassign: () => void;
  onDeleteShape: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  if (!shape) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Nothing selected</p>
        <p className="mt-1">Pick a tool and draw on the canvas, or click a shape to edit its zone.</p>
      </div>
    );
  }

  const c = zoneColors(zone?.state);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c.fill, border: `1px solid ${c.stroke}` }} />
          <span className="text-sm font-semibold capitalize">{shape.type}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {zone ? `Zone ${zone.number}` : 'Unassigned'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {zone ? (
          <>
            {shapeCountForZone > 1 && (
              <div className="rounded-md border border-water-border bg-water-bg px-3 py-2 text-xs text-water-text">
                This zone is drawn by {shapeCountForZone} shapes. Edits apply to all of them.
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="insp-name">Zone Name</Label>
              <Input id="insp-name" value={zone.name} onChange={(e) => onZoneChange({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={zone.type} onValueChange={(v) => onZoneChange({ type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  {!ZONE_TYPES.includes(zone.type as (typeof ZONE_TYPES)[number]) && (
                    <SelectItem value={zone.type}>{zone.type}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={zone.state} onValueChange={(v) => onZoneChange({ state: v as ZoneState })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ZONE_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{zoneColors(s).label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="insp-reading">Reading</Label>
              <Input
                id="insp-reading"
                type="number"
                value={zone.reading ?? ''}
                onChange={(e) => onZoneChange({ reading: e.target.value === '' ? null : Number(e.target.value) })}
                placeholder="—"
              />
            </div>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            This shape isn’t linked to a zone yet.
          </div>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onReassign}>
            <Repeat className="h-4 w-4" /> {zone ? 'Change Zone' : 'Assign Zone'}
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
