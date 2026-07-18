# SafetyView — Fire Alarm Monitoring System

A modular dashboard for monitoring fire alarm panels and their zones across an
organisation's buildings, with role-based access, alerting, reporting, and a
graphical **mimic** (floor-plan) view of each panel.

**Stack:** React 18 + **TypeScript** + Vite, **Tailwind CSS** with
**shadcn/ui** components, React Router (deep-linkable routes per page),
Supabase (PostgreSQL via PostgREST), a JWT-style session in `localStorage`, and
a small self-contained SVG **graphics engine** (`src/graphics`) powering the
mimic editor.

## Architecture (v6)

```
organizations
groups ─┐
        ├─► buildings ─► panels ─► zones ─► zone_status / zone_events
locations┘
users ──(user_roles)──► roles          (roles are many-to-many)
users ──(user_buildings)──► buildings   (a user's access scope)
```

- **Roles are many-to-many** via the `user_roles` join table. The built-in
  hierarchy (most → least senior) is `SUPER_ADMIN`, `NATIONAL_MANAGER`,
  `REGIONAL_MANAGER`, `DISTRICT_MANAGER`, `SUPERVISOR`, `BUILDING_OPERATOR`.
  Custom roles can be created too. `SUPER_ADMIN` has full admin access in the UI.
- **Access is scoped by `user_buildings`.** A non-admin user only sees the
  buildings (and their panels/zones) they are linked to. `SUPER_ADMIN` sees
  everything.
- **Zones** carry a state (`HEALTHY` / `FIRE` / `FAULT` / `ISOLATION`) and live
  readings; **panels** carry a status (`NORMAL` / `ALARM` / `FAULT` / `OFFLINE`).
- **Manual actions** on a zone: `TEST`, `HOOTER_ON`, `HOOTER_OFF`, `RESET`.

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:5173 and sign in with a username/password that exists in
the `users` table. Passwords are verified server-side by the `check_password`
Postgres RPC (bcrypt via pgcrypto) — see `db/functions.sql`.

Scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc` type-check + production build |
| `npm run typecheck` | Type-check only (`tsc --noEmit`) |
| `npm run preview` | Preview the production build |

## Database

Run the SQL in `db/` once against your Supabase project (SQL Editor). Both
files are idempotent.

- **`db/functions.sql`** — architecture v6 schema functions & RLS policies:
  `check_password` (bcrypt auth), user/role/building management RPCs, audit and
  login logging, and the typed views the app reads through PostgREST.
- **`db/panel_layouts.sql`** — the `panel_layouts` table backing the mimic
  view. Each panel has at most one layout: a background floor-plan image plus
  shapes, where every shape references a real `zones.id` so the drawn shape
  shows that zone's live fire/fault state. Stored as the `@/graphics` engine's
  JSON scene.

## How it works

- **Login** → the app reads the user's roles (from `user_roles`) and
  `organization_id`; the session is a JWT-style token in `localStorage`.
- **Overview** (`/buildings`, landing page) → the buildings in the user's scope,
  each with live panel/zone counts and fire/fault rollups. `SUPER_ADMIN` sees
  every building; others see only their `user_buildings`.
- **Building → Panels → Zones** → drill into a building to see its panels, then
  a panel to see its zones with live state, readings, and available manual
  actions. Tap a zone for detail.
- **Mimic editor** (`/panels/:panelId/mimic`) → a graphical floor-plan view of a
  panel. Draw shapes over a background image and bind each to a real zone; the
  shape then reflects that zone's live status. Built on the `@/graphics` engine.
- **Alerts** (`/alerts`) → fire/fault events across the user's scope, with
  per-user alert preferences (channel/destination/severity) in Settings.
- **Reports** (`/reports`) → alarm history reports for the accessible scope.
- **Admin** → CRUD for organizations, groups, locations, buildings, panels,
  users, and roles; plus **Audit Log** and **Login Logs**.

## Routes

Every page has its own URL (deep-linkable; SPA fallback in `vercel.json`).
Admin-only routes are guarded by `AdminRoute`; the rest by `ProtectedRoute`.

| Route | Page | Access |
| --- | --- | --- |
| `/login`, `/forgot-password` | Auth | public |
| `/buildings` | Overview (building list) | all |
| `/buildings/:buildingId` | Panels in a building | all |
| `/panels/:panelId` | Zones in a panel | all |
| `/panels/:panelId/mimic` | Panel mimic editor | all |
| `/all-buildings`, `/all-panels` | Flat cross-scope lists | all |
| `/fire-zones`, `/fault-zones` | Zones filtered by state | all |
| `/alerts` | Alerts feed | all |
| `/reports` | Alarm reports | all |
| `/profile`, `/settings` | User profile & preferences | all |
| `/users`, `/users/new`, `/users/:id`, `/users/:id/edit` | User management | admin |
| `/roles/*` | Role management | admin |
| `/organizations/*` | Organization management | admin |
| `/groups/*` | Group management | admin |
| `/locations/*` | Location management | admin |
| `/building-management/*` | Building CRUD | admin |
| `/panel-management/*` | Panel CRUD | admin |
| `/audit-log`, `/login-logs` | Audit & login logs | admin |

## Folder structure

```
src/
  components/
    ui/             shadcn/ui primitives (button, input, select, table, dialog,
                    card, badge, checkbox, dropdown-menu, label, spinner,
                    pagination-nav, password-input, confirm-dialog)
    auth/           ProtectedRoute, AdminRoute guards
    layout/         Sidebar, Topbar, DashboardLayout (router <Outlet/>)
    common/         Highlight (search-term highlighting)
  context/          AuthContext (session), AppSettingsContext (app name / logo)
  pages/            one component per route (Buildings, Panels, Zones, Alerts,
                    Reports, Users, Roles, Organizations, Groups, Locations,
                    management + detail + form pages, Audit/Login logs, etc.)
  features/
    zone-editor/    the domain layer that binds zones onto graphics shapes
  graphics/         self-contained SVG vector engine (see graphics/README.md)
  services/         supabase.ts (client), api.ts (typed data access)
  types/            shared domain types (architecture v6)
  lib/              roles.ts (role hierarchy helpers), password.ts, utils.ts
  utils/format.ts   formatting helpers
  index.css         Tailwind layers + design tokens (CSS variables)
```

## Data access (`src/services/api.ts`)

Fully typed against architecture v6. Grouped by concern:

- **Auth** — `login` / `logout` / `decodeToken` / `getToken`, `changePassword`,
  `adminSetPassword`, `resetPasswordByIdentity`.
- **Reference data** — `fetch*/create*/update*/delete*` for `Roles`,
  `Organizations`, `Groups`, `Locations`.
- **Buildings / panels / zones** — `visibleBuildingIds`, `fetchBuildings`,
  `fetchBuildingById`, building CRUD; `fetchPanelsByBuilding`, `fetchAllPanels`,
  `fetchPanelById`, panel CRUD, `fetchPanelsForUser`; `fetchZonesByPanel`,
  `fetchZonesByState`, `updateZoneName`, `performZoneAction`; `fetchZoneEvents`,
  `fetchActionLogs`; `summariseBuildings`.
- **Users** — `fetchUsers` / `fetchUserById`, `createUser`
  (RPC `create_user_with_password`), `updateUser`, `setUserRoles`,
  `setUserBuildings` (M2M), `toggleUserActive`, `deleteUser`.
- **Alerts / logs / settings** — `fetchAlerts`, `fetchAlertPreferences` /
  `setAlertPreferences`, `fetchLoginLogs`, `fetchAuditLog`, `fetchAppSettings` /
  `saveAppSettings`, `fetchAlarmReportData`.

## Graphics / mimic engine

`src/graphics` is a small, dependency-free (React + SVG only), domain-agnostic
2-D vector engine — draw/select/move/resize, undo/redo, pan & zoom, JSON-safe
scenes. The `src/features/zone-editor` layer binds real zones onto its shapes so
each shape renders that zone's live status. See `src/graphics/README.md` for the
engine's API and concepts.

## Theme

Tailwind theme in `tailwind.config.js`; shadcn CSS variables + domain status
palette (water / fire / ok / warn / crit / off) in `src/index.css`. App name and
logo are configurable at runtime via `AppSettingsContext`.
