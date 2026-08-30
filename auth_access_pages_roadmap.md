# Authentication and access page audit

## Implemented on `feat/auth-access-pages-redesign`

- Added a reusable branded `AccessPageShell` that follows the visual language
  established by `/request-access`.
- Refactored the live public access flow:
  - `/login`
  - `/request-submitted`
  - `/accept-invite/:companyId/:inviteId`
  - `/onboard-company/:companyId/:inviteId`
- Refactored the existing `/reset-password` valid, loading, and invalid states
  so it is ready if Displaygram adopts a custom Firebase email action handler.
- Removed three legacy global stylesheets that duplicated auth styles and used
  broad selectors such as `form`, which could leak into unrelated pages.
- Updated public calls to action to use the canonical `/login` and
  `/request-access` routes.
- Reduced the sitemap to real public pages and removed private application
  routes.
- Marked `/new-company-invite/:inviteId` as an auth route so it cannot trigger
  authenticated application bootstrapping while handling an invitation.

## Route decisions

| Route | Status | Decision |
| --- | --- | --- |
| `/request-access` | Live | Keep as the canonical company request page. |
| `/login` | Live | Keep as the canonical sign-in page. |
| `/request-submitted` | Live | Keep; the request form navigates here after a successful submission. |
| `/accept-invite/:companyId/:inviteId` | Live | Keep; current team and approved access-request emails use it. |
| `/onboard-company/:companyId/:inviteId` | Live | Keep; `onPendingNewUserAndCompanyInviteCreate` still generates this URL. |
| `/signup` | Legacy alias | Redirect to `/request-access`; do not design or advertise separately. |
| `/sign-up-login` | Legacy alias | Redirect to `/login`; do not include in the sitemap. |
| `/new-company-invite/:inviteId` | Legacy/unclear | Keep temporarily for old or manually issued links. No current URL generator was found. |
| `/reset-password` | Prepared but not live | Firebase's password-reset template currently points to its hosted `__/auth/action` handler, not this route. |

## Recommended follow-up

1. Decide whether to keep Firebase's hosted password-reset handler or configure
   and test a custom email action handler before directing users to
   `/reset-password`.
2. Confirm that no historical `/new-company-invite/:inviteId` links remain;
   remove the route only after that check.
3. Consolidate the two active invitation backends only as a separate data and
   migration project. Their Firestore collections and acceptance semantics are
   different, so this visual refactor intentionally leaves that logic intact.

## Integrity notes

- No Firebase Functions or Firestore rules changed in this branch.
- Invitation lookup, email matching, authentication, account creation, and
  acceptance logic were preserved.
- The legacy routes remain compatible so existing bookmarks and old emails do
  not fail abruptly.
