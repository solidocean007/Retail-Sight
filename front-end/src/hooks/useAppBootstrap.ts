// hooks/useAppBootstrap.ts
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { resetStore, RootState, useAppDispatch } from "../utils/store";
import {
  setAppReady,
  setLoadingMessage,
  setResetting,
} from "../Slices/appSlice";
import { fetchCurrentCompany } from "../Slices/currentCompanySlice";
import { fetchCompanyProducts } from "../thunks/productThunks";
import { closeAndDeleteIndexedDB } from "../utils/database/indexedDBUtils";
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
import { clearDeveloperNotifications } from "../Slices/developerNotificationSlice";
import { useUserNotificationsListener } from "./useUserNotificationsListener";
import { fetchAllPlans } from "../thunks/planThunks";
import { listenForClaimChanges } from "./listenForClaimChanges";
import { useAccountImportListener } from "./useAccountImportListener";
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
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  // console.log("currentUser role in useAppBootstrap: ", user?.role); // this logs super-admin
  const companyId = user?.companyId ?? null;
  const prevCompanyIdRef = useRef<string | null>(null);
  const { isEnabled } = useCompanyIntegrations(companyId);
  const galloEnabled = isEnabled("galloAxis");

  const appReady = useSelector((s: RootState) => s.app.appReady);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    const current = companyId;

    if (prevCompanyIdRef.current && prevCompanyIdRef.current !== current) {
      console.log("🔥 Company changed → clearing EVERYTHING");
      hasBootstrapped.current = false;
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
  // call this one immediately
  useSchemaVersion();

  // gate these
  const shouldStartSync = enabled && appReady && !!user?.companyId;
  useCompanyUsersSync(shouldStartSync);
  useUserAccountsSync(shouldStartSync);
  useCompanyConnectionsListener(shouldStartSync);

  useUserNotificationsListener(currentUser, shouldStartSync);
  useCompanyProductsListener(companyId, shouldStartSync);
  useAccountImportListener(companyId, shouldStartSync);
  useCompanySync(shouldStartSync);
  useCustomAccountsSync(shouldStartSync);
  useGalloGoalsListener(companyId, galloEnabled, shouldStartSync);

  useAllCompanyAccountsSync(
    currentUser?.role === "admin" ||
      currentUser?.role === "super-admin" ||
      currentUser?.role === "supervisor",
    shouldStartSync,
  );

  //
  // 1️⃣ ESSENTIAL BOOTSTRAP ONLY
  //
  useEffect(() => {
    if (!enabled || initializing || !currentUser || !companyId) return;
    if (hasBootstrapped.current) return;

    hasBootstrapped.current = true;

    const runDeferred = (cb: () => void) => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(cb);
      } else {
        setTimeout(cb, 200);
      }
    };

    const run = async () => {
      try {
        dispatch(setResetting(true));

        if (companyId) {
          dispatch(setLoadingMessage("Loading company info..."));
          await dispatch(fetchCurrentCompany(companyId));
        }

        dispatch(setAppReady(true));
        dispatch(setLoadingMessage(null));

        runDeferred(() => {
          dispatch(fetchAllPlans());

          if (companyId) {
            dispatch(fetchCompanyProducts(companyId));
            dispatch(setupCompanyGoalsListener(companyId));
          }
        });
      } finally {
        dispatch(setResetting(false));
      }
    };

    run();
  }, [enabled, initializing, currentUser?.uid, companyId, dispatch]);
}
