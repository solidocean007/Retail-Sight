// hooks/useAppBootstrap.ts
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { resetStore, RootState, useAppDispatch } from "../utils/store";
import {
  setAppReady,
  setLoadingMessage,
  setResetting,
} from "../Slices/appSlice";
import { showMessage } from "../Slices/snackbarSlice";
import { fetchCurrentCompany } from "../Slices/currentCompanySlice";
import { fetchCompanyProducts } from "../thunks/productThunks";
import {
  closeAndDeleteIndexedDB,
  getAllCompanyProductsFromIndexedDB,
  getGoalsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { setAllProducts } from "../Slices/productsSlice";
import { setupCompanyGoalsListener } from "../utils/listeners/setupCompanyGoalsListener";

// ❗ Sync hooks (do NOT block appReady)
import { useSchemaVersion } from "./useSchemaVersion";
import useCompanyUsersSync from "./useCompanyUsersSync";
import useUserAccountsSync from "./useUserAccountsSync";
import useAllCompanyAccountsSync from "./useAllCompanyAccountsSync";
import { useCustomAccountsSync } from "./useCustomAccountsSync";
import { useCompanyConnectionsListener } from "./useCompanyConnectionsListener";
import { useCompanyProductsListener } from "./useCompanyProductsListener";
import { useGalloGoalsListener } from "./useGalloGoalsListener";
import { useCompanyIntegrations } from "./useCompanyIntegrations";
import { setupDeveloperNotificationsListener } from "../utils/listeners/setupDeveloperNotificationsListener";
import { clearDeveloperNotifications } from "../Slices/developerNotificationSlice";
import { useUserNotificationsListener } from "./useUserNotificationsListener";
import { fetchAllPlans } from "../thunks/planThunks";
import { listenForClaimChanges } from "./listenForClaimChanges";
import { useAccountImportListener } from "./useAccountImportListener";
import { setCompanyGoals } from "../Slices/companyGoalsSlice";
import useCompanySync from "./useCompanySync";

/**
 * useAppBootstrap – Option B
 * ------------------------------------------------
 * * Only block UI on essential boot tasks.*
 * * All sync hooks run in background, never block appReady.*
 */

export function useAppBootstrap({
  enabled = true,
  currentUser,
  initializing,
}: {
  enabled?: boolean;
  currentUser: any;
  initializing: boolean;
}) {
  // console.log(currentUser);
  const isResetting = useSelector((s: RootState) => s.app.resetting);
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  // console.log("currentUser role in useAppBootstrap: ", user?.role); // this logs super-admin
  const companyId = user?.companyId ?? null;
  const prevCompanyIdRef = useRef<string | null>(null);
  const { isEnabled, loading } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");

  const appReady = useSelector((s: RootState) => s.app.appReady);

  useEffect(() => {
    const current = companyId;

    if (prevCompanyIdRef.current && prevCompanyIdRef.current !== current) {
      console.log("🔥 Company changed → clearing EVERYTHING");

      (async () => {
        dispatch(setResetting(true)); // ✅ FIRST
        await closeAndDeleteIndexedDB(); // ✅ wipe DB
        dispatch(resetStore()); // ✅ reset redux
      })();
    }

    prevCompanyIdRef.current = current;
  }, [companyId, dispatch]);

  useEffect(() => {
    if (!currentUser) {
      dispatch(clearDeveloperNotifications());
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    return listenForClaimChanges(currentUser.uid);
  }, [currentUser?.uid]);
  //
  // 🔄 Always call these (Rules of Hooks)
  //
  useSchemaVersion();
  useUserNotificationsListener(currentUser);
  useCompanyProductsListener(companyId);
  useAccountImportListener(companyId);

  // 👥 Re-enable dependent sync hooks (required for full goal hydration)
  useCompanySync();
  useCompanyUsersSync();
  useUserAccountsSync();
  const role = currentUser?.role;

  useAllCompanyAccountsSync(
    role
      ? role === "admin" || role === "super-admin" || role === "supervisor"
      : false,
  );
  useCustomAccountsSync();
  useCompanyConnectionsListener();
  useGalloGoalsListener(companyId, galloEnabled);

  //
  // 1️⃣ ESSENTIAL BOOTSTRAP ONLY
  //
  useEffect(() => {
    if (!enabled) return;
    if (initializing) return;
    if (!currentUser) return;

    const run = async () => {
      try {
        dispatch(setResetting(true));

        // STEP 1 — hydrate plan cache
        dispatch(setLoadingMessage("Loading plans…"));
        await dispatch(fetchAllPlans());

        // STEP 2 — essential company info
        if (companyId) {
          dispatch(setLoadingMessage("Loading company info…"));

          // preload company goals
          const cachedGoals = await getGoalsFromIndexedDB("companyGoals");
          if (cachedGoals?.length) {
            dispatch(setCompanyGoals(cachedGoals));
          }

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

          dispatch(setupCompanyGoalsListener(companyId));

          if (currentUser?.role === "developer") {
            dispatch(setupDeveloperNotificationsListener());
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
  }, [
    enabled,
    initializing,
    currentUser?.uid,
    companyId,
    galloEnabled,
    dispatch,
  ]);
}
