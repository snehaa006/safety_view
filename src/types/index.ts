// ---------------------------------------------------------------------------
// Domain types — Fire Alarm Monitoring System (architecture v6)
//   Groups → Buildings → Panels → Zones. Roles are M2M (user_roles).
//   Access is driven by user_buildings.
// ---------------------------------------------------------------------------

export type ZoneState = 'HEALTHY' | 'FIRE' | 'FAULT' | 'ISOLATION';
export type PanelStatus = 'NORMAL' | 'ALARM' | 'FAULT' | 'OFFLINE';
export type ManualAction = 'TEST' | 'HOOTER_ON' | 'HOOTER_OFF' | 'RESET';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED';

export const ROLE_NAMES = [
  'SUPER_ADMIN',
  'NATIONAL_MANAGER',
  'REGIONAL_MANAGER',
  'DISTRICT_MANAGER',
  'SUPERVISOR',
  'BUILDING_OPERATOR',
] as const;

export const MANUAL_ACTIONS: ManualAction[] = ['TEST', 'HOOTER_ON', 'HOOTER_OFF', 'RESET'];

export interface Role {
  id: number;
  role_name: string;
  description?: string | null;
}

export interface Organization {
  id: number;
  organization_name: string;
  logo_path: string | null;
  is_active: boolean;
  created_at?: string | null;
}

export interface AuthUser {
  id: number;
  username: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  organization_id?: number | null;
  parent_user_id?: number | null;
  roles: string[]; // role_name list
}

export interface TokenPayload {
  sub: string;
  id: number;
  roles: string[];
  organization_id: number | null;
  exp: number;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface ManagedUser {
  id: number;
  username: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  mobile_no: string | null;
  profile_photo_path: string | null;
  remarks: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
  organization_id: number | null;
  organization_name: string | null;
  parent_user_id: number | null;
  parent_username: string | null;
  roles: string[];
  role_ids: number[];
  building_ids: number[];
}

export interface Group {
  id: number;
  group_name: string;
  description: string | null;
}

export interface Location {
  id: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  building_name?: string | null;
}

export interface Building {
  id: number;
  building_name: string;
  group_id: number;
  group_name: string | null;
  location_id: number;
  location: Location | null;
  created_at?: string | null;
  // metrics
  panelCount: number;
  zoneCount: number;
  fire: number;
  fault: number;
}

export interface Panel {
  id: number;
  building_id: number;
  building_name: string | null;
  panel_code: string;
  panel_name: string | null;
  status: PanelStatus;
  notes: string | null;
  last_seen: string | null;
  zoneCount: number;
  fire: number;
  fault: number;
}

export interface Zone {
  id: number;
  panel_id: number;
  zone_number: number;
  zone_name: string;
  zone_type: string;
  current_state: ZoneState;
  current_reading: number | null;
  available_actions: ManualAction[];
  updated_at: string | null;
}

export interface ZoneEvent {
  id: number;
  zone_id: number;
  zone_name?: string | null;
  previous_state: string;
  new_state: string;
  created_at: string;
}

export interface ActionLogEntry {
  id: number;
  user_id: number;
  username?: string | null;
  zone_id: number;
  zone_name?: string | null;
  action: string;
  created_at: string;
}

export interface Alert {
  id: number;
  zone_event_id: number;
  building_id: number;
  building_name?: string | null;
  zone_id: number;
  zone_name?: string | null;
  panel_id?: number | null;
  panel_name?: string | null;
  location?: string | null;
  type: string;
  severity: string;
  created_at: string;
}

export interface LoginLog {
  id: number;
  user_id: number;
  username?: string | null;
  device_type: string;
  os_name: string | null;
  browser: string | null;
  ip_address: string | null;
  was_successful: boolean;
  created_at: string;
}

export interface UserAlertPreference {
  id?: number;
  user_id?: number;
  alert_type: string | null;
  severity_level: string | null;
  channel: string;
  destination: string;
  is_enabled: boolean;
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: AuditAction | string;
  entity_type: string | null;
  entity_id: number | null;
  description: string | null;
  created_at: string;
}

export interface ScopeMetrics {
  buildings: number;
  panels: number;
  zones: number;
  fire: number;
  fault: number;
  isolation: number;
}

export interface AlarmReportRow {
  s_no: number;
  building_name: string | null;
  panel_name: string;
  panel_code: string;
  zone_name: string;
  zone_number: number;
  previous_state: string;
  new_state: string;
  created_at: string;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  mobile_no?: string;
  organization_id?: number | null;
  parent_user_id?: number | null;
  remarks?: string | null;
  role_ids: number[];
  building_ids: number[];
}

export interface UpdateUserInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  mobile_no?: string;
  organization_id?: number | null;
  parent_user_id?: number | null;
  remarks?: string | null;
}
