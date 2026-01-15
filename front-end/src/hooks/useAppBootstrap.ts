// hooks/useAppBootstrap.ts
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import {
  setAppReady,
  setLoadingMessage,
  setResetting,
} from "../Slices/appSlice";
import { showMessage } from "../Slices/snackbarSlice";
import { hydrateFromCache } from "../Slices/planSlice";
import { fetchCurrentCompany } from "../Slices/currentCompanySlice";
import { fetchCompanyProducts } from "../thunks/productThunks";
import { getAllCompanyProductsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { setAllProducts } from "../Slices/productsSlice";
import { setupNotificationListenersForUser } from "../utils/listeners/setupNotificationListenersForUser";
import { setupNotificationListenersForCompany } from "../utils/listeners/setupNotificationListenerForCompany";
import { setupCompanyGoalsListener } from "../utils/listeners/setupCompanyGoalsListener";
import { useFirebaseAuth } from "../utils/useFirebaseAuth";
import { useIntegrations } from "./useIntegrations";

// ❗ Sync hooks (do NOT block appReady)
import { useSchemaVersion } from "./useSchemaVersion";
import useCompanyUsersSync from "./useCompanyUsersSync";
import useUserAccountsSync from "./useUserAccountsSync";
import useAllCompanyAccountsSync from "./useAllCompanyAccountsSync";
import { useCustomAccountsSync } from "./useCustomAccountsSync";
import { useCompanyConnectionsListener } from "./useCompanyConnectionsListener";
import { useCompanyProductsListener } from "./useCompanyProductsListener";
import { useGalloGoalsListener } from "./useGalloGoalsListener";

/**
 * useAppBootstrap – Option B
 * ------------------------------------------------
 * * Only block UI on essential boot tasks.*
 * * All sync hooks run in background, never block appReady.*
 */

export function useAppBootstrap({
  enabled = true,
}: { enabled?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");

  const appReady = useSelector((s: RootState) => s.app.appReady);

  const companyId = currentUser?.companyId ?? null;

  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (!currentUser) {
      hasBootstrapped.current = false;
    }
  }, [currentUser?.uid]);

  //
  // 🔄 Always call these (Rules of Hooks)
  //
  useSchemaVersion();

  // 👥 Re-enable dependent sync hooks (required for full goal hydration)
  useCompanyProductsListener(companyId);
  useCompanyUsersSync();
  useUserAccountsSync();
  useAllCompanyAccountsSync(
    currentUser?.role === "admin" ||
      currentUser?.role === "super-admin" ||
      currentUser?.role === "supervisor"
  );
  useCustomAccountsSync();
  useCompanyConnectionsListener();

  // ✅ ADD THIS HERE (top-level, not inside useEffect)
  useGalloGoalsListener(companyId, galloEnabled);

  //
  // 1️⃣ ESSENTIAL BOOTSTRAP ONLY
  //
  useEffect(() => {
    if (!enabled) return;
    if (initializing) return;

    // If auth has finished and no user → still don't bootstrap (public visitor)
    if (!currentUser) return;

    // Logged in user → ensure bootstrap runs ONE time
    if (hasBootstrapped.current) return;
    hasBootstrapped.current = true;

    const run = async () => {
      try {
        dispatch(setResetting(true));

        // STEP 1 — hydrate plan cache
        dispatch(setLoadingMessage("Loading plan cache…"));
        await dispatch(hydrateFromCache());

        // STEP 2 — essential company info
        if (companyId) {
          dispatch(setLoadingMessage("Loading company info…"));

          // cached product preload
          const cached = await getAllCompanyProductsFromIndexedDB();
          if (cached?.length) dispatch(setAllProducts(cached));

          await dispatch(fetchCurrentCompany(companyId));

          dispatch(setLoadingMessage("Loading products…"));
          await dispatch(fetchCompanyProducts(companyId));
        }

        // STEP 3 — attach listeners (does NOT block ready)
        if (companyId && currentUser) {
          dispatch(setLoadingMessage("Connecting live updates…"));

          dispatch(setupNotificationListenersForUser(currentUser));
          dispatch(setupNotificationListenersForCompany(currentUser));
          dispatch(setupCompanyGoalsListener(companyId));
        }

        // STEP 4 — READY ✔
        dispatch(setLoadingMessage("Finalizing…"));
        dispatch(setAppReady(true));
        dispatch(setLoadingMessage(null));
        dispatch(showMessage("✅ App ready"));
      } finally {
        dispatch(setResetting(false));
      }
    };

    run();
  }, [initializing, currentUser?.uid, companyId, galloEnabled, dispatch]);
}
