# SafetyView — Fire & Water Safety Dashboard (React)

A modular React dashboard for monitoring fire and water safety devices.
Stack: React + Vite frontend, Supabase (PostgreSQL via PostgREST), JWT-style
session in `localStorage`.

It is built against **SafetyView schema v4**:

```
groups → devices → zones (exactly 16 per device) → zone_status
users are assigned ONE device (users.device_id) inside a group.
```

There are no `buildings` / `panels` tables — zones belong directly to a device.

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:5173 and sign in with a username/password that exists in
the `users` table. Passwords are verified server-side by the `check_password`
Postgres RPC (pgcrypto).

## How it works

- **Login** → the app reads the user's `role`, `device_id` and `group_id`.
- **Devices view** (landing page):
  - `ADMIN` sees **every** device.
  - Any other role sees **exactly the devices assigned to them** via the
    `user_devices` join table (a hand-picked subset of their group). If a user
    has no explicit assignments yet, the app falls back to all devices in their
    group, then their single `device_id`.
- **User Management** (admin) → create/edit users and tick **one or more
  devices** from the user's group to grant access. Assignments live in
  `user_devices`; the first ticked device is also stored as the primary
  `users.device_id`.
- **Click a device** → opens its dashboard: summary cards, water/pressure
  charts, recent events, and the device's 16 zones. Tap a zone for full sensor
  detail.
- **Device Management** (admin only) → add / edit / delete devices and assign a
  group. A device's `ASSIGNED` / `NOT_ASSIGNED` badge is derived automatically
  from whether any user is linked to it.

## Folder structure

```
src/
  components/
    auth/           Login page, route guard
    layout/         Sidebar, Topbar, page shell
    dashboard/      Summary cards, device list, device & user management,
                    zone grid/tiles, charts, events log
  context/          AuthContext (session state incl. device_id / group_id)
  pages/            DashboardPage (devices → device dashboard, admin panels)
  services/
    supabase.js     Supabase client
    api.js          All data access against schema v4
  utils/            Status colors, formatting helpers
  styles/           Global design tokens (colors, spacing, fonts)
```

## Data access (`src/services/api.js`)

Key functions, all scoped to the v4 schema:

- `login(username, password)` — `check_password` RPC + profile lookup.
- `fetchDevices(user)` — devices visible to the user (admin = all, else their
  assigned device), each with a live fire/fault zone summary.
- `fetchZonesByDevice(id)` — a device's 16 zones + `zone_status` + the latest
  `sensor_readings` row per zone.
- `fetchEventsByDevice(id)` / `acknowledgeEvent(id)`.
- `fetchGroups()`, `createDevice` / `updateDevice` / `deleteDevice`.
- `fetchUsers`, `createUser` (RPC `create_user_with_password` + profile patch),
  `updateUser`, `toggleUserActive`.

No component code needs to change to point at a different backend as long as
these functions return the same shapes.

## Theme

White background with light accent boxes for status (water = light blue,
fire = light orange/red, fault = light amber, normal = light green). All tokens
live in `src/styles/global.css`.
