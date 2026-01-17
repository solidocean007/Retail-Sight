import { useEffect, useState } from "react";
import "./installPrompt.css";
import { usePWAInstallPrompt } from "../Pages/usePWAInstallPrompt";

export async function isPwaActuallyInstalled(): Promise<boolean> {
  if ("getInstalledRelatedApps" in navigator) {
    const apps = await (navigator as any).getInstalledRelatedApps();
    return apps?.length > 0;
  }
  return false;
}

export default function InstallPrompt({ user }: { user: any }) {
  const { deferredPrompt, isInstallable, install } = usePWAInstallPrompt();

  const [visibleMobile, setVisibleMobile] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);
  const [showDesktopHint, setShowDesktopHint] = useState(false);
  const [isTrulyInstalled, setIsTrulyInstalled] = useState(false);

  useEffect(() => {
    isPwaActuallyInstalled().then(setIsTrulyInstalled);
  }, []);

  // ------------------------------------------------------
  // PLATFORM DETECTION
  // ------------------------------------------------------

  const ua = navigator.userAgent.toLowerCase();
  const uaDataMobile = (navigator as any).userAgentData?.mobile;

  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua) && !/windows/.test(ua);
  const isMobileUA = isIOS || isAndroid || /mobile/.test(ua);
  const isDesktop = uaDataMobile === false || !isMobileUA;

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;

  const alreadyInstalled =
    isTrulyInstalled ||
    isStandalone ||
    localStorage.getItem("pwaInstalled") === "true";

  // ------------------------------------------------------
  // MOBILE INSTALL LOGIC
  // ------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    if (alreadyInstalled) return;

    const shouldShow = (isIOS && !isStandalone) || (!isIOS && deferredPrompt);

    if (!shouldShow) return;

    const timer = setTimeout(() => setVisibleMobile(true), 1200);
    return () => clearTimeout(timer);
  }, [user, deferredPrompt, alreadyInstalled, isIOS, isStandalone]);

  useEffect(() => {
    if (visibleMobile && !isDesktop) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [visibleMobile, isDesktop]);

  // ------------------------------------------------------
  // DESKTOP FAB — only show when truly installable
  // ------------------------------------------------------

  const desktopFab =
    isDesktop &&
    isInstallable &&
    !alreadyInstalled &&
    !isTrulyInstalled &&
    !fabHidden ? (
      <button
        className="desktop-install-fab"
        onClick={async () => {
          setFabHidden(true);
          setShowDesktopHint(true);

          // Only try install when deferredPrompt exists
          if (!deferredPrompt) {
            return;
          }

          const result = await install();

          if (result?.outcome === "accepted") {
            localStorage.setItem("pwaInstalled", "true");
            setShowDesktopHint(false);
          }
        }}
      >
        Install App
      </button>
    ) : null;

  // ------------------------------------------------------
  // DESKTOP HINT (persists after FAB hides)
  // ------------------------------------------------------

  const desktopHint = showDesktopHint ? (
    <>
      {/* Floating Install Button */}
      <button
        className="desktop-install-fab"
        onClick={() => {
          setFabHidden(true);
          setShowDesktopHint(true);
        }}
      >
        Install App
      </button>

      {/* AFTER CLICK — Overlay + Highlight + Toast */}
      {showDesktopHint && (
        <>
          {/* Dark overlay */}
          <div className="desktop-install-overlay"></div>

          {/* Arrow pointing at the actual install icon */}
          <div className="desktop-install-arrow">↑</div>

          {/* Tooltip */}
          <div className="desktop-install-hint">
            <img
              src="/icons/chrome-install-icon.png"
              className="install-icon-img"
              alt="Install Icon"
            />

            <div className="desktop-install-hint-text">
              Click the browser’s install icon in the toolbar.
            </div>

            <button
              className="desktop-install-hint-close"
              onClick={() => setShowDesktopHint(false)}
            >
              Got it
            </button>
          </div>
        </>
      )}
    </>
  ) : null;

  // ------------------------------------------------------
  // MOBILE INSTALL MODAL
  // ------------------------------------------------------

  const mobileModal = visibleMobile ? (
    <div className="install-prompt-container">
      <div className="install-card">
        <div className="install-title">Install Displaygram</div>

        {!isIOS ? (
          <>
            <div className="install-subtitle">
              Get full-screen speed and a smoother experience.
            </div>

            <div className="install-buttons">
              <button
                className="install-btn"
                onClick={async () => {
                  const result = await install();
                  if (result?.outcome === "accepted") {
                    localStorage.setItem("pwaInstalled", "true");
                  }
                  setVisibleMobile(false);
                }}
              >
                Install App
              </button>

              <button
                className="dismiss-btn"
                onClick={() => {
                  localStorage.setItem("pwaInstallDismissed", "true");
                  setVisibleMobile(false);
                }}
              >
                Not now
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="install-subtitle ios-instructions">
              Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
            </div>

            <div className="install-buttons">
              <button
                className="dismiss-btn"
                onClick={() => setVisibleMobile(false)}
              >
                Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  // ------------------------------------------------------
  // FINAL RETURN — independent rendering
  // ------------------------------------------------------

  return (
    <>
      {desktopFab}
      {desktopHint}
      {mobileModal}
    </>
  );
}
