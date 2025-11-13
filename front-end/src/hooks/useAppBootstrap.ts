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
import { setupGalloGoalsListener } from "../utils/listeners/setupGalloGoalsListener";

import { useFirebaseAuth } from "../utils/useFirebaseAuth";
import { useIntegrations } from "./useIntegrations";

// ❗ Sync hooks (do NOT block appReady)
import { useSchemaVersion } from "./useSchemaVersion";
import useCompanyUsersSync from "./useCompanyUsersSync";
import useUserAccountsSync from "./useUserAccountsSync";
import useAllCompanyAccountsSync from "./useAllCompanyAccountsSync";
import { useCustomAccountsSync } from "./useCustomAccountsSync";
import { useCompanyConnectionsListener } from "./useCompanyConnectionsListener";

/**
 * useAppBootstrap – Option B
 * ------------------------------------------------
 * * Only block UI on essential boot tasks.*
 * * All sync hooks run in background, never block appReady.*
 */

export function useAppBootstrap() {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();
  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");

  const appReady = useSelector((s: RootState) => s.app.appReady);

  const companyId = currentUser?.companyId ?? null;

  const hasBootstrapped = useRef(false);

  //
  // 🔄 Always call these (Rules of Hooks)
  //
  useSchemaVersion();
  useCompanyUsersSync();
  useUserAccountsSync();
  useAllCompanyAccountsSync(
    currentUser?.role === "admin" ||
      currentUser?.role === "super-admin" ||
      currentUser?.role === "supervisor"
  );
  useCustomAccountsSync();
  useCompanyConnectionsListener();

  //
  // 1️⃣ ESSENTIAL BOOTSTRAP ONLY
  //
  useEffect(() => {
    if (initializing) return;

    // Do not run bootstrap while auth is still settling
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

          if (galloEnabled) {
            dispatch(setupGalloGoalsListener(companyId));
          }
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
