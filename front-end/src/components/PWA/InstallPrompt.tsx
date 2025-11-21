import { useEffect, useState } from "react";
import { usePWAInstallPrompt } from "../../hooks/usePWAInstallPrompt";
import "./installPrompt.css";

export default function InstallPrompt({ user }: { user: any }) {
  const deferredPrompt = usePWAInstallPrompt();
  const [visible, setVisible] = useState(false);
  console.log("deferredPrompt:", deferredPrompt);
  // Detect if already installed
  const isPWA =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  useEffect(() => {
    if (!user) return;
    if (!deferredPrompt || isPWA) return;
    if (localStorage.getItem("pwaInstalled") === "true") return;

    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [user, deferredPrompt, isPWA]);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      localStorage.setItem("pwaInstalled", "true");
    }

    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwaInstalled", "dismissed");
  };

  return (
    <div className="install-prompt-container">
      <div className="install-card">
        <div className="install-title">Install Displaygram</div>
        <div className="install-subtitle">
          Get full-screen speed and a smoother experience on your device.
        </div>

        <div className="install-buttons">
          <button className="install-btn" onClick={handleInstall}>
            Install App
          </button>

          <button className="dismiss-btn" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
