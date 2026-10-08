# Displaygram Mobile Apps and Offline Capture Roadmap

Status: Reintegration in progress  
Created: September 7, 2026  
Target platforms: Google Play, Apple App Store, and the existing web/PWA app

## Current reintegration status

On October 7, 2026, production `main` was fast-forwarded to the create-post
workflow already deployed from commit `45fa9ce`. A fresh
`feat/mobile-offline-capture-v2` branch was created from that production
baseline. The September offline branch remains preserved as a reference and
must not be merged wholesale because the production capture workflow changed
substantially.

The staging project `displaygram-staging` now has Web and Android app
registrations, including the staging Android Firebase configuration.
Email/password Authentication is enabled. Firestore was created in `nam5`, and
the staging Storage bucket, Firestore rules/indexes, and Storage rules are live.
The `finalizeOfflineCapture` and `getAvailableBillingPlans` callables plus the
`syncUserRoleClaims` Firestore trigger are deployed in `us-central1` on Node 22;
an unauthenticated verification request for offline finalization was rejected as
expected. Staging also has a seven-day Functions artifact cleanup policy and
non-production Braintree placeholders that must be replaced with sandbox
credentials before billing is tested. The staging web build is live at
`https://displaygram-staging.web.app` and was verified to contain the staging
Firebase identifiers and production-project guard. One staging-only admin test
account now has a fake company, route, stores, brands, products, and free plan;
its custom claims point only to that fake company. On October 8, 2026, a local
staging debug APK was built successfully and verified as
`com.displaygram.app.staging` with the visible name "Displaygram Staging" and
the staging Firebase configuration. Staging still needs its iOS app registration
and distribution through an Android internal-test channel. Google sign-in
remains off.

The first Android device test exposed a legacy PWA behavior: offline navigation
could fall through to the static `offline.html` page before Create Post loaded.
The staging build now emits an offline asset manifest, pre-caches the complete
application shell (including lazy Create Post and Saved Posts bundles), and
serves the cached SPA for offline navigation. Native builds also unregister any
stale web service worker so the bundled Android application remains authoritative.
A replacement staging APK was generated, and the corrected service worker and
110-file offline manifest are live on staging Hosting. Direct APK delivery from
Hosting proved unreliable in an Android embedded browser, so version
`1.0-staging (2)` is now distributed to the initial tester through Firebase App
Distribution instead of a public download URL.

Android build identities are separated by environment: production uses
`com.displaygram.app`, while staging uses `com.displaygram.app.staging` and the
visible name "Displaygram Staging". Each flavor reads its own Firebase Android
configuration so a staging phone build cannot identify as the Play production
app.

## Historical implementation progress

Started September 7, 2026 on `feat/mobile-apps-offline-capture`, branched from
`main`.

Completed foundation:

- Added Capacitor 8 and generated tracked Android and iOS native projects from
  the existing Vite application.
- Added Camera, Filesystem, Network, App lifecycle, and Push Notifications
  plugins for the roadmap's native integration points.
- Kept the web/PWA service worker out of native containers and registered early
  native lifecycle/network events for camera-result recovery and future queue
  sync wakeups.
- Added required iOS camera and photo-library permission descriptions.
- Added a temporary Create Post notice explaining that existing-photo selection
  is planned for removal only after offline camera capture is validated.
- Added a separate versioned offline-capture database, platform-specific image
  persistence, local capture states, and a visible "Saved on this device"
  confirmation before any AI or Firebase upload begins.
- Preserved the offline-capture database during the existing application cache
  reset and added a sign-out warning for unsynced captures.
- Added an app-wide pending-upload banner using the Displaygram product name.
  It confirms that posts are safe on the device, explains that foreground sync
  is automatic, and reminds users to reopen Displaygram when a post still needs
  to finish.
- Added foreground automatic synchronization on initial app load, restored
  connectivity, and native app resume, with a single active worker and bounded
  retry backoff.
- Added build-generated app-shell precaching and offline SPA navigation after
  the first device test showed the older PWA fallback page blocking Create Post.
  Native containers defensively remove stale web service workers.
- Added the authenticated `finalizeOfflineCapture` function, deterministic post
  IDs, server-owned idempotency receipts, active company-membership checks, and
  server-side post/user/account validation.
