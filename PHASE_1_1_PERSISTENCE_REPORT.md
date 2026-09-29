# The12thHouse — Phase 1.1 Persistence Report

## Scope

This phase repairs the existing Admin Control Room persistence path without modifying `main`, the public visual design, database schema, RLS policies, or starting Phase 2.

## Root cause found

The previous implementation updated React state first and then launched Supabase mutations with `void` / fire-and-forget calls. It did not await responses, inspect backend errors, reload authoritative data, or roll back failed optimistic updates. The Admin therefore showed success while a database or policy error could be silently ignored; refresh then restored the previous backend value.

Additional confirmed issues:

- Release fields, publishing, featured state, tracks, links, and Home cards were edited directly from `onChange` handlers instead of explicit Save actions.
- Artwork and audio files were converted to Data URLs. This is not suitable persistent media storage.
- Track creation sent `track_order: 1` regardless of the actual position.
- Home slots were read into a compact array, which could lose positional gaps.
- No persisted track-order save operation existed.

## Backend audit evidence

Supabase project: `qhjqbqtcdeeoymmympzb`

Existing tables and fields confirmed:

- `public.albums`: `id`, `title`, `slug`, `description`, `cover_url`, `release_date`, `published`, `release_type`, `content_type`, `visual_type`, `visual_url`, `featured`.
- `public.tracks`: `id`, `album_id`, `title`, `audio_url`, `track_order`, `published`, `play_count`.
- `public.platform_links`: `id`, `album_id`, `platform`, `label`, `url`, `link_order`.
- `public.home_cards`: `slot`, `album_id`, `updated_at`.
- Foreign keys connect tracks and platform links to `albums.id`; Home cards also reference `albums.id`.

Storage buckets confirmed:

- `covers` — public bucket for release artwork.
- `audio` — private bucket for track audio; public reads are policy-gated against published track records.
- `artist-assets` — existing public artist media bucket.

Storage policies confirmed:

- Approved artist/admin roles can upload, update, and delete media in the three existing buckets.
- Public reads are allowed for covers and published audio references.

RLS policies confirmed for albums, tracks, platform links, and Home cards. The management function checks the approved email `kamielkhajehpour@gmail.com`. No schema or policy changes were made in this phase.

## Files changed

- `src/features/catalog/CatalogProvider.tsx`
  - Awaited all important Supabase writes.
  - Return real backend errors to the UI.
  - Reload authoritative catalog data after successful mutations.
  - Added persistent track ordering.
  - Added separate artwork upload/remove operations using `covers`.
  - Added separate audio upload/remove operations using `audio`.
  - Added signed URL resolution for private audio references.
  - Preserved Home slot positions when loading.
  - Added explicit release, track, link, and Home mutation result types.
- `src/pages/AdminPage.tsx`
  - Replaced implicit mutation controls with explicit Save actions.
  - Added visible `Saving…`, `Saved ✓`, and real `Save failed: …` states.
  - Added album track-slot count on release creation; slots become actual persisted track rows.
  - Added independent artwork controls.
  - Added independent audio controls and removal.
  - Added per-track save, delete, playable-state save, and separate order save.
  - Added release information and publishing save actions.
  - Added Home configuration and platform-link save actions.
  - Added backend-confirmed delete flow.
- `PHASE_1_1_PERSISTENCE_REPORT.md`

## Mutation coverage

| Area | Persistence behavior |
|---|---|
| Release create | Inserts into `albums`, waits for response, reloads catalog |
| Release edit | Updates `albums`, waits for response, reloads catalog |
| Release delete | Deletes Home references, tracks, links, then album; each response checked |
| Release status / featured | Explicit `Save Publishing Settings` updates `published`, `release_date`, and `featured` |
| Release artwork | Uploads independently to `covers`, stores public URL in `albums.cover_url` |
| Track create | Inserts into `tracks` with actual next `track_order` |
| Track title / playable state | Explicit `Save Track` updates `tracks` |
| Track order | Local reorder is not persisted until `Save Track Order`; each order is written to `tracks.track_order` |
| Track audio | Uploads independently to `audio`, stores storage path in `tracks.audio_url` |
| Track audio removal | Clears `audio_url`, disables playback, then removes the storage object |
| Track delete | Deletes the actual `tracks` row and reloads data |
| Platform links | Add, bulk edit with `Save Links`, delete; all use `platform_links` |
| Home cards | Drafted locally and saved with `Save Home Configuration` to `home_cards.slot` / `album_id` |

## Explicit save controls

- `Save Release`
- `Save Changes`
- `Save Artwork`
- `Remove Artwork`
- `Save Publishing Settings`
- `Save Track`
- `Save Audio`
- `Remove Audio`
- `Save Track Order`
- `Save Home Configuration`
- `Save Links`
- `Save Link`
- `Delete Release`, `Delete`, and `Delete Link` execute awaited backend mutations and show failures.

## Verified

- `npm run build` — passed.
- `npm run test` — passed: 1 test file, 4 tests.
- `git diff --check` — passed.
- Admin preview route rendered without runtime console errors.
- The Admin login gate renders correctly on the isolated Phase 1.1 preview.
- Supabase backend inspection confirmed that the required tables, relationships, buckets, and relevant policies already exist.

## Not yet verified end-to-end

A real authenticated browser session was not available on the new isolated preview origin, so the following require the Artist to perform a final authenticated test:

1. Sign in as `kamielkhajehpour@gmail.com`.
2. Create or edit a release and click its Save button.
3. Refresh and confirm the value remains.
4. Upload a cover and audio file separately; refresh and confirm both remain.
5. Reorder tracks, click `Save Track Order`, refresh, and confirm order.
6. Change Home cards and links, refresh, and confirm both Admin and public pages reflect them.

## Known warnings / limits

- Existing Vitest output includes React `act(...)` warnings from `InteractiveIntro` tests; all tests still pass.
- The Supabase security advisor reports pre-existing warnings for publicly executable `SECURITY DEFINER` functions, one RLS-enabled allowlist table without a policy, and disabled leaked-password protection. These were not changed because the task explicitly prohibits unrelated backend redesign.
- No production merge or deployment was performed.

## Branch

`preview/admin-persistence-phase-1`

`main` was not modified by this phase.
