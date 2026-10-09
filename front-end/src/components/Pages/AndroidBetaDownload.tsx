import release from "../../release/androidBetaRelease.json";
import "./androidBetaDownload.css";

const downloadUrl = `/downloads/${release.fileName}`;

const formattedSize =
  release.sizeBytes > 0
    ? `${(release.sizeBytes / 1024 / 1024).toFixed(1)} MB`
    : "Release build pending";

export default function AndroidBetaDownload() {
  return (
    <main className="android-beta-page">
      <section className="android-beta-hero">
        <img
          className="android-beta-logo"
          src="/displaygram-logo-long-BLUE.svg"
          alt="Displaygram"
        />
        <span className="android-beta-kicker">Android field beta</span>
        <h1>Install Displaygram Staging</h1>
        <p>
          Test offline capture on an Android phone without connecting to live
          customer data. Everything created in this app stays in the staging
          environment.
        </p>
        <div className="android-beta-release-row" aria-label="Release details">
          <span>{release.versionName}</span>
          <span>Build {release.versionCode}</span>
          <span>{formattedSize}</span>
        </div>
        <a className="android-beta-download" href={downloadUrl} download>
          Download Android beta
        </a>
        <p className="android-beta-browser-note">
          Open this page in Chrome on your Android phone. In-app browsers may
          not finish large APK downloads.
        </p>
      </section>

      <section className="android-beta-warning" aria-labelledby="before-installing">
        <h2 id="before-installing">Before the first website install</h2>
        <p>
          If Firebase App Distribution installed an earlier Displaygram Staging
          build, finish or discard every saved post before continuing. Then
          uninstall that staging app. This one-time reinstall is necessary
          because the website beta uses its own long-lived signing certificate.
        </p>
      </section>

      <section className="android-beta-card">
        <h2>Install on Android</h2>
        <ol>
          <li>Tap <strong>Download Android beta</strong> in Chrome.</li>
          <li>
            If Android asks, allow Chrome to install unknown apps. This permits
            this signed beta; it does not change the production Displaygram app.
          </li>
          <li>Open the downloaded APK and choose <strong>Install</strong>.</li>
          <li>
            Launch <strong>Displaygram Staging</strong> and sign in with the
            staging test account. The purple test banner should remain visible.
          </li>
          <li>
            You may turn off Chrome&apos;s unknown-app permission after the
            installation finishes.
          </li>
        </ol>
      </section>

      <section className="android-beta-card android-beta-integrity">
        <h2>Verify the download</h2>
        <p>
          Android verifies the app signature during installation. For an
          additional check, the release file&apos;s SHA-256 is:
        </p>
        <code>{release.sha256}</code>
        <p>
          Future website beta builds must use the same staging certificate so
          Android can install them as updates.
        </p>
      </section>

      <nav className="android-beta-links" aria-label="Beta links">
        <a href="/login">Open staging sign in</a>
        <a href="/help-support">Get help</a>
      </nav>
    </main>
  );
}
