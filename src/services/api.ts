// ---------------------------------------------------------------------------
// API service layer — Fire Alarm Monitoring System (architecture v6)
//
// Groups → Buildings → Panels → Zones. Roles are M2M via user_roles.
// Access is driven by user_buildings (soft-deleted). Super Admin sees all.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';
import type {
  Alert,
  AuditLogEntry,
  AuthUser,
  Building,
  CreateUserInput,
  Group,
  Location,
  LoginLog,
  LoginResult,
  ManagedUser,
  ManualAction,
  Organization,
  Panel,
  Role,
  ScopeMetrics,
  TokenPayload,
  UpdateUserInput,
  UserAlertPreference,
  Zone,
  ZoneEvent,
} from '@/types';

const AUTH_TOKEN_KEY = 'fwd_auth_token';

function norm(s: string): string {
  return (s || '').toUpperCase().replace(/[\s_-]+/g, '_');
}

function rolesAreAdmin(roles: string[] | undefined | null): boolean {
  return (roles ?? []).some((r) => norm(r) === 'SUPER_ADMIN');
}

// ---------------------------------------------------------------------------
// Audit logging (audit_log.action enum: CREATE/UPDATE/DELETE/LOGIN/LOGOUT/LOGIN_FAILED)
// ---------------------------------------------------------------------------

let auditActorId: number | null = null;
export function setAuditActor(id: number | null): void {
  auditActorId = id;
}

interface AuditOpts {
  entity_type?: string;
  entity_id?: number | null;
  old?: unknown;
  new?: unknown;
  description?: string;
}

async function logAudit(action: string, opts: AuditOpts = {}): Promise<void> {
  try {
    await supabase.rpc('log_audit', {
      p_user_id: auditActorId,
      p_action: action,
      p_entity_type: opts.entity_type ?? null,
      p_entity_id: opts.entity_id ?? null,
      p_old: opts.old ?? null,
      p_new: opts.new ?? null,
      p_description: opts.description ?? null,
    });
  } catch {
    /* logging must never break the primary action */
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function rolesForUser(userId: number): Promise<{ ids: number[]; names: string[] }> {
  const { data } = await supabase
    .from('user_roles')
    .select('role_id, deleted_at, roles ( role_name )')
    .eq('user_id', userId)
    .is('deleted_at', null);
  const ids: number[] = [];
  const names: string[] = [];
  for (const r of (data ?? []) as any[]) {
    ids.push(r.role_id);
    if (r.roles?.role_name) names.push(r.roles.role_name);
  }
  return { ids, names };
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.rpc('check_password', {
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Invalid username or password');

  const account = data[0] as Record<string, any>;
  const accId = account.out_id ?? account.id;
  const accUsername = account.out_username ?? account.username ?? username;
  const accEmail = account.out_email ?? account.email ?? null;

  // Profile + roles
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, email, first_name, last_name, organization_id, parent_user_id')
    .eq('id', accId)
    .maybeSingle();
  const { names } = await rolesForUser(accId);

  const user: AuthUser = {
    id: accId,
    username: (profile as any)?.username ?? accUsername,
    email: (profile as any)?.email ?? accEmail,
    first_name: (profile as any)?.first_name ?? null,
    last_name: (profile as any)?.last_name ?? null,
    organization_id: (profile as any)?.organization_id ?? null,
    parent_user_id: (profile as any)?.parent_user_id ?? null,
    roles: names,
  };

  const payload: TokenPayload = {
    sub: user.username,
    id: user.id,
    roles: user.roles,
    organization_id: user.organization_id ?? null,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };
  const token = `supabase.${btoa(JSON.stringify(payload))}.sig`;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  setAuditActor(user.id);
  void logAudit('LOGIN', { entity_type: 'users', entity_id: user.id, description: `Login: ${user.username}` });
  void recordLoginLog(user.id);
  return { token, user };
}

export function logout(): void {
  if (auditActorId != null) void logAudit('LOGOUT', { entity_type: 'users', entity_id: auditActorId });
  setAuditActor(null);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return JSON.parse(atob(token.split('.')[1])) as TokenPayload;
  } catch {
    return null;
  }
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
  const { error } = await supabase.rpc('change_password', {
    p_user_id: userId,
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'users', entity_id: userId, description: 'Password changed' });
}

function parseUserAgent(ua: string): { device_type: string; os_name: string | null } {
  const device_type = /Mobile|Android|iPhone|iPad|iPod/i.test(ua) ? 'MOBILE' : 'DESKTOP';
  let os_name: string | null = null;
  if (/Windows NT/i.test(ua)) os_name = 'Windows';
  else if (/Mac OS X/i.test(ua)) os_name = 'macOS';
  else if (/Android/i.test(ua)) os_name = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os_name = 'iOS';
  else if (/Linux/i.test(ua)) os_name = 'Linux';
  else if (/CrOS/i.test(ua)) os_name = 'ChromeOS';
  return { device_type, os_name };
}

async function getClientIp(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const json = await res.json() as { ip?: string };
    return json.ip ?? null;
  } catch { return null; }
}

async function recordLoginLog(userId: number): Promise<void> {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const { device_type, os_name } = parseUserAgent(ua);
    const ip_address = await getClientIp();
    await supabase.from('login_logs').insert({
      user_id: userId,
      was_successful: true,
      device_type,
      os_name,
      browser: ua.slice(0, 200) || null,
      user_agent: ua || null,
      ip_address,
    });
  } catch {
    /* login_logs may be RLS-restricted; ignore */
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('id, role_name, description').order('id');
  if (error) throw new Error(error.message);
  return (data ?? []) as Role[];
}

export async function createRole(input: { role_name: string; description?: string | null }): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('roles')
    .insert({ role_name: input.role_name, description: input.description || null })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  void logAudit('CREATE', { entity_type: 'roles', description: `Role ${input.role_name}` });
  return data as { id: number };
}

export async function updateRole(id: number, fields: { role_name?: string; description?: string | null }): Promise<void> {
  const { error } = await supabase.from('roles').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'roles', entity_id: id });
}

