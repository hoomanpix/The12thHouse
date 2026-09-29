# The12thHouse — Phase 1.2 Admin Architecture Report

## Scope

This phase implements the requested **destination-first Admin Control Room architecture** on the isolated branch `preview/admin-persistence-phase-1`.

The Admin is now organized around the artist's real workflow:

1. Choose a destination: **Home** or **Releases**.
2. If Releases is selected, choose a category: **Music** or **Visual**.
3. Choose the content type:
   - Music: **Single** or **Album**
   - Visual: **Cover** or **Animation**
4. Complete only the relevant form fields.
5. Save each logical section explicitly and receive backend-confirmed feedback.

No Phase 2 work, database schema migration, RLS change, public visual redesign, merge, or production deployment was performed.

## Implemented

### 1. Home destination

- Dedicated Home navigation entry.
- Persisted featured-content selector backed by the existing `featured` field.
- Persisted Home-card selectors backed by the existing `home_cards` mapping.
- Explicit **Save Home Configuration** action.
- Public Home no longer fabricates fallback cards or silently substitutes the first singles/album. It now renders only published content selected by persisted Home configuration.

### 2. Releases destination

- Dedicated Releases navigation entry with Music and Visual sub-navigation.
- Music filters: all, single, album.
- Visual filters: all, cover, animation.
- Status filters: Draft, Upcoming, Published.
- Persisted release list rows with artwork, content type, status, track count, and edit action.
- Explicit create and edit paths.
- Delete is protected by an in-app confirmation dialog.

### 3. Music workflows

#### Single

- Title, release date, status, description.
- Artwork upload.
- Track title.
- Optional audio upload during creation.
- Post-creation track editor with independent save controls.

#### Album

- Title, release date, status, description.
- Artwork upload.
- Track count.
- Dynamic track-title fields generated from the chosen count.
- Optional first-track audio upload during creation.
- Post-creation track editor for every track.

#### Track editor

- Independent title save.
- Independent audio upload save.
- Independent audio removal.
- Playable/unplayable state is disabled until audio exists.
- Track order move controls with explicit **Save Track Order**.
- Add-track flow for albums.
- Delete-track action with backend-confirmed feedback.
- Play count and audio availability indicators.

### 4. Visual workflows

#### Cover

- Title, release date, status, description.
- Artwork upload persisted through the existing `artist-assets` bucket and `artwork_url` field.

#### Animation

- Title, release date, status, description.
- Animation/video upload persisted through the existing `artist-assets` bucket and `visual_url` field.
- Optional poster/cover image.
- Edit view includes video preview, replacement, removal, and separate artwork controls.

### 5. Platform links

- Existing `platform_links` integration retained.
- Platform and URL are editable per link.
- Add-link and delete-link actions.
- Explicit **Save Links** action for edited links.
- Public release detail continues consuming persisted platform links.

### 6. Persistence and feedback

- Visual media persistence was added to `CatalogProvider` without changing database schema.
- Existing Supabase Storage bucket `artist-assets` is reused.
- Upload failures are surfaced and uploaded objects are cleaned up when the related database update fails.
- Save states are visible as `Saving…`, `Saved ✓`, or `Save failed: …`.
- Public catalog refreshes after successful mutations through the existing provider reload path.

## Files changed

- `src/pages/AdminPage.tsx`
  - Replaced the generic tab layout with destination/category/type contextual workflows.
  - Added explicit save sections, filters, creation forms, editing forms, media controls, and responsive navigation.
- `src/features/catalog/CatalogProvider.tsx`
  - Added `saveVisualMedia` and `removeVisualMedia` using the existing Storage architecture.
- `src/pages/HomePage.tsx`
  - Removed hard-coded fallback Home cards and fallback featured-release selection.
  - Home now follows persisted published configuration.
- `src/styles/global.css`
  - Added responsive styles for contextual navigation, wizard steps, filters, content rows, media previews, and mobile layouts.
- `PHASE_1_2_ADMIN_ARCHITECTURE_REPORT.md`
  - This report.

## Verification

### Automated

- `npm run build` — **passed**
- `npm run test` — **passed**
  - 1 test file passed
  - 4 tests passed
- `git diff --check` — **passed**

Vitest emits existing React `act(...)` environment warnings from `InteractiveIntro.test.tsx`; they do not fail the suite.

### Browser / preview

Preview used:

`https://5177-i4s6js21zv2l6vl0prnqe-3b749454.us4.manus.computer/`

Verified in the Sandbox browser:

- `/` public Home renders successfully from the shared catalog provider.
- Persisted public Home currently renders the three configured published cards: Rap Shode Bazi, Shode Mah Kamel, and Glass Horizon.
- `/admin` renders the artist sign-in gate with labelled email/password fields, Forgot Password, and Create Account actions.
- Browser console contained no runtime errors during the preview smoke check.
- The existing password recovery route remains handled by the current recovery implementation.

### Authentication boundary

The internal authenticated Control Room CRUD screens were not falsely marked as browser-accepted in this Sandbox run because the artist's Supabase password/session was not available to the agent. The unauthenticated gate and public catalog were verified. Final artist acceptance should sign in with:

`kamielkhajehpour@gmail.com`

Then exercise the following real workflows in the preview:

1. Home: select featured content and Home cards → **Save Home Configuration** → refresh public Home.
2. Releases → Music → Single: create one release, upload artwork/audio, save track, publish, verify public Releases.
3. Releases → Music → Album: choose track count, name tracks, save order, upload audio per track, verify playable/unplayable states.
4. Releases → Visual → Cover: create and upload artwork, publish, verify Visual filter and public detail.
5. Releases → Visual → Animation: create with video and optional poster, save media, verify public video detail.
6. Edit a platform link and add a new link → **Save Links** → verify public release detail.
7. Refresh the browser and confirm the saved records remain present.

## Branch and delivery state

- Branch: `preview/admin-persistence-phase-1`
- Main branch: unchanged by this phase.
- Production: not deployed.
- Supabase schema/RLS/Storage policy: unchanged.
- Public layout/design: unchanged except for Home's removal of hard-coded fallback content.
