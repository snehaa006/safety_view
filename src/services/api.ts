// ---------------------------------------------------------------------------
// API service layer — Supabase (PostgreSQL via PostgREST)
//
// Matches SafetyView schema v4:
//   groups → devices → zones (exactly 16 per device) → zone_status
//   users get one or more devices via the user_devices join table (within
//   their group); users.device_id is the primary device.
//
// Access rule (enforced here at the app layer):
//   • ADMIN  → sees every device.
//   • others → see exactly the devices assigned to them, falling back to their
//     group, then their single device.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';
import type {
  AuditLogEntry,
  AuthUser,
  Building,
  CreateUserInput,
  Device,
  DeviceHealth,
  DeviceStatus,
  Group,
  Location,
  LoginResult,
  ManagedUser,
  Organization,
  SafetyEvent,
  TokenPayload,
  UpdateUserInput,
  Zone,
  ZoneStatus,
  ZoneSummary,
} from '@/types';

const AUTH_TOKEN_KEY = 'fwd_auth_token';

function isAdmin(role: string | undefined | null): boolean {
  const r = (role || '').toUpperCase();
  return r === 'ADMIN' || r === 'SUPER_ADMIN';
}

// Read device_ids explicitly assigned to a user via the user_devices join
// table. Returns [] if the table doesn't exist yet (pre-migration).
async function getUserDeviceIds(userId: number | null | undefined): Promise<number[]> {
  if (userId == null) return [];
  const { data, error } = await supabase
    .from('user_devices')
    .select('device_id')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? []).map((r) => r.device_id).filter((x): x is number => x != null);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username: string, password: string): Promise<LoginResult> {
  const { data, error } = await supabase.rpc('check_password', {
    p_username: username,
    p_password: password,
  });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Invalid username or password');

  // The check_password RPC may return columns either plain (id, username…)
  // or OUT-prefixed (out_id, out_username…). Support both.
  const account = data[0] as Record<string, any>;
  const accId = account.out_id ?? account.id;
  const accUsername = account.out_username ?? account.username;
  const accRole = account.out_role ?? account.role;
  const accEmail = account.out_email ?? account.email;
  const accHier = account.out_hierarchy_level ?? account.hierarchy_level;

  let profile: Record<string, unknown> = {};
  const { data: profileRow } = await supabase
    .from('users')
    .select('id, username, email, role, device_id, group_id, building_id, organization_id, hierarchy_level, first_name, last_name')
    .eq('id', accId)
    .single();
  if (profileRow) profile = profileRow;

  const user: AuthUser = {
    id: accId,
    username: accUsername,
    role: (accRole ?? profile.role) as string,
    email: (accEmail ?? profile.email) as string | null,
    device_id: (profile.device_id as number | null) ?? null,
    group_id: (profile.group_id as number | null) ?? null,
    building_id: (profile.building_id as number | null) ?? null,
    organization_id: (profile.organization_id as number | null) ?? null,
    hierarchy_level: (accHier ?? profile.hierarchy_level ?? null) as number | null,
    first_name: (profile.first_name as string | null) ?? null,
    last_name: (profile.last_name as string | null) ?? null,
  };

  const payload: TokenPayload = {
    sub: user.username,
    role: user.role,
    id: user.id,
    device_id: user.device_id ?? null,
    group_id: user.group_id ?? null,
    building_id: user.building_id ?? null,
    organization_id: user.organization_id ?? null,
    hierarchy_level: user.hierarchy_level ?? null,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  };

  const token = `supabase.${btoa(JSON.stringify(payload))}.sig`;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  return { token, user };
}