export async function deleteRole(id: number): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('DELETE', { entity_type: 'roles', entity_id: id });
}

export async function fetchRoleById(id: number): Promise<Role | null> {
  const { data, error } = await supabase.from('roles').select('id, role_name, description').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Role;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, organization_name, logo_path, is_active, created_at')
    .order('organization_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Organization[];
}

export async function createOrganization(input: { organization_name: string; logo_path?: string | null; is_active?: boolean }): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('organizations')
    .insert({ organization_name: input.organization_name, logo_path: input.logo_path || null, is_active: input.is_active ?? true })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  void logAudit('CREATE', { entity_type: 'organizations', description: input.organization_name });
  return data as { id: number };
}

export async function updateOrganization(id: number, fields: { organization_name?: string; logo_path?: string | null; is_active?: boolean }): Promise<void> {
  const { error } = await supabase.from('organizations').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'organizations', entity_id: id });
}

export async function deleteOrganization(id: number): Promise<void> {
  const { error } = await supabase.from('organizations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('DELETE', { entity_type: 'organizations', entity_id: id });
}

export async function fetchOrganizationById(id: number): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, organization_name, logo_path, is_active, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Organization;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from('groups').select('id, group_name, description').order('group_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Group[];
}

export async function createGroup(input: { group_name: string; description?: string | null }): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ group_name: input.group_name, description: input.description || null })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  void logAudit('CREATE', { entity_type: 'groups', description: input.group_name });
  return data as { id: number };
}

export async function updateGroup(id: number, fields: { group_name?: string; description?: string | null }): Promise<void> {
  const { error } = await supabase.from('groups').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'groups', entity_id: id });
}

export async function deleteGroup(id: number): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('DELETE', { entity_type: 'groups', entity_id: id });
}

export async function fetchGroupById(id: number): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select('id, group_name, description').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as Group;
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, address, city, state, country, postal_code, latitude, longitude')
    .order('id');
  if (error) throw new Error(error.message);
  const locs = (data ?? []) as Location[];
  // Attach building names
  const { data: bdata } = await supabase.from('buildings').select('location_id, building_name');
  if (bdata) {
    const bmap = new Map<number, string>();
    for (const b of bdata as { location_id: number; building_name: string }[]) {
      if (!bmap.has(b.location_id)) bmap.set(b.location_id, b.building_name);
    }
    for (const l of locs) (l as any).building_name = bmap.get(l.id) ?? null;
  }
  return locs;
}

