// getActiveCompanyGoalsForAccounts.ts
import { CompanyGoalType } from "../types";

export const getActiveCompanyGoalsForAccount = (
  accountNumber: string | null | undefined,
  goals: CompanyGoalType[]
): CompanyGoalType[] => {
  if (!accountNumber) {
    return [];
  }

  const today = new Date();

  return goals.filter((goal) => {
    const { accounts, goalStartDate, goalEndDate } = goal;

    // Check if the goal applies globally or matches the account number
    const isMatchingAccount =
      accounts === "Global" ||
      (Array.isArray(accounts) &&
        accounts.some(
          (account) =>
            account.accountNumber &&
            String(account.accountNumber) === String(accountNumber)
        ));

    // Check if the goal's date range includes today's date
    const isWithinDateRange =
      new Date(goalStartDate) <= today && new Date(goalEndDate) >= today;

    return isMatchingAccount && isWithinDateRange;
  });
};




