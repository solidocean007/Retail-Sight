// src/utils/goalReports/goalAccountReportHelpers.ts
//
// Firestore access for goal account reports. See
// front-end/goal-account-status-design.md for the model.

import {
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
import {
  CreateGoalAccountReportInput,
  GoalAccountReport,
  GoalKind,
  GoalReportResolution,
  buildGoalAccountReportId,
} from "../../types/goalReports";

const COLLECTION = "goalAccountReports";

/** Drop undefined values — Firestore rejects them. */
const stripUndefined = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;

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
 * Admin triage. `removed_from_goal` records that the account was taken out of
 * the goal; `acknowledged_no_action` records that it was seen and left alone.
 *
 * NOTE: this only writes the report side. Actually removing the account from
 * the goal doc is a separate step (see the removal helpers) so that the two
 * can be batched or retried independently.
 */
export const resolveGoalAccountReports = async (
  reportIds: string[],
  resolution: GoalReportResolution,
  resolvedBy: string,
): Promise<void> => {
  const now = new Date().toISOString();

  await Promise.all(
    reportIds.map((id) =>
      updateDoc(doc(db, COLLECTION, id), {
        resolvedAt: now,
        resolvedBy,
        resolution,
        serverUpdatedAt: serverTimestamp(),
      }),
    ),
  );
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