type LocationInput = Omit<Location, 'id'>;

export async function createLocation(input: LocationInput): Promise<{ id: number }> {
  const { data, error } = await supabase.from('locations').insert(input).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  void logAudit('CREATE', { entity_type: 'locations' });
  return data as { id: number };
}

export async function updateLocation(id: number, fields: Partial<LocationInput>): Promise<void> {
  const { error } = await supabase.from('locations').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'locations', entity_id: id });
}

export async function deleteLocation(id: number): Promise<void> {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('DELETE', { entity_type: 'locations', entity_id: id });
}

export async function fetchLocationById(id: number): Promise<Location | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, address, city, state, country, postal_code, latitude, longitude')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Location;
}

// ---------------------------------------------------------------------------
// Access (user_buildings) — drives visibility
// ---------------------------------------------------------------------------

export async function visibleBuildingIds(user: AuthUser | null): Promise<number[] | null> {
  if (rolesAreAdmin(user?.roles)) return null; // all
  if (user?.id == null) return [];
  const { data } = await supabase
    .from('user_buildings')
    .select('building_id, deleted_at')
    .eq('user_id', user.id)
    .is('deleted_at', null);
  return (data ?? []).map((r) => r.building_id);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

const LOCATION_COLS = 'id, address, city, state, country, postal_code, latitude, longitude';

function locationLabel(l: Location | null): string {
  if (!l) return '—';
  return [l.address, l.city, l.state, l.country].filter(Boolean).join(', ') || '—';
}

export async function fetchBuildings(user: AuthUser | null): Promise<Building[]> {
  const ids = await visibleBuildingIds(user);
  let q = supabase
    .from('buildings')
    .select(`id, building_name, group_id, location_id, created_at, groups ( group_name ), locations ( ${LOCATION_COLS} )`)
    .order('building_name');
  if (ids !== null) {
    if (ids.length === 0) return [];
    q = q.in('id', ids);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const buildings = (data ?? []) as any[];
  if (buildings.length === 0) return [];

  const buildingIds = buildings.map((b) => b.id);
  const { data: panels } = await supabase.from('panels').select('id, building_id').in('building_id', buildingIds);
  const panelToBuilding: Record<number, number> = {};
  const metric: Record<number, { panelCount: number; zoneCount: number; fire: number; fault: number }> = {};
  for (const id of buildingIds) metric[id] = { panelCount: 0, zoneCount: 0, fire: 0, fault: 0 };
  for (const p of (panels ?? []) as any[]) {
    panelToBuilding[p.id] = p.building_id;
    if (metric[p.building_id]) metric[p.building_id].panelCount += 1;
  }
  const panelIds = (panels ?? []).map((p: any) => p.id);
  if (panelIds.length > 0) {
    const { data: zones } = await supabase.from('zones').select('panel_id, current_state').in('panel_id', panelIds);
    for (const z of (zones ?? []) as any[]) {
      const bId = panelToBuilding[z.panel_id];
      const m = metric[bId];
      if (!m) continue;
      m.zoneCount += 1;
      if (z.current_state === 'FIRE') m.fire += 1;
      else if (z.current_state === 'FAULT') m.fault += 1;
    }
  }

  return buildings.map((b) => ({
    id: b.id,
    building_name: b.building_name,
    group_id: b.group_id,
    group_name: b.groups?.group_name ?? null,
    location_id: b.location_id,
    location: b.locations ?? null,
    created_at: b.created_at ?? null,
    ...metric[b.id],
  }));
}

export async function fetchBuildingById(id: number): Promise<Building | null> {
  const { data, error } = await supabase
    .from('buildings')
    .select(`id, building_name, group_id, location_id, created_at, groups ( group_name ), locations ( ${LOCATION_COLS} )`)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const b = data as any;
  return {
    id: b.id,
    building_name: b.building_name,
    group_id: b.group_id,
    group_name: b.groups?.group_name ?? null,
    location_id: b.location_id,
    location: b.locations ?? null,
    created_at: b.created_at ?? null,
    panelCount: 0,
    zoneCount: 0,
    fire: 0,
    fault: 0,
  };
}

export async function createBuilding(input: { building_name: string; group_id: number; location_id: number }): Promise<{ id: number }> {
  const { data, error } = await supabase.from('buildings').insert(input).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  void logAudit('CREATE', { entity_type: 'buildings', description: input.building_name });
  return data as { id: number };
}

export async function updateBuilding(id: number, fields: { building_name?: string; group_id?: number; location_id?: number }): Promise<void> {
  const { error } = await supabase.from('buildings').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'buildings', entity_id: id });
}

