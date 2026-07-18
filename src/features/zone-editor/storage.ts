// ---------------------------------------------------------------------------
// Mimic-layout persistence, behind a `MimicStore` interface so the backend can
// be swapped. Default: Supabase `public.panel_layouts` (one row per panel;
// see db/panel_layouts.sql).
// ---------------------------------------------------------------------------

import { emptyScene, type Scene } from '@/graphics';
import { supabase } from '@/services/supabase';
import type { MimicLayout } from './types';

export interface MimicStore {
  /** The panel's mimic layout, or null if none has been created yet. */
  get(panelId: number): Promise<MimicLayout | null>;
  /** Create or update the panel's mimic layout. */
  save(panelId: number, scene: Scene): Promise<MimicLayout>;
  /** Remove the panel's mimic layout entirely. */
  remove(panelId: number): Promise<void>;
}

// The user stamped as `created_by` on new rows. Set from the auth context
// (mirrors setAuditActor in services/api.ts).
let layoutActorId: number | null = null;
export function setLayoutActor(id: number | null): void {
  layoutActorId = id;
}

const TABLE = 'panel_layouts';
const ROW_COLS = 'panel_id, scene, created_at, updated_at';

function rowToLayout(r: Record<string, unknown>): MimicLayout {
  return {
    panelId: Number(r.panel_id),
    scene: (r.scene as Scene) ?? emptyScene(),
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
  };
}

class SupabaseMimicStore implements MimicStore {
  async get(panelId: number): Promise<MimicLayout | null> {
    const { data, error } = await supabase.from(TABLE).select(ROW_COLS).eq('panel_id', panelId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToLayout(data as Record<string, unknown>) : null;
  }

  async save(panelId: number, scene: Scene): Promise<MimicLayout> {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ panel_id: panelId, scene, created_by: layoutActorId }, { onConflict: 'panel_id' })
      .select(ROW_COLS)
      .single();
    if (error) throw new Error(error.message);
    return rowToLayout(data as Record<string, unknown>);
  }

  async remove(panelId: number): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('panel_id', panelId);
    if (error) throw new Error(error.message);
  }
}

const store = new SupabaseMimicStore();

/** The store used by the app. Swap the returned instance to change backends. */
export function getMimicStore(): MimicStore {
  return store;
}
