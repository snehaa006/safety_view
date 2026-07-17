// ---------------------------------------------------------------------------
// Zone Editor domain model. This sits *on top of* the generic @/graphics
// engine: each graphics Shape carries `data.zoneId`, pointing at an EditorZone
// held on the BuildingLayout. Because zones are referenced (not embedded), the
// same zone can be drawn by several shapes (e.g. ZONE-14 appears on multiple
// levels of a station plan) and editing it updates every shape at once.
// ---------------------------------------------------------------------------

import type { Scene } from '@/graphics';
import type { ZoneState } from '@/types';

export const MAX_ZONES = 16;

export const ZONE_TYPES = [
  'Smoke Detector',
  'Heat Detector',
  'Multi-sensor',
  'Manual Call Point',
  'Sprinkler',
  'Gas Detector',
  'Beam Detector',
  'Other',
] as const;

export const ZONE_STATES: ZoneState[] = ['HEALTHY', 'FIRE', 'FAULT', 'ISOLATION'];

export interface EditorZone {
  id: string;
  number: number; // 1..16
  name: string;
  type: string;
  state: ZoneState;
  reading: number | null;
}

export interface BuildingLayout {
  id: string;
  name: string;
  zones: EditorZone[];
  scene: Scene; // background image + shapes (each shape.data = { zoneId })
  createdAt: string;
  updatedAt: string;
}

export interface ShapeZoneData {
  zoneId: string;
}

export function zoneIdOf(data: Record<string, unknown> | null | undefined): string | null {
  const id = data?.zoneId;
  return typeof id === 'string' ? id : null;
}
