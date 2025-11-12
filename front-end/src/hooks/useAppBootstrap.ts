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

  // ✅ new line
  useSchemaVersion(); // handles appConfig sync, local storage + reset

  useEffect(() => {
    if (initializing || !currentUser || hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const startBootstrap = async () => {
      if (runningBootstrap.current) return runningBootstrap.current;
      runningBootstrap.current = (async () => {
        try {
          dispatch(setResetting(true));
          await new Promise((res) => setTimeout(res, 200));

          // hydrate + listeners as before
          await dispatch(hydrateFromCache());
          if (companyId) {
            const cached = await getAllCompanyProductsFromIndexedDB();
            if (cached?.length) dispatch(setAllProducts(cached));
            await dispatch(fetchCurrentCompany(companyId));
            await dispatch(fetchCompanyProducts(companyId));
          }

          const unsubs: (() => void)[] = [];
          if (companyId) {
            unsubs.push(dispatch(setupNotificationListenersForUser(currentUser)));
            unsubs.push(dispatch(setupNotificationListenersForCompany(currentUser)));
            unsubs.push(dispatch(setupCompanyGoalsListener(companyId)));
            if (galloEnabled) unsubs.push(dispatch(setupGalloGoalsListener(companyId)));
          }

          dispatch(setAppReady(true));
          dispatch(showMessage("✅ App ready."));
          (runningBootstrap as any).unsubs = unsubs;
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
  }, [initializing, currentUser?.uid, companyId, galloEnabled, dispatch, appReady]);
}
