import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { resolveGoalAdminUid } from "./resolveGoalAdmin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const APP_ORIGIN = "https://displaygram.com";

/**
 * Daily end-of-day digest for goal account reports.
 *
 * ONE email per person, never one per goal — an admin running several goals
 * should get a single note listing what needs them, not an inbox full.
 *
 * Two distinct asks, so the two audiences get different emails:
 *   Admins (goal creators) — reports on their goals nobody has decided on yet.
 *   Supervisors            — follow-ups an admin routed to them to work
 *                            through with their rep.
 *
 * Email is the PRIMARY channel here, not a recap of a push: most users haven't
 * installed the PWA, so this may be the only thing they actually receive. It
 * has to stand alone.
 *
 * Anyone with nothing pending gets nothing. A digest that's usually empty is a
 * digest people filter to trash.
 */

type ReportDoc = {
  id: string;
  companyId: string;
  goalId: string;
  goalTitle?: string;
  accountName?: string;
  accountNumber?: string;
  oppId?: string;
  userId: string;
  userFirstName?: string;
  userLastName?: string;
  reasonKeys?: string[];
  helpKeys?: string[];
  note?: string;
  declinedBy?: string;
  resolvedAt?: string | null;
  resolution?: string | null;
  resolutionNote?: string | null;
  createdAt?: string;

  // Digest bookkeeping. A report is emailed ONCE per audience — the app's
  // feedback strip is what nags persistently, so a daily re-send of the same
  // unhandled items would just train people to ignore the email.
  //
  // Two fields because a report reaches two audiences at different points in
  // its life: unresolved goes to the goal's admin, and if that admin routes it
  // onward as a follow-up it then goes to the rep's supervisor.
  adminDigestAt?: string | null;
  supervisorDigestAt?: string | null;
};

const REASON_LABELS: Record<string, string> = {
  not_interested: "Not interested",
  no_room: "No room",
  not_displayable: "Not displayable",
  cost_too_much: "Cost too much",
  other: "Other",
  help_building: "Help building the display",
  help_approval: "Help getting approval",
  help_product: "Need product or samples",
  help_other: "Something else",
};

const label = (key: string) => REASON_LABELS[key] ?? key;

