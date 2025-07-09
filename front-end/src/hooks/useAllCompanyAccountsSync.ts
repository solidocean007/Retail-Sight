import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../utils/store";
import { fetchAllCompanyAccounts } from "../utils/helperFunctions/fetchAllCompanyAccounts";
import {
  getAllCompanyAccountsFromIndexedDB,
  saveAllCompanyAccountsToIndexedDB,
} from "../utils/database/indexedDBUtils";
import { setAllAccounts } from "../Slices/allAccountsSlice";
import { RootState } from "../utils/store";

const useAllCompanyAccountsSync = () => {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const allAccounts = useSelector((state: RootState) => state.allAccounts.accounts);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!user?.companyId) return;

      // const isPrivileged =
      //   user.role === "admin" || user.role === "super-admin" || user.role === "developer";
      // if (!isPrivileged) return;

      // if (allAccounts.length > 0) {
      //   console.log("[AccountSync] Accounts already in Redux, skipping fetch");
      //   return;
      // }

      const cached = await getAllCompanyAccountsFromIndexedDB();
      if (cached && cached.length > 0) {
        // console.log("[AccountSync] Loaded from IndexedDB:", cached.length);
        dispatch(setAllAccounts(cached));
        return;
      }

      const fresh = await fetchAllCompanyAccounts(user.companyId);
      if (fresh.length === 0) return;

      dispatch(setAllAccounts(fresh));
      try {
        await saveAllCompanyAccountsToIndexedDB(fresh);
        // console.log("[AccountSync] Saved fresh accounts to IndexedDB");
      } catch (err) {
        console.warn("[AccountSync] Failed to save to IndexedDB:", err);
      }
    };

    loadAccounts();
  }, [user?.companyId, user?.role, dispatch, allAccounts.length]);
};

export default useAllCompanyAccountsSync;
