// ---------------------------------------------------------------------------
// Mimic-view domain model. A panel's mimic view is a graphical second view of a
// single panel: a background floor plan plus shapes drawn with the generic
// @/graphics engine. Every shape references a REAL zone by id (public.zones.id)
// via `data.zoneId`, so the shape displays that zone's live fire/fault state.
// Zone name/state/reading are never stored here — they come live from the zones
// table.
// ---------------------------------------------------------------------------

import type { Scene } from '@/graphics';

export interface MimicLayout {
  panelId: number;
  scene: Scene; // shapes carry data = { zoneId: <real zones.id> }
  createdAt: string;
  updatedAt: string;
}

/** Read the real zone id embedded in a shape's opaque data payload. */
export function zoneIdOf(data: Record<string, unknown> | null | undefined): number | null {
  const id = data?.zoneId;
  if (typeof id === 'number') return Number.isFinite(id) ? id : null;
  if (typeof id === 'string' && id.trim() !== '') {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
