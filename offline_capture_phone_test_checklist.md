# Displaygram Offline Capture Phone Test

Status: Offline capture is live on the production web app. The signed Android
Build 17 remains a staging pilot while native-store and broader failure testing
continue.

## Pilot validation log

- Android staging build 3 saved a completed post while the phone was in
  airplane mode and uploaded it automatically after connectivity returned.
- The recovered capture produced one feed post; no duplicate was observed.
- Follow-up build 4 hides the ordinary unfinished-draft banner while online.
- Follow-up build 4 also falls back to the original photo when a generated feed
  thumbnail is not available yet. This preserves the existing resized-image
  path while preventing a broken image in the feed.
- Follow-up build 5 removes the local-save notice from the normal online
  capture flow. A shorter, quieter notice remains available while offline.
- The first offline cold-start test found that the app blocked on a remote
  Firestore profile read even though the draft remained device-local. Build 6
  caches the last server-validated profile, permits offline draft recovery with
  that matching profile, and waits for online revalidation before starting
  background data listeners or uploading queued captures.
- Build 7 keeps the active online capture form uncluttered, but shows a compact
  unfinished-post reminder after the user leaves or reopens that flow. Drafts
  therefore remain discoverable after connectivity returns.
- Build 8 replaces the global unfinished-draft banner with a numbered badge on
  the mobile Create Post button. The Create Post workflow contains a compact
  link for reviewing other device-local drafts; no dashboard management panel
  was added. Uploading, queued, and failure status remain globally visible.
- Build 9 positions the draft badge above the camera button and gives it a
  restrained attention pulse, while honoring the device's reduced-motion
  preference.
- Build 12 exposed a blank-screen regression when **Saved Posts** was opened in
  airplane mode. Build 13 keeps that recovery screen in the always-loaded app
  core and supplies Back and Retry actions if a device-local record still
  causes a rendering failure. The queued photo is not discarded by either
  action.
- Build 13 opened Saved Posts successfully offline and retained older local
  records, but a cold offline capture found an empty brand selector. Build 14
  hydrates the previously saved brand catalog even when live Firestore
  synchronization is disabled and retains the profile company ID fallback.
- Build 14 confirmed that queued posts resume uploading after connectivity
  returns. Build 15 makes feed images automatically retry after reconnecting so
  a manual app refresh is not required to replace broken offline placeholders.
- The November 26 Build 15 phone retest passed: the queued post uploaded once
  after reconnecting and its feed image appeared without a manual refresh.
- Build 17 uses the compact saved-post banner and shared arrow-D-arrow icon
  family. It hides the draft-count badge when the count is zero and retains the
  raised pulsing badge for positive counts.
- Build 17 retained the normal online posting path. The production build and
  lint passed, the concurrent-finalization emulator test produced one post and
  one receipt, and all five offline Storage rule tests passed.
- On November 26, the verified source, finalizer, Firestore rules, Storage
  rules, and Hosting release were published to production. Live checks found
  the production project identifier, no staging identifier, and the expected
  offline bundles. A pre-release backup branch was pushed before the release.
- Remaining interruption, restart, retry-storm, authentication, and broader
  device coverage tests remain follow-up work for the native pilot and gradual
  rollout; they are not recorded as completed.

## Build 18 native authentication test

Use only the staging Android app and staging test accounts. Download Build 18
from `https://displaygram-staging.web.app/android-beta`.

1. Update Build 17 in place with Build 18 and confirm existing saved drafts
   remain available.
2. Sign out, then sign in with an existing staging email/password account.
3. Confirm the feed loads and one normal online post can be opened.
4. Sign out, choose **Continue with Google**, and confirm Android opens the
   native account chooser rather than a browser popup.
5. Select an approved staging Google account and confirm the same Displaygram
   profile and company load.
6. Fully close and reopen the app and confirm the Google session persists.
7. Sign out and confirm protected screens no longer open without signing in.
8. Repeat the airplane-mode capture and reconnect test below using the Google
   session; confirm exactly one post is created.

Recorded November 26: native Google sign-in passed on a physical Android phone.
The email/password check was deferred because the selected staging identity was
Google-only and had no staging password credential. The owner accepted this
test gap for the production web merge. Build 18 remains staging-only and is not
approved as a production Android release.

## Safety prerequisite

A Firebase Hosting preview channel changes only the hosted website version. It
does not isolate Authentication, Firestore, Storage, or Functions. Do not run
the offline-capture pilot against the live `retail-sight` Firebase project.

Before testing:

1. Create or select a separate Firebase staging project.
2. Register its Displaygram web app and put the values in
   `front-end/.env.staging`, using `.env.staging.example` as the template.
3. Seed only test users, a test company, accounts, products, and goals.
4. Deploy this branch's Functions, Firestore rules, and Storage rules to that
   staging project.
5. Run `npm run build:staging` and deploy that output to the staging Hosting
   channel. Confirm the purple **Displaygram Test Environment** banner appears.

## First airplane-mode test

1. Sign in on the phone using a staging test user.
2. Open **Create Post**, turn on airplane mode, and take a new photo.
3. Confirm Displaygram says the photo is saved safely on the device.
4. Finish the post and tap **Submit**.
5. Confirm the saved-post banner appears and the post is listed under
   **View saved posts** as **Waiting to upload**.
6. Background or fully close Displaygram for several minutes.
7. Turn airplane mode off and confirm the phone has usable internet access.
8. Reopen Displaygram. Do not press Retry.
9. Confirm the status changes from waiting, to uploading, to successful.
10. Confirm exactly one post appears in the feed and the Saved Posts screen is
    empty.

Record the phone model, operating-system version, browser or app-shell build,
rough photo size, time offline, time to sync, and any message that was unclear.

## Interruption follow-ups

- Restore connectivity while Displaygram remains open.
- Restore connectivity while Displaygram is backgrounded.
- Close Displaygram during image upload, then reopen it.
- Toggle airplane mode repeatedly during upload and verify only one post exists.
- Sign out with a queued post and verify the warning and device-local retention.
- Reopen an unfinished draft from Saved Posts and complete it.
- Test an expired sign-in and a user whose company membership changed.
- Try a large photo and HEIC capture on both iPhone and Android.
