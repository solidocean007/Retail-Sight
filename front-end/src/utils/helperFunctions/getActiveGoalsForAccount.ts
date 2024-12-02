// getActiveGoalsForAccounts.ts
import { FireStoreGalloGoalDocType } from "../types";

export const getActiveGoalsForAccount = (
  accountNumber: string | null | undefined,
  goals: FireStoreGalloGoalDocType[]
) => {
  const today = new Date();
  return goals.filter((goal) => {
    const isMatchingAccount = goal.accounts.some((account) => {
      console.log(
        "Comparing accountNumber:",
        String(account.distributorAcctId),
        "with",
        String(accountNumber)
      );
      return String(account.distributorAcctId) === String(accountNumber);
    });

    return (
      isMatchingAccount &&
      new Date(goal.programDetails.programStartDate) <= today &&
      new Date(goal.programDetails.programEndDate) >= today
    );
  });
};

