# Production Android internal release

## Current state

- Package: `com.displaygram.app`
- Firebase project: `retail-sight`
- Firebase Android app:
  `1:484872165965:android:3e148ebb298b4826105a04`
- Release version: `1.0.1 (2)`
- Minimum Android SDK: 24
- Target Android SDK: 36
- Google authentication: native account chooser followed by the existing
  Firebase JavaScript session
- Push notifications: native Android FCM registration and delivery, with the
  existing service-worker path retained for web browsers

The production upload certificate is separate from the staging certificate.
Its registered Firebase fingerprints are:

- SHA-1: `27:E0:47:C8:46:C4:72:48:74:1D:A1:78:85:8E:E9:54:33:81:F9:04`
- SHA-256: `F2:35:45:37:15:DC:D0:74:95:7B:B3:0D:8C:39:0B:9F:13:3B:C2:37:21:D6:C5:B2:AC:58:77:03:36:D6:C9:57`

## Signing custody

The local upload key and recovery properties are stored outside Git under
`D:\Displaygram\.signing`. The populated local build properties file is
`front-end/android/production-keystore.properties` and is ignored by Git.
The non-secret upload certificate export is
`D:\Displaygram\.signing\displaygram-production-upload-cert.pem`.

Before uploading any bundle to Google Play, copy both the upload key and its
recovery properties into a business-controlled password manager or encrypted
backup. Losing the upload key or its password complicates future releases.
Never commit either file and never reuse the staging certificate.

## Rebuild

From `front-end`:

```powershell
npm run build:production
npx cap sync android
cd android
.\gradlew.bat bundleProductionRelease assembleProductionRelease
```

The signed outputs are:

- Play upload: `front-end/android/app/build/outputs/bundle/productionRelease/app-production-release.aab`
- Direct QA: `front-end/android/app/build/outputs/apk/production/release/app-production-release.apk`

The current verified `1.0.1 (2)` build produced:

- AAB SHA-256: `4D9A52C5BAD52B9576CA7616C527A8A8D09E7BE5F17B626D9F00E341955DC9CE`
- APK SHA-256: `5A0C20737C6CE419DA938668F9AD103A139D08132D4FF2E9394AE756F1F8FF88`

Rebuilding can change these file hashes. Always calculate and record the hashes
for the exact artifacts being distributed.

## Firebase App Distribution QA release

Production APK `1.0.1 (2)` was uploaded privately to Firebase App Distribution
as release `751ssioibcpe8` and assigned only to
`cwilliams@healywholesale.com`. The stable tester page is:

`https://appdistribution.firebase.google.com/testerapps/1:484872165965:android:3e148ebb298b4826105a04/releases/751ssioibcpe8`

Before upload, the exact APK installed successfully on the isolated Android 11
emulator, cold-started `com.displaygram.app/.MainActivity`, and produced no
fatal Android or Capacitor startup exception. The emulator image does not have
Google Play Services, so native token registration and delivery require the
focused physical-phone check below.

The production `onUserNotificationCreated` function was updated in isolation to
send browser tokens through the existing data-only service-worker path and
Android-native tokens through a visible notification payload. No Firestore or
Storage rules were deployed. The existing create-only token rule remains in
force; the client checks for an existing token before attempting a create.

Focused phone check for `1.0.1 (2)`:

1. Update from the tester page without uninstalling the existing production app.
2. Open **Notifications > Preferences**. The device card should offer **Enable**
   or **Register again**, rather than report that notifications are unsupported.
3. Tap the action and accept the Android notification permission prompt. The
   card should then report that push alerts are active.
4. From a second account, create a like or comment that targets the tester. Check
   foreground delivery, background delivery, and that tapping the alert opens
   Displaygram's Notifications page.

## Google Play internal-track handoff

1. Create or select the Displaygram app in Google Play Console for
   `com.displaygram.app` and enroll it in Play App Signing.
2. Open **Setup > App integrity** and copy the SHA-1 and SHA-256 fingerprints
   from the **App signing key certificate**. These are different from the
   upload certificate above.
3. Add both Play App Signing fingerprints to the production Firebase Android
   app, refresh `src/production/google-services.json`, and rebuild the AAB.
4. Upload the AAB to the Play **Internal testing** track, add only approved
   testers, and review the release before starting the internal rollout.
5. From a Play-installed build, test Google sign-in, the correct production
   company/feed, session persistence, sign-out, camera capture, and offline
   reconnect behavior.

Do not promote beyond Internal testing until these checks pass. Google Play has
not received an artifact from this repository yet. Firebase App Distribution
is a private QA bridge, not a substitute for the Play internal-track checks.