export async function deleteBuilding(id: number): Promise<void> {
  const { error } = await supabase.from('buildings').delete().eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('DELETE', { entity_type: 'buildings', entity_id: id });
}

export { locationLabel };

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------

async function panelMetrics(panelIds: number[]): Promise<Record<number, { zoneCount: number; fire: number; fault: number }>> {
  const metric: Record<number, { zoneCount: number; fire: number; fault: number }> = {};
  for (const id of panelIds) metric[id] = { zoneCount: 0, fire: 0, fault: 0 };
  if (panelIds.length === 0) return metric;
  const { data: zones } = await supabase.from('zones').select('panel_id, current_state').in('panel_id', panelIds);
  for (const z of (zones ?? []) as any[]) {
    const m = metric[z.panel_id];
    if (!m) continue;
    m.zoneCount += 1;
    if (z.current_state === 'FIRE') m.fire += 1;
    else if (z.current_state === 'FAULT') m.fault += 1;
  }
  return metric;
}

export async function fetchPanelsByBuilding(buildingId: number): Promise<Panel[]> {
  const { data, error } = await supabase
    .from('panels')
    .select('id, building_id, panel_code, panel_name, status, notes, last_seen, buildings ( building_name )')
    .eq('building_id', buildingId)
    .order('panel_code');
  if (error) throw new Error(error.message);
  const panels = (data ?? []) as any[];
  const metric = await panelMetrics(panels.map((p) => p.id));
  return panels.map((p) => ({
    id: p.id,
    building_id: p.building_id,
    building_name: p.buildings?.building_name ?? null,
    panel_code: p.panel_code,
    panel_name: p.panel_name ?? null,
    status: p.status,
    notes: p.notes ?? null,
    last_seen: p.last_seen ?? null,
    ...metric[p.id],
  }));
}

export async function fetchAllPanels(): Promise<Panel[]> {
  const { data, error } = await supabase
    .from('panels')
    .select('id, building_id, panel_code, panel_name, status, notes, last_seen, buildings ( building_name )')
    .order('panel_code');
  if (error) throw new Error(error.message);
  const panels = (data ?? []) as any[];
  const metric = await panelMetrics(panels.map((p) => p.id));
  return panels.map((p) => ({
    id: p.id,
    building_id: p.building_id,
    building_name: p.buildings?.building_name ?? null,
    panel_code: p.panel_code,
    panel_name: p.panel_name ?? null,
    status: p.status,
    notes: p.notes ?? null,
    last_seen: p.last_seen ?? null,
    ...metric[p.id],
  }));
}

export async function fetchPanelById(id: number): Promise<Panel | null> {
  const { data, error } = await supabase
    .from('panels')
    .select('id, building_id, panel_code, panel_name, status, notes, last_seen, buildings ( building_name )')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const p = data as any;
  return {
    id: p.id,
    building_id: p.building_id,
    building_name: p.buildings?.building_name ?? null,
    panel_code: p.panel_code,
    panel_name: p.panel_name ?? null,
    status: p.status,
    notes: p.notes ?? null,
    last_seen: p.last_seen ?? null,
    zoneCount: 0,
    fire: 0,
    fault: 0,
  };
}

export async function createPanel(input: { building_id: number; panel_code: string; panel_name?: string | null; status?: string; notes?: string | null }): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('panels')
    .insert({
      building_id: input.building_id,
      panel_code: input.panel_code,
      panel_name: input.panel_name || null,
      status: input.status || 'NORMAL',
      notes: input.notes || null,
    })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  void logAudit('CREATE', { entity_type: 'panels', description: input.panel_code });
  return data as { id: number };
}

export async function updatePanel(id: number, fields: { panel_code?: string; panel_name?: string | null; status?: string; notes?: string | null; building_id?: number }): Promise<void> {
  const { error } = await supabase.from('panels').update(fields).eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'panels', entity_id: id });
}