export function logout(): void {
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

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, group_name, description')
    .order('group_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Group[];
}

// ---------------------------------------------------------------------------
// Hierarchy: which buildings a user can see ("downward visibility").
//   • SUPER_ADMIN / ADMIN → null (all)
//   • NATIONAL/REGIONAL/DISTRICT MANAGER → buildings whose matching
//     manager column references them
//   • SUPERVISOR → buildings they supervise
//   • BUILDING_OPERATOR / others → their single assigned building
// ---------------------------------------------------------------------------

const ROLE_BUILDING_COLUMN: Record<string, string> = {
  NATIONAL_MANAGER: 'national_manager_id',
  REGIONAL_MANAGER: 'regional_manager_id',
  DISTRICT_MANAGER: 'district_manager_id',
  SUPERVISOR: 'supervisor_id',
};

export async function visibleBuildingIds(user: AuthUser | null): Promise<number[] | null> {
  if (isAdmin(user?.role)) return null; // all buildings
  const role = (user?.role || '').toUpperCase();
  const col = ROLE_BUILDING_COLUMN[role];
  if (col && user?.id != null) {
    const { data, error } = await supabase.from('buildings').select('id').eq(col, user.id);
    if (error) return [];
    return (data ?? []).map((r) => r.id);
  }
  if (user?.building_id != null) return [user.building_id];
  return [];
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export async function fetchDevices(user: AuthUser | null, buildingId?: number): Promise<Device[]> {
  let allowedIds: number[] | null = null;
  if (!isAdmin(user?.role)) {
    const ids = new Set<number>();
    for (const d of await getUserDeviceIds(user?.id)) ids.add(d);
    if (user?.group_id != null) {
      const { data: groupDevices } = await supabase.from('devices').select('id').eq('group_id', user.group_id);
      for (const r of (groupDevices ?? []) as any[]) ids.add(r.id);
    }
    // Devices inside the buildings this user can see (hierarchy)
    const bIds = await visibleBuildingIds(user);
    if (bIds === null) {
      // (admin handled above; non-admin won't hit this)
    } else if (bIds.length > 0) {
      const { data: bDevices } = await supabase.from('devices').select('id').in('building_id', bIds);
      for (const r of (bDevices ?? []) as any[]) ids.add(r.id);
    }
    if (user?.device_id != null) ids.add(user.device_id);
    if (ids.size === 0) return [];
    allowedIds = Array.from(ids);
  }

  let query = supabase
    .from('devices')
    .select(`
      id,
      device_uuid,
      device_remarks,
      status,
      health_status,
      group_id,
      building_id,
      updated_at,
      created_at,
      groups ( group_name ),
      buildings ( building_name )
    `)
    .order('id', { ascending: true });

  if (allowedIds) query = query.in('id', allowedIds);
  if (buildingId != null) query = query.eq('building_id', buildingId);

  const { data: devices, error } = await query;
  if (error) throw new Error(error.message);
  if (!devices || devices.length === 0) return [];

  const deviceIds = devices.map((d: any) => d.id);
  const { data: zoneRows, error: zoneErr } = await supabase
    .from('zones')
    .select('device_id, zone_status ( status )')
    .in('device_id', deviceIds);
  if (zoneErr) throw new Error(zoneErr.message);

  const summaryByDevice: Record<number, { totalZones: number; fireAlarms: number; faults: number }> = {};
  for (const id of deviceIds) summaryByDevice[id] = { totalZones: 0, fireAlarms: 0, faults: 0 };
  for (const z of (zoneRows ?? []) as any[]) {
    const s = summaryByDevice[z.device_id];
    if (!s) continue;
    s.totalZones += 1;
    const status = z.zone_status?.[0]?.status ?? z.zone_status?.status ?? 'NORMAL';
    if (status === 'FIRE_ALARM') s.fireAlarms += 1;
    else if (status === 'FAULT') s.faults += 1;
  }

  const assignedSet = new Set<number>();
  const [{ data: udRows }, { data: primaryRows }] = await Promise.all([
    supabase.from('user_devices').select('device_id').in('device_id', deviceIds),
    supabase.from('users').select('device_id').in('device_id', deviceIds),
  ]);
  for (const r of (udRows ?? []) as any[]) if (r.device_id != null) assignedSet.add(r.device_id);
  for (const r of (primaryRows ?? []) as any[]) if (r.device_id != null) assignedSet.add(r.device_id);

  return (devices as any[]).map((d) => ({
    id: d.id,
    device_uuid: d.device_uuid,
    device_remarks: d.device_remarks,
    status: (assignedSet.has(d.id) ? 'ASSIGNED' : 'NOT_ASSIGNED') as DeviceStatus,
    health_status: d.health_status ?? null,
    group_id: d.group_id,
    group_name: d.groups?.group_name ?? null,
    building_id: d.building_id ?? null,
    building_name: d.buildings?.building_name ?? null,
    updated_at: d.updated_at,
    created_at: d.created_at,
    summary: summaryByDevice[d.id] ?? { totalZones: 0, fireAlarms: 0, faults: 0 },
  }));
}

export async function createDevice(input: {
  device_uuid: string;
  device_remarks?: string;
  group_id?: number | null;
  building_id?: number | null;
}): Promise<{ id: number; device_uuid: string }> {
  const { data, error } = await supabase
    .from('devices')
    .insert({
      device_uuid: input.device_uuid,
      device_remarks: input.device_remarks || null,
      group_id: input.group_id || null,
      building_id: input.building_id || null,
    })
    .select('id, device_uuid')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: number; device_uuid: string };
}

export async function updateDevice(
  id: number,
  fields: { device_remarks?: string; group_id?: number | null; building_id?: number | null }
): Promise<{ id: number }> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.device_remarks !== undefined) patch.device_remarks = fields.device_remarks;
  if (fields.group_id !== undefined) patch.group_id = fields.group_id || null;
  if (fields.building_id !== undefined) patch.building_id = fields.building_id || null;

  const { data, error } = await supabase
    .from('devices')
    .update(patch)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function deleteDevice(id: number): Promise<{ id: number }> {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { id };
}

