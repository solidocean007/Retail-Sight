// getActiveGalloGoalsForAccounts.ts
import { FireStoreGalloGoalDocType } from "../types";

export const getActiveGalloGoalsForAccount = (
  accountNumber: string | null | undefined,
  goals: FireStoreGalloGoalDocType[]
) => {
  const today = new Date();
  return goals.filter((goal) => {
    const isMatchingAccount = goal.accounts.some((account) => {
      return String(account.distributorAcctId) === String(accountNumber);
    });

    return (
      isMatchingAccount &&
      new Date(goal.programDetails.programStartDate) <= today &&
      new Date(goal.programDetails.programEndDate) >= today
    );
  });
};

