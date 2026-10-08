import { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectCanSync, useAppDispatch } from "../utils/store";
import { fetchAllCompanyAccounts } from "../utils/helperFunctions/fetchAllCompanyAccounts";
import {
  getAllCompanyAccountsFromIndexedDB,
  saveAllCompanyAccountsToIndexedDB,
} from "../utils/database/indexedDBUtils";
import { setAllAccounts } from "../Slices/allAccountsSlice";
import { RootState } from "../utils/store";

const useAllCompanyAccountsSync = (enabled = true, shouldStartSync = true) => {
  const canSync = useSelector(selectCanSync);
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  // const allAccounts = useSelector((state: RootState) => state.allAccounts.accounts);

  useEffect(() => {
    if (!enabled || !user?.companyId || !canSync || !shouldStartSync) return;
    let cancelled = false;

    const loadAccounts = async () => {
      const cached = await getAllCompanyAccountsFromIndexedDB().catch((error) => {
        console.warn("[AccountSync] Failed to read IndexedDB:", error);
        return [];
      });
      if (cancelled) return;

      if (cached.length > 0) {
        dispatch(setAllAccounts(cached));
      }

      // Cached accounts remain usable when the app starts offline. The online
      // listener below refreshes them as soon as connectivity returns.
      if (!navigator.onLine) return;

      const fresh = await fetchAllCompanyAccounts(user.companyId);
      if (cancelled) return;
      if (!fresh || fresh.length === 0) {
        if (cached.length === 0) dispatch(setAllAccounts([]));
        return;
      }

      dispatch(setAllAccounts(fresh));

      try {
        await saveAllCompanyAccountsToIndexedDB(fresh);
      } catch (err) {
        console.warn("[AccountSync] Failed to save to IndexedDB:", err);
      }
    };

    void loadAccounts();
    const refreshAfterReconnect = () => void loadAccounts();
    window.addEventListener("online", refreshAfterReconnect);

    return () => {
      cancelled = true;
      window.removeEventListener("online", refreshAfterReconnect);
    };
    // shouldStartSync MUST be a dependency: it's false on first render (appReady
    // is still false), so without it the effect bails once and never re-runs,
    // leaving allAccounts permanently empty for the session.
  }, [user?.companyId, dispatch, canSync, enabled, shouldStartSync]);
};

export default useAllCompanyAccountsSync;
