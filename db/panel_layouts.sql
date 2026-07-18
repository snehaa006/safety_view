-- ============================================================================
-- SafetyView — Mimic (graphic) view for panels: panel_layouts table
--
-- A panel's "mimic view" is a second, graphical view of a single panel (the
-- operational Static view is that panel's zone list). Each panel has at most
-- one mimic layout: a background floor-plan image plus shapes, where every
-- shape references a REAL zone by id (public.zones.id) so the drawn shape shows
-- that zone's live fire/fault status.
--
-- The layout is stored as the @/graphics engine's JSON "scene". Zone
-- name/state/reading are NOT copied here — they are read live from the zones
-- table via the zone id embedded in each shape's `data`.
--
-- Run this whole file once in the Supabase SQL Editor. It is idempotent and
-- follows the same RLS convention as db/functions.sql.
--
-- NOTE: this REPLACES the earlier building_layouts schema (the mimic view moved
-- from the building level to the panel level). The drop below removes that
-- table; any layouts created against it are discarded.
-- ============================================================================

drop table if exists public.building_layouts cascade;
drop table if exists public.panel_layouts cascade;

-- 1. Table (one mimic layout per panel) --------------------------------------
create table public.panel_layouts (
  panel_id   bigint primary key references public.panels(id) on delete cascade,
  scene      jsonb not null default '{"shapes":[],"background":null}'::jsonb,
  created_by integer references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.panel_layouts is
  'Mimic (graphic) view per panel: a @/graphics scene (background image + shapes). Each shape references a real zone via scene.shapes[].data.zoneId.';

-- 2. Keep updated_at fresh on every update -----------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_panel_layouts_updated_at on public.panel_layouts;
create trigger trg_panel_layouts_updated_at
  before update on public.panel_layouts
  for each row execute function public.set_updated_at();

-- 3. Grants — a table created via raw SQL does not inherit Supabase's default
--    privileges, so grant the app roles table access explicitly (without this
--    PostgREST returns "permission denied for table panel_layouts").
grant select, insert, update, delete on public.panel_layouts to anon, authenticated;

-- 4. RLS — same permissive app policy used by the operational tables ---------
--    (anon key is public; for production prefer a backend/service-role.)
alter table public.panel_layouts enable row level security;
drop policy if exists "app_all" on public.panel_layouts;
create policy "app_all" on public.panel_layouts
  for all to anon, authenticated using (true) with check (true);

-- 5. Refresh PostgREST's schema cache so the table is queryable immediately. --
notify pgrst, 'reload schema';
