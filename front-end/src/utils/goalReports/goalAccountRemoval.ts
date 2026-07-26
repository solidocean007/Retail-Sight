// src/utils/goalReports/goalAccountRemoval.ts
//
// Removing an account from a goal after an admin acknowledges a rep's report.
//
// Removed ≠ deleted: the account stays on the goal (rendered dimmed) with its
// history intact, is excluded from completion math, and can be restored.
//
// The two goal kinds store this differently:
//   Company goals — `goalAssignments[].status`, a field this feature adds.
//   Gallo goals   — `accounts[].status`, which ALREADY exists and is already
//                   filtered to "active" by every Gallo view, so removal works
//                   there with no changes to completion math.

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { GoalAssignmentType } from "../types";

/** Absent status means active — existing goals predate the field. */
export const isAssignmentActive = (a: GoalAssignmentType): boolean =>
  (a.status ?? "active") === "active";

/** Active assignments for one rep, used for quota-reachability checks. */
export const activeAssignmentsForUser = (
  assignments: GoalAssignmentType[] | undefined,
  uid: string,
): GoalAssignmentType[] =>
  (assignments ?? []).filter((a) => a.uid === uid && isAssignmentActive(a));

/**
 * A rep can no longer hit their quota from what's left.
 *
 * Deliberately does NOT auto-adjust `perUserQuota` — an admin set that number
 * on purpose and silently lowering it would be surprising. Detect, surface,
 * let them decide.
 */
export const isQuotaUnreachable = (
  assignments: GoalAssignmentType[] | undefined,
  uid: string,
  perUserQuota?: number,
): boolean => {
  if (!perUserQuota || perUserQuota <= 0) return false;
  return activeAssignmentsForUser(assignments, uid).length < perUserQuota;
};

type RemovalTarget = {
  goalId: string;
  uid: string;
  accountNumber: string;
};

/**
 * Remove (or restore) accounts on a COMPANY goal.
 *
 * Reads the goal, rewrites the matching assignment entries, writes once —
 * Firestore can't update array elements in place, so a read-modify-write is
 * unavoidable. Batched into a single write so a bulk acknowledge of 40
 * accounts is one operation rather than 40.
 */
const setCompanyAssignmentStatus = async (
  goalId: string,
  targets: RemovalTarget[],
  status: "active" | "removed",
  actorUid: string,
  reasonKey?: string,
): Promise<void> => {
  if (!targets.length) return;

  const ref = doc(db, "companyGoals", goalId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Goal not found");

  const assignments: GoalAssignmentType[] = snap.data().goalAssignments ?? [];

  const isTarget = (a: GoalAssignmentType) =>
    targets.some(
      (t) =>
        t.uid === a.uid &&
        t.accountNumber.toString() === a.accountNumber.toString(),
    );

  const next = assignments.map((a) => {
    if (!isTarget(a)) return a;

    if (status === "active") {
      // Restore: strip the removal metadata entirely rather than leaving
      // stale attribution behind.
      const { removedAt, removedBy, removedReasonKey, ...rest } = a;
      void removedAt;
      void removedBy;
      void removedReasonKey;
      return { ...rest, status: "active" as const };
    }

    return {
      ...a,
      status: "removed" as const,
      removedAt: new Date().toISOString(),
      removedBy: actorUid,
      ...(reasonKey ? { removedReasonKey: reasonKey } : {}),
    };
  });

  await updateDoc(ref, { goalAssignments: next });
};

export const removeAccountsFromCompanyGoal = (
  goalId: string,
  targets: RemovalTarget[],
  actorUid: string,
  reasonKey?: string,
) => setCompanyAssignmentStatus(goalId, targets, "removed", actorUid, reasonKey);

export const restoreAccountsOnCompanyGoal = (
  goalId: string,
  targets: RemovalTarget[],
  actorUid: string,
) => setCompanyAssignmentStatus(goalId, targets, "active", actorUid);

/**
 * Remove (or restore) accounts on a GALLO goal by flipping the existing
 * `accounts[].status`. Every Gallo view already filters to "active", so this
 * takes effect in completion math with no further changes.
 *
 * Note: "disabled" is the existing vocabulary on Gallo goals — not "removed" —
 * so we stay consistent with what those views already understand.
 */
export const setGalloAccountStatus = async (
  galloGoalDocId: string,
  oppIds: string[],
  status: "active" | "disabled",
): Promise<void> => {
  if (!oppIds.length) return;

  const ref = doc(db, "galloGoals", galloGoalDocId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Gallo goal not found");

  const accounts = (snap.data().accounts ?? []) as Array<{
    oppId: string;
    status?: string;
  }>;

  const next = accounts.map((a) =>
    oppIds.includes(a.oppId) ? { ...a, status } : a,
  );

  await updateDoc(ref, { accounts: next });
};
