import {
  CompanyAccountType,
  CompanyGoalType,
  GoalSubmissionType,
} from "../../../utils/types";

/**
 * Resolves the list of accounts based on the goal's target mode.
 */
export function getEffectiveAccounts(
  goal: CompanyGoalType,
  allAccounts: CompanyAccountType[],
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
          goal.usersIdsOfGoal?.includes(route),
        ),
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
  effectiveAccounts: CompanyAccountType[],
) {
  if (
    goal.targetMode === "goalForSelectedUsers" &&
    goal.usersIdsOfGoal?.length
  ) {
    const uniqueSubmitters = new Set(
      goal.submittedPosts?.map((p) => p.submittedBy).filter(Boolean),
    );
    const submittedCount = Array.from(uniqueSubmitters).filter(
      (uid) => goal.usersIdsOfGoal!.includes(uid), // Type 'undefined' is not assignable to type 'string'
    ).length;
    const totalCount = goal.usersIdsOfGoal.length;
    const percentage =
      totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
    return { total: totalCount, submitted: submittedCount, percentage };
  }

  const submittedCount =
    goal.submittedPosts?.filter((post) =>
      effectiveAccounts.some((acc) => acc.accountNumber === post.accountNumber),
    ).length || 0;
  const totalCount = effectiveAccounts.length;
  const percentage =
    totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0;
  return { total: totalCount, submitted: submittedCount, percentage };
}

/**
 * Maps accounts with submission status
 */
export function mapAccountsWithStatus(
  goal: CompanyGoalType,
  effectiveAccounts: CompanyAccountType[],
) {
  if (
    goal.targetMode === "goalForSelectedUsers" &&
    goal.usersIdsOfGoal?.length
  ) {
    return goal.usersIdsOfGoal.map((uid) => {
      const matchingAccount = effectiveAccounts.find((account) =>
        account.salesRouteNums?.includes(uid),
      );
      const matchingPost = goal.submittedPosts?.find(
        (post) => post.submittedBy === uid,
      );
      return {
        ...(matchingAccount || {
          accountName: "Unknown User",
          accountNumber: "N/A",
          accountAddress: "—",
          marketId: "—",
          salesRouteNums: [],
        }),
        submittedBy: matchingPost?.submittedBy || null,
        submittedAt: matchingPost?.submittedAt || null,
        postId: matchingPost?.postId || null,
      };
    });
  }

  return effectiveAccounts.map((account) => {
    const found = goal.submittedPosts?.find(
      (post: GoalSubmissionType) =>
        post.accountNumber === account.accountNumber,
    );
    return {
      ...account,
      submittedBy: found?.submittedBy || null,
      submittedAt: found?.submittedAt || null,
      postId: found?.postId || null,
    };
  });
}