export async function deletePanel(id: number): Promise<void> {
  const { error } = await supabase.from('panels').delete().eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('DELETE', { entity_type: 'panels', entity_id: id });
}

// ---------------------------------------------------------------------------
// Zones
// ---------------------------------------------------------------------------

export interface ZoneWithContext extends Zone {
  panel_code: string;
  panel_name: string | null;
  panel_status: string;
  building_id: number;
  building_name: string;
}

export async function fetchPanelsForUser(user: AuthUser | null): Promise<Panel[]> {
  const ids = await visibleBuildingIds(user);
  if (ids !== null && ids.length === 0) return [];
  let q = supabase
    .from('panels')
    .select('id, building_id, panel_code, panel_name, status, notes, last_seen, buildings ( building_name )')
    .order('panel_code');
  if (ids !== null) q = q.in('building_id', ids);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const panels = (data ?? []) as any[];
  const metric = await panelMetrics(panels.map((p) => p.id));
  return panels.map((p) => ({
    id: p.id,
    building_id: p.building_id,
    building_name: p.buildings?.building_name ?? null,
    panel_code: p.panel_code,
    panel_name: p.panel_name ?? null,
    status: p.status,
    notes: p.notes ?? null,
    last_seen: p.last_seen ?? null,
    ...metric[p.id],
  }));
}

export async function fetchZonesByState(state: 'FIRE' | 'FAULT', user: AuthUser | null): Promise<ZoneWithContext[]> {
  const ids = await visibleBuildingIds(user);
  if (ids !== null && ids.length === 0) return [];

  // get panels the user can see
  let pq = supabase.from('panels').select('id, building_id, panel_code, panel_name, status, buildings ( building_name )');
  if (ids !== null) pq = pq.in('building_id', ids);
  const { data: panelData } = await pq;
  const panels = (panelData ?? []) as any[];
  if (panels.length === 0) return [];

  const panelMap: Record<number, { panel_code: string; panel_name: string | null; panel_status: string; building_id: number; building_name: string }> = {};
  for (const p of panels) {
    panelMap[p.id] = {
      panel_code: p.panel_code,
      panel_name: p.panel_name ?? null,
      panel_status: p.status,
      building_id: p.building_id,
      building_name: p.buildings?.building_name ?? 'Unknown',
    };
  }

  const { data, error } = await supabase
    .from('zones')
    .select('id, panel_id, zone_number, zone_name, zone_type, current_state, current_reading, available_actions, updated_at')
    .in('panel_id', panels.map((p) => p.id))
    .eq('current_state', state)
    .order('zone_number');
  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((z) => ({
    id: z.id,
    panel_id: z.panel_id,
    zone_number: z.zone_number,
    zone_name: z.zone_name,
    zone_type: z.zone_type,
    current_state: z.current_state,
    current_reading: z.current_reading ?? null,
    available_actions: (z.available_actions ?? []) as ManualAction[],
    updated_at: z.updated_at ?? null,
    ...panelMap[z.panel_id],
  }));
}

export async function updateZoneName(id: number, name: string): Promise<void> {
  const { error } = await supabase.from('zones').update({ zone_name: name }).eq('id', id);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'zones', entity_id: id, description: name });
}

export async function fetchZonesByPanel(panelId: number): Promise<Zone[]> {
  const { data, error } = await supabase
    .from('zones')
    .select('id, panel_id, zone_number, zone_name, zone_type, current_state, current_reading, available_actions, updated_at')
    .eq('panel_id', panelId)
    .order('zone_number');
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((z) => ({
    id: z.id,
    panel_id: z.panel_id,
    zone_number: z.zone_number,
    zone_name: z.zone_name,
    zone_type: z.zone_type,
    current_state: z.current_state,
    current_reading: z.current_reading ?? null,
    available_actions: (z.available_actions ?? []) as ManualAction[],
    updated_at: z.updated_at ?? null,
  }));
}

// User triggers a manual action → record an action_log (panel executes via backend).
export async function performZoneAction(zoneId: number, action: ManualAction): Promise<void> {
  if (auditActorId == null) throw new Error('Not authenticated');
  const { error } = await supabase.from('action_logs').insert({ user_id: auditActorId, zone_id: zoneId, action });
  if (error) throw new Error(error.message);
}

