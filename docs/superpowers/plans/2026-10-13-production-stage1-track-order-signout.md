# Production Stage 1 Track Order and Sign-out — Revised Implementation Plan

> **Status:** Review-only plan. Do not implement or apply until the user explicitly approves this revised plan.

**Goal:** Replace the non-atomic client track reorder with a narrowly authorized, concurrency-safe Supabase RPC; prepare a guarded all-or-nothing repair migration for the six confirmed negative track orders; and make sign-out clear private state synchronously while scheduling at most one safe public reload outside the auth callback.

**Architecture:** The reorder RPC will remain `SECURITY INVOKER` and will be executable only by `authenticated`. It will authenticate and authorize the approved manager, lock the album parent row, validate the exact current track set, and perform one transaction-backed update. The repair migration will lock and verify all six exact target rows before changing anything: it will update only when all six rows are in the expected negative state, no-op only when all six are already repaired, and raise before any update for missing, partial, or unexpected state. The auth callback performs only synchronous state invalidation and clearing. After the callback returns, a coalesced setTimeout(callback, 0) schedules at most one anonymous catalog reload, subject to the mounted-state and authentication guards defined in Task 4.

**Tech Stack:** React 18, TypeScript, Vitest, Supabase Postgres/RLS/Data API, existing installed dependencies only.

**Spec:** `/home/ubuntu/upload/Pasted_content_49.txt`

## Non-negotiable safety boundaries

- Work only on `fix/production-track-order-and-signout`, based on verified `main` HEAD `422342620882281123c876202d61b11461c02b7e`.
- Do not edit, merge, push, deploy, or modify `main`.
- Do not execute SQL, apply a migration, mutate production data, or change production configuration, grants, policies, functions, views, storage, or auth settings.
- Do not install, upgrade, or regenerate dependencies or lockfiles.
- Preserve the existing white editorial identity, InteractiveIntro behavior, responsive desktop/mobile behavior, disabled unpublished metadata tracks, signed audio privacy, Home hero/cards, and cross-device Realtime refresh behavior.
- Migration text-parsing tests are source/contract checks only; they must never be described as verification of PostgreSQL execution or concurrency.

## Exact planned file changes

| File | Planned responsibility |
|---|---|
| `supabase/migrations/20261013170000_atomic_track_order_rpc.sql` | Add/replace the invoker RPC, parent-row lock, exact-set validation, one update, and narrow execute grants. Review-only; never apply in this phase. |
| `supabase/migrations/20261013170100_repair_rap_is_art_track_order.sql` | Guarded all-or-nothing repair of exactly six known rows; explicit no-op for already repaired state; exception for every other state. Review-only; never apply in this phase. |
| `src/features/catalog/CatalogProvider.tsx` | Call the RPC, keep auth callback synchronous, invalidate private requests/state synchronously, and coalesce one post-callback anonymous reload. |
| `src/features/catalog/CatalogProvider.test.tsx` | Regression tests for RPC use, sign-out success/failure, stale private responses, repeated auth events, and private signed audio references. |
| `src/features/catalog/migration-contract.test.ts` | Source/contract assertions for the RPC and repair guards, including all four repair states. It does not execute SQL. |
| `docs/superpowers/plans/2026-10-13-production-stage1-track-order-signout.md` | Reviewed implementation plan and handoff record. |

No other files are planned to change.

## Required read-only investigation before implementation

Before editing the RPC migration, inspect and record the current production state without changing it:

1. Read the `tracks` and `albums` constraints, foreign keys, indexes, RLS policies, grants, and existing exposed functions.
2. Read every admin add-track, delete-track, and reorder path in `CatalogProvider.tsx` and `AdminPage.tsx`, including whether each path can insert/delete concurrently with reorder.
3. Confirm the current `track_order` data and the six exact repair targets without exposing unrelated user data.
4. Check the existing function authorization body and privilege boundary for `public.can_manage_the12thhouse()`; do not broaden it.
5. Record any concurrency case that cannot be safely covered without changing add/delete APIs. No schema/table change is allowed in this stage.

The implementation may proceed only after this evidence is documented in the review report and the concurrency hypothesis is explicit.

## Task 1 — Guarded all-or-nothing repair migration

**Migration contract:** The exact target album is `11111111-1111-4111-8111-111111111111`. The six audited track UUIDs and exact order transitions are:

