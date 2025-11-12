import { useEffect, useRef } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { setAppReady, setResetting, setVersions } from "../Slices/appSlice";
import { showMessage } from "../Slices/snackbarSlice";
import { hydrateFromCache } from "../Slices/planSlice";
import { fetchCurrentCompany } from "../Slices/currentCompanySlice";
import { fetchCompanyProducts } from "../thunks/productThunks";
import { getAllCompanyProductsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { setAllProducts } from "../Slices/productsSlice";
import { setupNotificationListenersForUser } from "../utils/listeners/setupNotificationListenersForUser";
import { setupNotificationListenersForCompany } from "../utils/listeners/setupNotificationListenerForCompany";
import { setupCompanyGoalsListener } from "../utils/listeners/setupCompanyGoalsListener";
import { setupGalloGoalsListener } from "../utils/listeners/setupGalloGoalsListener";
import { useFirebaseAuth } from "../utils/useFirebaseAuth";
import { useIntegrations } from "./useIntegrations";
import { resetApp } from "../utils/resetApp";
import { openDB } from "../utils/database/indexedDBOpen";

/**
 * useAppBootstrap
 * ----------------------------------------------------------
 * Initializes the app after auth is ready:
 *  - Loads Firestore AppConfig (schema version)
 *  - Hydrates caches (plans, products)
 *  - Sets up real-time listeners
 *  - Handles version mismatch soft resets
 * Safe against multiple re-renders and hard resets.
 */
export function useAppBootstrap() {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();
  const companyId = currentUser?.companyId || null;
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");
  const appReady = useSelector((s: RootState) => s.app.appReady);

  // Guards to ensure one atomic initialization
  const hasBootstrapped = useRef(false);
  const configUnsub = useRef<null | (() => void)>(null);
  const runningBootstrap = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (initializing || !currentUser || hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const configRef = doc(db, "appConfig", "HlAAI92RInjZymlMiwqu");

    const startBootstrap = async (): Promise<void> => {
      if (runningBootstrap.current) return runningBootstrap.current;

      runningBootstrap.current = (async () => {
        try {
          dispatch(setResetting(true));

          // Small delay lets IndexedDB reopen cleanly after reset
          await new Promise((res) => setTimeout(res, 200));

          // --- Load AppConfig ---
          // --- Load AppConfig ---
          const snap = await getDoc(configRef);
          const serverVersion = snap.exists()
            ? (snap.data().schemaVersion as string)
            : null;

          // ✅ Initialize local version if missing
          let localVersion = localStorage.getItem("app_version");

          if (!localVersion && serverVersion) {
            localVersion = serverVersion;
            localStorage.setItem("app_version", serverVersion);

            try {
              const db = await openDB();
              const tx = db.transaction("localSchemaVersion", "readwrite");
              tx.objectStore("localSchemaVersion").put({
                id: "schemaVersion",
                value: serverVersion,
              });
              await tx.done; // Property 'done' does not exist on type 'IDBTransaction'
            } catch (err) {
              console.warn(
                "⚠️ Could not write schemaVersion to IndexedDB:",
                err
              );
            }
          }

          // Dispatch into Redux
          dispatch(setVersions({ localVersion, serverVersion }));

          // --- Schema mismatch? perform one soft reset ---
          if (serverVersion && serverVersion !== localVersion) {
            console.log(
              "🔄 Schema mismatch detected; performing one-time reset."
            );
            await resetApp(dispatch);
            localStorage.setItem("app_version", serverVersion);
          }

          // --- Hydrate caches ---
          await dispatch(hydrateFromCache());

          if (companyId) {
            try {
              const cachedProducts = await getAllCompanyProductsFromIndexedDB();
              if (cachedProducts?.length)
                dispatch(setAllProducts(cachedProducts));
              await dispatch(fetchCurrentCompany(companyId));
              await dispatch(fetchCompanyProducts(companyId));
            } catch (err) {
              console.error("⚠️ Failed to load company data", err);
            }
          }

          // --- Setup listeners (notifications, goals, gallo) ---
          const unsubs: Array<() => void> = [];

          if (companyId) {
            unsubs.push(
              dispatch(setupNotificationListenersForUser(currentUser))
            );
            unsubs.push(
              dispatch(setupNotificationListenersForCompany(currentUser))
            );
            unsubs.push(dispatch(setupCompanyGoalsListener(companyId)));
            if (galloEnabled) {
              unsubs.push(dispatch(setupGalloGoalsListener(companyId)));
            }
          }

          // --- Watch AppConfig in realtime ---
          configUnsub.current = onSnapshot(configRef, (s) => {
            const next = s.exists() ? (s.data().schemaVersion as string) : null;
            const prev = localStorage.getItem("app_version") || null;

            if (next && next !== prev) {
              dispatch(
                showMessage(
                  "New app version detected. Click Reset App to update."
                )
              );
              dispatch(
                setVersions({ localVersion: prev, serverVersion: next })
              );
            }
          });

          dispatch(setAppReady(true));
          dispatch(showMessage("✅ App ready."));

          // --- Keep cleanup references ---
          (runningBootstrap as any).unsubs = unsubs;
        } catch (err) {
          console.error("❌ useAppBootstrap failed:", err);
          dispatch(showMessage("⚠️ Initialization error. Retrying in 2s..."));

          // Allow one retry
          setTimeout(() => {
            hasBootstrapped.current = false;
          }, 2000);
        } finally {
          dispatch(setResetting(false));
          runningBootstrap.current = null;
        }
      })();

      return runningBootstrap.current;
    };

    startBootstrap();

    // --- Cleanup ---
    return () => {
      if (configUnsub.current) {
        try {
          configUnsub.current();
        } catch (err) {
          console.warn("⚠️ Failed to unsubscribe from config listener", err);
        }
      }

      // Clean up listeners from last bootstrap
      const unsubs = (runningBootstrap as any).unsubs || [];
      unsubs.forEach((u: () => void) => {
        try {
          u();
        } catch {}
      });

      hasBootstrapped.current = false;
    };
  }, [
    initializing,
    currentUser?.uid,
    companyId,
    galloEnabled,
    dispatch,
    appReady,
  ]);
}
