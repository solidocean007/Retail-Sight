// src/hooks/useUserAccountsSync.ts
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState, selectCanSync, useAppDispatch } from "../utils/store";
import { loadUserAccounts } from "../Slices/userAccountsSlice";

export default function useUserAccountsSync(shouldStartSync = true) {
  const canSync = useSelector(selectCanSync);
  const dispatch = useAppDispatch();
  const user = useSelector((state: RootState) => state.user.currentUser);

  useEffect(() => {
    if (!canSync) return;
    if (!shouldStartSync) return;
    if (user?.companyId && user?.salesRouteNum) {
      dispatch(
        loadUserAccounts({
          companyId: user.companyId,
          salesRouteNum: user.salesRouteNum,
        })
      );
    }
    // shouldStartSync must be a dependency — it starts false (appReady is not
    // yet true), so omitting it means the effect bails once and never re-runs.
  }, [
    user?.companyId,
    user?.salesRouteNum,
    canSync,
    dispatch,
    shouldStartSync,
  ]);
}
