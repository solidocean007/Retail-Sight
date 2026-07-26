// src/hooks/useGoalAccountReports.ts
import { useCallback, useEffect, useState } from "react";
import { GoalAccountReport } from "../types/goalReports";
import { fetchReportsForGoal } from "../utils/goalReports/goalAccountReportHelpers";

/**
 * Reports for one goal, fetched once by the parent.
 *
 * Deliberately fetched at the goal level rather than per account row — a rep
 * with 100 accounts must not trigger 100 reads.
 */
export const useGoalAccountReports = (
  goalId: string | undefined,
  enabled = true,
) => {
  const [reports, setReports] = useState<GoalAccountReport[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!goalId || !enabled) return;

    setLoading(true);
    try {
      setReports(await fetchReportsForGoal(goalId));
    } catch (err) {
      console.error("Failed to load goal account reports:", err);
    } finally {
      setLoading(false);
    }
  }, [goalId, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reports, loading, refresh };
};
