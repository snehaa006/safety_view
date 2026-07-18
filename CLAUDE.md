# SafetyView — guidance for Claude

SafetyView is a Fire Alarm Monitoring dashboard. See `README.md` for the full
architecture, routes, and data-access overview. Read it before making changes.

**Stack:** React 18 + TypeScript + Vite, Tailwind + shadcn/ui, React Router,
Supabase (PostgREST). Architecture v6: organizations / groups / locations →
buildings → panels → zones; roles are M2M (`user_roles`); access is scoped by
`user_buildings`.

## Always keep the README up to date

**After making any code change, update `README.md` in the same change so it
stays accurate.** The README is the source of truth for the project's shape —
if your change makes any part of it wrong or incomplete, fix that part before
you finish. In particular, update the README whenever you:

- add, remove, or rename a **route** (`src/App.tsx`) → update the Routes table.
- add or change a **page**, top-level folder, or feature area → update the
  Folder structure section.
- add, remove, or rename a **data-access function** in `src/services/api.ts` →
  update the Data access section.
- change the **domain model / types** (`src/types`), roles, zone/panel states,
  or manual actions → update the Architecture section.
- change the **database schema, RPCs, or RLS** (`db/*.sql`) → update the
  Database section.
- change **scripts**, env vars, or setup steps → update Getting started.
- change the **theme** or design tokens → update the Theme section.

If a change touches none of the above (an internal refactor, a bug fix with no
surface-area change), the README can stay as-is — but check it, don't assume.

## Conventions

- Path alias `@/` → `src/` (see `tsconfig.json` / `vite.config.ts`).
- Keep new UI on shadcn/ui primitives in `src/components/ui`.
- All Supabase access goes through `src/services/api.ts`; keep it typed against
  `src/types`.
- Run `npm run typecheck` before finishing a change.
