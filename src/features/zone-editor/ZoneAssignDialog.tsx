// ---------------------------------------------------------------------------
// Pops up the moment a shape is drawn: create a brand-new zone, or assign the
// shape to an existing zone (so one zone can span several shapes). Cancelling
// removes the just-drawn shape.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ZoneState } from '@/types';
import { MAX_ZONES, ZONE_STATES, ZONE_TYPES, type EditorZone } from './types';
import { zoneColors } from './zoneStyle';

function zoneUid(): string {
  return `zone_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface ZoneAssignResult {
  create?: EditorZone;
  assignZoneId?: string;
}

export default function ZoneAssignDialog({
  open,
  zones,
  onCancel,
  onResolve,
}: {
  open: boolean;
  zones: EditorZone[];
  onCancel: () => void;
  onResolve: (result: ZoneAssignResult) => void;
}) {
  const usedNumbers = useMemo(() => new Set(zones.map((z) => z.number)), [zones]);
  const availableNumbers = useMemo(
    () => Array.from({ length: MAX_ZONES }, (_, i) => i + 1).filter((n) => !usedNumbers.has(n)),
    [usedNumbers],
  );
  const firstAvailable = availableNumbers[0] ?? 1;

  const [mode, setMode] = useState<'new' | 'existing'>(zones.length > 0 ? 'new' : 'new');
  const [number, setNumber] = useState<number>(firstAvailable);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(ZONE_TYPES[0]);
  const [state, setState] = useState<ZoneState>('HEALTHY');
  const [assignId, setAssignId] = useState<string>(zones[0]?.id ?? '');

  // Re-seed defaults whenever the dialog re-opens for a new shape.
  const [seededFor, setSeededFor] = useState<boolean>(false);
  if (open && !seededFor) {
    setNumber(firstAvailable);
    setName('');
    setType(ZONE_TYPES[0]);
    setState('HEALTHY');
    setMode('new');
    setAssignId(zones[0]?.id ?? '');
    setSeededFor(true);
  }
  if (!open && seededFor) setSeededFor(false);

  const canCreateNew = availableNumbers.length > 0;

  function submit() {
    if (mode === 'existing') {
      if (!assignId) return;
      onResolve({ assignZoneId: assignId });
      return;
    }
    onResolve({
      create: { id: zoneUid(), number, name: name.trim() || `Zone ${number}`, type, state, reading: null },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent onEscapeKeyDown={onCancel} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Assign a Zone to this shape</DialogTitle>
          <DialogDescription>
            Create a new zone or link this shape to one that already exists. The shape becomes the graphical
            representation of that zone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-md bg-secondary p-1">
          {(['new', 'existing'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={m === 'existing' && zones.length === 0}
              className={cn(
                'flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40',
                mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {m === 'new' ? 'New Zone' : `Existing Zone (${zones.length})`}
            </button>
          ))}
        </div>

        {mode === 'new' ? (
          !canCreateNew ? (
            <div className="rounded-md border border-warn-border bg-warn-bg px-4 py-3 text-sm text-warn-text">
              All {MAX_ZONES} zones are already defined. Switch to “Existing Zone” to reuse one.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Zone Number</Label>
                <Select value={String(number)} onValueChange={(v) => setNumber(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableNumbers.map((n) => (
                      <SelectItem key={n} value={String(n)}>Zone {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Initial State</Label>
                <Select value={state} onValueChange={(v) => setState(v as ZoneState)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZONE_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{zoneColors(s).label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="zone-name">Zone Name</Label>
                <Input id="zone-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. Platform Level ${number}`} autoFocus />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Zone Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-1.5">
            <Label>Choose an existing zone</Label>
            <Select value={assignId} onValueChange={setAssignId}>
              <SelectTrigger><SelectValue placeholder="Select a zone" /></SelectTrigger>
              <SelectContent>
                {zones
                  .slice()
                  .sort((a, b) => a.number - b.number)
                  .map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      Zone {z.number} — {z.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The shape will mirror the selected zone’s live state and update whenever that zone changes.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={submit} disabled={mode === 'new' ? !canCreateNew : !assignId}>
            {mode === 'new' ? 'Create & Assign' : 'Assign Zone'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
