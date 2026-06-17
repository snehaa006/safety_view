// ---------------------------------------------------------------------------
// Shared domain types — SafetyView schema (v4 + hierarchy update)
// ---------------------------------------------------------------------------

export type Role =
  | 'SUPER_ADMIN'
  | 'NATIONAL_MANAGER'
  | 'REGIONAL_MANAGER'
  | 'DISTRICT_MANAGER'
  | 'SUPERVISOR'
  | 'BUILDING_OPERATOR'
  | 'VIEWER'
  | 'ADMIN'; // legacy fallback

export const ROLE_OPTIONS: Exclude<Role, 'ADMIN'>[] = [
  'SUPER_ADMIN',
  'NATIONAL_MANAGER',
  'REGIONAL_MANAGER',
  'DISTRICT_MANAGER',
  'SUPERVISOR',
  'BUILDING_OPERATOR',
  'VIEWER',
];

export type DeviceStatus = 'ASSIGNED' | 'NOT_ASSIGNED';
export type DeviceHealth = 'HEALTHY' | 'OFFLINE' | 'CONNECTED' | 'FAULT';

export type ZoneStatus = 'NORMAL' | 'ALARM' | 'FAULT' | 'OFFLINE';

export type EventSeverity = 'LOW' | 'MEDIUM' | 'CRITICAL';

export interface AuthUser {
  id: number;
  username: string;
  role: Role | string;
  email?: string | null;
  device_id?: number | null;
  group_id?: number | null;
  building_id?: number | null;
  location_id?: number | null;
  organization_id?: number | null;
  hierarchy_level?: number | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface TokenPayload {
  sub: string;
  role: string;
  id: number;
  device_id: number | null;
  group_id: number | null;
  building_id: number | null;
  location_id: number | null;
  organization_id: number | null;
  hierarchy_level: number | null;
  exp: number;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface Group {
  id: number;
  group_name: string;
  description?: string | null;
}

export interface Organization {
  id: number;
  organization_name: string;
  logo_path: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface DeviceSummary {
  totalZones: number;
  fireAlarms: number;
  faults: number;
}

export interface Device {
  id: number;
  device_uuid: string;
  device_remarks: string | null;
  status: DeviceStatus;
  health_status: DeviceHealth | null;
  group_id: number | null;
  group_name: string | null;
  building_id: number | null;
  building_name: string | null;
  updated_at: string | null;
  created_at: string | null;
  summary: DeviceSummary;
}

export interface Building {
  id: number;
  building_name: string;
  address: string | null;
  location_id: number | null;
  location_name: string | null;
  supervisor_id: number | null;
  district_manager_id: number | null;
  regional_manager_id: number | null;
  national_manager_id: number | null;
  created_at: string | null;
  // device health metrics within this building
  deviceCount: number;
  healthy: number;
  offline: number;
  connected: number;
}

export interface ScopeMetrics {
  buildings: number;
  devices: number;
  healthy: number;
  offline: number;
  connected: number;
}

export interface ZoneSensors {
  waterLevel: number;
  pressure: number;
  fire: boolean;
  fault: boolean;
  temperature: number;
  smokeLevel: number;
  batteryLevel: number;
  powerStatus: string;
  communicationStatus: string;
}

export interface Zone {
  id: number;
  device_id: number;
  zone_number: number;
  zone_name: string;
  floor_name: string | null;
  status: ZoneStatus;
  sensors: ZoneSensors;
  lastUpdated: string;
}

export interface SafetyEvent {
  id: number;
  device_id: number;
  zone_id: number;
  zone_name: string;
  event_type: string;
  severity: EventSeverity | string;
  message: string;
  is_acknowledged: boolean;
  created_at: string;
}

export interface ZoneSummary {
  totalZones: number;
  fireAlarms: number;
  faults: number;
  offline: number;
  avgWaterLevel: number;
  avgPressure: number;
}

export interface ManagedUser {
  id: number;
  username: string;
  email: string | null;
  role: Role | string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  last_login: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile_no: string | null;
  customer_id: string | null;
  org_name: string | null;
  organization_id: number | null;
  organization_name: string | null;
  organization_logo: string | null;
  hierarchy_level: number | null;
  parent_user_id: number | null;
  device_type: string | null;
  remarks: string | null;
  alert_email_enabled: boolean | null;
  alert_emails: string[];
  device_id: number | null;
  group_id: number | null;
  building_id: number | null;
  location_id: number | null;
  device_uuid: string | null;
  group_name: string | null;
  building_name: string | null;
  location_name: string | null;
  assigned_device_ids: number[];
  assigned_device_uuids: string[];
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: string;
  device_id?: number | null;
  group_id?: number | null;
  building_id?: number | null;
  location_id?: number | null;
  first_name?: string;
  last_name?: string;
  mobile_no?: string;
  customer_id?: string | null;
  org_name?: string | null;
  organization_id?: number | null;
  device_type?: string | null;
  alert_email_enabled?: boolean;
  remarks?: string | null;
}

export interface UpdateUserInput {
  role?: string;
  email?: string;
  device_id?: number | null;
  group_id?: number | null;
  building_id?: number | null;
  location_id?: number | null;
  first_name?: string;
  last_name?: string;
  mobile_no?: string;
  organization_id?: number | null;
  device_type?: string | null;
  alert_email_enabled?: boolean;
  remarks?: string | null;
}

export interface Location {
  id: number;
  name: string;
  type: 'NATIONAL' | 'REGIONAL' | 'DISTRICT';
  parent_id: number | null;
  created_at: string | null;
}

export interface AuditLogEntry {
  id: number;
  performed_by: number | null;
  user_role: string | null;
  action: string;
  target_table: string | null;
  target_id: number | null;
  description: string | null;
  created_at: string;
}

/** A single notes/to-do item stored (as JSON) in users.remarks. */
export interface TodoItem {
  text: string;
  done: boolean;
}
