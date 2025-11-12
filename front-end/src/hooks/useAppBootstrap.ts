// hooks/useAppBootstrap.ts
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
import useCompanyUsersSync from "./useCompanyUsersSync";
import useUserAccountsSync from "./useUserAccountsSync";
import useAllCompanyAccountsSync from "./useAllCompanyAccountsSync";
import { useCustomAccountsSync } from "./useCustomAccountsSync";
import { useCompanyConnectionsListener } from "./useCompanyConnectionsListener";

/**
 * useAppBootstrap
 * ----------------------------------------------------------
 * Bootstraps the app after authentication is ready:
 *  - Syncs schema version (Firestore vs local)
 *  - Hydrates cache (plans, products)
 *  - Sets up listeners (goals, notifications)
 *  - Ensures all relationship sync hooks run
 *  - Emits "appReady" only after all streams attached
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

  // 🔄 Always keep schemaVersion synced
  useSchemaVersion();

  // 👥 Re-enable dependent sync hooks (required for full goal hydration)
  useCompanyUsersSync();
  useUserAccountsSync();
  useAllCompanyAccountsSync(
    currentUser?.role === "admin" ||
      currentUser?.role === "super-admin" ||
      currentUser?.role === "supervisor"
  );
  useCustomAccountsSync();
  useCompanyConnectionsListener();

  // ───────────────────────────────
  // 1️⃣ MAIN BOOTSTRAP
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

          // 🧠 1. Hydrate cached plans/products first
          await dispatch(hydrateFromCache());
          if (companyId) {
            const cached = await getAllCompanyProductsFromIndexedDB();
            if (cached?.length) dispatch(setAllProducts(cached));
            await dispatch(fetchCurrentCompany(companyId));
            await dispatch(fetchCompanyProducts(companyId));
          }

          // 🔔 2. Attach listeners BEFORE marking appReady
          const unsubs: (() => void)[] = [];
          if (companyId) {
            unsubs.push(dispatch(setupCompanyGoalsListener(companyId)));
            unsubs.push(dispatch(setupNotificationListenersForUser(currentUser)));
            unsubs.push(dispatch(setupNotificationListenersForCompany(currentUser)));
            if (galloEnabled)
              unsubs.push(dispatch(setupGalloGoalsListener(companyId)));
          }

          // ✅ 3. Now mark app as ready
          dispatch(setAppReady(true));
          dispatch(showMessage("✅ App ready."));

          // Store unsubs on ref (optional future cleanup)
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
  }, [initializing, currentUser?.uid, companyId, galloEnabled, dispatch]);

  // ───────────────────────────────
  // 2️⃣ OPTIONAL SAFETY RE-ATTACH
  // ───────────────────────────────
  useEffect(() => {
    if (!appReady || !currentUser?.companyId) return;
    console.log("🔁 App ready – verifying listeners...");
  }, [appReady, currentUser]);
}
