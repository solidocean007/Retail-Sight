// hooks/useAppBootstrap.ts
import { useEffect, useRef } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { setAppReady, setResetting, setVersions } from "../Slices/appSlice";
import { hydrateFromCache } from "../Slices/planSlice";
import { getAllCompanyProductsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { setAllProducts } from "../Slices/productsSlice";
import { fetchCompanyProducts } from "../thunks/productThunks";
import { fetchCurrentCompany } from "../Slices/currentCompanySlice";
import { setupCompanyGoalsListener } from "../utils/listeners/setupCompanyGoalsListener";
import { setupGalloGoalsListener } from "../utils/listeners/setupGalloGoalsListener";
import { setupNotificationListenersForCompany } from "../utils/listeners/setupNotificationListenerForCompany";
import { setupNotificationListenersForUser } from "../utils/listeners/setupNotificationListenersForUser";
import { useIntegrations } from "../hooks/useIntegrations";
import { useFirebaseAuth } from "../utils/useFirebaseAuth";
import { resetApp as doResetApp } from "../utils/resetApp";

// A single, shared promise so concurrent callers don't double-reset.
let resetOncePromise: Promise<void> | null = null;

export function useAppBootstrap() {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();
  const companyId = currentUser?.companyId || null;
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");

  // Make sure we only attach config snapshot once.
  const configUnsubRef = useRef<null | (() => void)>(null);
  const bootstrappedRef = useRef(false);
  const initialConfigLoadedRef = useRef(false); // 'initialConfigLoadedRef' is declared but its value is never read.

  useEffect(() => {
    if (initializing) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    // 1) Read AppConfig once, then subscribe.
    const configRef = doc(db, "app", "config");

    (async () => {
      // Initial read
      const snap = await getDoc(configRef);
      const serverVersion = snap.exists() ? (snap.data().version as string) : null;
      const localVersion = localStorage.getItem("app_version");

      dispatch(setVersions({ localVersion, serverVersion }));

      // 2) If version mismatch -> single atomic reset.
      if (serverVersion && localVersion !== serverVersion) {
        await runResetOnce(serverVersion, dispatch);
      } else {
        // Ensure we never show stale mismatch banner
        localStorage.setItem("app_version", serverVersion ?? "");
      }

      // 3) Only after version is reconciled, hydrate cache + load company/product
      await dispatch(hydrateFromCache());

      if (companyId) {
        try {
          const cached = await getAllCompanyProductsFromIndexedDB();
          if (cached.length) dispatch(setAllProducts(cached));
          await dispatch(fetchCurrentCompany(companyId));
          await dispatch(fetchCompanyProducts(companyId));
        } catch (e) {
          console.error("Bootstrap company data failed", e);
        }
      }

      // 4) Now attach stable listeners (goals/notifications) once.
      const unsubs: Array<() => void> = [];
      if (currentUser?.companyId) {
        unsubs.push(dispatch(setupNotificationListenersForUser(currentUser)));
        unsubs.push(dispatch(setupNotificationListenersForCompany(currentUser)));
        unsubs.push(dispatch(setupCompanyGoalsListener(currentUser.companyId)));
        if (galloEnabled) {
          unsubs.push(dispatch(setupGalloGoalsListener(currentUser.companyId)));
        }
      }

      // 5) App is ready (routes can render safely without flicker)
      dispatch(setAppReady(true));

      // 6) Realtime: watch version changes (debounced by equality check)
      configUnsubRef.current = onSnapshot(configRef, (s) => {
        const next = s.exists() ? (s.data().version as string) : null;
        const prev = localStorage.getItem("app_version") || null;
        if (next && next !== prev) {
          // Do not reset immediately; mark and show CTA (header) OR auto-reset here if desired.
          dispatch(setVersions({ localVersion: prev, serverVersion: next }));
        }
      });

      // Cleanup listeners on unmount
      return () => {
        unsubs.forEach((u) => {
          try { u(); } catch {}
        });
        if (configUnsubRef.current) {
          try { configUnsubRef.current(); } catch {}
        }
      };
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initializing, companyId, galloEnabled, currentUser?.uid]);
}

async function runResetOnce(serverVersion: string, dispatch: any) {
  // Guard: if we already reset **for this version** in this browser, skip
  const lastResetVersion = localStorage.getItem("last_reset_version");
  if (lastResetVersion === serverVersion) return;

  if (!resetOncePromise) {
    dispatch(setResetting(true));
    resetOncePromise = (async () => {
      try {
        await doResetApp(dispatch); // your existing util
        localStorage.setItem("app_version", serverVersion);
        localStorage.setItem("last_reset_version", serverVersion);
      } finally {
        dispatch(setResetting(false));
      }
    })();
  }
  await resetOncePromise;
}
