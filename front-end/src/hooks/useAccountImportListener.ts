//front-end/src/hooks/useAccountImportListener.ts
import { useEffect } from "react";
import { useAppDispatch } from "../utils/store";
import { setupAccountImportListener } from "../utils/listeners/setupAccountImportListener";

export const useAccountImportListener = (companyId?: string | null, shouldStartSync = true) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!companyId || !shouldStartSync) return;

    const unsubscribe = dispatch(setupAccountImportListener(companyId));

    return unsubscribe;
  }, [companyId, dispatch]);
};