export async function fetchZoneEvents(panelId: number, limit = 30): Promise<ZoneEvent[]> {
  const { data: zoneRows } = await supabase.from('zones').select('id, zone_name').eq('panel_id', panelId);
  const zoneMap: Record<number, string> = {};
  const zoneIds = ((zoneRows ?? []) as any[]).map((z) => {
    zoneMap[z.id] = z.zone_name;
    return z.id;
  });
  if (zoneIds.length === 0) return [];
  const { data, error } = await supabase
    .from('zone_events')
    .select('id, zone_id, previous_state, new_state, created_at')
    .in('zone_id', zoneIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((e) => ({ ...e, zone_name: zoneMap[e.zone_id] ?? `Zone ${e.zone_id}` }));
}

export async function fetchActionLogs(panelId: number, limit = 30): Promise<import('@/types').ActionLogEntry[]> {
  const { data: zoneRows } = await supabase.from('zones').select('id, zone_name').eq('panel_id', panelId);
  const zoneMap: Record<number, string> = {};
  const zoneIds = ((zoneRows ?? []) as any[]).map((z) => {
    zoneMap[z.id] = z.zone_name;
    return z.id;
  });
  if (zoneIds.length === 0) return [];
  const { data, error } = await supabase
    .from('action_logs')
    .select('id, user_id, zone_id, action, created_at, users ( username )')
    .in('zone_id', zoneIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((a) => ({
    id: a.id,
    user_id: a.user_id,
    username: a.users?.username ?? null,
    zone_id: a.zone_id,
    zone_name: zoneMap[a.zone_id] ?? `Zone ${a.zone_id}`,
    action: a.action,
    created_at: a.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

export async function fetchAlerts(user: AuthUser | null, limit = 200): Promise<Alert[]> {
  const ids = await visibleBuildingIds(user);
  let q = supabase
    .from('alerts')
    .select(`id, zone_event_id, building_id, zone_id, type, severity, created_at,
      buildings ( building_name, locations ( address, city, state ) ),
      zones ( zone_name, panel_id, panels ( panel_name, panel_code ) )`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (ids !== null) {
    if (ids.length === 0) return [];
    q = q.in('building_id', ids);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((a) => {
    const loc = a.buildings?.locations;
    const locationStr = loc ? [loc.address, loc.city, loc.state].filter(Boolean).join(', ') : null;
    const panel = a.zones?.panels;
    return {
      id: a.id,
      zone_event_id: a.zone_event_id,
      building_id: a.building_id,
      building_name: a.buildings?.building_name ?? null,
      zone_id: a.zone_id,
      zone_name: a.zones?.zone_name ?? null,
      panel_id: a.zones?.panel_id ?? null,
      panel_name: panel ? (panel.panel_name || panel.panel_code) : null,
      location: locationStr,
      type: a.type,
      severity: a.severity,
      created_at: a.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Scope metrics (dashboard overview)
// ---------------------------------------------------------------------------

export function summariseBuildings(buildings: Building[]): ScopeMetrics {
  return buildings.reduce<ScopeMetrics>(
    (acc, b) => ({
      buildings: acc.buildings + 1,
      panels: acc.panels + b.panelCount,
      zones: acc.zones + b.zoneCount,
      fire: acc.fire + b.fire,
      fault: acc.fault + b.fault,
      isolation: acc.isolation,
    }),
    { buildings: 0, panels: 0, zones: 0, fire: 0, fault: 0, isolation: 0 }
  );
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

const USER_COLS = `
  id, username, email, first_name, last_name, mobile_no, profile_photo_path,
  remarks, is_active, last_login, created_at, updated_at,
  organization_id, parent_user_id,
  organizations ( organization_name )
`;

export async function fetchUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase.from('users').select(USER_COLS).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  const users = (data ?? []) as any[];

  const usernameById: Record<number, string> = {};
  for (const u of users) usernameById[u.id] = u.username;

  // roles per user
  const rolesByUser: Record<number, { ids: number[]; names: string[] }> = {};
  const { data: urRows } = await supabase
    .from('user_roles')
    .select('user_id, role_id, deleted_at, roles ( role_name )')
    .is('deleted_at', null);
  for (const r of (urRows ?? []) as any[]) {
    (rolesByUser[r.user_id] ??= { ids: [], names: [] }).ids.push(r.role_id);
    if (r.roles?.role_name) rolesByUser[r.user_id].names.push(r.roles.role_name);
  }

  // buildings per user
  const buildingsByUser: Record<number, number[]> = {};
  const { data: ubRows } = await supabase
    .from('user_buildings')
    .select('user_id, building_id, deleted_at')
    .is('deleted_at', null);
  for (const r of (ubRows ?? []) as any[]) (buildingsByUser[r.user_id] ??= []).push(r.building_id);

  return users.map((u) => normaliseUser(u, rolesByUser[u.id], buildingsByUser[u.id], usernameById));
}

function normaliseUser(
  u: any,
  roles: { ids: number[]; names: string[] } | undefined,
  buildingIds: number[] | undefined,
  usernameById: Record<number, string>
): ManagedUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email ?? null,
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    mobile_no: u.mobile_no ?? null,
    profile_photo_path: u.profile_photo_path ?? null,
    remarks: u.remarks ?? null,
    is_active: u.is_active,
    last_login: u.last_login ?? null,
    created_at: u.created_at,
    updated_at: u.updated_at ?? null,
    organization_id: u.organization_id ?? null,
    organization_name: u.organizations?.organization_name ?? null,
    parent_user_id: u.parent_user_id ?? null,
    parent_username: u.parent_user_id != null ? usernameById[u.parent_user_id] ?? null : null,
    roles: roles?.names ?? [],
    role_ids: roles?.ids ?? [],
    building_ids: buildingIds ?? [],
  };
}

export async function fetchUserById(id: number): Promise<ManagedUser | null> {
  const { data, error } = await supabase.from('users').select(USER_COLS).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const { data: urRows } = await supabase
    .from('user_roles')
    .select('role_id, deleted_at, roles ( role_name )')
    .eq('user_id', id)
    .is('deleted_at', null);
  const roles = { ids: [] as number[], names: [] as string[] };
  for (const r of (urRows ?? []) as any[]) {
    roles.ids.push(r.role_id);
    if (r.roles?.role_name) roles.names.push(r.roles.role_name);
  }
  const { data: ubRows } = await supabase
    .from('user_buildings')
    .select('building_id, deleted_at')
    .eq('user_id', id)
    .is('deleted_at', null);
  const buildingIds = ((ubRows ?? []) as any[]).map((r) => r.building_id);

  let parentUsername: string | null = null;
  if ((data as any).parent_user_id != null) {
    const { data: p } = await supabase.from('users').select('username').eq('id', (data as any).parent_user_id).maybeSingle();
    parentUsername = (p as any)?.username ?? null;
  }
  const u = data as any;
  const m = normaliseUser(u, roles, buildingIds, {});
  m.parent_username = parentUsername;
  return m;
}

// Soft-delete current rows, (re)insert the new set.
export async function setUserRoles(userId: number, roleIds: number[]): Promise<void> {
  await supabase.from('user_roles').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId).is('deleted_at', null);
  const ids = Array.from(new Set(roleIds));
  if (ids.length) {
    const { error } = await supabase.from('user_roles').insert(ids.map((role_id) => ({ user_id: userId, role_id })));
    if (error) throw new Error(error.message);
  }
}

export async function setUserBuildings(userId: number, buildingIds: number[]): Promise<void> {
  await supabase.from('user_buildings').update({ deleted_at: new Date().toISOString() }).eq('user_id', userId).is('deleted_at', null);
  const ids = Array.from(new Set(buildingIds));
  if (ids.length) {
    const { error } = await supabase.from('user_buildings').insert(ids.map((building_id) => ({ user_id: userId, building_id })));
    if (error) throw new Error(error.message);
  }
}

export async function createUser(input: CreateUserInput): Promise<{ id: number | undefined; username: string }> {
  const { data, error } = await supabase.rpc('create_user', {
    p_username: input.username,
    p_email: input.email,
    p_password: input.password,
    p_first_name: input.first_name || null,
    p_last_name: input.last_name || null,
    p_mobile_no: input.mobile_no || null,
    p_organization_id: input.organization_id || null,
    p_parent_user_id: input.parent_user_id || null,
    p_remarks: input.remarks || null,
  });
  if (error) throw new Error(error.message);
  // create_user returns the new id (scalar)
  let newId: number | undefined = typeof data === 'number' ? data : (data as any)?.id;
  if (newId == null) {
    const { data: row } = await supabase.from('users').select('id').eq('username', input.username).maybeSingle();
    newId = (row as any)?.id;
  }
  if (newId != null) {
    try {
      await setUserRoles(newId, input.role_ids);
      await setUserBuildings(newId, input.building_ids);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('audit_log') && !msg.includes('row-level security')) throw err;
    }
  }
  void logAudit('CREATE', { entity_type: 'users', entity_id: newId ?? null, description: `Created user ${input.username}` });
  return { id: newId, username: input.username };
}

export async function updateUser(userId: number, fields: UpdateUserInput): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of ['email', 'first_name', 'last_name', 'mobile_no', 'remarks'] as const) {
    if (fields[k] !== undefined) patch[k] = (fields[k] as string) || null;
  }
  if (fields.organization_id !== undefined) patch.organization_id = fields.organization_id || null;
  if (fields.parent_user_id !== undefined) patch.parent_user_id = fields.parent_user_id || null;
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'users', entity_id: userId, new: fields });
}

export async function toggleUserActive(userId: number, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('users').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', userId);
  if (error) throw new Error(error.message);
  void logAudit('UPDATE', { entity_type: 'users', entity_id: userId, description: isActive ? 'Activated' : 'Deactivated' });
}

export async function deleteUser(userId: number): Promise<void> {
  await supabase.from('user_roles').delete().eq('user_id', userId);
  await supabase.from('user_buildings').delete().eq('user_id', userId);
  await supabase.from('user_alert_preferences').delete().eq('user_id', userId);
  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw new Error(error.message);
  void logAudit('DELETE', { entity_type: 'users', entity_id: userId });
}

// ---------------------------------------------------------------------------
// Alert preferences (per user)
// ---------------------------------------------------------------------------

export async function fetchAlertPreferences(userId: number): Promise<UserAlertPreference[]> {
  const { data, error } = await supabase
    .from('user_alert_preferences')
    .select('id, user_id, alert_type, severity_level, channel, destination, is_enabled')
    .eq('user_id', userId)
    .order('id');
  if (error) return [];
  return (data ?? []) as UserAlertPreference[];
}

export async function setAlertPreferences(userId: number, prefs: UserAlertPreference[]): Promise<void> {
  await supabase.from('user_alert_preferences').delete().eq('user_id', userId);
  const rows = prefs
    .filter((p) => p.channel && p.destination)
    .map((p) => ({
      user_id: userId,
      alert_type: p.alert_type || null,
      severity_level: p.severity_level || null,
      channel: p.channel,
      destination: p.destination,
      is_enabled: p.is_enabled,
    }));
  if (rows.length) {
    const { error } = await supabase.from('user_alert_preferences').insert(rows);
    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Login logs + Audit log (admin, read-only)
// ---------------------------------------------------------------------------

export async function fetchLoginLogs(limit = 200): Promise<LoginLog[]> {
  const { data, error } = await supabase
    .from('login_logs')
    .select('id, user_id, device_type, os_name, browser, ip_address, was_successful, created_at, users ( username )')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((l) => ({
    id: l.id,
    user_id: l.user_id,
    username: l.users?.username ?? null,
    device_type: l.device_type,
    os_name: l.os_name ?? null,
    browser: l.browser ?? null,
    ip_address: l.ip_address ?? null,
    was_successful: l.was_successful,
    created_at: l.created_at,
  }));
}

export async function fetchAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase.rpc('get_audit_log', { p_limit: limit });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  // resolve usernames
  const ids = Array.from(new Set(rows.map((r) => r.user_id).filter((x) => x != null)));
  const nameById: Record<number, string> = {};
  if (ids.length) {
    const { data: us } = await supabase.from('users').select('id, username').in('id', ids);
    for (const u of (us ?? []) as any[]) nameById[u.id] = u.username;
  }
  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id ?? null,
    username: r.user_id != null ? nameById[r.user_id] ?? null : null,
    action: r.action,
    entity_type: r.entity_type ?? null,
    entity_id: r.entity_id ?? null,
    description: r.description ?? null,
    created_at: r.created_at,
  }));
}
