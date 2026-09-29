# The12thHouse — Phase 1 Admin Control Room Report

**Date:** 2026-09-28  
**Project:** `hoomanpix/The12thHouse`  
**Phase:** 1 — Admin Control Room prototype and recovery-flow repair  
**Branch:** `preview/admin-control-room-phase-1`  
**Base:** `main` at `43bd55a`  
**Current HEAD:** `70d8851` (`feat: build admin control room phase 1`)

## Executive summary

Phase 1 is implemented on an isolated preview branch. The Admin experience is now a separate, information-dense control-room product for managing releases, tracks, Home cards, links, and settings through the live Supabase-backed catalog. Access is restricted in the UI and database policy layer to the approved artist email:

> `kamielkhajehpour@gmail.com`

The critical password-recovery defect has been repaired. Supabase recovery callbacks no longer fall through HashRouter into a blank public Home page. They are intercepted and rendered by a dedicated `/admin/change-password` route, with the password form rendered immediately and explicit validation/error states.

## Delivered in Phase 1

### Admin control room

- Dedicated Admin shell with product-style navigation and tabs:
  - Dashboard
  - Releases
  - Tracks
  - Home
  - Links
  - Settings
- Supabase-backed catalog synchronization replacing the earlier local-storage path.
- Admin-only access gate for the approved artist email.
- Release and track management UI, including publish/visibility controls and media-related fields already supported by the current Phase 1 prototype.
- Home-card selection/editing support for the three primary Home cards.
- Links and settings surfaces inside the Admin shell.
- Public-site presentation remains outside the Admin redesign scope.

### Password recovery

- Added route: `/admin/change-password`.
- Added recovery-hash detection for Supabase `type=recovery` callbacks.
- Updated Admin/public route selection so recovery callbacks stay inside the Admin product.
- Changed reset-email redirect behavior to use `VITE_AUTH_REDIRECT_URL` when configured, with a safe local/base-path fallback to `#/admin/change-password`.
- Recovery form renders before catalog loading, so it does not depend on the public catalog synchronization completing first.
- Added explicit states for invalid recovery session, password mismatch, success, and Supabase update errors.

## Verification performed

### 1. Preview server

Started the Vite preview server with:

```bash
npm run dev -- --host 0.0.0.0 --port 5176
```

Local readiness check returned `HTTP/1.1 200 OK`.

Preview URL:

<https://5176-i4s6js21zv2l6vl0prnqe-3b749454.us4.manus.computer/>

### 2. Direct recovery route

Opened:

<https://5176-i4s6js21zv2l6vl0prnqe-3b749454.us4.manus.computer/#/admin/change-password>

Observed immediately:

- `The12thHouse Admin · Password recovery`
- `Set a new password`
- New password field
- Confirm password field
- `Save new password` button

The page did **not** fall through to the public Home route or render blank.

### 3. Simulated Supabase recovery hash

Opened a simulated callback containing:

```text
#access_token=simulated-access-token&refresh_token=simulated-refresh-token&type=recovery
```

Observed the dedicated password-recovery UI remained rendered. This confirms the recovery hash is intercepted instead of being interpreted as a normal HashRouter public-site route.

### 4. Password mismatch handling

Entered two different passwords and submitted the form.

Observed the explicit error:

```text
Passwords do not match.
```

The form remained on the recovery screen and did not navigate to Home.

### 5. Public-site regression check

Opened the production public site:

<https://hoomanpix.github.io/The12thHouse/>

Observed the public Home page rendered normally with its existing navigation and release cards. No public layout change was introduced as part of the recovery repair.

### 6. Build and automated tests

Executed:

```bash
npm run build
npm run test
```

Results:

- Vite/TypeScript production build: **passed**
- Vitest: **1 test file passed, 4 tests passed**
- Existing test output includes React `act(...)` warnings from `InteractiveIntro`; these are warnings only and do not fail the suite.

## Source areas changed

- `src/App.tsx`
  - Recognizes both the explicit recovery route and Supabase recovery hash state as Admin routes.
- `src/config/routes.ts`
  - Adds `adminRecovery: '/admin/change-password'`.
- `src/features/catalog/CatalogProvider.tsx`
  - Uses the configured auth redirect URL or a base-path-safe recovery fallback.
  - Preserves the approved-email recovery gate.
- `src/pages/AdminPage.tsx`
  - Adds the dedicated password-reset form and explicit success/error states.
- `src/styles/global.css`
  - Adds the recovery-page styling and Admin control-room styling.

## Security and access notes

- The approved email is enforced in the Admin UI and in the Supabase access-policy approach established for this phase.
- Password values were not logged, stored in the report, or transmitted outside the browser interaction.
- The simulated recovery hash used for testing was fake and cannot update an account.
- A real password update still requires a valid Supabase recovery session generated by the reset email.

## Known limitations and follow-up boundary

1. **Real email end-to-end confirmation:** A live reset email must still be exercised on the deployed domain/device with a valid Supabase recovery token. The browser verification here intentionally used a simulated hash and therefore did not change the artist account password.
2. **Deployment redirect configuration:** For production, set `VITE_AUTH_REDIRECT_URL` to the final deployed site URL that includes the recovery route, or ensure the fallback base URL is the correct deployed origin. The current fallback is suitable for the Vite base-path deployment tested here.
3. **Supabase Storage:** Storage/media upload finalization remains a Phase 2/backend concern where the current Supabase project configuration or policies require additional work.
4. **Responsive/accessibility depth:** The recovery form has semantic labels and visible validation messaging. A full Lighthouse/axe and multi-viewport audit of the entire Admin product remains future hardening work.
5. **Phase boundary:** No Phase 2 backend finalization work was started as part of this completion step.

## Working-tree note

The branch contains the Phase 1 source changes and the existing project review artifact. The report itself is added as a documentation artifact. Generated TypeScript build metadata may also be refreshed by the build command and should not be treated as a hand-authored product change.

## Final status

**Phase 1 status: complete for preview review.**

The branch is ready for the artist’s final manual approval and subsequent merge/deployment decision. `main` was not modified.
