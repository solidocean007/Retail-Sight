import { CompanyGoalWithIdType } from "../../utils/types";

export const getActiveCompanyGoalsForAccount = (
  accountNumber: string | number | undefined | null,
  goals: CompanyGoalWithIdType[]
): CompanyGoalWithIdType[] => {
  if (!accountNumber || !goals?.length) {
    console.warn("❌ No account number or no goals to evaluate");
    return [];
  }

  const today = new Date();
  const accountKey = String(accountNumber);

  return goals.filter((goal) => {
    const start = new Date(goal.goalStartDate);
    const end = new Date(`${goal.goalEndDate}T23:59:59.999Z`); // ✅ full-day support
    const isActiveToday = start <= today && end >= today;

    if (!isActiveToday) return false;

    if (goal.targetRole === "supervisor") {
      // ✅ supervisor goal: account must be in userAssignments
      return (
        !!goal.userAssignments &&
        Array.isArray(goal.userAssignments[accountKey])
      );
    }

    // ✅ sales goal: account must be in accountNumbersForThisGoal
    return goal.accountNumbersForThisGoal?.includes(accountKey);
  });
};

