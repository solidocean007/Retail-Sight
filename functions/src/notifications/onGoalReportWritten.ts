import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { resolveGoalAdminUid } from "./resolveGoalAdmin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const APP_ORIGIN = "https://displaygram.com";

/**
 * Tells the goal's admin, in-app and by push, that something landed in their
 * queue — without waiting for the 5pm digest.
 *
 * A Firestore trigger rather than an `activityEvents` write from the client,
 * for two reasons: the rep's client can't resolve who the admin is without
 * reading `companyGoals`, and a trigger can't be forgotten at a call site. The
 * report document itself is the source of truth.
 *
 * WHICH WRITES COUNT
 * Only two things should reach the admin, and both are distinguishable from
 * the document alone:
 *
 *   1. A rep filing or editing a report. `saveGoalAccountReport` is the ONLY
 *      writer that touches `updatedAt` — every admin and supervisor path
 *      writes `serverUpdatedAt` instead — so a changed `updatedAt` means the
 *      rep wrote this.
 *   2. A supervisor confirming a follow-up, which clears `resolvedAt` and puts
 *      the report back in the admin's queue. Detected by a changed
 *      `supervisorConfirmedAt`.
 *
 * Everything else — the admin's own decision, the digest stamping
 * `adminDigestAt`, auto-close on submission — is silently ignored. Without
 * that filter an admin would notify themselves on every click.
 *
 * VOLUME
 * One notification per admin, per goal, per day, matching the rest of the
 * feature. The id is deterministic, and repeat activity updates it in place
 * with a growing count instead of stacking. Because `onUserNotificationCreated`
 * fires on document CREATION only, the push goes out once and later updates
 * refresh the in-app item quietly — which is the point.
 *
 * Gallo goals aren't in `companyGoals` and older company goals may predate
 * `createdByUserId`; both have no admin recipient and fall through to the
 * digest, same as before.
 */

/** Eastern date, matching the digest — a UTC bucket would split at 8pm ET. */
const easternDay = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(
    new Date()
  );

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const onGoalReportWritten = onDocumentWritten(
  "goalAccountReports/{reportId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after) return; // withdrawn by the rep

    const repWrote = Boolean(
      after.updatedAt && after.updatedAt !== before?.updatedAt
    );

    const supervisorConfirmed = Boolean(
      after.supervisorConfirmedAt &&
        after.supervisorConfirmedAt !== before?.supervisorConfirmedAt
    );

    if (!repWrote && !supervisorConfirmed) return;

    const goalId = String(after.goalId ?? "");
    if (!goalId) return;

    // The admin is the goal's creator — company goal or Gallo import, same
    // rule, shared with the digest so the two channels can't disagree.
    const adminUid = await resolveGoalAdminUid(goalId);

    if (!adminUid) {
      logger.info(`Goal ${goalId} has no creator; report reaches digest only.`);
      return;
    }

    const actorUid = supervisorConfirmed
      ? String(after.supervisorConfirmedBy ?? "")
      : String(after.userId ?? "");

    // An admin reporting on their own goal shouldn't ping themselves.
    if (adminUid === actorUid) return;

    const goalTitle = String(after.goalTitle || "your goal");
    const reportId = event.params.reportId;

    const notificationId = `goalinbox_${goalId}_${adminUid}_${easternDay()}`;
    const ref = db.doc(`users/${adminUid}/notifications/${notificationId}`);
    const nowTs = admin.firestore.FieldValue.serverTimestamp();

    // Transaction because a rep working quickly through accounts produces
    // overlapping invocations; a lost update here would undercount.
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      const data = (existing.data() ?? {}) as Record<string, unknown>;

      // Ids rather than counters so that a rep editing the same report twice
      // doesn't inflate the number. Two lists because the two events mean
      // different things to the admin.
      const filed: string[] = Array.isArray(data.filedReportIds)
        ? (data.filedReportIds as string[]).slice()
        : [];
      const confirmed: string[] = Array.isArray(data.confirmedReportIds)
        ? (data.confirmedReportIds as string[]).slice()
        : [];

      const list = supervisorConfirmed ? confirmed : filed;
      if (!list.includes(reportId)) list.push(reportId);

      const filedCount = filed.length;
      const confirmedCount = confirmed.length;

      const accountLabel =
        after.accountName || after.accountNumber || after.oppId || "an account";

      let message: string;
      if (filedCount && confirmedCount) {
        message =
          `${plural(filedCount, "account")} reported and ` +
          `${plural(confirmedCount, "follow-up")} confirmed on ${goalTitle}.`;
      } else if (confirmedCount) {
        message =
          confirmedCount === 1
            ? `A supervisor confirmed the issue at ${accountLabel} on ${goalTitle}.`
            : `${plural(confirmedCount, "follow-up")} confirmed by supervisors on ${goalTitle}.`;
      } else {
        const repName =
          `${after.userFirstName ?? ""} ${after.userLastName ?? ""}`.trim() ||
          "A rep";

        message =
          filedCount === 1
            ? `${repName} reported an issue at ${accountLabel} on ${goalTitle}.`
            : `${plural(filedCount, "account")} reported on ${goalTitle}.`;
      }

      tx.set(
        ref,
        {
          id: notificationId,
          userId: adminUid,
          title: "Feedback waiting on you",
          message,
          type: "goal.reportFiled",
          intent: "activity",
          priority: "normal",
          link: `${APP_ORIGIN}/dashboard`,
          goalId,
          filedReportIds: filed,
          confirmedReportIds: confirmed,
          accountCount: filedCount + confirmedCount,
          // Reopen and resurface: later activity on the same day shouldn't
          // hide under an item the admin already read and scrolled past.
          readAt: null,
          createdAt: nowTs,
          firstSeenAt: existing.exists ? (data.firstSeenAt ?? nowTs) : nowTs,
          updatedAt: nowTs,
          deliveredVia: { inApp: nowTs },
        },
        { merge: true }
      );
    });
  }
);
