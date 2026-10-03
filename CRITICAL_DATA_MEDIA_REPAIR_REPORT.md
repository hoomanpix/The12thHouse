# The12thHouse — Critical Data Connection + Media Playback Repair

## 1. Current branch / commit

- **Branch:** `fix/admin-public-data-media-repair`
- **Commit:** `f45251e6a49d420bdccc6c6058517061439b2e57`
- **Base:** `main` at `0958e4e605d56080f6a30c048d6b186bd29c8fe5`
- **Working tree:** clean after the implementation commit.
- **Production/main/deployment:** not merged, pushed, or deployed.

No intentional public visual redesign was made.

## 2. Root causes found

### A. Admin media uploads were rejected by Storage RLS

- **Symptom:** Admin displayed `Save failed: new row violates row-level security policy` during media upload.
- **Evidence:** Supabase Postgres logs contained repeated `new row violates row-level security policy for table "objects"` errors for Storage `INSERT` operations.
- **Affected bucket/policy:** `storage.objects`; the original upload policy allowed only `has_role('artist') OR has_role('admin')`.
- **Authenticated account:** `kamielkhajehpour@gmail.com`; the account exists, is email-confirmed, and has a recorded sign-in.
- **Root cause:** The Storage write policy did not use the same approved-email authorization function used by the catalog tables. The approved artist could therefore pass the catalog write gate while still failing the Storage policy when the role/JWT path was not available to Storage.
- **Fix:** Applied migration `repair_admin_storage_and_upcoming_reads` so Storage INSERT/UPDATE/DELETE accepts the protected `can_manage_the12thhouse()` gate in addition to existing role checks. RLS remains enabled and anonymous writes are not allowed.

### B. Public Home was not clearly consuming the authoritative catalog

- **Symptom:** Public Home appeared to show stale/static content and did not reliably reflect Admin-managed content.
- **Root cause:** `HomePage.tsx` consumed the provider under misleading `mockArtist`/`mockReleases` names and used legacy date-only Upcoming detection. This obscured the authoritative remote data path and excluded persisted `status = 'upcoming'` rows when the date was null or already passed.
- **Fix:** Home now consumes `artist` and `releases` from `CatalogProvider`, filters the persisted Home-card IDs against published/Upcoming remote rows, and uses persisted status first. The existing layout and visual components are unchanged.

### C. Public RLS hid Upcoming content

- **Symptom:** Admin could persist Upcoming content, but anonymous Public queries could not receive it.
- **Root cause:** Public SELECT policies allowed only `published` rows, while the database now stores a distinct `status = 'upcoming'` value.
- **Fix:** The migration extends public SELECT access to `status = 'upcoming'` for albums, tracks belonging to Upcoming albums, and platform links belonging to published/Upcoming albums. Mutation policies remain restricted.

### D. Upcoming releases incorrectly required a future date

- **Symptom:** Upcoming content with no date was not represented as Upcoming by the public pages and the Admin create form required a date.
- **Fix:** Shared model accepts `release_date: string | null`; status is normalized from Supabase; Home, Releases, and Detail use `TBA` for null/hidden dates; the existing Admin create form only requires a date for Published content. No date is invented.

### E. Audio player `ended` handler could use stale queue state

- **Symptom:** The existing player could fail to advance to the correct next track after the current track ended.
- **Root cause:** The `ended` listener was installed once but captured the initial `playNext` closure. That closure could retain an empty or old queue after route changes and track selection.
- **Fix:** The existing provider now keeps current player state in a ref and routes `ended`, Next, and Previous through the current persisted queue. `setQueue` also removes non-playable items so disabled tracks cannot enter the player queue.

### F. Public Home could queue non-playable tracks

- **Symptom:** Home built a queue from every track in a release, even when a track had no audio or was intentionally non-playable.
- **Fix:** Home now queues only tracks with `published !== false` and a persisted audio URL. Release Detail already applies the same rule and remains unchanged visually.

## 3. Database / RLS changes

Applied to Supabase project `qhjqbqtcdeeoymmympzb`:

Migration: `repair_admin_storage_and_upcoming_reads`

- Replaced Storage policies:
  - `artists upload media`
  - `artists update media`
  - `artists delete media`
- New write condition:
  - `can_manage_the12thhouse()` **or** `has_role('artist')` **or** `has_role('admin')`
- Upload bucket allowlist remains exactly:
  - `audio`
  - `covers`
  - `artist-assets`
- Replaced public read policies for:
  - `albums`
  - `tracks`
  - `platform_links`
- Public reads now include published content and Upcoming content, while write policies remain protected.
- **RLS was not disabled.** No table was made publicly writable. No service-role credential was added to the frontend.

Database evidence observed before repair:

- `albums`: 5 rows
- `tracks`: 20 rows
- `home_cards`: 3 configured slots
- artist account: present and email-confirmed
- current database includes both Published and Upcoming content

## 4. Storage changes

Existing buckets were audited; no bucket was deleted, renamed, converted, or re-encoded:

| Bucket | Public | Existing use | Result |
|---|---:|---|---|
| `covers` | Yes | Original artwork | Preserved; public URL remains the original Storage object |
| `artist-assets` | Yes | Visual/animation media | Preserved; original object URL remains in `albums.visual_url` |
| `audio` | No | Uploaded track audio | Preserved; public access is policy-controlled and the provider resolves a signed URL for playback |