const escapeHtml = (value: string) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    // Regex literal rather than a string: eslint's `quotes` rule wants double
    // quotes, prettier rewrites a double-quoted string containing a quote to
    // single quotes, and the two never agree. A regex avoids the argument.
    .replace(/"/g, "&quot;")
    .replaceAll("'", "&#039;");

const repName = (r: ReportDoc) =>
  `${r.userFirstName ?? ""} ${r.userLastName ?? ""}`.trim() || "A rep";

/** Group reports by goal, preserving a display title. */
const byGoal = (reports: ReportDoc[]) => {
  const map = new Map<string, { title: string; reports: ReportDoc[] }>();

  reports.forEach((r) => {
    const entry = map.get(r.goalId);
    if (entry) {
      entry.reports.push(r);
      return;
    }
    map.set(r.goalId, {
      title: r.goalTitle || "Untitled goal",
      reports: [r],
    });
  });

  return [...map.values()];
};

/** Compact per-goal block: what happened, at which accounts, by whom. */
const renderGoalBlock = (goal: { title: string; reports: ReportDoc[] }) => {
  const lines = goal.reports
    .slice(0, 8) // keep the email skimmable; the app has the full list
    .map((r) => {
      const keys = [...(r.reasonKeys ?? []), ...(r.helpKeys ?? [])]
        .map(label)
        .join(", ");

      const who = r.declinedBy
        ? ` &middot; spoke with ${escapeHtml(r.declinedBy)}`
        : "";

      return `<li style="margin-bottom:4px;">
        <strong>${escapeHtml(r.accountName || r.accountNumber || r.oppId || "Account")}</strong>
        &mdash; ${escapeHtml(keys)}
        <span style="color:#6b7280;">(${escapeHtml(repName(r))}${who})</span>
      </li>`;
    })
    .join("");

  const more =
    goal.reports.length > 8
      ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px;">
           +${goal.reports.length - 8} more in the app
         </p>`
      : "";

  return `
    <div style="margin:0 0 18px;">
      <p style="margin:0 0 6px;font-weight:600;">
        ${escapeHtml(goal.title)}
        <span style="font-weight:400;color:#6b7280;">
          &middot; ${goal.reports.length} account${goal.reports.length === 1 ? "" : "s"}
        </span>
      </p>
      <ul style="margin:0;padding-left:18px;font-size:14px;">${lines}</ul>
      ${more}
    </div>`;
};

const renderEmail = (opts: {
  heading: string;
  intro: string;
  goals: { title: string; reports: ReportDoc[] }[];
}) => `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:600px;">
    <h2 style="margin:0 0 4px;font-size:18px;">${opts.heading}</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:14px;">${opts.intro}</p>
    ${opts.goals.map(renderGoalBlock).join("")}
    <p style="margin:20px 0 0;">
      <a href="${APP_ORIGIN}/dashboard"
         style="background:#1976d2;color:#fff;padding:9px 16px;border-radius:6px;
                text-decoration:none;font-size:14px;display:inline-block;">
        Review in Displaygram
      </a>
    </p>
  </div>`;

const queueEmail = async (to: string, subject: string, html: string) => {
  await db.collection("mail").add({
    to,
    message: { subject, html },
    metadata: { kind: "goal_report_digest" },
  });
};

export const dailyGoalReportDigest = onSchedule(
  {
    // End of day, and timezone-aware so it doesn't drift with DST.
    schedule: "0 17 * * *",
    timeZone: "America/New_York",
  },
  async () => {
    // Reports nobody has decided on yet — the admin's queue.
    const openSnap = await db
      .collection("goalAccountReports")
      .where("resolvedAt", "==", null)
      .get();

    // Follow-ups an admin routed onward — the supervisor's queue.
    const followUpSnap = await db
      .collection("goalAccountReports")
      .where("resolution", "==", "follow_up")
      .get();

    // Only what hasn't been emailed to that audience yet. Filtered here
    // rather than in the query because Firestore can't match a missing field,
    // and the pending set is small enough that it doesn't matter.
    const open = openSnap.docs
      .map((d) => ({ ...(d.data() as ReportDoc), id: d.id }))
      .filter((r) => !r.adminDigestAt);

    const followUps = followUpSnap.docs
      .map((d) => ({ ...(d.data() as ReportDoc), id: d.id }))
      .filter((r) => !r.supervisorDigestAt);

    if (!open.length && !followUps.length) {
      logger.info("Digest: nothing new since the last send, skipping.");
      return;
    }

    // ---- Resolve the people involved -------------------------------
    const goalIds = new Set([...open, ...followUps].map((r) => r.goalId));
    const goalCreatorByGoalId = new Map<string, string>();

    await Promise.all(
      [...goalIds].map(async (goalId) => {
        // Checks companyGoals then galloGoals. Shared with the immediate
        // notification so both channels agree on who owns a goal. Goals
        // predating `createdByUserId` still have no admin recipient.
        const creator = await resolveGoalAdminUid(goalId);
        if (creator) goalCreatorByGoalId.set(goalId, creator);
      })
    );

    const repUids = new Set([...open, ...followUps].map((r) => r.userId));
    const userDocs = await Promise.all(
      [...repUids].map(async (uid) => {
        const snap = await db.doc(`users/${uid}`).get();
        return { uid, data: snap.data() };
      })
    );

    const supervisorByRepUid = new Map<string, string>();
    userDocs.forEach(({ uid, data }) => {
      const sup = data?.reportsTo ? String(data.reportsTo).trim() : "";
      if (sup) supervisorByRepUid.set(uid, sup);
    });

    // ---- Bucket reports per recipient ------------------------------
    const forAdmin = new Map<string, ReportDoc[]>();
    const forSupervisor = new Map<string, ReportDoc[]>();

    open.forEach((r) => {
      const adminUid = goalCreatorByGoalId.get(r.goalId);
      if (!adminUid) return;
      forAdmin.set(adminUid, [...(forAdmin.get(adminUid) ?? []), r]);
    });

    followUps.forEach((r) => {
      const supUid = supervisorByRepUid.get(r.userId);
      if (!supUid) return;
      forSupervisor.set(supUid, [...(forSupervisor.get(supUid) ?? []), r]);
    });

    // ---- Send, one email per person --------------------------------
    const emailFor = async (uid: string) => {
      const snap = await db.doc(`users/${uid}`).get();
      const data = snap.data();
      if (!data?.email) return null;
      if ((data.status ?? "active") !== "active") return null;
      return String(data.email);
    };

    let sent = 0;
    const now = new Date().toISOString();

    // Marked only after the email is queued, so a failure mid-run leaves the
    // report undigested and it goes out tomorrow rather than vanishing.
    const markDigested = async (
      reports: ReportDoc[],
      field: "adminDigestAt" | "supervisorDigestAt"
    ) => {
      const CHUNK = 450;
      for (let i = 0; i < reports.length; i += CHUNK) {
        const batch = db.batch();
        reports.slice(i, i + CHUNK).forEach((r) => {
          batch.update(db.doc(`goalAccountReports/${r.id}`), { [field]: now });
        });
        await batch.commit();
      }
    };

    for (const [adminUid, reports] of forAdmin) {
      const to = await emailFor(adminUid);
      if (!to) continue;

      const goals = byGoal(reports);
      await queueEmail(
        to,
        `${reports.length} account${
          reports.length === 1 ? "" : "s"
        } need your review`,
        renderEmail({
          heading: "Feedback waiting on you",
          intro: `Reps reported issues on ${goals.length} goal${
            goals.length === 1 ? "" : "s"
          } you created. Nothing has been decided yet.`,
          goals,
        })
      );

      await markDigested(reports, "adminDigestAt");
      sent += 1;
    }

    for (const [supUid, reports] of forSupervisor) {
      const to = await emailFor(supUid);
      if (!to) continue;

      const goals = byGoal(reports);
      await queueEmail(
        to,
        `${reports.length} follow-up${
          reports.length === 1 ? "" : "s"
        } for your team`,
        renderEmail({
          heading: "Follow-ups for your team",
          intro: "An admin asked you to work through these with your reps.",
          goals,
        })
      );

      await markDigested(reports, "supervisorDigestAt");
      sent += 1;
    }

    logger.info(
      `Digest sent: ${sent} email(s) — ${forAdmin.size} admin, ` +
        `${forSupervisor.size} supervisor.`
    );
  }
);
