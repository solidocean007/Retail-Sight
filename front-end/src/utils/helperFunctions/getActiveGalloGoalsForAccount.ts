// getActiveGalloGoalsForAccounts.ts
import { FireStoreGalloGoalDocType } from "../types";
import { getGoalTimingState } from "../../components/GoalIntegration/utils/getGoalTimingState";

export const getActiveGalloGoalsForAccount = (
  accountNumber: string | null | undefined,
  goals: FireStoreGalloGoalDocType[],
) => {
  const now = Date.now();

  return goals.filter((goal) => {
    const isMatchingAccount = goal.accounts.some(
      (account) =>
        String(account.distributorAcctId) === String(accountNumber),
    );

    return (
      isMatchingAccount &&
      goal.lifeCycleStatus === "active" &&
      getGoalTimingState(goal, now) === "current"
    );
  });
};
