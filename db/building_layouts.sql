-- ============================================================================
-- SafetyView — Zone Editor: building_layouts table
--
-- Backs the graphics-based Zone Editor. Each row is one building layout:
-- a name, the list of zones, and the graphics "scene" (background image +
-- shapes, where every shape references a zone by id). `zones` and `scene`
-- are stored as JSONB produced by the @/graphics engine's serializer.
--
-- Run this whole file once in the Supabase SQL Editor. It is idempotent and
-- follows the same RLS convention as db/functions.sql (permissive app_all
-- policy for the anon/authenticated app roles).
--
-- NOTE: the uploaded floor-plan image is embedded in scene.background.src as a
-- base64 data URL. That's fine for typical plans; for very large images prefer
-- Supabase Storage and keep only the object URL here.
-- ============================================================================

-- 1. Table -------------------------------------------------------------------
create table if not exists public.building_layouts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Untitled Building',
  zones      jsonb not null default '[]'::jsonb,
  scene      jsonb not null default '{"shapes":[],"background":null}'::jsonb,
  created_by integer references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.building_layouts is
  'Zone Editor layouts: name + zones (jsonb) + graphics scene (jsonb, includes background image and shapes).';

-- 2. Keep updated_at fresh on every update ----------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_building_layouts_updated_at on public.building_layouts;
create trigger trg_building_layouts_updated_at
  before update on public.building_layouts
  for each row execute function public.set_updated_at();

-- 3. Indexes -----------------------------------------------------------------
create index if not exists building_layouts_updated_at_idx
  on public.building_layouts (updated_at desc);
create index if not exists building_layouts_created_by_idx
  on public.building_layouts (created_by);

-- 4. Grants — a table created via raw SQL does not inherit Supabase's default
--    privileges, so grant the app roles table access explicitly (without this
--    PostgREST returns "permission denied for table building_layouts").
grant select, insert, update, delete on public.building_layouts to anon, authenticated;

-- 5. RLS — same permissive app policy used by the operational tables ---------
--    (anon key is public; for production prefer a backend/service-role.)
alter table public.building_layouts enable row level security;
drop policy if exists "app_all" on public.building_layouts;
create policy "app_all" on public.building_layouts
  for all to anon, authenticated using (true) with check (true);

-- 6. Refresh PostgREST's schema cache so the table is queryable immediately. --
notify pgrst, 'reload schema';
