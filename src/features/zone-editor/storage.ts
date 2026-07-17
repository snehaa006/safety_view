// ---------------------------------------------------------------------------
// Layout persistence. Defined behind a `LayoutStore` interface so the backing
// store can be swapped without touching the editor UI.
//
// The default store is Supabase (the `public.building_layouts` table — see
// db/building_layouts.sql). A localStorage store is kept as an offline/testing
// fallback and as a reference implementation of the interface.
// ---------------------------------------------------------------------------

import { emptyScene } from '@/graphics';
import { supabase } from '@/services/supabase';
import type { BuildingLayout, EditorZone } from './types';

export interface LayoutStore {
  list(): Promise<BuildingLayout[]>;
  get(id: string): Promise<BuildingLayout | null>;
  create(name: string): Promise<BuildingLayout>;
  save(layout: BuildingLayout): Promise<BuildingLayout>;
  remove(id: string): Promise<void>;
}

function uid(prefix = 'bld'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newLayout(name: string): BuildingLayout {
  const now = new Date().toISOString();
  return { id: uid(), name: name.trim() || 'Untitled Building', zones: [], scene: emptyScene(), createdAt: now, updatedAt: now };
}

// The user whose id is stamped as `created_by` on new layouts. Set from the
// auth context (mirrors setAuditActor in services/api.ts).
let layoutActorId: number | null = null;
export function setLayoutActor(id: number | null): void {
  layoutActorId = id;
}

// ---------------------------------------------------------------------------
// Supabase-backed store (default)
// ---------------------------------------------------------------------------

const TABLE = 'building_layouts';
const ROW_COLS = 'id, name, zones, scene, created_at, updated_at';

function rowToLayout(r: Record<string, unknown>): BuildingLayout {
  return {
    id: String(r.id),
    name: (r.name as string) ?? 'Untitled Building',
    zones: (r.zones as EditorZone[]) ?? [],
    scene: (r.scene as BuildingLayout['scene']) ?? emptyScene(),
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    updatedAt: (r.updated_at as string) ?? new Date().toISOString(),
  };
}

class SupabaseLayoutStore implements LayoutStore {
  async list(): Promise<BuildingLayout[]> {
    const { data, error } = await supabase.from(TABLE).select(ROW_COLS).order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => rowToLayout(r as Record<string, unknown>));
  }

  async get(id: string): Promise<BuildingLayout | null> {
    const { data, error } = await supabase.from(TABLE).select(ROW_COLS).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToLayout(data as Record<string, unknown>) : null;
  }

  async create(name: string): Promise<BuildingLayout> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ name: name.trim() || 'Untitled Building', created_by: layoutActorId })
      .select(ROW_COLS)
      .single();
    if (error) throw new Error(error.message);
    return rowToLayout(data as Record<string, unknown>);
  }

  async save(layout: BuildingLayout): Promise<BuildingLayout> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ name: layout.name.trim() || 'Untitled Building', zones: layout.zones, scene: layout.scene })
      .eq('id', layout.id)
      .select(ROW_COLS)
      .single();
    if (error) throw new Error(error.message);
    return rowToLayout(data as Record<string, unknown>);
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// localStorage store (offline / testing fallback)
// ---------------------------------------------------------------------------

const LOCAL_KEY = 'sv_zone_layouts';

class LocalLayoutStore implements LayoutStore {
  constructor(private readonly key = LOCAL_KEY) {}

  private readAll(): BuildingLayout[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as BuildingLayout[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeAll(layouts: BuildingLayout[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(layouts));
    } catch (err) {
      throw new Error(
        err instanceof DOMException && err.name === 'QuotaExceededError'
          ? 'Storage is full — try a smaller background image or delete an old building.'
          : 'Could not save the layout.',
      );
    }
  }

  async list(): Promise<BuildingLayout[]> {
    return this.readAll().sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
  }

  async get(id: string): Promise<BuildingLayout | null> {
    return this.readAll().find((l) => l.id === id) ?? null;
  }

  async create(name: string): Promise<BuildingLayout> {
    const layout = newLayout(name);
    this.writeAll([layout, ...this.readAll()]);
    return layout;
  }

  async save(layout: BuildingLayout): Promise<BuildingLayout> {
    const updated: BuildingLayout = { ...layout, updatedAt: new Date().toISOString() };
    const all = this.readAll();
    const idx = all.findIndex((l) => l.id === layout.id);
    if (idx >= 0) all[idx] = updated;
    else all.unshift(updated);
    this.writeAll(all);
    return updated;
  }

  async remove(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((l) => l.id !== id));
  }
}

const supabaseStore = new SupabaseLayoutStore();

/** The store used by the app. Swap the returned instance to change backends. */
export function getLayoutStore(): LayoutStore {
  return supabaseStore;
}

export function getLocalLayoutStore(): LayoutStore {
  return new LocalLayoutStore();
}
