import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { setAppReady, setResetting } from "../Slices/appSlice";
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
import { useSchemaVersion } from "./useSchemaVersion";

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
  const hasBootstrapped = useRef(false);
  const runningBootstrap = useRef<Promise<void> | null>(null);

  // ✅ Keep version sync logic separate
  useSchemaVersion();

  // ───────────────────────────────
  // 1️⃣ MAIN BOOTSTRAP (runs once)
  // ───────────────────────────────
  useEffect(() => {
    if (initializing || !currentUser || hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const startBootstrap = async () => {
      if (runningBootstrap.current) return runningBootstrap.current;
      runningBootstrap.current = (async () => {
        try {
          dispatch(setResetting(true));
          await new Promise((res) => setTimeout(res, 200));

          // hydrate plans & products
          await dispatch(hydrateFromCache());
          if (companyId) {
            const cached = await getAllCompanyProductsFromIndexedDB();
            if (cached?.length) dispatch(setAllProducts(cached));
            await dispatch(fetchCurrentCompany(companyId));
            await dispatch(fetchCompanyProducts(companyId));
          }

          dispatch(setAppReady(true));
          dispatch(showMessage("✅ App ready."));
        } catch (err) {
          console.error("❌ useAppBootstrap failed:", err);
          setTimeout(() => (hasBootstrapped.current = false), 2000);
        } finally {
          dispatch(setResetting(false));
          runningBootstrap.current = null;
        }
      })();
      return runningBootstrap.current;
    };

    startBootstrap();
  }, [initializing, currentUser?.uid, companyId, dispatch]);

  // ───────────────────────────────
  // 2️⃣ POST-BOOTSTRAP LISTENERS
  // ───────────────────────────────
  useEffect(() => {
    if (!appReady || !currentUser?.companyId) return;

    const companyId = currentUser.companyId;
    const unsubs: Array<() => void> = [];

    unsubs.push(dispatch(setupCompanyGoalsListener(companyId)));
    unsubs.push(dispatch(setupNotificationListenersForUser(currentUser)));
    unsubs.push(dispatch(setupNotificationListenersForCompany(currentUser)));

    if (galloEnabled) {
      unsubs.push(dispatch(setupGalloGoalsListener(companyId)));
    }

    return () => {
      for (const u of unsubs)
        try {
          u();
        } catch {}
    };
  }, [dispatch, appReady, currentUser, galloEnabled]);
}
