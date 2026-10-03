# THE12THHOUSE — Full Admin + Public Site Audit Report

**Date:** 2026-10-03  
**Branch:** `preview/full-admin-public-audit-20261003`  
**Base commit before this repair:** `fd8acc5`  
**Production/main:** not modified and not deployed

## Scope

This audit covered the current repository implementation and the connected Supabase project `qhjqbqtcdeeoymmympzb`. No mock data, service-role key, RLS bypass, duplicate database, or production merge was introduced.

## Root-cause summary

| Issue | Finding | Repair status |
|---|---|---|
| Music upload RLS error | Table writes use `can_manage_the12thhouse()` (JWT email), while Storage INSERT/UPDATE/DELETE policies used `has_role()` (`public.user_roles`). The browser UI gates by email, but Storage used a different identity check. The database still has the old Storage policies; the repair migration is present in this branch but has not been applied to Supabase. | Migration prepared; live application blocked pending explicit production/database approval and authenticated reproduction |
| Album count decrease | The prior Admin handler showed a success message while preserving all persisted tracks, so `8 → 6` did not result in six records. | Fixed: explicit confirmation now identifies tracks and awaits deletion of the excess persisted records |
| Track order/playability | Order is persisted through `tracks.track_order`; public lists are sorted from that field. Public callers filtered playable tracks, but the player itself accepted arbitrary queue items. | Fixed: queue filters missing/unplayable items and `playTrack` rejects `playable: false` |
| Upcoming public visibility | Existing live public policies only exposed `published = true`; upcoming records were not consistently readable publicly. | Existing branch migration prepares `published/upcoming` public policies; not yet applied live |
| Visual media | Original extension and MIME are retained in Storage path/upload metadata; public detail uses format-aware image/video rendering. | Code path covered; authenticated upload and desktop/mobile playback remain live verification blockers |

## Admin audit

### Authentication

- Supabase Auth is used through `supabase.auth`.
- Admin UI restricts the approved email `kamielkhajehpour@gmail.com`.
- The live project contains one Auth user with that email and one `user_roles` row with role `admin`.
- Password recovery has a dedicated Admin route.
- No service-role key is present in browser code; the client uses a publishable/anon key.

### RLS and identity

The live database contains `albums`, `tracks`, `home_cards`, `platform_links`, `profiles`, and `user_roles`.

Current live table write policies use `can_manage_the12thhouse()`, whose definition checks the JWT email. Current live Storage write policies use `has_role('artist') OR has_role('admin')`, whose definition checks `user_roles` by `auth.uid()`.

This is the confirmed policy mismatch. The repair migration changes Storage writes to the same `can_manage_the12thhouse()` check used by table writes while preserving bucket restrictions.

### Releases and Home

- Admin release creation/update/delete uses the existing `albums` table.
- Home selection uses `home_cards(slot, album_id)` and does not duplicate release content.
- Mutations await Supabase responses and reload authoritative catalog data.
- Featured and status updates are explicit Save actions.
- Partial multi-step saves can still leave a release row without its later media if a subsequent upload fails; the UI reports the actual failed step and does not claim full success.

### Albums, tracks, count and order

- Existing `tracks` schema is reused: `id`, `album_id`, `title`, `audio_url`, `track_order`, `published`, `play_count`.
- Track order is read from `track_order`, exposed as Move Up/Move Down controls, and persisted with Save Track Order.
- New track editors are unsaved until Save Track.
- Increasing count preserves existing records and creates additional editors.
- Decreasing count now requires explicit confirmation, names the records to be removed, awaits each backend deletion, and reports failure without a false success message.
- Existing live data includes an album with 18 tracks and several duplicate titles; no destructive cleanup was performed during this audit.

### Playability

- `tracks.published` is the persisted per-track playability control.
- The public tracklist keeps non-playable tracks visible and disables their play button.
- Home and release-detail queue builders include only tracks with `published !== false` and an audio reference.
- The player now filters queue items without audio and rejects queue items explicitly marked `playable: false`.

### Media and Storage

Live buckets:

- `covers`: public
- `artist-assets`: public
- `audio`: private