- Added owner/company-scoped `offlineUploads/**` Storage rules and backend-only
  `displayImages/**` writes. Firestore clients are explicitly denied access to
  offline capture receipts, including through the temporary catch-all rule.
- Added Storage emulator coverage for correct user/company uploads, retries,
  unauthenticated and cross-scope attempts, invalid metadata/content, and final
  image access. All five tests passed locally on September 8, 2026 using the
  Firebase Storage emulator and Java 21.
- Added a protected Saved Posts screen linked from the status banner. Users can
  preview local photos, reopen unfinished or failed drafts, retry queued work,
  and deliberately discard captures when no upload is active.
- Added environment-based Firebase web configuration, a staging configuration
  template, a visible test-environment banner, and a build-time guard that
  prevents a staging build from silently connecting to the production
  `retail-sight` Firebase project.

Open decisions and gates:

- `com.displaygram.app` is a provisional development identifier; ownership must
  be confirmed before Firebase native apps, signing, or store records are made.
- Native Google/Apple authentication strategy and organization developer-account
  status still need owner confirmation.
- The separate Firebase staging project is active and has a minimal fake-data
  test tenant. Additional test users must be added only to that tenant (or to
  other explicitly fake tenants) before distributing access more broadly. A
  Hosting preview channel by itself still connects to whichever Firebase
  backend was compiled into the app.
- Cloud Functions now targets Node 22. The complete production function suite
  still needs regression testing before its runtime is upgraded and redeployed;
  only the three functions needed for staging login/bootstrap and offline capture
  have been deployed to staging.
- The new sync protocol no longer uses the broadly writable `images/**` or
  `tempUploads/**` paths. Those legacy paths remain an independent integrity
  issue and should be tightened after their existing callers are inventoried.
- AI, custom-product/manual-account, and Gallo follow-up work is not yet routed
  through retry-safe backend jobs. A core post can sync, but this branch must not
  be deployed to the pilot until those side effects and recovery UI are handled.

## Outcome

Ship Displaygram as maintainable Android and iOS applications without rewriting
the React product, while allowing field users to capture retail displays in poor
or nonexistent network conditions without losing photos or creating duplicate
posts.

The first mobile release should focus on the field workflow: sign in, choose an
account or goal, take a display photo, complete post details, save offline, and
sync later. Billing administration and company setup should remain web-first in
the first store release.

## Current-state findings

Displaygram already has several useful foundations:

- React 18 and Vite provide a web codebase that can be packaged for both stores.
- A web app manifest, icons, standalone display mode, and a service worker exist.
- The create-post screen already supports the rear camera through a file input.
- IndexedDB already caches posts, users, accounts, goals, products, and company
  connections.
- Firebase Authentication, Firestore, Storage, Functions, Hosting, and push
  notifications are already in use.

The current capture flow is not offline-safe:

- Selecting a photo may immediately upload a temporary image for AI detection.
- Submitting a post uploads the image, creates the Firestore post, updates goals,
  logs AI feedback, may create an account, and may send a Gallo achievement.
- Those operations are sequential and do not share one durable idempotency key.
- A network interruption can therefore leave a partial submission or force the
  user to repeat the workflow.
- The service worker currently caches the offline page and selected images, but
  not a complete offline application shell or a submission queue.
- The existing logout/reset path clears local application data, so it must be
  changed before unsynced captures are stored locally.

## Architecture decision

### Use Capacitor around the existing React application

Capacitor is the recommended approach because it can be added to an existing
modern web project and provides native iOS and Android access without maintaining
a second UI codebase.

Use these native capabilities:

- Camera: capture from the rear camera and select an existing image.
- Filesystem: persist the original photo in the app's private storage before any
  network operation begins.
- Network: detect connectivity changes and wake the foreground sync queue.
- App lifecycle: recover a camera result if Android terminates and recreates the
  app while the camera activity is open.
- Push notifications: use the native APNs/FCM path inside store applications;
  retain the current service-worker path for web users.

Do not rewrite Displaygram in React Native for version one. A rewrite would
duplicate working UI and business logic, delay the offline feature, and increase
the risk of web and mobile behavior diverging.

Reference: <https://capacitorjs.com/docs>

## Offline capture design

### Non-negotiable behavior

