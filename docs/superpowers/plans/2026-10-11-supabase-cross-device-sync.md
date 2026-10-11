# Supabase Cross-Device Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use native implementation with review before production/database changes.

**Goal:** Ensure catalog changes made in the Supabase admin panel become visible reliably across iOS, Android, and desktop without requiring a full browser restart.

**Architecture:** Keep the existing `CatalogProvider` as the single source of truth. Add guarded revalidation on visibility/focus/online transitions, prevent stale overlapping loads from overwriting newer data, and prepare a Realtime publication migration for the catalog tables. Do not apply database DDL to production in this task without explicit approval.

**Tech Stack:** React 18, TypeScript, Vite, `@supabase/supabase-js`, Supabase Postgres/RLS, Vitest.

**Spec:** The user request in the current task: audit and optimize the complete admin-to-public Supabase connection across platforms while preserving existing architecture and preview-first rules.

## Global Constraints

- Work only on a temporary Git branch until explicit final approval.
- Preserve `InteractiveIntro`, the white editorial identity, existing routes, and existing Supabase data integrity.
- Do not apply database migrations to production without explicit approval.
- Keep public reads limited by existing RLS policies.
- Avoid changing mobile/desktop visual behavior unrelated to data synchronization.

## Review Focus

- A stale page returning to foreground must revalidate once without creating a request loop.
- Rapid visibility/focus events must not allow an older response to overwrite a newer response.
- Authenticated admin reloads must keep private draft visibility while anonymous users remain public-only.
- Realtime must not be treated as available until the database publication contains the required tables.
- Existing tests, build, storage URL resolution, and playback behavior must remain intact.

---

### Task 1: Guarded catalog revalidation

**Files:**
- Modify: `src/features/catalog/CatalogProvider.tsx`
- Test: `src/features/catalog/CatalogProvider.test.tsx`

**Interfaces:**
- Keep the existing `reloadCatalog` public API.
- Add internal request-generation protection and browser lifecycle listeners.

- [ ] Add a regression test proving a visibility/focus revalidation calls the remote loader and that an older pending load cannot replace newer state.
- [ ] Implement one guarded revalidation path shared by manual reload, focus, visibility, and online events.
- [ ] Register and clean up listeners exactly once per provider mount.
- [ ] Re-run the full test suite and build.

### Task 2: Realtime readiness migration (preview only)

**Files:**
- Create: `supabase/migrations/20261011140000_enable_catalog_realtime.sql`

**Interfaces:**
- Add `albums`, `tracks`, `platform_links`, `home_cards`, and `home_hero` to `supabase_realtime` publication idempotently.
- Do not execute this migration against the production project in this task.

- [ ] Review the SQL for idempotency and compatibility with the current schema.
- [ ] Add a client subscription only if it is harmless when publication is not yet enabled; lifecycle refresh remains the guaranteed fallback.
- [ ] Re-run Supabase advisors after any database execution; no database execution is planned before approval.

### Task 3: Verification and preview handoff

**Files:**
- No production files outside the temporary branch.

- [ ] Run focused catalog tests, full tests, build, and `git diff --check`.
- [ ] Confirm the temporary branch and preview URL.
- [ ] Report verified root causes, fixes, remaining production database approval, and exact validation results.
