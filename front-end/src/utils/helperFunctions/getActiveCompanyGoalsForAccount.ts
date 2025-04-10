// getActiveCompanyGoalsForAccounts.ts
import { CompanyGoalType } from "../types";

export const getActiveCompanyGoalsForAccount = (
  accountNumber: string | null | undefined,
  goals: CompanyGoalType[]
): CompanyGoalType[] => {
  if (!accountNumber) return [];

  const today = new Date();

  const parseDate = (date: any) => {
    if (!date) return null;
    if (typeof date === "string" || typeof date === "number") return new Date(date);
    if (date.seconds) return new Date(date.seconds * 1000);
    return null;
  };

  return goals.filter((goal) => {
    const { accounts, appliesToAllAccounts, goalStartDate, goalEndDate } = goal;

    const isMatchingAccount =
      appliesToAllAccounts ||
      (Array.isArray(accounts) &&
        accounts.some((account) =>
          String(account.accountNumber) === String(accountNumber)
        ));

    const start = parseDate(goalStartDate);
    const end = parseDate(goalEndDate);
    const isWithinDateRange = start && end && start <= today && end >= today;

    return isMatchingAccount && isWithinDateRange;
  });
};




