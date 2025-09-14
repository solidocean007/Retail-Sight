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

    // 🔹 Sales goals: account must be explicitly included
    if (goal.targetRole === "sales") {
      return goal.accountNumbersForThisGoal?.includes(accountKey);
    }

    // 🔹 Supervisor goals: still filter by account, but we’ll check role later in PickStore
    if (goal.targetRole === "supervisor") {
      return goal.accountNumbersForThisGoal?.includes(accountKey);
    }

    return false;
  });
};
