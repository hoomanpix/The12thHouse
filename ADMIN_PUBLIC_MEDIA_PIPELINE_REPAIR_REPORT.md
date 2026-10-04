# The12thHouse — Admin ↔ Supabase ↔ Public Media Pipeline Repair

## 1. Root causes

The current `main` implementation had four concrete defects. First, the live catalog policies were broad `public` policies whose write condition depended on the approved-email helper; the repair now gives the authenticated session an explicit write path while keeping `can_manage_the12thhouse()` as the authorization gate. RLS remains enabled and public users receive no write access. The connected account was verified in Auth and the approved email was verified in `admin_allowlist`.

Second, audio upload performed two unrelated operations as one semantic action: it uploaded the original file and then updated the track with `published: true`. That made upload silently override the artist's independent playable/unplayable choice. The upload path now changes only `audio_url`; `tracks.published` remains the explicit playability decision.

Third, the private `audio` bucket used signed URLs, but the catalog loader converted any signed-URL failure into `audio_url: null` with no retained original reference. The loader now retains `audio_reference` and an explicit `audio_error`. The player can refresh one expired signed URL from the original Storage reference, then reports a real media error if the browser cannot decode the original codec or the object is unavailable.

Fourth, the player installed listeners around callbacks that could retain stale React state. The `ended` event could wrap to the first track instead of stopping, and queue changes could retain an invalid active track. The player now uses current-state refs, cleans up listeners, preserves the active track when possible, filters missing audio, and stops cleanly at the end of the playable queue.

## 2. Files changed

- `src/features/audio-player/AudioPlayerProvider.tsx`
- `src/features/audio-player/types.ts`
- `src/features/audio-player/queue.ts`
- `src/features/audio-player/queue.test.ts`
- `src/features/catalog/CatalogProvider.tsx`
- `src/pages/AdminPage.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/ReleaseDetailPage.tsx`
- `src/types/index.ts`
- `supabase/migrations/20261004195500_repair_admin_public_media_pipeline.sql`

No public CSS, typography, colors, spacing, navigation structure, artwork presentation, or player visual design was changed.

## 3. Supabase changes

Migration `repair_admin_public_media_pipeline` was applied to project `qhjqbqtcdeeoymmympzb`.

The migration replaces write policies for `albums`, `tracks`, `platform_links`, and `home_cards` with `TO authenticated` policies gated by `can_manage_the12thhouse()`. Storage INSERT, UPDATE, and DELETE policies now also target authenticated sessions and retain the same approved-email gate. The allowed upload buckets remain `audio`, `covers`, and `artist-assets`.

The public Storage SELECT policy remains read-only. Covers and artist assets are publicly readable; audio is readable only when the object name matches a track's persisted `audio_url` and that track has `published IS TRUE`. The private `audio` bucket was not made public, RLS was not disabled, and no service-role key was added to the browser.

Live verification after migration showed the expected policy roles: catalog and Storage writes are `{authenticated}`, while public reads remain `{public}`. The live schema contains the existing fields `albums.status`, `albums.show_release_date`, `tracks.audio_url`, `tracks.track_order`, and `tracks.published`; no schema change was introduced.

## 4. Media changes

Audio, cover, and video uploads preserve the original file extension and MIME type. The upload calls do not transcode files and now use unique paths with `upsert: false`, preventing accidental replacement of another object. The original reference is persisted in `tracks.audio_url` or `albums.visual_url`.

The existing `.mov` object was inspected in Storage: MIME `video/quicktime`, size `2,909,925` bytes, HTTP `200` for the full response, HTTP `206` for a byte-range request, `Accept-Ranges: bytes`, and `Access-Control-Allow-Origin: *`. The public visual detail loaded the real MOV URL in a native `<video>` element with `readyState = 4`, duration `9.87` seconds, and no media error.

## 5. Player changes

`AudioPlayerProvider` now installs stable listeners once, removes them on unmount, and routes `ended`, Next, Previous, and queue changes through current refs. Auto-next advances only to the next eligible item and stops at the end instead of wrapping. A playable item requires explicit `published === true` and a non-empty audio URL. Missing audio never enters the queue.

The player now represents loading, ready, paused, playing, and native media errors explicitly. If a private signed URL expires, it makes one refresh attempt from `audioReference`; if refresh fails or the browser cannot decode the original format, it keeps a concrete error state rather than silently replacing the media or turning it into mock audio.

## 6. Admin and public persistence changes

Admin audio upload no longer changes playability. Track-count reduction now asks for confirmation and deletes the excess persisted track rows through the existing backend mutation, including audio cleanup and order normalization. Increasing the count still creates explicit unsaved editors that must be saved individually. Authoritative catalog reloads refresh the Admin drafts after backend success.

Home and Release Detail now use the same explicit playability predicate. They may still show unplayable tracks in the visual tracklist, but only playable tracks with real audio references enter the queue. Existing public layout and visual behavior remain unchanged.

## 7. Verification

The following checks passed on branch `fix/admin-public-media-pipeline`:

- `npm test -- --run`: **PASS** — 2 test files, 7 tests passed.
- `npm run build`: **PASS** — TypeScript build and Vite production build completed.
- `git diff --check`: **PASS**.
- Live Supabase table/schema inspection: **PASS**.
- Live policy inspection before and after migration: **PASS**.
- Preview HTTP health locally and publicly: **PASS** — HTTP 200.
- Public Home preview: **PASS** — persisted Supabase releases and Home cards rendered.
- Public Releases preview: **PASS** — persisted Published and Upcoming content rendered.
- Admin preview: **PASS** — restricted sign-in screen rendered for unauthenticated access.
- Browser console during route smoke tests: **no console errors observed**.
- Original MOV HTTP delivery: **PASS** — MIME, CORS, byte-range, and content length verified.
- Native desktop MOV playback inspection: **PASS** — `readyState=4`, duration `9.87`, no error.

## 8. Remaining blockers

A real authenticated artist mutation test still requires the artist to sign in with the existing password. This sandbox did not have that password, so it could not honestly execute the final upload/reorder/playability/refresh matrix against the live UI. The live policy path was applied and inspected, but the exact browser mutation was not claimed as manually completed.

Mobile Safari/iOS was not available in this sandbox. Native playback remains subject to the browser's support for the original codec/container; unsupported codecs now produce a real error rather than a false success or silent conversion.

The repair was committed and pushed to `fix/admin-public-media-pipeline`. It was not merged into `main` and was not deployed to production.
