import { CompanyGoalWithIdType } from "../types";

export const getActiveCompanyGoalsForAccount = (
  accountNumber: string | number | undefined | null,
  goals: CompanyGoalWithIdType[]
): CompanyGoalWithIdType[] => {
  if (!accountNumber || !goals?.length) return [];

  const today = new Date();
  const accountKey = String(accountNumber);

  return goals.filter((goal) => {
    const start = new Date(goal.goalStartDate);
    const end = new Date(`${goal.goalEndDate}T23:59:59.999Z`);
    const isActiveToday = start <= today && end >= today;
    if (!isActiveToday) return false;

    // 🔥 NEW — use goalAssignments instead of accountNumbersForThisGoal
    const isIncluded = goal.goalAssignments?.some(
      (a) => a.accountNumber === accountKey
    );

    return isIncluded;
  });
};
