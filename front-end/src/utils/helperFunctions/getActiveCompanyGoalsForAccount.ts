// getActiveCompanyGoalsForAccounts.ts
import { CompanyGoalType } from "../types";

export const getActiveCompanyGoalsForAccount = (
  accountNumber: string | null | undefined,
  goals: CompanyGoalType[]
) => {
  const today = new Date();
  return goals.filter((goal) => {
    const isMatchingAccount =
      goal.accounts === "Global" || // Check if the goal applies globally
      (Array.isArray(goal.accounts) &&
        goal.accounts.some((accountId) => String(accountId) === String(accountNumber)));

    return (
      isMatchingAccount &&
      new Date(goal.goalStartDate) <= today &&
      new Date(goal.goalEndDate) >= today
    );
  });
};
