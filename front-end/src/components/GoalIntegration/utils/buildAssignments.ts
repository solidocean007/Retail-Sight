// utils/goalUtils/buildAssignments.ts

import { CompanyAccountType, GoalAssignmentType, UserType } from "../../../utils/types";


interface BuildAssignmentsArgs {
  accounts: CompanyAccountType[];
  filteredAccounts: CompanyAccountType[];
  normalizedUsers: UserType[];
  assigneeType: "sales" | "supervisor";
  accountScope: "all" | "selected";
}

/**
 * Produces a deduped list of GoalAssignmentType objects
 * based on the current accounts, filters, and assignee type.
 */
export function buildAssignments({
  accounts,
  filteredAccounts,
  normalizedUsers,
  assigneeType,
  accountScope,
}: BuildAssignmentsArgs): GoalAssignmentType[] {

  // Decide which accounts are in scope
  const scoped = accountScope === "all" ? accounts : filteredAccounts;

  const assignments: GoalAssignmentType[] = [];

  for (const acc of scoped) {
    const routeNums = acc.salesRouteNums || [];

    // 1️⃣ No routes → skip for supervisor/sales
    if (routeNums.length === 0) continue;

    if (assigneeType === "sales") {
      // reps whose salesRouteNum matches
      const reps = normalizedUsers.filter(
        (u) => u.salesRouteNum && routeNums.includes(u.salesRouteNum)
      );

      for (const rep of reps) {
        assignments.push({
          uid: rep.uid,
          accountNumber: acc.accountNumber.toString(),
        });
      }
    }

    if (assigneeType === "supervisor") {
      // reps for account
      const reps = normalizedUsers.filter(
        (u) => u.salesRouteNum && routeNums.includes(u.salesRouteNum)
      );

      // supervisors of those reps
      const supervisorUids = new Set(
        reps.map((r) => r.reportsTo).filter(Boolean) as string[]
      );

      // supervisors who personally sell this account
      normalizedUsers.forEach((u) => {
        if (
          u.role === "supervisor" &&
          u.salesRouteNum &&
          routeNums.includes(u.salesRouteNum)
        ) {
          supervisorUids.add(u.uid);
        }
      });

      for (const supUid of supervisorUids) {
        assignments.push({
          uid: supUid,
          accountNumber: acc.accountNumber.toString(),
        });
      }
    }
  }

  // Dedupe accountNumber+uid pairs
  return Array.from(
    new Map(assignments.map((a) => [`${a.accountNumber}-${a.uid}`, a])).values()
  );
}