- Track 01: `611db515-619a-4d06-9353-c6a80710e3ff` → `-1` → `1`
- Track 02: `63ad52b6-9855-4443-a6eb-57916924cbf6` → `-2` → `2`
- Track 03: `b3787472-e29b-47fa-8eba-8e9dd10a5763` → `-3` → `3`
- Track 04: `99af06c6-dccd-4dcd-b1a6-d15b4282b43c` → `-4` → `4`
- Track 05: `3146c863-fcbd-4adb-9fb5-a803783b3d6f` → `-5` → `5`
- Track 06: `699f10ba-7a76-468f-9bcd-e36ba8d5ab11` → `-6` → `6`

The Track 06 UUID above is the exact value retained from the prior read-only production audit/repair mapping; it differs from the candidate UUID supplied in the request and the candidate must not be used.

Implementation requirements:

- Lock all six target rows before evaluating state, using row-level locks inside one migration transaction.
- Verify every target UUID exists, belongs to the exact album, and has the expected track identity/state needed by the repair.
- Define two valid complete states only:
  - **Unrepaired:** all six exact rows have their exact expected old values (`Track 01=-1` through `Track 06=-6`). Update all six to `1..6` in one atomic statement.
  - **Already repaired:** all six exact rows have the final values `Track 01=1` through `Track 06=6`. Perform a no-op and do not update any row.
- For a missing row, mismatched album, wrong title/identity, partial repair, duplicate/unexpected order, or any mixed state, raise an exception before any update executes.
- Do not silently repair a subset. Do not use a broad `UPDATE` by album or order alone.
- Keep the migration idempotent for the two valid complete states.

Source/contract tests must separately assert coverage of these named states: complete expected old state, complete already-repaired state, partial state, and unexpected state. PostgreSQL transaction behavior remains unverified until a separately authorized database test environment is available.

## Task 2 — Concurrency-safe `reorder_album_tracks`

**Interface:** `public.reorder_album_tracks(p_album_id uuid, p_track_ids uuid[]) returns integer`.

Implementation requirements:

- Use `SECURITY INVOKER`; never use `SECURITY DEFINER` as a shortcut.
- Use `SET search_path = ''` and schema-qualified relations/functions.
- Require a non-null authenticated user and `public.can_manage_the12thhouse()` authorization.
- Lock the parent `public.albums` row for the target album with `FOR UPDATE` before reading/validating its track set. This serializes reorder operations for the same album.
- Validate that the album exists and is `content_type = 'music'`.
- Reject null, empty, duplicate, foreign, missing, or incomplete `p_track_ids`.
- Validate exact set equality between the requested IDs and the album’s current tracks after acquiring the parent lock.
- Perform one `UPDATE ... FROM unnest(... WITH ORDINALITY)` and return the updated row count. Any validation or update-count failure must raise and roll back the whole function invocation.
- Re-check add/delete compatibility from the **Required read-only investigation before implementation**. Inspect all existing track add/delete paths and document whether they are serialized by the parent lock. If direct track insertion/deletion is not serialized by the parent lock, explicitly document the remaining race: a newly inserted track may not be included in the just-completed order, and a concurrent deletion must fail closed through the exact-set/update-count checks. Do not claim stronger guarantees than the evidence supports.
- Revoke execute from `PUBLIC` and `anon`; grant execute only to `authenticated`.

Contract tests must assert invoker security, empty search path, auth/manager checks, parent-row lock, exact-set checks, one update, and execute boundary. They must not claim that a text match proves actual row-lock or transaction behavior.

## Task 3 — Client reorder integration

Keep the existing public interface:

```ts
saveTrackOrder(releaseId: string, trackIds: string[]): Promise<MutationResult>
```

Requirements:

- After local music-release validation, call `supabase.rpc('reorder_album_tracks', { p_album_id: releaseId, p_track_ids: trackIds })` exactly once.
- Do not perform the old negative-order/positive-order loop or any fallback row-by-row update.
- Return the RPC error unchanged in the existing `MutationResult` shape.
- Reload the current catalog only after RPC success.
- Tests must cover successful parameters, RPC error, invalid release, and absence of direct track updates.

## Task 4 — Synchronous auth callback and sign-out race handling

Requirements:

