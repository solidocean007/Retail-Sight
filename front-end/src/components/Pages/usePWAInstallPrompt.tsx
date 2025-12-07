import { useEffect, useState, useRef } from "react";

export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Ensures fallback logic runs only once
  const fallbackChecked = useRef(false);

  useEffect(() => {
    console.log("%c[PWA] Hook mounted", "color:#3b82f6");

    // -------------------------------------------
    // 1. beforeinstallprompt listener
    // -------------------------------------------
    const handler = (e: any) => {
      console.log("%c[PWA] beforeinstallprompt FIRED", "color: #22c55e");
      e.preventDefault(); // REQUIRED to capture event

      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // -------------------------------------------
    // 2. Fallback for browsers that suppress event
    // -------------------------------------------
    const tryFallback = () => {
      if (fallbackChecked.current) return;
      fallbackChecked.current = true;

      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true;

      const manifestExists = Boolean(
        document.querySelector('link[rel="manifest"]')
      );

      const hasSW = Boolean(navigator.serviceWorker?.controller);

      const appearsInstallable = !isStandalone && manifestExists && hasSW;

      if (!deferredPrompt && appearsInstallable) {
        console.log(
          "%c[PWA] Fallback: Browser appears installable even without event",
          "color:#eab308"
        );
        setIsInstallable(true);
      }
    };

    // Wait for service worker to finish installing
    const timer = setTimeout(tryFallback, 1500);

    // Cleanup
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, [deferredPrompt]);

  // -------------------------------------------
  // INSTALL ACTION
  // -------------------------------------------
  const install = async () => {
    console.log("%c[PWA] install() called", "color:#0ea5e9");

    // Real install (Android / Desktop Chrome)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      console.log("%c[PWA] userChoice: " + result?.outcome, "color:#22c55e");

      setDeferredPrompt(null);
      setIsInstallable(false);

      return result;
    }

    // Fallback (Chrome/Edge toolbar installation)
    console.log(
      "%c[PWA] No deferredPrompt available — use toolbar install button",
      "color:#f97316"
    );

    return null;
  };

  // Hook API
  return {
    deferredPrompt,
    isInstallable,
    install,
  };
}