The code preserves the uploaded file extension and uses the original Storage object. Covers use the `covers` bucket; audio uses `audio`; visual media uses `artist-assets`.

The code updates the database reference only after upload succeeds and removes a newly uploaded object if the database update fails. For replacement/removal, database reference clearing precedes old-object deletion so the old asset is not deleted before the authoritative update.

## Public audit

### Home and release detail

- Public pages read through the shared `CatalogProvider` and Supabase `albums`/`tracks`/`home_cards` query.
- Home cards resolve persisted album references rather than a separate Home content model.
- Release detail sorts normalized tracks by persisted order.
- Upcoming dates support a real date or `RELEASE DATE TBA`; no date is invented and no `Invalid Date` is produced.

### Audio player

- Queue order follows the normalized public track order.
- Non-playable tracks remain visible but cannot be queued through the public UI.
- The new player-level guard prevents direct calls from starting a queue item marked non-playable.
- Actual audio playback and next/previous behavior with newly uploaded files require an authenticated live upload and browser playback test.

### Visual cover and animation

- Detail artwork has a lightbox with close behavior and preserved aspect ratio.
- Image formats render as `<img>`; other visual references render as `<video>` with MIME derived from the original extension.
- GIF/APNG are treated as images; WebM/MOV/OGV receive format-specific video MIME values.
- A browser may still reject a particular MOV codec/container; that limitation must be documented per uploaded file rather than hidden by conversion.

## Data flow map

```text
Admin form
  → CatalogProvider mutation
  → Supabase Auth session
  → RLS policy
  → albums / tracks / home_cards / platform_links
  → Supabase Storage (covers / audio / artist-assets)
  → public CatalogProvider query
  → Home / Releases / Release Detail / Audio Player
```

**Verified by source inspection and live read-only Supabase inspection:** tables, columns, buckets, policies, functions, persisted records, and public query shape.  
**Not fully verified end-to-end:** an authenticated browser mutation from upload through refresh and public playback.

## Verification results

### Automated

- `npm run build` — **PASS**
- `npm test -- --run` — **PASS**: 1 test file, 4 tests
- `git diff --check` — **PASS**
- Preview HTTP health on port 4180 — **PASS** (`HTTP 200`)

Existing test output contains React `act(...)` warnings from `InteractiveIntro`; they do not fail the suite.

### Manual end-to-end matrix

| Test | Result | Evidence / blocker |
|---|---|---|
| Single create → cover/audio → refresh → public | BLOCKED | Requires authenticated browser and real upload |
| Album 5 tracks → mixed playable → reorder → refresh → public | BLOCKED | Requires authenticated browser and real persisted test album |
| Album count 5 → 8 → 6 | PARTIAL | Code path repaired and build-verified; live destructive confirmation not executed |
| Upcoming with date → Home | BLOCKED | Live public upcoming policy migration not applied |
| Upcoming without date → TBA | PARTIAL | Helper and UI path inspected; live public policy not applied |
| High-resolution cover → lightbox | PARTIAL | Code path inspected; live high-resolution upload not executed |
| Original animation desktop/mobile | BLOCKED | Requires real uploaded media and authenticated browser on both viewports |
| Audio queue and non-playable protection | PARTIAL | Source-level guard and build verified; live audio URL playback not executed |

## Remaining blockers requiring explicit action

1. Apply `supabase/migrations/20261003120000_repair_catalog_data_flow.sql` to the connected Supabase project after approval. This changes live RLS policies and must not be silently applied.
2. Reproduce the original upload error with the real authenticated artist session and capture the failing request (`storage.objects INSERT` versus table `UPDATE`) to close the historical-error gap.
3. Perform the manual A–G authenticated acceptance tests with real files, refreshes, public queries, and desktop/mobile playback.
4. Consider adding a database transaction/RPC for multi-row track reorder if concurrent Admin edits must be supported; the current sequential awaited updates are correct for one Admin session but are not atomic across concurrent writers.

## Security

- No service-role key is exposed or added.
- RLS was not disabled.
- No `USING (true)` or `WITH CHECK (true)` admin-write policy was added.
- Public read access remains limited by content status and intended public buckets in the migration.
- Main/production was not changed or deployed.