- Keep `onAuthStateChange` callbacks synchronous. The callback must not `await`, call an async catalog loader directly, or perform a database operation.
- Coalesce bootstrap loading across the initial `getSession()` resolution and the `INITIAL_SESSION` auth event. Track a bootstrap-load state/ref shared by both paths: the first unauthenticated bootstrap request claims the initial public load, and the other path must reuse that in-flight/claimed load rather than start another anonymous request. If the initial session is authenticated, the bootstrap state must likewise permit only one authenticated catalog load for that bootstrap session; `SIGNED_IN`, `USER_UPDATED`, `PASSWORD_RECOVERY`, and later independent unauthenticated transitions remain separate events and may schedule their own guarded reloads after bootstrap.
- On unauthenticated state, synchronously:
  - increment/invalidate the request generation;
  - clear `user`;
  - clear authenticated releases, tracks, signed URLs/references, Home cards, Hero state, and private catalog errors;
  - mark the catalog as not ready while the public reload is pending.
- Schedule the coalesced anonymous reload only through `setTimeout(callback, 0)` after the callback has returned; this gives the Supabase auth operation time to finish before another Supabase request starts.
- The scheduled callback must verify that the provider is still mounted, verify that the current state is still unauthenticated, and use a ref guard to coalesce repeated unauthenticated events into at most one `loadRemote(false)` call for the event batch. Clear the scheduled/coalescing guard before or when the callback exits so a later independent sign-out event can schedule its own reload.
- A stale authenticated request resolving after sign-out must fail the request-generation check and must not restore private data.
- `signOut()` must return `{}` only after Supabase reports success. On error, return `{ error }` and do not report a successful logout or successful public reload. If state was cleared optimistically before an error, restore authenticated data only through an explicit post-error load path, outside the auth callback.
- Preserve private signed-audio privacy in tests by using a private fixture with both a signed URL/reference and metadata, then asserting neither remains after sign-out.

Regression tests must cover successful sign-out, failed sign-out, stale private request, repeated auth events without a loop or auth re-entry, removal of signed private media references, and bootstrap coalescing. Specifically, use fake timers to assert that repeated unauthenticated events before the `setTimeout(..., 0)` boundary produce exactly one scheduled anonymous reload; assert that the reload does not begin until timers advance; assert that an unmounted provider's scheduled callback performs no reload; assert that a newly authenticated state cancels/invalidates the scheduled anonymous reload; assert that stale authenticated responses cannot restore private state before or after the scheduled reload; and assert that an unauthenticated initial session causing both `getSession()` resolution and `INITIAL_SESSION` produces exactly one initial public catalog load, while a later independent auth change still produces its own reload.

## Task 5 — Verification and handoff

Run only the existing installed commands/dependencies:

```bash
./node_modules/.bin/vitest run src/features/catalog/migration-contract.test.ts src/features/catalog/CatalogProvider.test.tsx
./node_modules/.bin/vitest run
./node_modules/.bin/tsc -b
npm run build
 git diff --check
```

Acceptance criteria:

- Focused tests and full suite pass with zero failures.
- TypeScript build and Vite production build exit successfully.
- `git diff --check` is clean.
- Working tree contains only the exact files listed above.
- No migration or SQL has been executed; no production row, grant, function, policy, schema, or configuration has changed.
- Final report includes branch/base HEAD, exact commands and outputs, the read-only concurrency evidence, and a separate list of PostgreSQL behaviors not verified locally.

## Rollback approach

Before approval, rollback is source-only: discard the dedicated branch or restore the changed files; `main` and production remain untouched. There is no automatic production rollback in this task. If a later, separately approved deployment exposes a frontend issue, revert the frontend to the prior known-good commit and disable the RPC with a separately reviewed forward migration. Do not automatically reverse the six-row data repair back to negative values; any data reversal would require a new explicit approval and a separately reviewed compensating migration.

## Explicitly unverified cases

- Actual PostgreSQL execution of either migration.
- Actual transaction rollback behavior on partial/unexpected repair states.
- Actual row-lock behavior under two concurrent sessions.
- Whether every existing direct add/delete path is fully serialized by the parent lock; this must be reported after the read-only path audit.
- Production grants/RLS behavior after migration application.
- Cross-device production propagation after deployment.
- Preview URL behavior and browser cache behavior.

**Handoff:** This revised plan is the only deliverable for this request. Wait for explicit user approval before implementing any amendments or applying any SQL.
