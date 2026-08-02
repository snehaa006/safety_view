# Project Report

## Web Application Development — Softchip Instrumentation IoT Projects

**Projects covered**

1. **Complaint Management & Service Tracking System** (repository: `complaint-dash`)
2. **SafetyView — Fire Alarm Monitoring System** (repository: `safety_view`)

| | |
|---|---|
| **Organisation** | Softchip Instrumentation |
| **Domain** | Industrial IoT — field service management & life-safety monitoring |
| **Report date** | 2 August 2026 |
| **Deliverables** | Two production-ready React + TypeScript web applications, each backed by a Supabase (PostgreSQL) database and deployed on Vercel |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Objectives](#2-objectives)
3. [Common Technology Stack & Rationale](#3-common-technology-stack--rationale)
4. [Project I — Complaint Management & Service Tracking System](#4-project-i--complaint-management--service-tracking-system)
5. [Project II — SafetyView, Fire Alarm Monitoring System](#5-project-ii--safetyview-fire-alarm-monitoring-system)
6. [Comparative Analysis](#6-comparative-analysis)
7. [Quantitative Summary of Work Delivered](#7-quantitative-summary-of-work-delivered)
8. [Engineering Challenges & Resolutions](#8-engineering-challenges--resolutions)
9. [Achievements & Benefits Gained](#9-achievements--benefits-gained)
10. [Known Limitations & Future Scope](#10-known-limitations--future-scope)
11. [Conclusion](#11-conclusion)

---

## 1. Executive Summary

Softchip Instrumentation manufactures and services instrumentation and life-safety
equipment deployed at customer premises. Two operational problems were identified in the
after-sales and monitoring workflow:

- **Service complaints were tracked informally** — raised over phone/email, assigned by
  word of mouth, with no auditable record of who did what, no visibility into whether a
  ticket was breaching its promised turnaround, and no consolidated analytics for
  management.
- **Fire alarm panels installed across customer buildings had no unified dashboard** —
  panel and zone health could only be inspected physically at the panel itself, and there
  was no historical alarm record, no role-scoped access, and no visual (floor-plan) view
  of which physical area a zone corresponds to.

Two independent web applications were designed and built to address these, sharing a
common architectural approach (React + TypeScript single-page application talking directly
to a PostgreSQL database through Supabase's auto-generated REST layer) but differing
substantially in domain model and specialised functionality.

Both systems are complete, deployable and in a working state:

| | Complaint Management System | SafetyView |
|---|---|---|
| Purpose | Complaint intake → assignment → resolution, with SLA tracking | Live fire-alarm panel/zone monitoring, alerting and reporting |
| Application code | 56 TypeScript/TSX modules, ~5,600 lines | 82 TypeScript/TSX modules, ~10,400 lines |
| Database code | 1,117 lines of SQL + 7 migration scripts | 359 lines of SQL (RPCs, RLS, views) |
| Domain tables | 13 | 16 |
| Distinct application routes | 40+ | 30+ |
| Version-control history | 43 commits across 19 merged pull requests | 97 commits across 41 merged pull requests |

---

## 2. Objectives

**Common objectives (both projects)**

- Deliver a browser-based, deep-linkable single-page application requiring no installation
  on the customer's machine.
- Enforce **role-based access control**, so that each class of user sees only the data
  within their operational scope.
- Maintain a **tamper-resistant audit trail** of significant actions, written by the
  database rather than the client.
- Keep the entire stack on managed infrastructure (Supabase + Vercel) so there is no
  server for Softchip to operate, patch or scale.
- Make the schema reproducible: a single idempotent SQL script must be able to build the
  whole database from an empty project.

**Project-specific objectives**

*Complaint Management System*
- Model the customer's real organisational geography (Zone → Circle → Branch).
- Track a complaint through a strictly validated lifecycle, with every transition logged.
- Compute and display **Service Level Agreement (SLA)** compliance per complaint.
- Allow field evidence — photographs, video, recorded voice notes, documents — to be
  attached to a complaint from a mobile browser.
- Provide management analytics with export to PDF and Excel.

*SafetyView*
- Model the installed-base hierarchy (Organisation → Group/Location → Building → Panel →
  Zone) and scope every user's visibility to the buildings assigned to them.
- Surface live zone state (Healthy / Fire / Fault / Isolation) and panel status
  (Normal / Alarm / Fault / Offline).
- Support **manual field actions** on a zone (Test, Hooter On, Hooter Off, Reset) with a
  logged record of each.
- Provide a **graphical mimic view** — an actual floor plan of the building with drawn
  shapes bound to real zones, so an operator sees *where* an alarm is, not just its number.

---

## 3. Common Technology Stack & Rationale

| Layer | Technology | Why it was chosen |
|---|---|---|
| Language | **TypeScript** | Compile-time guarantees across a large surface of database-shaped data; every table has a matching interface so a schema change surfaces as a type error rather than a runtime crash. |
| UI framework | **React** (19 in Complaint Management, 18 in SafetyView) | Component reuse across ~40 screens per app; large ecosystem. |
| Build tool | **Vite** | Near-instant dev-server start and hot module replacement; produces an optimised static bundle for CDN hosting. |
| Routing | **React Router** | Every screen — including create/edit forms and detail views — has its own URL, so pages are bookmarkable, shareable and support browser back/forward. |
| Styling | **Tailwind CSS** + design tokens as CSS variables | Utility-first styling keeps visual consistency without a growing custom stylesheet; theming (colour palette, status colours) is centralised in CSS variables and can be re-skinned in one file. |
| Components | **Radix UI** primitives / **shadcn-ui** pattern | Accessible, unstyled primitives (dialog, select, dropdown, tabs, toast) that are styled locally and committed into the repo — no opaque third-party design system to fight. |
| Charts | **Recharts** | Declarative React charting for the analytics dashboards. |
| Backend + Database | **Supabase** (PostgreSQL, PostgREST, Row Level Security, Storage, Realtime) | Removes the need to write and host a bespoke API server: PostgREST exposes the schema as a typed REST API, business rules live in the database as functions and triggers, and file storage and websocket subscriptions come from the same platform. |
| Hosting | **Vercel** | Static build + SPA rewrite configured in `vercel.json`; Git-push deploys. |

### 3.1 The architectural decision: a "thick database, thin API" model

Neither project runs a custom Node/Express backend. This is a deliberate architectural
choice and the single most important thing to understand about both codebases:

```
  Browser (React SPA)
        │  HTTPS, anon key
        ▼
  PostgREST  ← auto-generated REST endpoints over the schema
        │
        ▼
  PostgreSQL  ← tables, views, enums, indexes
        ├── SECURITY DEFINER functions (RPCs)  → authentication, privileged writes
        ├── Triggers                            → validation, audit, notifications
        └── Row Level Security policies         → access gate
```

**Consequences of this model, and how they were handled:**

- *Business rules that must never be bypassed live in the database, not the client.*
  For example, the complaint lifecycle is enforced by a PostgreSQL trigger; even a
  hand-crafted HTTP request cannot move a complaint from `open` straight to `resolved`.
  Similarly, audit rows are written by triggers, so the client cannot choose to omit them.
- *The database is the API contract.* The TypeScript type definitions
  (`src/types/index.ts` in both projects) are hand-maintained mirrors of the schema; a
  change to one must be made to the other in the same change-set.
- *Secrets never reach the browser.* Password hashes are protected by column-level grants
  so that only `SECURITY DEFINER` functions can read or write them; the browser holds only
  the public anon key.

---

## 4. Project I — Complaint Management & Service Tracking System

Repository: `complaint-dash` · Application name: *Complaint Management & Service Tracking System*

### 4.1 Problem statement and users

Organisations that operate a large branch network (the reference customer being a bank)
raise service complaints against installed equipment. Three classes of user participate:

| Role | Responsibility in the system |
|---|---|
| **System Administrator** (`admin`) | Owns the whole system: creates and approves user accounts, maintains the Zone/Circle/Branch geography and the equipment register, assigns complaints to field engineers, configures categories, reads the audit log, exports management reports. |
| **Bank Official** (`bank_official`) | The complainant. Raises complaints for the branches assigned to them, attaches evidence, tracks progress, confirms and closes a resolved complaint, and rates the service 1–5. |
| **System Integrator** (`system_integrator`) | The field service engineer. Sees only complaints assigned to them, moves them through the workflow, commits an estimated resolution time, records service notes, uploads maintenance reports. |

### 4.2 Domain model

```
Zone ──► Circle ──► Branch ──► Panel        (installed equipment)
                       │
                       └────► Complaint ──► status history
                                        ├─► notes
                                        └─► attachments
Users ──(user_branch_assignments)──► Branch  (a bank official's scope)
```

A deliberate constraint of the customer's operating model was captured in the schema: a
Circle contains **at most one** Branch. This is enforced with a `unique` constraint on
`branches.circle_id`, so an attempt to create a second branch under an occupied circle is
rejected by the database, not merely discouraged by the UI.

Deletion is **cascading by design**: removing a Zone removes its Circles, their Branch,
that Branch's Panels and Complaints, and each Complaint's notes, attachments and status
history. This was chosen so that a delete action in the UI always succeeds cleanly rather
than failing on a foreign-key violation and leaving the administrator stuck.

### 4.3 Database design

**13 tables**: `users`, `zones`, `circles`, `branches`, `user_branch_assignments`,
`complaint_categories`, `panels`, `complaints`, `complaint_status_history`,
`complaint_notes`, `complaint_attachments`, `notifications`, `audit_logs`.

**8 enumerated types** give the schema its vocabulary and make invalid values
unrepresentable:

| Enum | Values |
|---|---|
| `user_role` | admin, bank_official, system_integrator |
| `user_status` | pending, active, inactive |
| `panel_status` | active, maintenance, inactive |
| `complaint_status` | open, in_progress, resolved, closed, rejected |
| `complaint_priority` | low, medium, high, critical |
| `attachment_type` | image, video, audio, pdf, document |
| `notification_event` | created, assigned, status_changed, resolved |
| `notification_channel` | email, sms, whatsapp, in_app |

**12 indexes** were added on every foreign key and on the columns the list screens filter
by (`complaints.status`, `complaints.branch_id`, `complaints.assigned_to`,
`complaints.category_id`, `audit_logs.entity_type/entity_id`, etc.), so filtered list views
remain index-backed as the complaint table grows.

**One view**, `complaint_location_view`, denormalises the Branch → Circle → Zone chain onto
each complaint so that the dashboard's geographic charts are a single query rather than a
client-side join across four tables.

**Server-side logic** — 13 functions and 9 triggers. The significant ones:

| Object | What it does |
|---|---|
| `generate_ticket_number()` (trigger) | Allocates the human-readable ticket number on insert, so numbering is server-controlled and gap-free rather than guessed by the client. |
| `enforce_complaint_status_transition()` (trigger) | **The core business rule.** Validates every status change against the permitted lifecycle: `open → in_progress → resolved → closed`, with `open → rejected` as a branch. Additionally, `resolved → closed` is permitted only to a `bank_official` (the complainant confirms the fix), and any transition to `rejected` is permitted only to an `admin`. |
| `insert_status_history()` | Writes the immutable transition record consumed by the timeline UI. `complaint_status_history` is protected by an RLS policy that forbids direct client inserts — rows can only arrive via this function. |
| `notify_complaint_event()` (trigger) | Generates notification rows on create / assign / status-change / resolve. |
| `audit_complaint_created()`, `audit_users_change()`, `audit_zones_change()`, `audit_circles_change()`, `audit_branches_change()`, `audit_user_branch_assignment_change()` (triggers) | Write the audit log server-side for every consequential mutation. |
| `touch_updated()` (trigger) | Maintains `updated_at` timestamps. |

**Authentication** (`database/auth.sql`) is a custom username/password scheme rather than
Supabase's built-in session auth, because the customer required plain usernames (not email
addresses) as the login identity:

- `create_user_with_password(...)` — `SECURITY DEFINER`; hashes with bcrypt via `pgcrypto`.
- `verify_user_password(username, password)` — verifies the bcrypt hash and returns the
  application user row.
- `change_own_password(user_id, current, new)` — re-verifies the current password before
  replacing the hash, so a stolen session cannot silently change a password.
- `guard_password_hash()` (trigger) plus **column-level grants** that withhold
  `users.password_hash` from the `anon` and `authenticated` roles — the hash is unreadable
  and unwritable except through the definer functions above.

**Storage**: a Supabase Storage bucket with its own policies backs complaint attachments;
the `complaint_attachments` table stores the object path and the media type.

**Realtime**: the `notifications` table is added to the `supabase_realtime` publication, so
the browser receives new notifications over a websocket instead of polling.

### 4.4 Frontend design

56 modules organised as:

```
src/
  components/    Layout, Sidebar, TopBar, DataTable, DetailLayout, FormLayout,
                 ComplaintTimeline, SlaBadge, PanelQRCode, ui/ (11 primitives)
  hooks/         useAuth (session), useNotifications (realtime feed)
  lib/           supabase client, sla.ts (SLA engine), attachments.ts, utils
  pages/         27 route components
  types/         TypeScript mirror of the schema
```

**Route-per-screen architecture.** An early design decision was to give every action its
own URL instead of opening modals — `/zones/new`, `/zones/:zoneId`, `/zones/:zoneId/edit`,
and so on across all eight entities. The benefit is that any screen can be linked to,
refreshed, or reached with the browser's back button; the cost is more route components,
which was mitigated by three shared layout components (`DetailLayout`, `FormLayout`,
`DataTable`) that all pages compose.

**Drill-down navigation.** Every list row is clickable and opens that record's detail page,
which in turn offers a "View <next level>" button that navigates down the hierarchy with
the filter pre-applied through URL search parameters: a Zone links to
`/circles?zone=:id`, a Circle to `/branches?circle=:id`, a Branch to
`/complaints?branch=:id`. Because filters live in the URL, a filtered view is itself a
shareable link.

**The SLA engine** (`src/lib/sla.ts`) is a self-contained module implementing the promised
turnaround per priority:

| Priority | SLA target |
|---|---|
| Critical | 4 hours |
| High | 24 hours |
| Medium | 72 hours |
| Low | 168 hours (7 days) |

The due time is computed on the client as `created_date + target` rather than stored in the
database. This was a considered trade-off: storing it would require a schema column and a
background job to re-evaluate breaches, whereas computing it means the countdown ticks live
in the browser with zero server cost and no migration to keep in sync. The clock stops on
`resolved`/`closed`/`rejected`; terminal complaints report an outcome (**SLA met** or
**SLA breached**) rather than a countdown. The list view renders a colour-graded badge per
row (green → amber → red), highlights overdue rows and offers an *Overdue / On track*
filter; the detail view shows a live countdown.

**Complaint detail** renders the lifecycle as a visual timeline (Created → Assigned → In
Progress → Resolved → Closed, with a Rejected branch) driven by `complaint_status_history`,
alongside the live SLA countdown, the integrator's committed resolution time, the service
notes thread, the satisfaction rating and the attachment gallery — with inline image
thumbnails and inline video/audio players.

**Evidence capture** supports photographs, video, documents and **voice notes recorded
directly in the browser** via the MediaRecorder API, which matters because complaints are
frequently raised from a phone at the branch.

**Analytics dashboard** (`DashboardPage.tsx`, ~620 lines) is role-scoped — the administrator
sees system-wide figures, a bank official sees only their assigned branches, an integrator
sees only their own assignments. It presents KPI cards (open / in-progress / resolved /
closed / rejected / overdue), complaints by category, complaints by priority, a monthly
trend comparing *Raised* against *Resolved*, geographic distribution by zone and circle, a
Top-10 branches ranking, and average resolution time. **Every chart element is a filter**:
clicking a KPI card, a bar or a pie slice deep-links to the pre-filtered complaints list.
For a bank official with fewer than five complaints the charts are suppressed as
statistically meaningless and only the KPI cards render.

**Reporting export** to PDF (`jspdf` + `jspdf-autotable`) and Excel (`exceljs`). Both
libraries are **lazy-loaded on demand**, keeping roughly a megabyte of dependency out of
the initial bundle for the majority of page loads that never export anything.

**Equipment QR codes.** Each registered panel gets a unique QR code (`qrcode.react`) with a
PNG download, deep-linking to that panel's detail page. A field engineer standing at the
equipment can scan it and immediately see the panel's details, current status and complaint
history.

**Audit log viewer** presents login events, user changes, geography changes and complaint
activity with a human-readable entity label, hover-to-reveal full entity IDs and a
formatted key/value detail modal in place of raw JSON.

### 4.5 Delivered module inventory

| Module | Routes | Notes |
|---|---|---|
| Dashboard | `/dashboard` | Role-scoped analytics, clickable charts, PDF/Excel export |
| Complaints | `/complaints`, `/complaints/new`, `/complaints/:id` | URL-synced filters, SLA badges, timeline, media, notes, rating |
| Users | `/users` + new/detail/edit/assign | Approval workflow, activate/deactivate, branch assignment |
| Zones / Circles / Branches | list + new/detail/edit for each | Geography CRUD with drill-down |
| Panels | `/panels` + new/detail/edit | Equipment register with QR codes |
| Categories | `/categories` + new/detail/edit | Configurable complaint taxonomy |
| Notifications | `/notifications` | Realtime feed, unread badge, toast, channel labels |
| Audit Logs | `/audit-logs` | Admin-only, trigger-written |
| Profile | `/profile` | All roles: details, phone, password change |

---

## 5. Project II — SafetyView, Fire Alarm Monitoring System

Repository: `safety_view` · Application name: *SafetyView* · Schema generation: **v6**

### 5.1 Problem statement and users

Fire alarm panels installed across a customer's building portfolio each supervise a number
of **zones** (a floor, a wing, a plant room). SafetyView aggregates all of them into a
single monitoring dashboard with historical reporting and a graphical floor-plan view.

Roles are **many-to-many** — a user may hold several — via a `user_roles` join table, with
a built-in seniority hierarchy:

```
SUPER_ADMIN → NATIONAL_MANAGER → REGIONAL_MANAGER → DISTRICT_MANAGER
            → SUPERVISOR → BUILDING_OPERATOR
```

Custom roles can also be created at runtime through the Roles admin screen. Crucially,
**role and scope are separate concerns**: a user's *permissions* come from `user_roles`,
while the *set of buildings they can see* comes from a second join table,
`user_buildings`. A `SUPER_ADMIN` sees every building; everyone else sees only their linked
buildings, and every query in the data layer is filtered accordingly.

### 5.2 Domain model (architecture v6)

```
organizations
groups ────┐
           ├──► buildings ──► panels ──► zones ──► zone_status
locations ─┘                                   └─► zone_events
users ──(user_roles)──────► roles         (M2M — permissions)
users ──(user_buildings)──► buildings     (M2M — visibility scope)
```

**State machines.** A zone carries one of `HEALTHY`, `FIRE`, `FAULT`, `ISOLATION` along with
live sensor readings; a panel carries `NORMAL`, `ALARM`, `FAULT`, `OFFLINE`. Four manual
actions may be performed on a zone — `TEST`, `HOOTER_ON`, `HOOTER_OFF`, `RESET` — each
written to `action_logs` so there is a record of who silenced or reset what, and when.

**16 tables** are consumed through PostgREST: `organizations`, `groups`, `locations`,
`buildings`, `panels`, `zones`, `zone_events`, `action_logs`, `alerts`, `users`, `roles`,
`user_roles`, `user_buildings`, `user_alert_preferences`, `login_logs`, `app_settings`,
plus `panel_layouts` for the mimic view.

### 5.3 Database design

The database layer is deliberately smaller than in the Complaint system — SafetyView reads
mostly through typed views and concentrates its server-side code in **8 RPC functions**,
all `SECURITY DEFINER`:

| RPC | Purpose |
|---|---|
| `check_password(username, password)` | bcrypt verification via `pgcrypto`; stamps `last_login` **only** when the credentials are valid, and only for active users. Returns identity columns only — no role column, because roles are read separately from `user_roles`. |
| `create_user(...)` | Creates a user with a hashed password; roles and building access are attached afterwards through the join tables. |
| `change_password(...)` | Self-service password change with old-password verification. |
| `admin_set_password(user_id, new)` | Administrative reset. |
| `reset_password_by_identity(username, email, new)` | Backs the Forgot Password flow — requires both identifiers to match. |
| `log_audit(...)` / `get_audit_log(limit)` | Writes and reads the audit trail. |
| `delete_user_cascade(user_id)` | Removes a user together with their role and building links in one transaction, so no orphaned join rows remain. |

`db/panel_layouts.sql` adds the `panel_layouts` table (one layout per panel, enforced), a
`set_updated_at()` trigger, RLS policy and grants. The layout is stored as the graphics
engine's JSON scene — a background floor-plan image plus a set of shapes, where **every
shape carries a real `zones.id`**.

Both SQL files are idempotent and can be re-run against an existing project safely.

### 5.4 Frontend design

82 modules, ~10,400 lines, organised into four clearly separated layers:

```
src/
  components/  ui/ (14 shadcn primitives), auth/ (ProtectedRoute, AdminRoute),
               layout/ (Sidebar, Topbar, DashboardLayout), common/
  context/     AuthContext (session), AppSettingsContext (runtime app name & logo)
  pages/       36 route components
  features/
    zone-editor/   domain layer binding zones onto graphics shapes
  graphics/        self-contained SVG vector engine (1,351 lines, zero dependencies)
  services/        supabase.ts (client) + api.ts (the entire data layer)
  types/           26 exported types/interfaces mirroring architecture v6
  lib/             roles.ts (hierarchy helpers), password.ts, utils.ts
```

#### 5.4.1 A single typed data-access layer

The strongest structural decision in this project is that **all database access is confined
to one module**, `src/services/api.ts` — 1,239 lines exporting **64 typed functions**. No
page component ever calls Supabase directly. The functions are grouped by concern:

| Group | Representative functions |
|---|---|
| Auth | `login`, `logout`, `decodeToken`, `getToken`, `changePassword`, `adminSetPassword`, `resetPasswordByIdentity` |
| Reference data | full `fetch`/`create`/`update`/`delete` sets for Roles, Organizations, Groups, Locations |
| Buildings / panels / zones | `visibleBuildingIds`, `fetchBuildings`, `fetchBuildingById`, building CRUD, `fetchPanelsByBuilding`, `fetchAllPanels`, `fetchPanelById`, panel CRUD, `fetchPanelsForUser`, `fetchZonesByPanel`, `fetchZonesByState`, `updateZoneName`, `performZoneAction`, `fetchZoneEvents`, `fetchActionLogs`, `summariseBuildings` |
| Users | `fetchUsers`, `fetchUserById`, `createUser`, `updateUser`, `setUserRoles`, `setUserBuildings`, `toggleUserActive`, `deleteUser` |
| Alerts / logs / settings | `fetchAlerts`, `fetchAlertPreferences`, `setAlertPreferences`, `fetchLoginLogs`, `fetchAuditLog`, `fetchAppSettings`, `saveAppSettings`, `fetchAlarmReportData` |

The benefit is concrete: access scoping is implemented **once**. `visibleBuildingIds(user)`
resolves a user's permitted building set (returning `null` as a sentinel meaning
"unrestricted" for `SUPER_ADMIN`), and every downstream query composes it. A change to the
scoping rule is a change in one function, not in thirty-six page components.

#### 5.4.2 The graphics engine and mimic editor — the technically hardest component

`src/graphics` is a **purpose-built, dependency-free 2-D vector engine** — 1,351 lines of
TypeScript over React and SVG only, with no third-party canvas or drawing library:

| Module | Lines | Responsibility |
|---|---|---|
| `GraphicsCanvas.tsx` | 602 | The SVG surface: rendering, pointer interaction, selection handles |
| `geometry.ts` | 244 | Hit-testing, bounding boxes, resize maths |
| `useGraphicsEditor.ts` | 222 | Editor state machine, undo/redo history |
| `types.ts` | 101 | Scene, shape and tool type definitions |
| `scene.ts` | 77 | JSON-safe scene serialisation |
| `camera.ts` | 52 | Pan and zoom transforms |
| `index.ts` | 53 | Public API surface |

It provides draw / select / move / resize, undo–redo, pan and zoom, and JSON-serialisable
scenes. It is **domain-agnostic by design** — it knows nothing about fire alarms — and is
documented independently in `src/graphics/README.md` as a reusable asset.

The fire-alarm meaning is supplied by a separate thin layer, `src/features/zone-editor`,
which binds each drawn shape to a real `zones.id` (`ZoneAssignDialog`), styles it by that
zone's live state (`zoneStyle.ts`), overlays live status (`ZoneOverlay`), and persists the
scene to `panel_layouts` (`storage.ts`).

The operational payoff: an operator opens `/panels/:panelId/mimic` and sees the actual floor
plan with each zone shaded by its live state. A fire condition is not a row in a table
saying "Zone 7" — it is a red region on the plan of the building, which is what somebody
responding to an alarm actually needs.

Achieving usable interaction took several iterations, recorded in the commit history:
persisting layouts to the database, moving the mimic from building level down to panel level
(the correct granularity, since zones belong to panels), making trackpad pan/zoom behave the
way designers expect from tools such as Figma, and progressively strengthening the visual
treatment of zone markings so they read clearly against a busy architectural drawing.

#### 5.4.3 Other delivered functionality

- **Overview** (`/buildings`, the landing page) — every building in scope with live panel
  and zone counts and fire/fault roll-ups, computed by `summariseBuildings`.
- **Drill-down** — Building → Panels → Zones, each level with live state, readings and the
  available manual actions.
- **Cross-scope views** — `/all-buildings`, `/all-panels`, and `/fire-zones` /
  `/fault-zones` which slice zones by state across the entire accessible scope, so an
  operator can answer "what is on fire *anywhere*" in one click.
- **Alerts** (`/alerts`) — fire and fault events across scope, with per-user alert
  preferences (channel, destination, severity) configured in Settings.
- **Reports** (`/reports`) — alarm history reporting over the accessible scope, backed by
  `fetchAlarmReportData`.
- **Administration** — full CRUD for Organizations, Groups, Locations, Buildings, Panels,
  Users and Roles, plus the Audit Log and Login Logs viewers.
- **Runtime white-labelling** — `AppSettingsContext` reads the application name and logo
  from the `app_settings` table, so the deployment can be re-branded for a customer without
  a rebuild. The name propagates to the browser tab title, the top bar and the login page.
- **Route guards** — `ProtectedRoute` requires a session; `AdminRoute` additionally requires
  administrative role, guarding all 8 admin route groups.

---

## 6. Comparative Analysis

| Dimension | Complaint Management System | SafetyView |
|---|---|---|
| **Primary purpose** | Workflow / process management | Live monitoring & situational awareness |
| **Data character** | Human-generated, low volume, long-lived | Device-generated, higher volume, time-series |
| **Access-control model** | Single role per user (enum column) + branch assignments | Many-to-many roles (`user_roles`) + building scope (`user_buildings`) — richer, supports custom roles |
| **Where business logic lives** | Heavily in the database — 9 triggers enforce lifecycle, audit and notification | Mostly in the typed data layer; database provides 8 auth/audit RPCs |
| **Data-access pattern** | Pages query Supabase through a shared client | All access funnelled through one 64-function typed API module |
| **Signature technical feature** | SLA engine with live countdown and breach analytics | Zero-dependency SVG graphics engine driving the floor-plan mimic view |
| **Analytics** | Rich clickable dashboard, PDF/Excel export | Alarm history reports, scope roll-ups |
| **Realtime** | Supabase Realtime websocket for notifications | Polled state reads |
| **Scale of codebase** | 56 modules / ~5,600 LOC / 1,117 SQL lines | 82 modules / ~10,400 LOC / 359 SQL lines |

**What the comparison demonstrates.** The two projects deliberately explore two different
points on the same architectural spectrum. The Complaint system pushes correctness into the
database, on the grounds that a status transition or an audit record must hold regardless of
which client is talking; SafetyView pushes structure into a single typed data layer, on the
grounds that visibility scoping is a read-side concern that must compose cleanly across
dozens of screens. Both are legitimate; having built both, the practical conclusion is that
**invariants belong in the database and composition belongs in the data layer** — the ideal
system uses both, as each of these does for its own dominant concern.

---

## 7. Quantitative Summary of Work Delivered

| Metric | Complaint Management | SafetyView | Total |
|---|---|---|---|
| TypeScript / TSX modules | 56 | 82 | **138** |
| Application lines of code | 5,579 | 10,361 | **15,940** |
| SQL lines (schema, RPCs, RLS) | 1,117 | 359 | **1,476** |
| Migration scripts | 7 | — (idempotent scripts) | 7 |
| Database tables | 13 | 16 (+1 layouts) | **30** |
| Enumerated types | 8 | 4 (as TS union types) | 12 |
| Database functions / RPCs | 13 | 8 | **21** |
| Triggers | 9 | 1 | 10 |
| RLS policies | ~20 | 1 + grants | ~21 |
| Indexes | 12 | — | 12 |
| Views | 1 | typed views per entity | — |
| Page / route components | 27 | 36 | **63** |
| Reusable UI primitives | 11 | 14 | 25 |
| Typed data-access functions | — (per-page queries) | 64 | 64 |
| Exported domain types | schema mirror | 26 | — |
| Distinct application routes | 40+ | 30+ | **70+** |
| Commits | 43 | 97 | **140** |
| Merged pull requests | 19 | 41 | **60** |

---

## 8. Engineering Challenges & Resolutions

The following are real problems encountered during development, each traceable to the
commit history, together with how they were resolved. They are included because the
diagnosis is the substance of the engineering work.

### 8.1 Row Level Security versus custom authentication (Complaint Management)

**Problem.** The application authenticates through a custom `verify_user_password` RPC and
connects with the public anon key. It therefore never opens a Supabase Auth session, which
means `auth.uid()` is `NULL` on every request (visible as `"auth_user": null` in the API
logs). Every RLS policy written in terms of `auth.uid()` or a `current_user_role()` helper
derived from it was consequently unable to identify the caller. The symptoms were severe and
initially confusing: writes failed with *"new row violates row-level security policy"*, and
reads silently returned empty result sets — a user created successfully through the
`SECURITY DEFINER` RPC did not appear in the Users list afterwards.

**Diagnosis.** The failure is structural rather than a policy bug: the policies were correct
SQL, but they were evaluating an identity that the chosen authentication model never
supplies.

**Resolution adopted.** Application tables were moved to permissive RLS, with the access
gate enforced in the UI (`Sidebar.tsx` for navigation, `App.tsx` route guards for direct
URL access) and in the query layer (bank-official queries filter by
`user_branch_assignments`, integrator queries by `assigned_to`). The one control retained at
the database layer is the one that matters most: `users.password_hash` is withheld from
`anon`/`authenticated` by column-level grants, so credentials remain unreadable regardless
of what the client requests.

**Documented path to full enforcement.** This limitation is recorded honestly in the
project README. Restoring true database-level role enforcement requires the login RPC to
mint a signed Supabase JWT that the client installs via `supabase.auth.setSession()`, after
which `auth.uid()` and `current_user_role()` resolve server-side and the original policies
become effective without application changes. This is documented as the recommended next
step rather than quietly ignored.

### 8.2 Silent failures from missing table grants (Complaint Management)

Delete actions appeared to succeed in the UI but left rows in place. The cause was missing
`DELETE` grants to `anon`/`authenticated` on several tables — PostgREST returned a success
status while the operation affected nothing. Resolved by an explicit grants migration
(`20260708_fix_missing_table_grants.sql`), and folded back into the main `db.sql` so fresh
installations never hit it.

### 8.3 Deletion failing on foreign keys (Complaint Management)

Deleting a Zone or Circle failed whenever dependent records existed, leaving administrators
unable to correct data-entry mistakes. Resolved by making the hierarchy cascade explicitly
(`20260708_02_cascade_deletes_and_branch_circle_unique.sql`), and — after weighing
reversibility against usability — accepting hard deletes as the documented behaviour rather
than introducing soft-delete flags that every query would then have to respect.

### 8.4 Idempotent seeding and orphaned auth rows (Complaint Management)

Re-running the setup script produced duplicate-key errors on the seeded administrator, and
`auth.users` rows could be left orphaned relative to `public.users`. Resolved by making the
seed idempotent and by extending `create_user_with_password` to self-heal an orphaned row
rather than requiring manual intervention in the SQL editor. The value of this is that the
setup instructions remain a simple "run these two files", with no caveats.

### 8.5 Notification feed leaking across users (Complaint Management)

The notification feed and the *mark all read* action were initially unscoped, so a user
could see notifications generated for others. Fixed by scoping both the feed and the
realtime subscription to the logged-in user.

### 8.6 Getting the mimic editor's interaction model right (SafetyView)

Three distinct rounds of work were required after the engine itself was functional:
correcting the granularity (the mimic belongs to a **panel**, not a building, because zones
belong to panels); fixing trackpad pan-and-zoom to match the conventions users already know
from Figma, since the initial mapping of wheel events was actively disorienting; and
strengthening the visual treatment of zone markings — larger name-only labels and stronger
fills — after testing showed subtle overlays were illegible against a detailed architectural
floor plan. This is a useful reminder that for an operator-facing tool, legibility under
real conditions is a functional requirement, not a cosmetic one.

### 8.7 Role naming drift between application and database (SafetyView)

Role names were compared case-sensitively in the application while stored differently in the
database, so role checks silently failed. Standardised on `UPPER_SNAKE_CASE` matching the
database, with comparison helpers centralised in `src/lib/roles.ts`.

### 8.8 Audit logging breaking user creation (SafetyView)

An RLS error on the `audit_log` insert that follows user creation was aborting the whole
operation, so users could not be created. Resolved by making the post-creation audit step
non-fatal — an audit failure now degrades logging rather than blocking the primary action.

---

## 9. Achievements & Benefits Gained

### 9.1 Delivered to the organisation

1. **Two complete, deployable products**, not prototypes — each with authentication, role-based
   access, full CRUD across its domain, analytics, audit trail and production deployment
   configuration.
2. **A digitised complaint workflow with measurable SLAs.** Turnaround is no longer anecdotal:
   every complaint carries a target derived from its priority, breaches are visible at a
   glance in the list view, and management can export compliance evidence to PDF or Excel.
3. **Accountability by construction.** Because audit records and status history are written by
   database triggers, the record of who did what cannot be bypassed by a client — which is
   precisely the property an audit trail must have to be worth keeping.
4. **A unified view of the installed fire-safety base**, replacing physical inspection at the
   panel with a role-scoped dashboard, historical alarm reporting, and a floor-plan view that
   answers *where* an alarm is, not merely *which number* it is.
5. **A reusable engineering asset.** The SVG graphics engine is domain-agnostic, dependency-free
   and separately documented; it can be lifted into any future Softchip product needing
   interactive schematics, plant diagrams or instrument layouts.
6. **Zero operational burden.** No servers to provision, patch or scale: managed PostgreSQL and
   storage on Supabase, static hosting on Vercel, deploy on Git push.
7. **Reproducible infrastructure.** Each database is rebuildable from an idempotent SQL script,
   so a fresh customer environment is a matter of running two files rather than restoring a
   snapshot of unknown provenance.
8. **Documentation that stays accurate.** Both repositories carry a `CLAUDE.md` convention
   requiring the README and SQL files to be updated in the same change-set as the code, so the
   documentation does not silently rot away from the implementation.

### 9.2 Technical capability gained

- **Full-stack TypeScript.** End-to-end type safety from PostgreSQL enums through TypeScript
  union types into React props, and the discipline of keeping a hand-maintained type layer
  synchronised with a schema.
- **Relational database design.** Normalisation across a four-level hierarchy, enums as domain
  vocabulary, deliberate use of unique constraints to encode business rules, cascading
  referential integrity, denormalised views for analytics, and index placement driven by the
  actual filter patterns of the UI.
- **Server-side programming in PL/pgSQL.** Triggers for validation, auditing and event
  generation; `SECURITY DEFINER` functions as a privilege boundary; column-level grants to
  protect credentials.
- **Applied security thinking.** bcrypt via `pgcrypto`; never trusting the client with a rule
  that matters; understanding *why* Row Level Security failed under a custom auth model rather
  than disabling it and moving on — and documenting the honest state of the system instead of
  overstating it.
- **React application architecture at scale.** 63 route components kept maintainable through
  shared layout primitives, context-based session and settings management, route guards, and
  URL-as-state so that filters and drill-downs are shareable.
- **Performance engineering.** Lazy-loading heavyweight export libraries; indexing to match
  query patterns; choosing client-side SLA computation over a stored column plus a background
  job.
- **Building a graphics engine from first principles** — hit-testing, transform maths, an undo
  stack, camera pan/zoom and serialisable scenes over raw SVG, with a clean separation between
  the generic engine and the domain layer bound on top of it.
- **Realtime application development** — websocket subscriptions, live badge counts and toast
  notifications, correctly scoped per user.
- **Professional version-control practice** — 140 commits across 60 reviewed pull requests, each
  branch scoped to a single concern with a descriptive message, giving a legible history in
  which every fix above can be traced to its cause.

---

## 10. Known Limitations & Future Scope

These are stated plainly; each is documented in the respective repository README.

### Complaint Management System

| Limitation | Status and path forward |
|---|---|
| **Database-level role enforcement is inactive.** Access control is enforced in the UI and query layer, not by RLS (see §8.1). | The schema, policies and helper functions already exist. The remaining work is for the login RPC to mint a signed Supabase JWT installed via `supabase.auth.setSession()`, restoring `auth.uid()` server-side. Password hashes *are* protected at the database layer today. |
| **Email / SMS / WhatsApp notifications are not dispatched.** | The schema, channel enum, event triggers and UI labelling are all in place, and in-app notifications are delivered live over Supabase Realtime. Dispatch requires a Supabase Edge Function wired to a provider (e.g. Resend, Twilio, WhatsApp Business API) with credentials the repository does not carry. |
| **Google Maps location selection is not wired up.** | Requires a billing-enabled Maps API key. Would let branches be pinned on a real map and the location shown to the assigned engineer. |
| **Hard deletes with no undo.** | A deliberate trade-off (§8.3); a soft-delete model with a restore view is the future option if the customer requires it. |

### SafetyView

| Area | Future scope |
|---|---|
| **Live device ingestion** | Zone and panel state is read from the database; a gateway/edge service polling or subscribing to the physical panels would close the loop to true real-time. |
| **Realtime push** | The Complaint system's Supabase Realtime pattern can be applied here so that a fire event updates the dashboard and mimic view without a refresh. |
| **Alert dispatch** | Alert preferences (channel, destination, severity) are captured; actual delivery over email/SMS/push requires the same Edge Function work described above. |
| **Mimic enhancements** | Multi-floor layouts per building, shape libraries for standard devices, and an operator-facing read-only mimic mode distinct from the editor. |
| **Reporting depth** | Scheduled report generation and export parity with the Complaint system's PDF/Excel output. |

### Cross-cutting

- **Automated testing.** Neither project carries a test suite; correctness currently rests on
  TypeScript's type checking (`npm run typecheck` is a required pre-commit step in SafetyView)
  and manual verification. Unit tests for the SLA engine and the graphics geometry module, and
  end-to-end tests for the two authentication flows, would be the highest-value additions and
  are the recommended first investment.
- **Shared component library.** The two projects have independently converged on similar UI
  primitives, layout patterns and table/filter behaviour; extracting a shared internal package
  would remove the duplication and speed up any third application.

---

## 11. Conclusion

Two production-grade web applications were designed, implemented, documented and deployed for
Softchip Instrumentation's IoT and instrumentation business: a **Complaint Management & Service
Tracking System** that converts an informal, phone-based after-sales process into an auditable
workflow with measurable service-level compliance, and **SafetyView**, a fire alarm monitoring
dashboard that consolidates a distributed installed base into one role-scoped view and renders
live zone status directly onto building floor plans.

Together they comprise roughly **16,000 lines of application code across 138 modules**, backed
by **30 database tables and 21 server-side functions**, delivered over **140 commits and 60
reviewed pull requests**.

The engineering value is not only in the feature list. It is in the decisions behind it: putting
invariants where they cannot be bypassed, funnelling data access through a single typed layer so
that a scoping rule is written once, choosing computation over storage where it removes a
migration and a background job, building a graphics engine as a domain-agnostic asset rather
than a one-off, and — where a limitation could not be resolved within the constraints — stating
it accurately in the documentation together with the concrete path to closing it, instead of
letting it pass unmentioned.

---

*End of report.*