export interface DeviceInfo {
  id: number;
  device_uuid: string;
  device_remarks: string | null;
  status: DeviceStatus;
  health_status: DeviceHealth | null;
  group_id: number | null;
  group_name: string | null;
}

export async function fetchDeviceById(id: number): Promise<DeviceInfo | null> {
  const { data, error } = await supabase
    .from('devices')
    .select('id, device_uuid, device_remarks, status, health_status, group_id, groups ( group_name )')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const d = data as any;
  return {
    id: d.id,
    device_uuid: d.device_uuid,
    device_remarks: d.device_remarks,
    status: d.status,
    health_status: d.health_status ?? null,
    group_id: d.group_id,
    group_name: d.groups?.group_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Buildings (hierarchy: building contains devices; managed up the chain)
// ---------------------------------------------------------------------------

const BUILDING_SELECT = `
  id, building_name, address, location_id,
  supervisor_id, district_manager_id, regional_manager_id, national_manager_id,
  created_at, locations ( name )
`;

export async function fetchBuildings(user: AuthUser | null): Promise<Building[]> {
  const ids = await visibleBuildingIds(user);
  let q = supabase.from('buildings').select(BUILDING_SELECT).order('building_name', { ascending: true });
  if (ids !== null) {
    if (ids.length === 0) return [];
    q = q.in('id', ids);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const buildings = (data ?? []) as any[];
  if (buildings.length === 0) return [];

  // device health metrics per building
  const bIds = buildings.map((b) => b.id);
  const { data: devs } = await supabase.from('devices').select('building_id, health_status').in('building_id', bIds);
  const metric: Record<number, { deviceCount: number; healthy: number; offline: number; connected: number }> = {};
  for (const id of bIds) metric[id] = { deviceCount: 0, healthy: 0, offline: 0, connected: 0 };
  for (const d of (devs ?? []) as any[]) {
    const m = metric[d.building_id];
    if (!m) continue;
    m.deviceCount += 1;
    m.connected += 1;
    if (d.health_status === 'OFFLINE') m.offline += 1;
    else if (d.health_status === 'HEALTHY' || d.health_status == null) m.healthy += 1;
  }

  return buildings.map((b) => ({
    id: b.id,
    building_name: b.building_name,
    address: b.address ?? null,
    location_id: b.location_id ?? null,
    location_name: b.locations?.name ?? null,
    supervisor_id: b.supervisor_id ?? null,
    district_manager_id: b.district_manager_id ?? null,
    regional_manager_id: b.regional_manager_id ?? null,
    national_manager_id: b.national_manager_id ?? null,
    created_at: b.created_at ?? null,
    ...metric[b.id],
  }));
}

export async function fetchBuildingById(id: number): Promise<Building | null> {
  const { data, error } = await supabase.from('buildings').select(BUILDING_SELECT).eq('id', id).maybeSingle();
  if (error || !data) return null;
  const b = data as any;
  return {
    id: b.id,
    building_name: b.building_name,
    address: b.address ?? null,
    location_id: b.location_id ?? null,
    location_name: b.locations?.name ?? null,
    supervisor_id: b.supervisor_id ?? null,
    district_manager_id: b.district_manager_id ?? null,
    regional_manager_id: b.regional_manager_id ?? null,
    national_manager_id: b.national_manager_id ?? null,
    created_at: b.created_at ?? null,
    deviceCount: 0,
    healthy: 0,
    offline: 0,
    connected: 0,
  };
}

export interface BuildingInput {
  building_name: string;
  address?: string | null;
  location_id?: number | null;
  supervisor_id?: number | null;
  district_manager_id?: number | null;
  regional_manager_id?: number | null;
  national_manager_id?: number | null;
}

function buildingPatch(input: Partial<BuildingInput>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (input.building_name !== undefined) p.building_name = input.building_name;
  if (input.address !== undefined) p.address = input.address || null;
  if (input.location_id !== undefined) p.location_id = input.location_id || null;
  if (input.supervisor_id !== undefined) p.supervisor_id = input.supervisor_id || null;
  if (input.district_manager_id !== undefined) p.district_manager_id = input.district_manager_id || null;
  if (input.regional_manager_id !== undefined) p.regional_manager_id = input.regional_manager_id || null;
  if (input.national_manager_id !== undefined) p.national_manager_id = input.national_manager_id || null;
  return p;
}

export async function createBuilding(input: BuildingInput): Promise<{ id: number }> {
  const { data, error } = await supabase.from('buildings').insert(buildingPatch(input)).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function updateBuilding(id: number, input: Partial<BuildingInput>): Promise<{ id: number }> {
  const { data, error } = await supabase.from('buildings').update(buildingPatch(input)).eq('id', id).select('id').maybeSingle();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function deleteBuilding(id: number): Promise<{ id: number }> {
  const { error } = await supabase.from('buildings').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { id };
}

// ---------------------------------------------------------------------------
// Organizations (admin)
// ---------------------------------------------------------------------------

export async function fetchOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, organization_name, logo_path, is_active, created_at')
    .order('organization_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Organization[];
}

export async function createOrganization(input: {
  organization_name: string;
  logo_path?: string | null;
  is_active?: boolean;
}): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      organization_name: input.organization_name,
      logo_path: input.logo_path || null,
      is_active: input.is_active ?? true,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function updateOrganization(
  id: number,
  fields: { organization_name?: string; logo_path?: string | null; is_active?: boolean }
): Promise<{ id: number }> {
  const patch: Record<string, unknown> = {};
  if (fields.organization_name !== undefined) patch.organization_name = fields.organization_name;
  if (fields.logo_path !== undefined) patch.logo_path = fields.logo_path || null;
  if (fields.is_active !== undefined) patch.is_active = fields.is_active;
  const { data, error } = await supabase
    .from('organizations')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function deleteOrganization(id: number): Promise<{ id: number }> {
  const { error } = await supabase.from('organizations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { id };
}

// ---------------------------------------------------------------------------
// Groups (admin CRUD)
// ---------------------------------------------------------------------------

export async function createGroup(input: {
  group_name: string;
  description?: string | null;
}): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ group_name: input.group_name, description: input.description || null })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function updateGroup(
  id: number,
  fields: { group_name?: string; description?: string | null }
): Promise<{ id: number }> {
  const patch: Record<string, unknown> = {};
  if (fields.group_name !== undefined) patch.group_name = fields.group_name;
  if (fields.description !== undefined) patch.description = fields.description || null;
  const { data, error } = await supabase
    .from('groups')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function deleteGroup(id: number): Promise<{ id: number }> {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { id };
}

// ---------------------------------------------------------------------------
// Change own password (calls the change_password RPC)
// ---------------------------------------------------------------------------

export async function changePassword(
  userId: number,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  const { error } = await supabase.rpc('change_password', {
    p_user_id: userId,
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Zones for a device
// ---------------------------------------------------------------------------

export async function fetchZonesByDevice(deviceId: number): Promise<Zone[]> {
  const { data: zonesData, error: zonesError } = await supabase
    .from('zones')
    .select(`
      id,
      device_id,
      zone_number,
      zone_name,
      floor_name,
      zone_status (
        status,
        water_level_pct,
        line_pressure_bar,
        updated_at
      )
    `)
    .eq('device_id', deviceId)
    .order('zone_number', { ascending: true });

  if (zonesError) throw new Error(zonesError.message);
  if (!zonesData || zonesData.length === 0) return [];

  const { data: readings, error: readingsError } = await supabase
    .from('sensor_readings')
    .select(
      'zone_id, temperature, smoke_index, fire_detected, fault_detected, battery_level, power_status, communication_status, created_at'
    )
    .in('zone_id', (zonesData as any[]).map((z) => z.id))
    .order('created_at', { ascending: false });

  if (readingsError) throw new Error(readingsError.message);

  const latestReadingByZone: Record<number, any> = {};
  for (const r of (readings ?? []) as any[]) {
    if (!latestReadingByZone[r.zone_id]) latestReadingByZone[r.zone_id] = r;
  }

  return (zonesData as any[]).map((z) => {
    const snap = z.zone_status?.[0] ?? z.zone_status ?? {};
    const reading = latestReadingByZone[z.id] ?? {};

    const fire: boolean = reading.fire_detected ?? false;
    const fault: boolean = reading.fault_detected ?? false;
    const commStatus: string = reading.communication_status ?? 'ONLINE';

    let status: ZoneStatus = (snap.status ?? 'NORMAL') as ZoneStatus;
    if ((status as string) === 'FIRE_ALARM') status = 'ALARM';
    else if (status === 'NORMAL' && commStatus === 'OFFLINE') status = 'OFFLINE';

    return {
      id: z.id,
      device_id: z.device_id,
      zone_number: z.zone_number,
      zone_name: z.zone_name,
      floor_name: z.floor_name,
      status,
      sensors: {
        waterLevel: parseFloat(snap.water_level_pct ?? 0),
        pressure: parseFloat(snap.line_pressure_bar ?? 0),
        fire,
        fault,
        temperature: parseFloat(reading.temperature ?? 0),
        smokeLevel: reading.smoke_index ?? 0,
        batteryLevel: reading.battery_level ?? 100,
        powerStatus: reading.power_status ?? 'ON',
        communicationStatus: commStatus,
      },
      lastUpdated: snap.updated_at ?? reading.created_at ?? new Date().toISOString(),
    };
  });
}

// ---------------------------------------------------------------------------
// Events for a device
// ---------------------------------------------------------------------------

export async function fetchEventsByDevice(deviceId: number): Promise<SafetyEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id,
      device_id,
      zone_id,
      event_type,
      severity,
      title,
      message,
      is_acknowledged,
      created_at,
      zones ( zone_name )
    `)
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((e) => ({
    id: e.id,
    device_id: e.device_id,
    zone_id: e.zone_id,
    zone_name: e.zones?.zone_name ?? `Zone ${e.zone_id}`,
    event_type: e.event_type,
    severity: e.severity,
    message: e.message ?? e.title,
    is_acknowledged: e.is_acknowledged,
    created_at: e.created_at,
  }));
}

export async function acknowledgeEvent(eventId: number): Promise<{ id: number; is_acknowledged: boolean }> {
  const { data, error } = await supabase
    .from('events')
    .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
    .eq('id', eventId)
    .select('id, is_acknowledged')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: number; is_acknowledged: boolean };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function summariseZones(zones: Zone[]): ZoneSummary {
  const totalZones = zones.length;
  if (totalZones === 0) {
    return { totalZones: 0, fireAlarms: 0, faults: 0, offline: 0, avgWaterLevel: 0, avgPressure: 0 };
  }
  const fireAlarms = zones.filter((z) => z.sensors.fire || z.status === 'ALARM').length;
  const faults = zones.filter((z) => z.sensors.fault || z.status === 'FAULT').length;
  const offline = zones.filter((z) => z.sensors.communicationStatus === 'OFFLINE').length;
  const avgWaterLevel = Math.round(zones.reduce((s, z) => s + z.sensors.waterLevel, 0) / totalZones);
  const avgPressure =
    Math.round((zones.reduce((s, z) => s + z.sensors.pressure, 0) / totalZones) * 100) / 100;

  return { totalZones, fireAlarms, faults, offline, avgWaterLevel, avgPressure };
}

// ---------------------------------------------------------------------------
// User Management (admin only)
// ---------------------------------------------------------------------------

const USER_SELECT = `
  id, username, email, role, is_active, created_at, updated_at, last_login,
  first_name, last_name, mobile_no, customer_id, org_name,
  organization_id, hierarchy_level, parent_user_id, device_type,
  remarks, alert_email_enabled,
  device_id, group_id, building_id,
  devices!device_id ( device_uuid ),
  groups ( group_name ),
  organizations ( organization_name, logo_path )
`;

function normaliseUser(
  u: any,
  assigned: { id: number; uuid: string | null }[],
  alertEmails: string[] = [],
  buildingName: string | null = null
): ManagedUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email ?? null,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at ?? null,
    last_login: u.last_login ?? null,
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    mobile_no: u.mobile_no ?? null,
    customer_id: u.customer_id ?? null,
    org_name: u.org_name ?? null,
    organization_id: u.organization_id ?? null,
    organization_name: u.organizations?.organization_name ?? null,
    organization_logo: u.organizations?.logo_path ?? null,
    hierarchy_level: u.hierarchy_level ?? null,
    parent_user_id: u.parent_user_id ?? null,
    device_type: u.device_type ?? null,
    remarks: u.remarks ?? null,
    alert_email_enabled: u.alert_email_enabled ?? null,
    alert_emails: alertEmails,
    device_id: u.device_id ?? null,
    group_id: u.group_id ?? null,
    building_id: u.building_id ?? null,
    device_uuid: u.devices?.device_uuid ?? null,
    group_name: u.groups?.group_name ?? null,
    building_name: buildingName,
    assigned_device_ids: assigned.map((d) => d.id),
    assigned_device_uuids: assigned.map((d) => d.uuid).filter((x): x is string => !!x),
  };
}

async function alertEmailsByUser(): Promise<Record<number, string[]>> {
  const byUser: Record<number, string[]> = {};
  const { data } = await supabase.from('user_alert_emails').select('user_id, email');
  for (const r of (data ?? []) as any[]) {
    (byUser[r.user_id] ??= []).push(r.email);
  }
  return byUser;
}

async function buildingNameMap(): Promise<Record<number, string>> {
  const map: Record<number, string> = {};
  const { data } = await supabase.from('buildings').select('id, building_name');
  for (const r of (data ?? []) as any[]) map[r.id] = r.building_name;
  return map;
}

export async function fetchUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const byUser: Record<number, { id: number; uuid: string | null }[]> = {};
  const { data: udRows } = await supabase
    .from('user_devices')
    .select('user_id, device_id, devices ( device_uuid )');
  for (const r of (udRows ?? []) as any[]) {
    (byUser[r.user_id] ??= []).push({ id: r.device_id, uuid: r.devices?.device_uuid ?? null });
  }

  const emails = await alertEmailsByUser();
  const bNames = await buildingNameMap();

  return ((data ?? []) as any[]).map((u) =>
    normaliseUser(u, byUser[u.id] ?? [], emails[u.id] ?? [], u.building_id ? bNames[u.building_id] ?? null : null)
  );
}

export async function fetchUserById(userId: number): Promise<ManagedUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select(USER_SELECT)
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;

  const { data: udRows } = await supabase
    .from('user_devices')
    .select('device_id, devices ( device_uuid )')
    .eq('user_id', userId);
  const assigned = ((udRows ?? []) as any[]).map((r) => ({
    id: r.device_id,
    uuid: r.devices?.device_uuid ?? null,
  }));

  const { data: emailRows } = await supabase
    .from('user_alert_emails')
    .select('email')
    .eq('user_id', userId);
  const alertEmails = ((emailRows ?? []) as any[]).map((r) => r.email);

  let buildingName: string | null = null;
  if ((data as any).building_id) {
    const { data: b } = await supabase
      .from('buildings')
      .select('building_name')
      .eq('id', (data as any).building_id)
      .maybeSingle();
    buildingName = (b as any)?.building_name ?? null;
  }

  return normaliseUser(data, assigned, alertEmails, buildingName);
}

export async function createUser(input: CreateUserInput): Promise<{ id: number | undefined; username: string }> {
  const { error } = await supabase.rpc('create_user_with_password', {
    p_username: input.username,
    p_email: input.email,
    p_password: input.password,
    p_role: input.role,
    p_first_name: input.first_name || null,
    p_last_name: input.last_name || null,
    p_mobile_no: input.mobile_no || null,
    p_customer_id: input.customer_id || null,
    p_device_id: input.device_id || null,
    p_group_id: input.group_id || null,
    p_org_name: input.org_name || null,
    p_device_type: input.device_type || null,
  });
  if (error) throw new Error(error.message);

  const { data: row } = await supabase
    .from('users')
    .select('id')
    .eq('username', input.username)
    .single();
  const newId = (row as any)?.id as number | undefined;

  // The RPC doesn't accept organization_id / remarks / alert flag — patch after.
  if (
    newId != null &&
    (input.organization_id !== undefined ||
      input.remarks !== undefined ||
      input.alert_email_enabled !== undefined ||
      input.building_id !== undefined)
  ) {
    const patch: Record<string, unknown> = {};
    if (input.organization_id !== undefined) patch.organization_id = input.organization_id || null;
    if (input.remarks !== undefined) patch.remarks = input.remarks || null;
    if (input.alert_email_enabled !== undefined) patch.alert_email_enabled = input.alert_email_enabled;
    if (input.building_id !== undefined) patch.building_id = input.building_id || null;
    await supabase.from('users').update(patch).eq('id', newId);
  }

  return { id: newId, username: input.username };
}

export async function updateUser(userId: number, fields: UpdateUserInput): Promise<{ id: number }> {
  const patch: Record<string, unknown> = {};
  if (fields.role !== undefined) patch.role = fields.role;
  if (fields.email !== undefined) patch.email = fields.email || null;
  if (fields.device_id !== undefined) patch.device_id = fields.device_id || null;
  if (fields.group_id !== undefined) patch.group_id = fields.group_id || null;
  if (fields.first_name !== undefined) patch.first_name = fields.first_name || null;
  if (fields.last_name !== undefined) patch.last_name = fields.last_name || null;
  if (fields.mobile_no !== undefined) patch.mobile_no = fields.mobile_no || null;
  if (fields.organization_id !== undefined) patch.organization_id = fields.organization_id || null;
  if (fields.remarks !== undefined) patch.remarks = fields.remarks || null;
  if (fields.device_type !== undefined) patch.device_type = fields.device_type || null;
  if (fields.alert_email_enabled !== undefined) patch.alert_email_enabled = fields.alert_email_enabled;
  if (fields.building_id !== undefined) patch.building_id = fields.building_id || null;

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: number };
}

// Replace the full set of devices assigned to a user (many-to-many).
export async function setUserDevices(userId: number, deviceIds: number[]): Promise<void> {
  const { error: delErr } = await supabase.from('user_devices').delete().eq('user_id', userId);
  if (delErr) throw new Error(delErr.message);

  const ids = (deviceIds ?? []).filter((x) => x != null);
  if (ids.length === 0) return;

  const rows = ids.map((device_id) => ({ user_id: userId, device_id }));
  const { error: insErr } = await supabase.from('user_devices').insert(rows);
  if (insErr) throw new Error(insErr.message);
}

export async function toggleUserActive(
  userId: number,
  isActive: boolean
): Promise<{ id: number; is_active: boolean }> {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select('id, is_active')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: number; is_active: boolean };
}

// Replace the full alert-email list for a user (user_alert_emails table).
export async function setUserAlertEmails(userId: number, emails: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('user_alert_emails').delete().eq('user_id', userId);
  if (delErr) throw new Error(delErr.message);
  const clean = (emails ?? []).map((e) => e.trim()).filter((e) => e.length > 0);
  if (clean.length === 0) return;
  // de-duplicate (table has UNIQUE(user_id, email))
  const rows = Array.from(new Set(clean)).map((email) => ({ user_id: userId, email }));
  const { error: insErr } = await supabase.from('user_alert_emails').insert(rows);
  if (insErr) throw new Error(insErr.message);
}

// ---------------------------------------------------------------------------
// Locations (admin CRUD)
// ---------------------------------------------------------------------------

export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, type, parent_id, created_at')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Location[];
}

export async function createLocation(input: {
  name: string;
  type: string;
  parent_id?: number | null;
}): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from('locations')
    .insert({ name: input.name, type: input.type, parent_id: input.parent_id || null })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function updateLocation(
  id: number,
  fields: { name?: string; type?: string; parent_id?: number | null }
): Promise<{ id: number }> {
  const patch: Record<string, unknown> = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.type !== undefined) patch.type = fields.type;
  if (fields.parent_id !== undefined) patch.parent_id = fields.parent_id || null;
  const { data, error } = await supabase
    .from('locations')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data as { id: number };
}

export async function deleteLocation(id: number): Promise<{ id: number }> {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { id };
}

// ---------------------------------------------------------------------------
// Audit Log (read-only; requires a SELECT policy for the anon key)
// ---------------------------------------------------------------------------

export async function fetchAuditLog(limit = 200): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, performed_by, user_role, action, target_table, target_id, description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLogEntry[];
}

export async function deleteUser(userId: number): Promise<{ id: number }> {
  // Detach references that would otherwise block the delete.
  await supabase.from('events').update({ acknowledged_by: null }).eq('acknowledged_by', userId);
  await supabase.from('user_devices').delete().eq('user_id', userId);

  const { error } = await supabase.from('users').delete().eq('id', userId);
  if (error) throw new Error(error.message);
  return { id: userId };
}
