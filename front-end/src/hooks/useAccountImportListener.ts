//front-end/src/hooks/useAccountImportListener.ts
import { useEffect } from "react";
import { useAppDispatch } from "../utils/store";
import { setupAccountImportListener } from "../utils/listeners/setupAccountImportListener";

export const useAccountImportListener = (companyId?: string | null) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    console.log("AccountImportListener companyId:", companyId);

    if (!companyId) return;

    const unsubscribe = dispatch(setupAccountImportListener(companyId));

    return unsubscribe;
  }, [companyId, dispatch]);
};