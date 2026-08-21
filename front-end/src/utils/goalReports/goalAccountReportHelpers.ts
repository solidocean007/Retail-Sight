// src/utils/goalReports/goalAccountReportHelpers.ts
//
// Firestore access for goal account reports. See
// front-end/goal-account-status-design.md for the model.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { stripUndefined } from "../firestore/stripUndefined";
import {
  CreateGoalAccountReportInput,
  GoalAccountReport,
  GoalKind,
  GoalReportResolution,
  buildGoalAccountReportId,
} from "../../types/goalReports";

const COLLECTION = "goalAccountReports";

/**
 * Create or replace a rep's report for one account on one goal.
 *
 * Uses a deterministic ID, so a rep changing their mind updates the existing
 * record instead of creating a duplicate. Returns the document ID.
 */
export const saveGoalAccountReport = async (
  input: CreateGoalAccountReportInput,
): Promise<string> => {
  if (!input.accountNumber && !input.oppId) {
    throw new Error("A report needs either an accountNumber or an oppId");
  }

  // A record is valid as a pure help request (no reason) or a pure reason
  // report (no help) — but it has to say something.
  if (!input.reasonKeys?.length && !input.helpKeys?.length) {
    throw new Error("A report needs at least one reason or help request");
  }

  const id = buildGoalAccountReportId({
    goalKind: input.goalKind,
    goalId: input.goalId,
    accountNumber: input.accountNumber,
    oppId: input.oppId,
    userId: input.userId,
  });

  const ref = doc(db, COLLECTION, id);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();

  await setDoc(
    ref,
    stripUndefined({
      ...input,
      id,

      // Preserve original creation time when a rep edits their report.
      createdAt: existing.exists()
        ? (existing.data().createdAt ?? now)
        : now,
      updatedAt: now,
      serverUpdatedAt: serverTimestamp(),

      // Editing a report reopens it — an admin's earlier triage no longer
      // reflects what the rep is saying.
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
    }),
    { merge: true },
  );

  return id;
};

/** A rep withdrawing their report entirely. */
export const deleteGoalAccountReport = async (
  reportId: string,
): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, reportId));
};

/** All reports on one goal — powers the admin review screen. */
export const fetchReportsForGoal = async (
  goalId: string,
): Promise<GoalAccountReport[]> => {
  const q = query(collection(db, COLLECTION), where("goalId", "==", goalId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({ ...(d.data() as GoalAccountReport), id: d.id }));
};

/** One rep's reports, optionally scoped to a single goal. */
export const fetchReportsForUser = async (
  userId: string,
  goalId?: string,
): Promise<GoalAccountReport[]> => {
  const clauses = [where("userId", "==", userId)];
  if (goalId) clauses.push(where("goalId", "==", goalId));

  const snap = await getDocs(query(collection(db, COLLECTION), ...clauses));

  return snap.docs.map((d) => ({ ...(d.data() as GoalAccountReport), id: d.id }));
};

/**
 * Every report for a playbook, via the goals that reference it.
 *
 * Deliberately NOT denormalizing playbookId onto reports: in practice a
 * playbook maps to about one goal, so the 30-value `in` limit never bites.
 * Chunked anyway so this doesn't become a landmine if that changes.
 */
export const fetchReportsForGoalIds = async (
  goalIds: string[],
): Promise<GoalAccountReport[]> => {
  if (!goalIds.length) return [];

  const CHUNK = 30;
  const results: GoalAccountReport[] = [];

  for (let i = 0; i < goalIds.length; i += CHUNK) {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        where("goalId", "in", goalIds.slice(i, i + CHUNK)),
      ),
    );

    snap.docs.forEach((d) =>
      results.push({ ...(d.data() as GoalAccountReport), id: d.id }),
    );
  }

  return results;
};

/**
 * Record an admin's decision.
 *
 *  accepted  — reason stands; caller also removes the account from the goal.
 *  follow_up — account stays; routed to the rep's supervisor to review.
 *
 * NOTE: this only writes the report side. Removing the account from the goal
 * doc is a separate step (see goalAccountRemoval) so the two can be batched or
 * retried independently.
 */
export const resolveGoalAccountReports = async (
  reportIds: string[],
  resolution: GoalReportResolution,
  resolvedBy: string,
  resolutionNote?: string,
): Promise<void> => {
  const now = new Date().toISOString();

  await Promise.all(
    reportIds.map((id) =>
      updateDoc(doc(db, COLLECTION, id), {
        resolvedAt: now,
        resolvedBy,
        resolution,
        resolutionNote: resolutionNote?.trim() || null,
        serverUpdatedAt: serverTimestamp(),
      }),
    ),
  );
};

/**
 * Tell the rep what an admin decided about their report.
 *
 * Goes through `activityEvents` rather than writing the notification directly —
 * Firestore rules block client writes to `users/{uid}/notifications`
 * (`allow create: if false`), so the Cloud Function fan-out is the only path.
 *
 * One event per rep: reps have different accounts, so a shared message would
 * be wrong for most of them.
 */
