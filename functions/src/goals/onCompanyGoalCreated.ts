import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const clean = (value: unknown) => String(value ?? "").trim();

const escapeHtml = (value: unknown) =>
  clean(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Owns assignment fan-out after a company goal commits. The UI no longer
 * performs mail writes, so an email problem cannot turn a successful goal
 * creation into a misleading client-side failure or duplicate retry.
 */
export const onCompanyGoalCreated = onDocumentCreated(
  "companyGoals/{goalId}",
  async (event) => {
    const goal = event.data?.data();
    if (!goal) return;

    const goalId = event.params.goalId;
    const assignments = Array.isArray(goal.goalAssignments)
      ? goal.goalAssignments
      : [];
    const targetUserIds = [
      ...new Set(
        assignments
          .map((assignment: Record<string, unknown>) => clean(assignment.uid))
          .filter(Boolean)
      ),
    ];

    if (targetUserIds.length === 0) return;

    const actorUserId = clean(goal.createdByUserId);
    const goalCompanyId = clean(goal.companyId);
    const actorName =
      `${clean(goal.createdByFirstName)} ${clean(goal.createdByLastName)}`.trim() ||
      "Your company";
    const goalTitle = clean(goal.goalTitle) || "New goal";
    const goalDescription = clean(goal.goalDescription);
    const sendEmail = goal.notifications?.emailOnCreate === true;
    const emailHtml = [
      "<div style='font-family: sans-serif; font-size: 15px; color: #333;'>",
      "<p>You have been assigned a new goal:</p>",
      `<h3>${escapeHtml(goalTitle)}</h3>`,
      `<p>${escapeHtml(goalDescription)}</p>`,
      `<p><strong>Start:</strong> ${escapeHtml(goal.goalStartDate)}<br/>`,
      `<strong>End:</strong> ${escapeHtml(goal.goalEndDate)}</p>`,
      "</div>",
    ].join("");

    await Promise.all(
      targetUserIds.map(async (targetUserId) => {
        const userSnap = await db.doc(`users/${targetUserId}`).get();
        const user = userSnap.data();

        // Goal assignment data is client-authored. Never fan notifications out
        // to a user outside the company that owns the goal.
        if (!userSnap.exists || clean(user?.companyId) !== goalCompanyId)
          return;

        await db
          .doc(`activityEvents/goal-assignment_${goalId}_${targetUserId}`)
          .set(
            {
              type: "goal.assignment",
              goalId,
              actorUserId,
              actorName,
              targetUserIds: [targetUserId],
              goalTitle,
              goalDescription,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: false }
          );

        if (!sendEmail) return;

        const email = clean(user?.email);
        if (!email) return;

        await db.doc(`mail/goal-assignment_${goalId}_${targetUserId}`).set(
          {
            to: email,
            from: "support@displaygram.com",
            category: "transactional",
            message: {
              subject: `New Goal Assigned: ${goalTitle}`,
              text: `You have been assigned a new goal.\n\n${goalTitle}\n\n${goalDescription}`,
              html: emailHtml,
            },
            goalId,
            companyId: goalCompanyId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: false }
        );
      })
    );
  }
);
