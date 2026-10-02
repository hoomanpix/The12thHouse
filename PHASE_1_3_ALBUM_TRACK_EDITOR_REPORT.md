# The12thHouse — Phase 1.3 Album Track Count + Dynamic Track Editor

## Scope

This phase extends the existing Admin/Music implementation. It does not redesign the public site, change the public visual language, merge into `main`, or deploy production.

## Branch

- Branch: `preview/phase-1-3-album-track-editor`
- Base: `bec6eb8` (`fix: show upcoming cards without published hero`)
- Main branch: unchanged

## 1. Exact files changed

- `src/pages/AdminPage.tsx`
- `src/features/catalog/CatalogProvider.tsx`
- `PHASE_1_3_ALBUM_TRACK_EDITOR_REPORT.md`

## 2. Existing track schema used

The implementation reuses the existing `tracks` table and existing project mapping:

- `id` — track ID
- `album_id` — release/album ID
- `title` — track title
- `track_order` — persisted order
- `audio_url` — persisted audio reference/path
- `published` — playable state
- Existing duration/play-count fields remain unchanged

No new table or schema was introduced.

## 3. Existing Storage bucket used

Audio continues to use the existing Supabase Storage bucket:

- Bucket: `audio`
- Path format: `{releaseId}/{trackId}-{timestamp}.{extension}`
- Database reference: `tracks.audio_url`

Album artwork remains independent and continues to use the existing `covers` bucket and `albums.cover_url` field.

## 4. Number-of-tracks implementation

For a new album, the workflow is now:

1. Enter album metadata.
2. Click **Save Album**.
3. Open the persisted album editor.
4. Enter a positive integer in **Number of tracks**.
5. Click **Apply Track Count**.

The count is not hard-coded. The editor creates exactly the required number of unsaved track sections relative to the persisted track records.

Validation and safety behavior:

- Numeric input
- Minimum value: `1`
- Integer normalization
- Increasing the count preserves existing tracks
- Decreasing the count never silently deletes existing tracks
- Decreasing the count requires explicit confirmation and leaves existing records intact

## 5. Dynamic track editor

Each new unsaved track editor has its own:

- Explicit track number/order
- Track title field
- Independent audio file input
- Selected-file state
- **Save Track** action

Existing persisted tracks are reconstructed from the authoritative `tracks` records after loading the album. The editor does not use localStorage or a hard-coded album length.

The **+ Add Track** action creates one additional unsaved editor without immediately writing a database record.

## 6. Individual audio upload

Each persisted track can save its own audio independently. The save flow is:

1. Persist/update the track metadata.
2. Upload the selected file to the existing `audio` bucket.
3. Persist the resulting audio reference in `tracks.audio_url`.
4. Reload the catalog from Supabase.

The UI reports success only after the backend/storage operations complete. Backend failures are shown using the actual returned error message.

## 7. Save behavior

- Existing track: **Save Track** persists title and playable state; if a file is selected, it also uploads and persists that track's audio.
- New track: **Save Track** first creates the track record, then uploads its selected audio, then removes the unsaved editor after successful completion.
- The editor keeps a track visible when creation or upload fails.
- Album artwork is saved through the existing independent artwork flow and is not coupled to track audio.

## 8. Delete behavior

Every persisted track has a **Delete** action with explicit browser confirmation.

After confirmation, the provider:

1. Deletes the persisted track record for that album.
2. Removes its independent audio object when a stored path is available.
3. Normalizes remaining `track_order` values starting at `1`.
4. Reloads the authoritative catalog.

If the database deletion fails, the provider returns the backend error and the UI does not claim success.

## 9. Track-order behavior

Existing order is read from `track_order` and displayed as `01`, `02`, etc. Up/down controls change the draft order, and **Save Track Order** persists every order value back to `tracks.track_order`, followed by an authoritative reload.

## 10. Refresh persistence test

Implemented path verified statically through the data flow:

- Album track sections are reconstructed from `selectedRelease.tracks` loaded by `CatalogProvider`.
- New track records are inserted through `addTrack`.
- Track metadata and audio are persisted through Supabase mutations.
- Every successful mutation performs `loadRemote(Boolean(user))`.

A real authenticated browser refresh test with newly uploaded artist files was **not executed in this session** because the temporary browser preview link was unavailable/expired and no new Supabase test album or audio files were created. This is recorded as a verification limitation rather than claimed as completed.

## 11. Public-site test

The public release detail already reads `release.tracks` from the shared `CatalogProvider`, uses persisted `track_order`, displays persisted titles, and enables playback only when `published !== false` and `audio_url` exists. No separate hard-coded tracklist was added.

A real newly-created album was not published during this isolated implementation, so the end-to-end public test with fresh Supabase data remains a manual acceptance step for the Artist.

## 12. Build result

`npm run build` passed successfully.

## 13. Test result

`npm run test` passed:

- 1 test file passed
- 4 tests passed

The test runner emitted existing React `act(...)` warnings but returned success.

`git diff --check` passed.

## 14. Supabase blockers

No schema blocker was identified in the existing implementation. The project already exposes the required `tracks` fields and the `audio` Storage path used by the provider.

Remaining limitation: live Supabase persistence and Storage policy acceptance require an authenticated Artist session and actual audio files. They were not simulated or falsely marked as verified.

## 15. Preview URL

- Local preview endpoint: `http://127.0.0.1:5179/` — returned HTTP 200.
- Temporary browser URL: `https://5179-i4s6js21zv2l6vl0prnqe-3b749454.us4.manus.computer/#/admin`
- Browser verification status: the temporary website endpoint reported unavailable/expired during the smoke test, so interaction-level authenticated verification could not be completed.

## 16. Commit hash

Initial implementation commit: `866fca5aac4fe9c74d50b9d01d07e5e68384aeea`. The report-only amendment below keeps the branch isolated; this branch must not be merged into `main` or deployed as part of this phase.
