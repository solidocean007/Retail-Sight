import { CompanyGoalWithIdType } from "../types";

export const getActiveCompanyGoalsForAccount = (
  accountNumber: string | null | undefined,
  goals: CompanyGoalWithIdType[]
): CompanyGoalWithIdType[] => {
  if (!accountNumber) return [];

  const today = new Date();

  const parseDate = (date: any): Date | null => {
    if (!date) return null;
    if (typeof date === "string" || typeof date === "number")
      return new Date(date);
    if (date.seconds) return new Date(date.seconds * 1000);
    return null;
  };

  console.log("goals", goals);

  return goals.filter((goal) => {
    const start = parseDate(goal.goalStartDate);
    const end = parseDate(goal.goalEndDate);
    const isWithinDateRange = start && end && start <= today && end >= today;

    const isAccountIncluded =
      Array.isArray(goal.accountNumbersForThisGoal) &&
      goal.accountNumbersForThisGoal
        .map(String)
        .includes(String(accountNumber));

    return isWithinDateRange && isAccountIncluded;
  });
};
