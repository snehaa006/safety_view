# SafetyView — Fire & Water Safety Dashboard

A modular dashboard for monitoring fire and water safety devices.

**Stack:** React 18 + **TypeScript** + Vite, **Tailwind CSS** with
**shadcn/ui** components, React Router (dynamic routes per page), Supabase
(PostgreSQL via PostgREST), JWT-style session in `localStorage`.

It is built against **SafetyView schema v4**:

```
groups → devices → zones (exactly 16 per device) → zone_status
users get one or more devices via the user_devices join table (within a group).
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

## Routes

Every page has its own URL (deep-linkable; SPA fallback in `vercel.json`):

| Route | Page | Access |
| --- | --- | --- |
| `/login` | Sign in | public |
| `/devices` | Device list | all |
| `/devices/:deviceId` | Device dashboard — Overview tab | all |
| `/devices/:deviceId/fire` `…/water` `…/events` | Device dashboard tabs | all |
| `/device-management` | Device CRUD | admin |
| `/users` | User list (search / filter / delete) | admin |
| `/users/new` | Create user | admin |
| `/users/:id` | Full user detail | admin |
| `/users/:id/edit` | Edit user (separate page) | admin |

## Folder structure

```
src/
  components/
    ui/             shadcn/ui primitives (button, input, select, table,
                    dialog, card, badge, checkbox, dropdown-menu, label)
    auth/           ProtectedRoute, AdminRoute guards
    layout/         Sidebar, Topbar, DashboardLayout (router <Outlet/>)
    dashboard/      SummaryCards, ZoneGrid/Tile, ZoneDetailModal,
                    ZoneCharts, EventsLog
  context/          AuthContext (session incl. device_id / group_id)
  pages/            LoginPage, DevicesPage, DeviceDashboardPage,
                    DeviceManagementPage, UserManagementPage,
                    UserFormPage, UserDetailPage
  services/         supabase.ts (client), api.ts (typed data access)
  types/            shared domain types (schema v4)
  lib/utils.ts      cn() class-merge helper
  index.css         Tailwind layers + design tokens (CSS variables)
```

## Data access (`src/services/api.ts`)

Fully typed against schema v4. Key functions:

- `login` / `logout` / `decodeToken` — `check_password` RPC + profile lookup.
- `fetchDevices(user)` — devices visible to the user (admin = all, else their
  assigned devices), each with a live fire/fault zone summary + derived status.
- `fetchDeviceById` / `fetchZonesByDevice` / `fetchEventsByDevice` / `acknowledgeEvent`.
- `fetchGroups`, `createDevice` / `updateDevice` / `deleteDevice`.
- `fetchUsers` / `fetchUserById`, `createUser` (RPC `create_user_with_password`),
  `updateUser`, `setUserDevices` (many-to-many), `toggleUserActive`, `deleteUser`.

## Theme

Tailwind theme in `tailwind.config.js`; shadcn CSS variables + domain status
palette (water / fire / ok / warn / crit / off) in `src/index.css`.
