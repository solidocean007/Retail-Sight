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

  const result = goals.filter((goal) => {
    const start = new Date(goal.goalStartDate);
    const end = new Date(goal.goalEndDate);
    const accountList = goal.accountNumbersForThisGoal ?? [];

    const isActiveToday = start <= today && end >= today;
    const accountMatch = accountList.includes(String(accountNumber));

    return isActiveToday && accountMatch;
  });

  return result;
};
