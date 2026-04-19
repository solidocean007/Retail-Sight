// hooks/useGalloGoalsListener.ts
import { useEffect } from "react";
import { selectCanSync, useAppDispatch } from "../utils/store";
import { setupGalloGoalsListener } from "../utils/listeners/setupGalloGoalsListener";
import { useSelector } from "react-redux";

export function useGalloGoalsListener(
  companyId?: string | null,
  enabled = false,
  shouldStartSync = true
) {
  const canSync = useSelector(selectCanSync);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!companyId || !enabled || !canSync || !shouldStartSync) return;

    console.log("🟢 Attaching Gallo goals listener");

    const unsubscribe = dispatch(
      setupGalloGoalsListener(companyId)
    ) as unknown as (() => void);

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [companyId, enabled, canSync,dispatch]);
}
