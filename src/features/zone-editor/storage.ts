// ---------------------------------------------------------------------------
// Layout persistence. Defined behind a `LayoutStore` interface so the backing
// store can be swapped (localStorage today; a Supabase `building_layouts` table
// or a JSON column later) without touching the editor UI.
//
// Layouts include a base64 background image, so they can be large — localStorage
// is a pragmatic default that keeps the graphics editor fully self-contained and
// working with no schema changes.
// ---------------------------------------------------------------------------

import { emptyScene } from '@/graphics';
import type { BuildingLayout } from './types';

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

const DEFAULT_KEY = 'sv_zone_layouts';

class LocalLayoutStore implements LayoutStore {
  constructor(private readonly key = DEFAULT_KEY) {}

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
      // Quota exceeded is the realistic failure (large background images).
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

/** The store used by the app. Swap this factory to change the backend. */
export function getLayoutStore(): LayoutStore {
  return new LocalLayoutStore();
}
