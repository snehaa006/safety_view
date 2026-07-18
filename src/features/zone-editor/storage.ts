// ---------------------------------------------------------------------------
// Mimic-layout persistence, behind a `MimicStore` interface so the backend can
// be swapped. Default: Supabase `public.building_layouts` (one row per
// building; see db/building_layouts.sql).
// ---------------------------------------------------------------------------

import { emptyScene, type Scene } from '@/graphics';
import { supabase } from '@/services/supabase';
import type { MimicLayout } from './types';

export interface MimicStore {
  /** The building's mimic layout, or null if none has been created yet. */
  get(buildingId: number): Promise<MimicLayout | null>;
  /** Create or update the building's mimic layout. */
  save(buildingId: number, scene: Scene): Promise<MimicLayout>;
  /** Remove the building's mimic layout entirely. */
  remove(buildingId: number): Promise<void>;
}

// The user stamped as `created_by` on new rows. Set from the auth context
// (mirrors setAuditActor in services/api.ts).
let layoutActorId: number | null = null;
export function setLayoutActor(id: number | null): void {
  layoutActorId = id;
}

const TABLE = 'building_layouts';
const ROW_COLS = 'building_id, scene, created_at, updated_at';

function rowToLayout(r: Record<string, unknown>): MimicLayout {
  return {
    buildingId: Number(r.building_id),
    scene: (r.scene as Scene) ?? emptyScene(),
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
  };
}

class SupabaseMimicStore implements MimicStore {
  async get(buildingId: number): Promise<MimicLayout | null> {
    const { data, error } = await supabase.from(TABLE).select(ROW_COLS).eq('building_id', buildingId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToLayout(data as Record<string, unknown>) : null;
  }

  async save(buildingId: number, scene: Scene): Promise<MimicLayout> {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ building_id: buildingId, scene, created_by: layoutActorId }, { onConflict: 'building_id' })
      .select(ROW_COLS)
      .single();
    if (error) throw new Error(error.message);
    return rowToLayout(data as Record<string, unknown>);
  }

  async remove(buildingId: number): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('building_id', buildingId);
    if (error) throw new Error(error.message);
  }
}

const store = new SupabaseMimicStore();

/** The store used by the app. Swap the returned instance to change backends. */
export function getMimicStore(): MimicStore {
  return store;
}
