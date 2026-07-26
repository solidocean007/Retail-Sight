import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * The admin who owns a goal, for either kind of goal.
 *
 * Company goals live in `companyGoals`; Gallo goals live in `galloGoals` and
 * are keyed by the same id reports use (`galloGoals` documents are written at
 * `doc(db, "galloGoals", selectedGoal.goalId)`, and `goalDetails.goalId` is
 * that document id — see `createGalloGoal`). So one lookup id serves both, and
 * we just have to check both collections.
 *
 * Shared by the immediate notification and the 5pm digest deliberately: if the
 * two disagreed about who owns a goal, someone would get a push about work
 * that never appears in their email, or vice versa.
 *
 * Returns "" when no creator is recorded — Gallo goals imported before
 * `createdByUserId` was added, and older company goals where the field is
 * optional. Those have no immediate recipient by design.
 */
export const resolveGoalAdminUid = async (goalId: string): Promise<string> => {
  if (!goalId) return "";

  const read = async (collection: string): Promise<string> => {
    try {
      const snap = await db.doc(`${collection}/${goalId}`).get();
      return String(snap.data()?.createdByUserId ?? "").trim();
    } catch (err) {
      logger.warn(`resolveGoalAdminUid: ${collection}/${goalId} failed`, err);
      return "";
    }
  };

  return (await read("companyGoals")) || (await read("galloGoals"));
};
