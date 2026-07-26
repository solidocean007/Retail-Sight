import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * Close goal account reports when the display actually gets built.
 *
 * The supervisor's job on a follow-up is to make the display happen. If it
 * happens, the report is moot — nobody should have to remember to tick it off,
 * and a stale flag on an executed account is noise in the admin's queue and
 * the daily digest.
 *
 * Matches on goal + account rather than goal + account + rep: if a display
 * exists for that account on that goal, every report about it is moot no
 * matter who filed it.
 *
 * Silent by design. The rep knows they submitted, and the admin sees it
 * resolved — a notification here would be telling people what they just did.
 */
export const resolveReportsOnSubmission = onDocumentCreated(
  "posts/{postId}",
  async (event) => {
    const post = event.data?.data();
    if (!post) return;

    const accountNumber = post.accountNumber
      ? String(post.accountNumber)
      : null;

    // A post belongs to at most one company goal and/or one Gallo goal.
    const targets: {
      goalId: string;
      field: "accountNumber" | "oppId";
      value: string;
    }[] = [];

    if (post.companyGoalId && accountNumber) {
      targets.push({
        goalId: String(post.companyGoalId),
        field: "accountNumber",
        value: accountNumber,
      });
    }

    if (post.galloGoal?.goalId) {
      // Gallo reports are keyed on oppId; fall back to accountNumber for
      // matched accounts where the rep's report captured that instead.
      const oppId = post.galloGoal.oppId ? String(post.galloGoal.oppId) : null;

      if (oppId) {
        targets.push({
          goalId: String(post.galloGoal.goalId),
          field: "oppId",
          value: oppId,
        });
      } else if (accountNumber) {
        targets.push({
          goalId: String(post.galloGoal.goalId),
          field: "accountNumber",
          value: accountNumber,
        });
      }
    }

    if (!targets.length) return;

    const now = new Date().toISOString();
    let closed = 0;

    for (const t of targets) {
      try {
        const snap = await db
          .collection("goalAccountReports")
          .where("goalId", "==", t.goalId)
          .where(t.field, "==", t.value)
          .get();

        // Already-decided reports stay as they are — an admin's "accepted"
        // is a record of a judgment, not something a later post should
        // overwrite. Only open items and outstanding follow-ups close here.
        const toClose = snap.docs.filter((d) => {
          const r = d.data();
          return !r.resolvedAt || r.resolution === "follow_up";
        });

        if (!toClose.length) continue;

        const batch = db.batch();
        toClose.forEach((d) => {
          batch.update(d.ref, {
            resolvedAt: now,
            resolvedBy: "system",
            resolution: "executed",
            serverUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        await batch.commit();
        closed += toClose.length;
      } catch (err) {
        // Never let this fail the post. A stale flag is a minor annoyance;
        // a submission that appears to error is not.
        logger.warn(`Could not auto-close reports for goal ${t.goalId}`, err);
      }
    }

    if (closed) {
      logger.info(
        `Auto-closed ${closed} report(s) after submission ${event.params.postId}.`
      );
    }
  }
);
