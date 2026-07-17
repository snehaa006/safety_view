// ---------------------------------------------------------------------------
// Maps a zone state to concrete SVG colours for the graphics engine. Kept in
// sync (semantically) with ZONE_STATE_META in @/utils/format, but expressed as
// raw hex because SVG fills can't use Tailwind classes.
// ---------------------------------------------------------------------------

import type { ZoneState } from '@/types';

export interface ZoneColors {
  fill: string;
  stroke: string;
  text: string;
  label: string;
}

export const ZONE_COLORS: Record<ZoneState, ZoneColors> = {
  HEALTHY: { fill: '#22c55e', stroke: '#15803d', text: '#14532d', label: 'Healthy' },
  FIRE: { fill: '#ef4444', stroke: '#b91c1c', text: '#7f1d1d', label: 'Fire' },
  FAULT: { fill: '#f59e0b', stroke: '#b45309', text: '#78350f', label: 'Fault' },
  ISOLATION: { fill: '#9ca3af', stroke: '#4b5563', text: '#1f2937', label: 'Isolation' },
};

export const UNASSIGNED_COLORS: ZoneColors = {
  fill: '#94a3b8',
  stroke: '#475569',
  text: '#334155',
  label: 'Unassigned',
};

export function zoneColors(state: ZoneState | null | undefined): ZoneColors {
  if (!state) return UNASSIGNED_COLORS;
  return ZONE_COLORS[state] ?? UNASSIGNED_COLORS;
}