When the user taps **Save display**, the app must first save the photo and draft
locally. Only after that local save succeeds may it attempt an upload. The user
must be able to close and reopen the app and still see the pending capture.

```text
Take photo
    -> save photo in private device storage
    -> save draft metadata with a generated capture ID
    -> show "Saved on this device"
    -> wait for usable connectivity
    -> upload image using the same capture ID
    -> finalize the post once on the server
    -> run optional AI/goal/Gallo follow-up work
    -> mark synced and remove the local photo after confirmation
```

### Local draft record

Each capture should have a durable local record similar to:

```text
captureId              UUID generated before capture is submitted
userId                 authenticated owner
companyId              company at capture time
localImageUri          private local file path
previewUri             local preview path or object URL
capturedAt             device timestamp
accountSnapshot        selected account ID and display label
goalSnapshot           selected goal ID and minimum display data
postPayload            description, products, brands, quantities, location
state                  draft | queued | uploading | finalizing | synced | failed
attemptCount           retry counter
lastAttemptAt          last sync attempt
lastErrorCode          safe machine-readable failure reason
serverPostId           set only after server confirmation
schemaVersion          permits safe future migrations
```

Store image binaries in Capacitor Filesystem on native devices. Store queue
metadata in an IndexedDB store dedicated to offline captures. Keep the web/PWA
fallback in IndexedDB, but test browser storage quotas with real photos. If
WebView persistence proves unreliable during testing, move native queue metadata
to SQLite without changing the queue interface.

### Sync protocol

1. Generate `captureId` before any upload.
2. Compress a working copy while retaining the original according to the product
   retention decision.
3. Upload to the stable, company-scoped staging path
   `offlineUploads/{companyId}/{userId}/{captureId}/original.jpg`.
4. Use resumable upload and persist enough state to restart after interruption.
5. Call the authenticated `finalizeOfflineCapture` function with the
   `captureId`, storage path, and post metadata.
6. In a Firestore transaction, make the capture ID idempotent: repeated calls
   must return the same post instead of creating duplicates.
7. Validate that the caller still belongs to the company and may create posts.
8. Create or finalize the post, then enqueue downstream work.
9. Return the permanent post ID to the device.
10. Mark the local record synced; delete the local photo only after the server
    post and image are confirmed.

AI detection should be deferred while offline. Once the image is uploaded, AI
can run asynchronously and offer suggestions later. AI failure must never block
the core post from syncing.

Gallo and company-goal updates also need idempotency markers so retries cannot
submit the same achievement twice. A failed integration should appear as
"Post synced; follow-up needs attention," not as a lost post.

### User experience

Add an always-visible sync indicator:

- **Saved offline**: safely stored on this device.
- **Waiting for connection**: queued and requires no user action.
- **Syncing 2 of 5**: progress is visible.
- **Needs attention**: account, goal, permission, or permanent validation issue.
- **Synced**: server copy confirmed.

Add an Offline Queue screen where users can preview, edit, retry, or deliberately
discard a capture. Never silently delete pending captures during logout, cache
reset, application upgrade, or authentication refresh. If a user signs out with
pending work, explain that the drafts remain locked to that user on that device
and provide explicit upload or discard choices.

Do not promise that every upload will finish while the app is fully closed.
iOS and Android can suspend background work. Version one should guarantee
durable capture and reliable foreground/resume syncing; constrained background
sync can be evaluated after this path is proven.

## Security and Firebase integrity

The current Storage rule for `images/**` allows any authenticated user to write
any path. Before the mobile beta, replace this broad rule with company- and
user-scoped upload paths.

Required controls:

- Storage writes must require authenticated claims matching the path's company
  and user IDs.
- Validate image MIME type and enforce an agreed maximum file size.
- Do not allow clients to overwrite another user's uploaded capture.
- The final post and sync receipt should be written by a callable Function or
  another server-authoritative path.
- Firestore rules must prevent clients from changing ownership, company scope,
  sync state, or integration completion fields.
- Add cleanup for abandoned uploads that never produce a finalized post.
- Log capture ID, user ID, company ID, state transition, and safe error code;
  never log image contents or access tokens.
- Add App Check to native beta builds in monitoring mode first. Enforce it for
  upload/finalization endpoints only after genuine iOS and Android traffic has
  been validated.

