export const getActiveGoalsForAccount = (
  accountNumber: string,
  goals: GalloGoalType[]
) => {
  const today = new Date();
  return goals.filter(
    (goal) =>
      goal.accounts.some(
        (account) => account.distributorAcctId === accountNumber
      ) &&
      new Date(goal.programStartDate) <= today &&
      new Date(goal.programEndDate) >= today
  );
};
