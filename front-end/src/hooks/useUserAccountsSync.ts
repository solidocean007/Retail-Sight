// src/hooks/useUserAccountsSync.ts
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState, selectCanSync, useAppDispatch } from "../utils/store";
import { loadUserAccounts } from "../Slices/userAccountsSlice";

export default function useUserAccountsSync() {
  const canSync = useSelector(selectCanSync);
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);

  useEffect(() => {
    if (!canSync) return;
    if (user?.companyId && user?.salesRouteNum) {
      dispatch(
        loadUserAccounts({
          companyId: user.companyId,
          salesRouteNum: user.salesRouteNum,
        })
      );
    }
  }, [user?.companyId, user?.salesRouteNum, canSync, dispatch]);
}
