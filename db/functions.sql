-- ============================================================================
-- SafetyView / Fire Alarm Monitoring — Database functions & policies
-- Architecture v6 (roles + user_roles, buildings → panels → zones, user_buildings)
--
-- Run this whole file once in the Supabase SQL Editor. It is idempotent.
-- ============================================================================

-- 0. pgcrypto (password hashing). On Supabase it lives in the "extensions" schema.
create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- 1. AUTH — check_password
--    Verifies the password against users.hashed_password (bcrypt via crypt),
--    updates last_login, and returns identity columns. No role column anymore —
--    the app reads roles from user_roles separately.
-- ============================================================================
create or replace function public.check_password(p_username text, p_password text)
returns table (id integer, username varchar, email varchar)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- stamp last_login only when credentials are valid
  update users u
     set last_login = now()
   where lower(u.username) = lower(p_username)
     and u.is_active = true
     and u.hashed_password = extensions.crypt(p_password, u.hashed_password);

  return query
  select u.id, u.username, u.email
    from users u
   where lower(u.username) = lower(p_username)
     and u.is_active = true
     and u.hashed_password = extensions.crypt(p_password, u.hashed_password);
end;
$$;
grant execute on function public.check_password(text, text) to anon, authenticated;

-- ============================================================================
-- 2. create_user — inserts a person into the new users table (hashes password).
--    Returns the new user id. Roles & building access are attached by the app
--    afterwards (user_roles / user_buildings).
-- ============================================================================
create or replace function public.create_user(
  p_username text,
  p_email text,
  p_password text,
  p_first_name text default null,
  p_last_name text default null,
  p_mobile_no text default null,
  p_organization_id bigint default null,
  p_parent_user_id integer default null,
  p_remarks text default null
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_id integer;
begin
  if exists (
    select 1 from users
    where username = p_username
       or (p_email is not null and email = p_email)
  ) then
    raise exception 'Username or email already exists';
  end if;

  insert into users (
    username, email, hashed_password, first_name, last_name, mobile_no,
    organization_id, parent_user_id, remarks, is_active
  ) values (
    p_username, p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
    p_first_name, p_last_name, p_mobile_no,
    p_organization_id, p_parent_user_id, p_remarks, true
  )
  returning id into v_id;

  return v_id;
end;
$$;
grant execute on function public.create_user(text,text,text,text,text,text,bigint,integer,text) to anon, authenticated;

-- ============================================================================
-- 3. change_password — verifies the old password, sets a new bcrypt hash.
-- ============================================================================
create or replace function public.change_password(
  p_user_id integer, p_old_password text, p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from users
    where id = p_user_id
      and hashed_password = extensions.crypt(p_old_password, hashed_password)
  ) then
    raise exception 'Current password is incorrect';
  end if;

  update users
     set hashed_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
         updated_at = now()
   where id = p_user_id;
end;
$$;
grant execute on function public.change_password(integer, text, text) to anon, authenticated;

-- Optional admin helper: set a password without knowing the old one.
-- (Used for resets. Keep access limited; remove the anon grant if undesired.)
create or replace function public.admin_set_password(p_user_id integer, p_new_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update users
     set hashed_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
         updated_at = now()
   where id = p_user_id;
end;
$$;
grant execute on function public.admin_set_password(integer, text) to anon, authenticated;

-- ============================================================================
-- 4. AUDIT — writer + reader (audit_log stays RLS-locked; these are DEFINER)
--    log_audit handles the action enum without needing its type name (via %L).
-- ============================================================================
create or replace function public.log_audit(
  p_user_id integer,
  p_action text,
  p_entity_type text default null,
  p_entity_id bigint default null,
  p_old jsonb default null,
  p_new jsonb default null,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format(
    'insert into audit_log(user_id, action, entity_type, entity_id, old_value, new_value, description)
     values ($1, %L, $2, $3, $4, $5, $6)', p_action)
  using p_user_id, p_entity_type, p_entity_id, p_old, p_new, p_description;
exception when others then
  -- never let auditing break the primary action
  null;
end;
$$;
grant execute on function public.log_audit(integer,text,text,bigint,jsonb,jsonb,text) to anon, authenticated;

create or replace function public.get_audit_log(p_limit integer default 200)
returns setof audit_log
language sql
security definer
set search_path = public
as $$
  select * from audit_log order by created_at desc limit p_limit;
$$;
grant execute on function public.get_audit_log(integer) to anon, authenticated;

-- ============================================================================
-- 5. RLS — let the anon app read/write the operational tables.
--    (audit_log stays locked; it's reached only through the DEFINER functions.)
--    NOTE: anon key is public — for production prefer a backend/service-role.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'roles','user_roles','organizations','users','groups','locations','buildings',
    'user_buildings','panels','zones','zone_analog_thresholds','zone_events',
    'action_logs','login_logs','alerts','alert_notifications','user_alert_preferences'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "app_all" on public.%I;', t);
    execute format('create policy "app_all" on public.%I for all to anon, authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ============================================================================
-- 6. SEED — the six designation roles + give the "admin" user Super Admin.
-- ============================================================================
insert into roles (role_name) values
  ('Super Admin'), ('National Manager'), ('Regional Manager'),
  ('District Manager'), ('Supervisor'), ('Building Operator')
on conflict (role_name) do nothing;

insert into user_roles (user_id, role_id)
select u.id, r.id
  from users u, roles r
 where u.username = 'admin' and r.role_name = 'Super Admin'
   and not exists (
     select 1 from user_roles ur
      where ur.user_id = u.id and ur.role_id = r.id and ur.deleted_at is null
   );

-- ============================================================================
-- 7. Refresh PostgREST's schema cache so new functions are callable immediately.
-- ============================================================================
notify pgrst, 'reload schema';
