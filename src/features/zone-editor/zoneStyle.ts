// ---------------------------------------------------------------------------
// Maps a zone state to concrete SVG colours for the graphics engine. Kept in
// sync (semantically) with ZONE_STATE_META in @/utils/format, but expressed as
// raw hex because SVG fills can't use Tailwind classes. Bold, saturated fills
// with darker borders so zones read clearly over a floor-plan photo.
// ---------------------------------------------------------------------------

import type { ZoneState } from '@/types';

export interface ZoneColors {
  fill: string;
  stroke: string;
  text: string;
  label: string;
}

export const ZONE_COLORS: Record<ZoneState, ZoneColors> = {
  HEALTHY: { fill: '#16a34a', stroke: '#14532d', text: '#052e16', label: 'Healthy' },
  FIRE: { fill: '#dc2626', stroke: '#7f1d1d', text: '#450a0a', label: 'Fire' },
  FAULT: { fill: '#d97706', stroke: '#78350f', text: '#451a03', label: 'Fault' },
  ISOLATION: { fill: '#6b7280', stroke: '#1f2937', text: '#111827', label: 'Isolation' },
};

export const UNASSIGNED_COLORS: ZoneColors = {
  fill: '#64748b',
  stroke: '#334155',
  text: '#f8fafc',
  label: 'Unassigned',
};

export function zoneColors(state: ZoneState | null | undefined): ZoneColors {
  if (!state) return UNASSIGNED_COLORS;
  return ZONE_COLORS[state] ?? UNASSIGNED_COLORS;
}
