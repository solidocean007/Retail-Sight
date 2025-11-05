import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
  UserType,
} from "../../../utils/types";

/**
 * Resolves the list of accounts based on the goal's target mode.
 */
export function getEffectiveAccounts(
  goal: CompanyGoalType,
  allAccounts: CompanyAccountType[]
): CompanyAccountType[] {
  switch (
    goal.targetMode ||
    (goal.appliesToAllAccounts ? "goalForAllAccounts" : undefined)
  ) {
    case "goalForAllAccounts":
      return allAccounts;
    case "goalForSelectedAccounts":
      return goal.accounts || [];
    case "goalForSelectedUsers":
      return allAccounts.filter((account) =>
        account.salesRouteNums?.some((route) =>
          goal.usersIdsOfGoal?.includes(route)
        )
      );
    default:
      return [];
  }
}

/**
 * Calculates submission stats based on the goal's mode.
 */
export function calculateSubmissionStats(
  goal: CompanyGoalType,
  effectiveAccounts: CompanyAccountType[]
) {
  if (
    goal.targetMode === "goalForSelectedUsers" &&
    goal.usersIdsOfGoal?.length
  ) {
    const uniqueSubmitters = new Set(
      goal.submittedPosts?.map((p) => p.submittedBy).filter(Boolean)
    );
    const submittedCount = Array.from(uniqueSubmitters).filter((user) =>
      goal.usersIdsOfGoal!.includes(user.uid)
    ).length;
    const totalCount = goal.usersIdsOfGoal.length;
    const percentage =
      totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
    return { total: totalCount, submitted: submittedCount, percentage };
  }

  const submittedCount =
    goal.submittedPosts?.filter((post) =>
      effectiveAccounts.some(
        (acc) => acc.accountNumber === post.account.accountNumber
      )
    ).length || 0;
  const totalCount = effectiveAccounts.length;
  const percentage =
    totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
  return { total: totalCount, submitted: submittedCount, percentage };
}

/**
 * Maps accounts with submission status
 */
export interface AccountWithStatus extends CompanyAccountType {
  submittedBy: UserType | null;
  submittedAt: string | null;
  postId: string | null;
}

export function mapAccountsWithStatus(
  goal: CompanyGoalType,
  effectiveAccounts: CompanyAccountType[]
): AccountWithStatus[] {
  return effectiveAccounts.map((effectiveAccount) => {
    // Find the submittedPost that matches this effectiveAccount's number
    const matchingSubmittedPost = goal.submittedPosts?.find(
      (submittedPost: GoalSubmissionType) =>
        submittedPost.account?.accountNumber?.toString() ===
        effectiveAccount.accountNumber.toString()
    );

    return {
      ...effectiveAccount,
      // Attach post metadata if a matching submission was found
      submittedBy: matchingSubmittedPost?.submittedBy || null,
      submittedAt: matchingSubmittedPost?.submittedAt || null,
      postId: matchingSubmittedPost?.postId || null,
    };
  });
}