Rules changes must be tested in the Firebase emulator for correct-company,
wrong-company, unauthenticated, retry, and expired-membership cases before
production deployment.

## Store strategy and policy work

### Account ownership

Create organization-owned developer accounts rather than personal accounts:

- Apple Developer Program / App Store Connect under the legal business owner.
- Google Play Console organization account; Google requires organization
  verification information and a D-U-N-S number.
- Store signing credentials in a business-controlled password manager and give
  at least one trusted backup administrator access.
- Reserve stable identifiers, for example `com.displaygram.app`, only after
  confirming legal ownership and naming.

Using a newly created Google Play personal account can trigger a closed-test
requirement of at least 12 continuously opted-in testers for 14 days. An
organization account is the appropriate fit for Displaygram and avoids tying the
app's ownership to one person's identity.

References:

- <https://support.google.com/googleplay/android-developer/answer/13634885>
- <https://support.google.com/googleplay/android-developer/answer/14151465>

### Authentication and account deletion

Apple's current review rules require an equivalent privacy-preserving login when
third-party/social login is used, with an exception for qualifying business apps
that require an existing enterprise account. Because Displaygram currently uses
Google login, plan for Sign in with Apple unless App Review confirms the business
account exception applies.

Both stores require account-deletion support when account creation is offered.
Build:

- an in-app **Delete or request deletion of my account** path;
- a public web page where a former user can request deletion;
- clear handling for company-owned posts, audit data, billing records, and legal
  retention obligations;
- admin-safe behavior so deleting one user never deletes the company or other
  users unintentionally.

References:

- <https://developer.apple.com/app-store/review/guidelines/>
- <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- <https://support.google.com/googleplay/android-developer/answer/13327111>

### Billing in the first mobile release

Do not expose Braintree checkout or plan-change purchasing inside the first iOS
or Android build. Displaygram is a business service sold to organizations, but
store payment-policy interpretation should be confirmed before submission.

Version one should:

- allow existing authorized users to use the plan their company already has;
- make plan usage/status read-only if it is shown at all;
- keep checkout, subscription changes, and payment-method management on the web;
- avoid in-app calls to action that direct iOS users to an external purchase.

This reduces review risk and keeps the field application focused.

### Store materials

Prepare for both stores:

- app name, subtitle/short description, long description, category, keywords;
- support URL, privacy-policy URL, account-deletion URL, and contact information;
- app icon, launch/splash assets, phone screenshots, and optional preview video;
- camera, photo-library, location, and notification permission explanations;
- Apple App Privacy answers and Google Play Data Safety answers covering Firebase,
  Braintree, Cloud Vision, location, photos, diagnostics, and notifications;
- age/content rating, export-compliance answers, review notes, and a stable demo
  account that does not expose a real customer's data.

Google Play requires new apps to use an Android App Bundle and Play App Signing.
Apple builds are uploaded and beta-tested through App Store Connect/TestFlight.

References:

- <https://developer.android.com/studio/publish/>
- <https://developer.android.com/studio/publish/app-signing>
- <https://support.google.com/googleplay/android-developer/answer/10787469>
- <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/>
- <https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app>

## Delivery phases

### Phase 0 — Decisions and prerequisites

- Validate the Node 22 runtime across the complete production function suite;
  the staging offline-capture function is already running on Node 22.
- Confirm Apple and Google organization account status and ownership.
- Confirm access to a current Mac capable of running Xcode for iOS builds.
- Select application ID, app owner, support contact, and privacy-policy owner.
- Decide whether original full-resolution photos remain on-device after sync.
- Decide offline queue size and retention period.
- Choose a small real-world pilot group.

Exit condition: accounts, ownership, identifiers, pilot users, and data-retention
decisions are documented.

### Phase 1 — Native shell and authentication

- Add Capacitor to the current Vite project on a dedicated feature branch.
- Generate Android and iOS projects from the same production web build.
- Configure native app links/deep links and Firebase platform applications.
- Implement native-safe Google authentication and Sign in with Apple or document
  the approved business-app exception.
- Replace web-only push behavior with the platform-native notification path.
- Add camera, photo, location, network, and notification permission messaging.
- Confirm that normal web deployment remains independent of store releases.

Exit condition: internal Android and iOS builds can sign in and navigate the
existing application without popup-based authentication failures.

