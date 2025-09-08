// useUserAccountsSync.ts (called once from App.tsx)
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { setUserAccounts, setLoadingUserAccounts as setUserLoading } from "../Slices/userAccountsSlice";
import {
  getUserAccountsFromIndexedDB,
  saveUserAccountsToIndexedDB,
} from "../utils/database/indexedDBUtils";
import { fetchUserAccounts } from "../utils/helperFunctions/fetchUserAccounts"; // make this if not present
import { showMessage } from "../Slices/snackbarSlice";

export default function useUserAccountsSync() {
  const dispatch = useAppDispatch();
  const user = useSelector((s: RootState) => s.user.currentUser);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user?.companyId || !user?.uid) return;
      dispatch(setUserLoading(true));

      try {
        // 1) serve cached user accounts fast
        const cached = await getUserAccountsFromIndexedDB(user.uid);
        if (!cancel && cached?.length) dispatch(setUserAccounts(cached));
      } catch {}

      try {
        // 2) refresh from network (per-user subset)
        const fresh = await fetchUserAccounts(user.companyId, user.uid);
        if (cancel) return;
        if (!fresh?.length) {
          dispatch(setUserAccounts([]));
          dispatch(showMessage("No accounts assigned to you yet."));
        } else {
          dispatch(setUserAccounts(fresh));
          try {
            await saveUserAccountsToIndexedDB(user.uid, fresh);
          } catch (e) {
            console.warn("[UserAccountsSync] Failed to cache:", e);
          }
        }
      } finally {
        if (!cancel) dispatch(setUserLoading(false));
      }
    })();
    return () => { cancel = true; };
  }, [user?.companyId, user?.uid, dispatch]);
}
