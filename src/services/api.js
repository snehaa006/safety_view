// ---------------------------------------------------------------------------
// API service layer — Supabase (PostgreSQL via PostgREST)
//
// Matches SafetyView schema v4:
//   groups → devices → zones (exactly 16 per device) → zone_status
//   users are assigned ONE device (users.device_id) inside a group.
//   buildings / panels tables no longer exist.
//
// Access rule (enforced here at the app layer):
//   • ADMIN  → sees every device.
//   • others → see ONLY their assigned device (users.device_id) and its zones.
// ---------------------------------------------------------------------------

import { supabase } from './supabase';

const AUTH_TOKEN_KEY = 'fwd_auth_token';

function isAdmin(role) {
  return (role || '').toUpperCase() === 'ADMIN';
}

// Read device_ids explicitly assigned to a user via the user_devices join
// table. Returns [] if the table doesn't exist yet (pre-migration) so the app
// keeps working with the group fallback.
async function getUserDeviceIds(userId) {
  if (userId == null) return [];
  const { data, error } = await supabase
    .from('user_devices')
    .select('device_id')
    .eq('user_id', userId);
  if (error) return [];
  return (data ?? []).map((r) => r.device_id).filter((x) => x != null);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username, password) {
  // Password is verified server-side using bcrypt via the check_password
  // Postgres RPC (uses pgcrypto's crypt()). The hash never leaves the DB.
  const { data, error } = await supabase.rpc('check_password', {
    p_username: username,
    p_password: password,
  });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Invalid username or password');

  const account = data[0];

  // The RPC only returns identity columns; pull the rest of the profile
  // (assigned device + group) from the users table so the app knows what
  // this user is allowed to see.
  let profile = {};
  const { data: profileRow } = await supabase
    .from('users')
    .select('id, username, email, role, device_id, group_id, first_name, last_name')
    .eq('id', account.id)
    .single();
  if (profileRow) profile = profileRow;

  const user = {
    id: account.id,
    username: account.username,
    role: account.role ?? profile.role,
    email: account.email ?? profile.email,
    device_id: profile.device_id ?? null,
    group_id: profile.group_id ?? null,
    first_name: profile.first_name ?? null,
    last_name: profile.last_name ?? null,
  };

  const token = `supabase.${btoa(
    JSON.stringify({
      sub: user.username,
      role: user.role,
      id: user.id,
      device_id: user.device_id,
      group_id: user.group_id,
      exp: Date.now() + 8 * 60 * 60 * 1000,
    })
  )}.sig`;

  localStorage.setItem(AUTH_TOKEN_KEY, token);
  return { token, user };
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, group_name, description')
    .order('group_name', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Devices
//
// Returns the devices a user is allowed to see, each enriched with its group
// name and a live alarm summary (fire / fault counts across its 16 zones).
// ---------------------------------------------------------------------------

export async function fetchDevices(user) {
  // Access rule:
  //   • ADMIN     → every device.
  //   • non-admin → exactly the devices assigned to them in user_devices.
  //                 If none are assigned (or the table doesn't exist yet),
  //                 fall back to all devices in their group, then their single
  //                 device, then nothing.
  let allowedIds = null; // null = no restriction (admin)
  if (!isAdmin(user?.role)) {
    let ids = await getUserDeviceIds(user?.id);
    if (ids.length === 0 && user?.group_id != null) {
      const { data: groupDevices } = await supabase
        .from('devices')
        .select('id')
        .eq('group_id', user.group_id);
      ids = (groupDevices ?? []).map((r) => r.id);
    }
    if (ids.length === 0 && user?.device_id != null) ids = [user.device_id];
    if (ids.length === 0) return [];
    allowedIds = ids;
  }

  let query = supabase
    .from('devices')
    .select(`
      id,
      device_uuid,
      device_remarks,
      status,
      group_id,
      updated_at,
      created_at,
      groups ( group_name )
    `)
    .order('id', { ascending: true });

  if (allowedIds) query = query.in('id', allowedIds);

  const { data: devices, error } = await query;
  if (error) throw new Error(error.message);
  if (!devices || devices.length === 0) return [];

  // Pull a live status snapshot for every zone of these devices so each
  // device card can show how many zones are in fire / fault.
  const deviceIds = devices.map((d) => d.id);
  const { data: zoneRows, error: zoneErr } = await supabase
    .from('zones')
    .select('device_id, zone_status ( status )')
    .in('device_id', deviceIds);

  if (zoneErr) throw new Error(zoneErr.message);

  const summaryByDevice = {};
  for (const id of deviceIds) {
    summaryByDevice[id] = { totalZones: 0, fireAlarms: 0, faults: 0 };
  }
  for (const z of zoneRows ?? []) {
    const s = summaryByDevice[z.device_id];
    if (!s) continue;
    s.totalZones += 1;
    const status = z.zone_status?.[0]?.status ?? z.zone_status?.status ?? 'NORMAL';
    if (status === 'FIRE_ALARM') s.fireAlarms += 1;
    else if (status === 'FAULT') s.faults += 1;
  }

  // Derive the real assignment status: a device is ASSIGNED if at least one
  // user is linked to it — either through the user_devices join table or as a
  // primary users.device_id. Computed on read so the badge can't drift.
  const assignedSet = new Set();
  const [{ data: udRows }, { data: primaryRows }] = await Promise.all([
    supabase.from('user_devices').select('device_id').in('device_id', deviceIds),
    supabase.from('users').select('device_id').in('device_id', deviceIds),
  ]);
  for (const r of udRows ?? []) if (r.device_id != null) assignedSet.add(r.device_id);
  for (const r of primaryRows ?? []) if (r.device_id != null) assignedSet.add(r.device_id);

  return devices.map((d) => ({
    id: d.id,
    device_uuid: d.device_uuid,
    device_remarks: d.device_remarks,
    status: assignedSet.has(d.id) ? 'ASSIGNED' : 'NOT_ASSIGNED',
    group_id: d.group_id,
    group_name: d.groups?.group_name ?? null,
    updated_at: d.updated_at,
    created_at: d.created_at,
    summary: summaryByDevice[d.id] ?? { totalZones: 0, fireAlarms: 0, faults: 0 },
  }));
}

export async function createDevice({ device_uuid, device_remarks, status, group_id }) {
  const { data, error } = await supabase
    .from('devices')
    .insert({
      device_uuid,
      device_remarks: device_remarks || null,
      status: status || 'NOT_ASSIGNED',
      group_id: group_id || null,
    })
    .select('id, device_uuid')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateDevice(id, { device_remarks, status, group_id }) {
  const patch = { updated_at: new Date().toISOString() };
  if (device_remarks !== undefined) patch.device_remarks = device_remarks;
  if (status !== undefined) patch.status = status;
  if (group_id !== undefined) patch.group_id = group_id || null;

  const { data, error } = await supabase
    .from('devices')
    .update(patch)
    .eq('id', id)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDevice(id) {
  const { error } = await supabase.from('devices').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { id };
}

// ---------------------------------------------------------------------------
// Zones for a device  (zones + zone_status + latest sensor_reading per zone)
// ---------------------------------------------------------------------------

export async function fetchZonesByDevice(deviceId) {
  // 1. All 16 zones of this device with their current status snapshot
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

  // 2. Latest sensor reading per zone (temperature, smoke, battery, comms…)
  const { data: readings, error: readingsError } = await supabase
    .from('sensor_readings')
    .select(
      'zone_id, temperature, smoke_index, fire_detected, fault_detected, battery_level, power_status, communication_status, created_at'
    )
    .in('zone_id', zonesData.map((z) => z.id))
    .order('created_at', { ascending: false });

  if (readingsError) throw new Error(readingsError.message);

  const latestReadingByZone = {};
  for (const r of readings ?? []) {
    if (!latestReadingByZone[r.zone_id]) latestReadingByZone[r.zone_id] = r;
  }

  // 3. Normalise to the shape the rest of the app expects
  return zonesData.map((z) => {
    const snap = z.zone_status?.[0] ?? z.zone_status ?? {};
    const reading = latestReadingByZone[z.id] ?? {};

    const fire = reading.fire_detected ?? false;
    const fault = reading.fault_detected ?? false;
    const commStatus = reading.communication_status ?? 'ONLINE';

    let status = snap.status ?? 'NORMAL';
    if (status === 'FIRE_ALARM') status = 'ALARM';
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

export async function fetchEventsByDevice(deviceId) {
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

  return (data ?? []).map((e) => ({
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

// ---------------------------------------------------------------------------
// Summary for a device (computed from its live zone data)
// ---------------------------------------------------------------------------

export function summariseZones(zones) {
  const totalZones = zones.length;
  if (totalZones === 0) {
    return { totalZones: 0, fireAlarms: 0, faults: 0, offline: 0, avgWaterLevel: 0, avgPressure: 0 };
  }
  const fireAlarms = zones.filter((z) => z.sensors.fire || z.status === 'ALARM').length;
  const faults = zones.filter((z) => z.sensors.fault || z.status === 'FAULT').length;
  const offline = zones.filter((z) => z.sensors.communicationStatus === 'OFFLINE').length;
  const avgWaterLevel = Math.round(
    zones.reduce((sum, z) => sum + z.sensors.waterLevel, 0) / totalZones
  );
  const avgPressure =
    Math.round((zones.reduce((sum, z) => sum + z.sensors.pressure, 0) / totalZones) * 100) / 100;

  return { totalZones, fireAlarms, faults, offline, avgWaterLevel, avgPressure };
}

// ---------------------------------------------------------------------------
// User Management (admin only)
// ---------------------------------------------------------------------------

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, username, email, role, is_active, created_at,
      first_name, last_name, mobile_no, org_name,
      device_id, group_id,
      devices!device_id ( device_uuid ),
      groups ( group_name )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Assigned devices per user (from the join table). Tolerates the table not
  // existing yet (pre-migration) by leaving the lists empty.
  const byUser = {};
  const { data: udRows } = await supabase
    .from('user_devices')
    .select('user_id, device_id, devices ( device_uuid )');
  for (const r of udRows ?? []) {
    (byUser[r.user_id] ??= []).push({ id: r.device_id, uuid: r.devices?.device_uuid ?? null });
  }

  return (data ?? []).map((u) => ({
    ...u,
    device_uuid: u.devices?.device_uuid ?? null,
    group_name: u.groups?.group_name ?? null,
    assigned_device_ids: (byUser[u.id] ?? []).map((d) => d.id),
    assigned_device_uuids: (byUser[u.id] ?? []).map((d) => d.uuid).filter(Boolean),
  }));
}

export async function createUser({
  username,
  email,
  password,
  role,
  device_id,
  group_id,
  first_name,
  last_name,
  mobile_no,
  customer_id,
  org_name,
  device_type,
}) {
  // The create_user_with_password RPC hashes the password server-side
  // (pgcrypto) and inserts the full v4 profile in one call. The DB trigger
  // requires the device's group to match the user's group, so the caller
  // passes a consistent (device_id, group_id) pair.
  const { data, error } = await supabase.rpc('create_user_with_password', {
    p_username: username,
    p_email: email,
    p_password: password,
    p_role: role,
    p_first_name: first_name || null,
    p_last_name: last_name || null,
    p_mobile_no: mobile_no || null,
    p_customer_id: customer_id || null,
    p_device_id: device_id || null,
    p_group_id: group_id || null,
    p_org_name: org_name || null,
    p_device_type: device_type || null,
  });

  if (error) throw new Error(error.message);

  // The RPC returns void, so look up the new user's id for follow-up device
  // assignment.
  const { data: row } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();
  return { id: row?.id, username };
}

export async function updateUser(userId, fields) {
  const { role, email, device_id, group_id, first_name, last_name, mobile_no } = fields;
  const patch = {};
  if (role !== undefined) patch.role = role;
  if (email !== undefined) patch.email = email || null;
  if (device_id !== undefined) patch.device_id = device_id || null;
  if (group_id !== undefined) patch.group_id = group_id || null;
  if (first_name !== undefined) patch.first_name = first_name || null;
  if (last_name !== undefined) patch.last_name = last_name || null;
  if (mobile_no !== undefined) patch.mobile_no = mobile_no || null;

  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Replace the full set of devices assigned to a user (many-to-many).
export async function setUserDevices(userId, deviceIds) {
  const { error: delErr } = await supabase
    .from('user_devices')
    .delete()
    .eq('user_id', userId);
  if (delErr) throw new Error(delErr.message);

  const ids = (deviceIds ?? []).filter((x) => x != null);
  if (ids.length === 0) return { userId, deviceIds: [] };

  const rows = ids.map((device_id) => ({ user_id: userId, device_id }));
  const { error: insErr } = await supabase.from('user_devices').insert(rows);
  if (insErr) throw new Error(insErr.message);
  return { userId, deviceIds: ids };
}

export async function toggleUserActive(userId, isActive) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId)
    .select('id, is_active')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Acknowledge an event
// ---------------------------------------------------------------------------

export async function acknowledgeEvent(eventId) {
  const { data, error } = await supabase
    .from('events')
    .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
    .eq('id', eventId)
    .select('id, is_acknowledged')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