### Phase 2 — Durable offline capture foundation

- Add the versioned offline-capture data model and IndexedDB queue.
- Add native private-file persistence through Capacitor Filesystem.
- Refactor photo selection so AI upload is never required to retain a photo.
- Add offline account/goal/product selection using existing local caches.
- Add queue UI, status indicator, retries, and logout protection.
- Add migration tests for local schema upgrades.

Exit condition: a user can capture and fully describe multiple displays in
airplane mode, terminate the app, reopen it, and recover every draft.

### Phase 3 — Idempotent synchronization backend

- Add the stable company-scoped Storage path and tighten Storage rules.
- Add `finalizeDisplayCapture` and an idempotent capture receipt.
- Route both online and offline post creation through the same finalization path.
- Make AI, custom-product, account, goal, and Gallo follow-up operations retry-safe.
- Add abandoned-upload cleanup and developer diagnostics.
- Deploy rules and Functions behind a pilot feature flag.

Exit condition: repeated retries produce one post, one image set, and at most one
external achievement.

### Phase 4 — Failure testing and pilot

Test at minimum:

- airplane mode before capture;
- connection loss during image upload and during finalization;
- slow cellular service and repeated online/offline transitions;
- app termination after taking the photo and during upload;
- device reboot with queued captures;
- expired authentication and changed company membership;
- deleted or changed account/goal while a draft is pending;
- logout with pending captures;
- low device storage and large/HEIC images;
- duplicate taps and retry storms;
- iPhone and Android camera permission denial;
- upgrades from an older app build with queued data.

Pilot first with internal staff, then a small Healy/Geloso field group. Capture
feedback inside the app and provide a direct support route.

Exit condition: no lost images, no duplicate posts, and an agreed sync-success
target is met across poor-network tests.

### Phase 5 — Store submission

- Complete privacy policy and deletion workflow.
- Complete Apple privacy and Google Data Safety declarations.
- Produce screenshots from real release builds using non-customer demo data.
- Create signed Android App Bundle and configure Play App Signing.
- Upload iOS build to TestFlight and Android build to internal testing.
- Resolve beta findings, prepare reviewer credentials/instructions, and submit.
- Release gradually and monitor crash-free sessions and sync performance.

Exit condition: both store builds are approved and released to a controlled
percentage of users before full rollout.

## Suggested sequence and schedule

These are planning ranges, not commitments:

1. Prerequisites and Node 22: about 1 week.
2. Capacitor shell, native auth, and device integrations: 1–2 weeks.
3. Offline capture queue and server finalization: 2–4 weeks.
4. Failure testing and customer pilot: about 2 weeks.
5. Store materials, review, and fixes: 1–3 or more weeks depending on review.

A reasonable planning range is 6–10 weeks of focused work, plus any time needed
for developer-account verification or store review.

## Release gates and success measures

Do not submit publicly until all of these are true:

- Zero known cases of a captured image disappearing after the app reports it saved.
- Repeated sync attempts cannot create duplicate posts or Gallo achievements.
- Pending captures survive restart, upgrade, and loss of connectivity.
- The user always knows whether a capture is local, syncing, failed, or confirmed.
- Wrong-company upload and post-finalization attempts fail in emulator rule tests.
- Account deletion and privacy disclosures match actual Firebase, Braintree,
  Cloud Vision, camera, location, and notification behavior.
- Store demo credentials are isolated from customer data.
- Web, Android, and iOS regression suites pass from the same release commit.

Track these metrics without storing photo content in analytics:

- offline captures saved;
- queue-to-sync success rate;
- median and high-percentile time to sync;
- retry count and permanent failure reason;
- duplicate finalization prevented;
- local drafts older than the retention target;
- crash-free sessions by app version and platform.

## Decisions needed from the owner

- Apple Developer organization account: existing, needs enrollment, or unknown.
- Google Play organization account: existing, needs enrollment, or unknown.
- Mac/Xcode access: owned, borrowed/hosted, or needs purchasing.
- Initial device scope: phones only or phones and tablets.
- Offline queue policy: maximum captures and maximum days retained locally.
- Photo policy: remove local original after confirmed sync or retain it.
- Pilot group: internal users and named customer volunteers.
- Mobile billing: confirm web-only billing for version one.