export const notifyReportDecision = async (input: {
  actorUserId: string;
  actorName: string;
  targetUserId: string;
  goalId: string;
  goalTitle?: string;
  resolution: GoalReportResolution;
  accountNames: string[];
  resolutionNote?: string;
}): Promise<void> => {
  if (!input.targetUserId || !input.accountNames.length) return;

  try {
    await addDoc(collection(db, "activityEvents"), {
      type: "goal.reportResolved",
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      targetUserIds: [input.targetUserId],

      goalId: input.goalId,
      goalTitle: input.goalTitle ?? "",
      resolution: input.resolution,
      accountNames: input.accountNames,
      accountCount: input.accountNames.length,
      resolutionNote: input.resolutionNote ?? "",

      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Never let a notification failure undo a decision that already committed.
    console.error("Failed to emit report decision notification:", err);
  }
};

/**
 * Reports an admin sent back for a conversation — the supervisor's queue.
 * These lead the daily digest: unlike an unread report, a follow-up is a
 * commitment someone made out loud.
 */
export const getFollowUpReports = (
  reports: GoalAccountReport[],
): GoalAccountReport[] =>
  reports.filter((r) => r.resolution === "follow_up");

/**
 * Supervisor backs the rep up after working the account.
 *
 * Reopens the report for the admin by clearing `resolvedAt` — deliberately
 * reusing "open" rather than adding a state, so the feedback strip, the review
 * modal, and the digest all pick it up with no changes. `adminDigestAt` is
 * cleared too: a supervisor confirmation is new information and deserves to
 * appear in the next digest.
 *
 * Does NOT touch the goal. Only an admin can remove an account.
 */
export const confirmReportAsSupervisor = async (
  reportId: string,
  supervisorUid: string,
  supervisorNote?: string,
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, reportId), {
    supervisorConfirmedAt: new Date().toISOString(),
    supervisorConfirmedBy: supervisorUid,
    supervisorNote: supervisorNote?.trim() || null,

    // Back into the admin's queue.
    resolvedAt: null,
    resolution: null,
    adminDigestAt: null,

    serverUpdatedAt: serverTimestamp(),
  });
};

/**
 * Supervisor investigated and decided the rep should keep pursuing it. Closes
 * the report without involving the admin. Account stays on the goal.
 */
export const keepWorkingReport = async (
  reportId: string,
  supervisorUid: string,
  supervisorNote?: string,
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, reportId), {
    resolvedAt: new Date().toISOString(),
    resolvedBy: supervisorUid,
    resolution: "keep_working",
    supervisorNote: supervisorNote?.trim() || null,
    serverUpdatedAt: serverTimestamp(),
  });
};

/** Follow-ups routed to a given supervisor's direct reports. */
export const fetchFollowUpsForSupervisor = async (
  companyId: string,
  repUids: string[],
): Promise<GoalAccountReport[]> => {
  if (!companyId || !repUids.length) return [];

  const CHUNK = 30;
  const results: GoalAccountReport[] = [];

  for (let i = 0; i < repUids.length; i += CHUNK) {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        where("companyId", "==", companyId),
        where("userId", "in", repUids.slice(i, i + CHUNK)),
        where("resolution", "==", "follow_up"),
      ),
    );

    snap.docs.forEach((d) =>
      results.push({ ...(d.data() as GoalAccountReport), id: d.id }),
    );
  }

  return results;
};

/** Undo triage — puts reports back in the open queue. */
export const reopenGoalAccountReports = async (
  reportIds: string[],
): Promise<void> => {
  await Promise.all(
    reportIds.map((id) =>
      updateDoc(doc(db, COLLECTION, id), {
        resolvedAt: null,
        resolvedBy: null,
        resolution: null,
        serverUpdatedAt: serverTimestamp(),
      }),
    ),
  );
};

/** Group reports by reason key for the admin aggregate view. */
export const summarizeReportsByReason = (
  reports: GoalAccountReport[],
): Record<string, number> => {
  const counts: Record<string, number> = {};

  reports.forEach((r) => {
    r.reasonKeys?.forEach((key) => {
      counts[key] = (counts[key] ?? 0) + 1;
    });
  });

  return counts;
};

/** Same, for outstanding help requests. */
export const summarizeReportsByHelp = (
  reports: GoalAccountReport[],
): Record<string, number> => {
  const counts: Record<string, number> = {};

  reports.forEach((r) => {
    r.helpKeys?.forEach((key) => {
      counts[key] = (counts[key] ?? 0) + 1;
    });
  });

  return counts;
};

/**
 * Help requests an admin hasn't handled yet — the actionable queue, as
 * distinct from reports that are merely informational.
 */
export const getOpenHelpRequests = (
  reports: GoalAccountReport[],
): GoalAccountReport[] =>
  reports.filter((r) => Boolean(r.helpKeys?.length) && !r.resolvedAt);

/**
 * The last person a rep recorded speaking with at this account, across any
 * goal — used to prefill the contact field so reps aren't retyping the same
 * buyer's name every time.
 *
 * Keyed on accountNumber because that's stable across goals. Gallo `oppId` is
 * per-opportunity, so it can't carry a contact forward; unmatched Gallo
 * accounts simply won't prefill.
 */
export const fetchLastContactForAccount = async (
  companyId: string,
  accountNumber?: string,
): Promise<string | null> => {
  if (!companyId || !accountNumber) return null;

  try {
    const snap = await getDocs(
      query(
        collection(db, COLLECTION),
        where("companyId", "==", companyId),
        where("accountNumber", "==", accountNumber),
        orderBy("createdAt", "desc"),
        limit(5),
      ),
    );

    // Most recent report that actually recorded a name.
    for (const d of snap.docs) {
      const contact = (d.data() as GoalAccountReport).declinedBy?.trim();
      if (contact) return contact;
    }

    return null;
  } catch (err) {
    // Prefill is a convenience — never let it break the dialog.
    console.warn("Could not look up last contact for account:", err);
    return null;
  }
};

/** Convenience for the report lookup a rep's account row needs. */
export const findReportForAccount = (
  reports: GoalAccountReport[],
  opts: { goalKind: GoalKind; accountNumber?: string; oppId?: string },
): GoalAccountReport | undefined =>
  reports.find(
    (r) =>
      r.goalKind === opts.goalKind &&
      ((opts.accountNumber && r.accountNumber === opts.accountNumber) ||
        (opts.oppId && r.oppId === opts.oppId)),
  );
