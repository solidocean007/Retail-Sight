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
import { showMessage } from "../Slices/snackbarSlice";

const useAllCompanyAccountsSync = (enabled=true) => {
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);
  // const allAccounts = useSelector((state: RootState) => state.allAccounts.accounts);

  useEffect(() => {
    if (!enabled || !user?.companyId) return;
    const loadAccounts = async () => {

      const cached = await getAllCompanyAccountsFromIndexedDB();
      if (cached && cached.length > 0) {
        dispatch(setAllAccounts(cached));
        return;
      }

      const fresh = await fetchAllCompanyAccounts(user.companyId);
      if (!fresh || fresh.length === 0) {
        dispatch(setAllAccounts([]));
        dispatch(showMessage("No accounts have been imported for this company yet."));
        return;
      }

      dispatch(setAllAccounts(fresh));

      try {
        await saveAllCompanyAccountsToIndexedDB(fresh);
      } catch (err) {
        console.warn("[AccountSync] Failed to save to IndexedDB:", err);
      }
    };

    loadAccounts();
  }, [user?.companyId, dispatch, enabled]);
};

export default useAllCompanyAccountsSync;