Verified stored animation object:

- Format/container: `.mov`
- MIME returned: `video/quicktime`
- Response: HTTP 200
- Range support: HTTP 206 with `Content-Range`
- CORS: `Access-Control-Allow-Origin: *`
- Preview native video inspection: `readyState = 4`, `duration = 9.87`, `error = null`

The application continues to store the original uploaded file extension and MIME type. It does not convert audio or video to MP3/MP4 and does not store blob URLs or local filesystem paths.

## 5. Admin changes

Only data/media behavior was changed:

- Admin-created releases now persist the database `status` (`draft`, `upcoming`, `published`) instead of deriving it only from `published` and date.
- Upcoming releases may be saved with a null release date.
- Existing per-track save, delete, order, playability, cover, audio, visual, and platform-link flows remain backend-backed.
- Storage upload failures continue to surface as explicit errors; success is not shown when the backend rejects the operation.

## 6. Public changes

Only data/media/player behavior was changed:

- Home now renders Admin-selected Home-card IDs from the remote catalog provider.
- Home and Releases recognize persisted Upcoming status with or without a date.
- Detail pages display `TBA` when the release date is null or intentionally hidden.
- Public pages continue to use the existing cards, artwork, tracklist, video element, navigation, and player UI.
- Home and Detail only queue playable tracks.

**Explicit confirmation:** No intentional visual/design changes were made.

## 7. Audio player

The existing audio player was repaired, not replaced.

- **Original formats:** the uploaded Storage URL is assigned directly to `HTMLAudioElement`; no conversion is performed.
- **Loading:** the provider assigns the persisted URL, calls `load()`, and reports `loading` until metadata arrives.
- **Play:** uses the selected persisted track URL.
- **Pause:** uses the same HTML audio element.
- **Seek:** writes the requested percentage to `audio.currentTime` using the actual duration.
- **Duration:** comes from `loadedmetadata` and the native media duration.
- **Progress:** comes from `timeupdate` and updates the existing player UI.
- **Next:** uses the current queue in persisted track order.
- **Previous:** uses the current queue in persisted track order.
- **Ended:** uses a current-state ref, avoiding the previous stale-closure bug, then advances through the playable queue.
- **Non-playable tracks:** are filtered before queue insertion and remain disabled in the existing tracklist.
- **Errors:** native load/play failures set an explicit player error state; they are not silently ignored.
- **Route changes:** the provider remains mounted at the app root, so player state continues across public routes.

## 8. Animation playback

| Format | Desktop result | Mobile result |
|---|---|---|
| `.mov` / `video/quicktime` | Native `<video>` element loaded the real Supabase URL; `readyState=4`, `duration=9.87`, no media error in the isolated Chromium preview | Not independently verified in iOS Safari in this sandbox |

The original `.mov` remains the source. Browser support remains codec/container dependent: a browser that cannot decode a specific QuickTime codec may reject it even when the HTTP response, MIME type, CORS, and range requests are correct. No silent format replacement was added.

## 9. Test results

- `npm run build`: **PASS** — Vite production build completed successfully.
- `npm run test`: **PASS** — 1 test file, 4 tests passed. Existing React `act(...)` warnings remain in the test output.
- `git diff --check`: **PASS**.
- `npm run lint`: **BLOCKED** — the repository has no `lint` script; npm returned `Missing script: "lint"`.

## 10. End-to-end results

| Flow | Result | Evidence |
|---|---|---|
| Admin → catalog table RLS | PASS by policy audit | Existing catalog writes use approved-email gate; no RLS bypass added |
| Admin → Storage upload policy | PASS by policy repair | Storage policies now include approved-email gate; prior failing policy was identified from logs |
| Database → Public Home | PASS in isolated preview | Preview Home displayed remote Supabase items including `Rap is Art` Upcoming card |
| Database → Public Releases | PASS in isolated preview | Preview Releases displayed remote Upcoming and Published rows |
| Database → visual detail | PASS in isolated preview | Native `<video>` loaded the real Supabase `.mov` URL with no media error |
| Track order persistence | BLOCKED for live mutation test | No authenticated Admin browser session/artist password was available in this run; code continues to use `track_order` and reloads authoritative rows |
| Audio upload and real playback | BLOCKED for live mutation test | No authenticated Admin browser session/artist password was available; player and Storage URL paths were repaired and audited |
| Mobile Safari media test | BLOCKED | No iOS Safari session/device was available in this sandbox |

## 11. Remaining blockers

1. A real authenticated artist session is still required to execute the full manual matrix: login, upload audio, upload cover, upload animation, reorder tracks, toggle playability, refresh, logout/login, and confirm the persisted result.
2. Mobile Safari/iOS verification is not available in this sandbox.
3. The repository does not define a lint script.
4. The Supabase security advisor still reports pre-existing warnings for executable `SECURITY DEFINER` functions and disabled leaked-password protection; those were not changed because this repair must remain limited to the Admin/Public data-media path.

This branch is ready for authenticated artist verification. It has not been merged into `main` and has not been deployed.
