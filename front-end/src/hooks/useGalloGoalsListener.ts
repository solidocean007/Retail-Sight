// hooks/useGalloGoalsListener.ts
import { useEffect } from "react";
import { useAppDispatch } from "../utils/store";
import { setupGalloGoalsListener } from "../utils/listeners/setupGalloGoalsListener";

export function useGalloGoalsListener(
  companyId?: string | null,
  enabled = false
) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!companyId || !enabled) return;

    console.log("🟢 Attaching Gallo goals listener");

    const unsubscribe = dispatch(
      setupGalloGoalsListener(companyId)
    ) as unknown as (() => void);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [companyId, enabled, dispatch]);
}
