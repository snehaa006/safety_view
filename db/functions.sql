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
  ('SUPER_ADMIN'), ('NATIONAL_MANAGER'), ('REGIONAL_MANAGER'),
  ('DISTRICT_MANAGER'), ('SUPERVISOR'), ('BUILDING_OPERATOR')
on conflict (role_name) do nothing;

insert into user_roles (user_id, role_id)
select u.id, r.id
  from users u, roles r
 where u.username = 'admin' and r.role_name = 'SUPER_ADMIN'
   and not exists (
     select 1 from user_roles ur
      where ur.user_id = u.id and ur.role_id = r.id and ur.deleted_at is null
   );

-- ============================================================================
-- 8. delete_user_cascade — hard-deletes a user and clears everything that
--    would otherwise block the delete via foreign keys:
--      - direct reports are re-pointed to the deleted user's own manager
--        (so the reporting chain isn't broken, instead of being orphaned)
--      - role/building assignments and alert preferences are removed
--      - login_logs / action_logs rows for the user are removed outright:
--        these are per-user activity logs (not a shared audit trail) and,
--        unlike audit_log, their user_id columns are NOT NULL, so detaching
--        them by nulling isn't an option without a schema change.
--      - audit_log rows are kept for history but detached (user_id -> null),
--        since audit_log has no direct app-role policy and is only reachable
--        through SECURITY DEFINER functions like this one.
--    NOTE: if your schema also has an alert_notifications table with a FK to
--    users, add its cleanup here too — it isn't referenced anywhere else in
--    this app's frontend so it's left alone rather than guessed at.
-- ============================================================================
create or replace function public.delete_user_cascade(p_user_id integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_parent integer;
begin
  if not exists (select 1 from users where id = p_user_id) then
    raise exception 'User % not found', p_user_id;
  end if;

  select parent_user_id into v_parent from users where id = p_user_id;
  if v_parent = p_user_id then
    v_parent := null; -- guard against corrupted self-referencing data
  end if;

  update users set parent_user_id = v_parent, updated_at = now()
   where parent_user_id = p_user_id;

  delete from user_roles where user_id = p_user_id;
  delete from user_buildings where user_id = p_user_id;
  delete from user_alert_preferences where user_id = p_user_id;
  delete from login_logs where user_id = p_user_id;
  delete from action_logs where user_id = p_user_id;
  update audit_log set user_id = null where user_id = p_user_id;

  delete from users where id = p_user_id;
end;
$$;
grant execute on function public.delete_user_cascade(integer) to anon, authenticated;

-- ============================================================================
-- 9. reset_password_by_identity — self-service "forgot password" without a
--    login session. This app has no email/SMS channel configured to deliver
--    a reset link, so as a substitute the caller must prove they know both
--    the username AND the email on file for an active account; if that
--    matches, the password is set directly.
-- ============================================================================
create or replace function public.reset_password_by_identity(
  p_username text, p_email text, p_new_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_matched integer;
begin
  update users
     set hashed_password = extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)),
         updated_at = now()
   where lower(username) = lower(p_username)
     and lower(email) = lower(p_email)
     and is_active = true;

  get diagnostics v_matched = row_count;
  if v_matched = 0 then
    raise exception 'We could not verify an account with that username and email.';
  end if;
end;
$$;
grant execute on function public.reset_password_by_identity(text, text, text) to anon, authenticated;

-- ============================================================================
-- 10. Refresh PostgREST's schema cache so new functions are callable immediately.
-- ============================================================================
notify pgrst, 'reload schema';
