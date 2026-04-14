// useAvailableGoals.ts
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { CompanyGoalWithIdType } from "../utils/types";

export const useAvailableGoals = (
  isSupplier: boolean,
  companyId: string | undefined
) => {
  const allGoals = useSelector(
    (state: RootState) => state.companyGoals.goals
  ) as CompanyGoalWithIdType[];

  return useMemo(() => {
    if (!companyId) return [];

    if (isSupplier) {
      // 🔥 ONLY supplier-assigned goals
      return allGoals.filter(
        (g) => g.supplierIdForGoal === companyId
      );
    }

    // 🔹 distributor → their own goals
    return allGoals.filter(
      (g) => g.companyId === companyId
    );
  }, [allGoals, isSupplier, companyId]);
};