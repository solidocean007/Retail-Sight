import { useEffect, useState } from "react";
import { usePWAInstallPrompt } from "../../hooks/usePWAInstallPrompt";
import "./installPrompt.css";

export default function InstallPrompt({ user }: { user: any }) {
  const deferredPrompt = usePWAInstallPrompt();
  const [visible, setVisible] = useState(false);

  // Detect PWA installed state
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  // Detect iOS device
  const isIOS = /iphone|ipad|ipod/.test(
    window.navigator.userAgent.toLowerCase()
  );

  useEffect(() => {
    if (visible) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [visible]);

  useEffect(() => {
    if (!user) return;
    if (isStandalone) return; // already installed
    if (localStorage.getItem("pwaInstalled") === "true") return;
    if (localStorage.getItem("pwaInstallDismissed") === "true") return;

    // iOS:
    // ❗ No deferredPrompt — we show our own banner
    // Android:
    // ✔ deferredPrompt exists — show regular install banner
    const shouldShow = (isIOS && !isStandalone) || (!isIOS && deferredPrompt);

    if (!shouldShow) return;

    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [user, deferredPrompt, isStandalone, isIOS]);

  if (!visible) return null;

  // Android
  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      localStorage.setItem("pwaInstalled", "true");
    }
    setVisible(false);
  };

  // iOS
  const handleIOSDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwaInstallDismissed", "true");
  };

  return (
    <div className="install-prompt-container">
      <div className="install-card">
        <div className="install-title">Install Displaygram</div>

        {!isIOS ? (
          <>
            <div className="install-subtitle">
              Get full-screen speed and a smoother experience.
            </div>

            <div className="install-buttons">
              <button className="install-btn" onClick={handleAndroidInstall}>
                Install App
              </button>

              <button
                className="dismiss-btn"
                onClick={() => {
                  setVisible(false);
                  localStorage.setItem("pwaInstallDismissed", "true");
                }}
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="install-subtitle ios-instructions">
              Install Displaygram by tapping <strong>Share</strong> →{" "}
              <strong>Add to Home Screen</strong>.
            </div>

            <div className="install-buttons">
              <button className="dismiss-btn" onClick={handleIOSDismiss}>
                Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
