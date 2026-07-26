import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendEmailNotificationCore } from "./sendEmailNotificationCore";

if (!admin.apps.length) admin.initializeApp();

const APP_ORIGIN = "https://displaygram.com";

type ActivityEventType =
  | "post.like"
  | "post.comment"
  | "post.commentLike"
  | "post.mention"
  | "goal.assignment"
  | "goal.reportResolved";

const db = admin.firestore();

/**
 * Returns users whose email notification setting is enabled.
 *
 * Defaults to enabled when the setting is missing so older users
 * receive important notification emails unless they opt out.
 */
async function getUsersWithEmailSettingEnabled(
  userIds: string[],
  settingKey: "emailComments" | "emailGoalAssignments"
): Promise<string[]> {
  const enabledUserIds: string[] = [];

  for (const uid of userIds) {
    const settingsSnap = await db
      .doc(`users/${uid}/notificationSettings/settings`)
      .get();

    const settings = settingsSnap.exists ? settingsSnap.data() : null;

    // Enabled by default:
    // undefined => enabled
    // true => enabled
    // false => disabled
    if (settings?.[settingKey] !== false) {
      enabledUserIds.push(uid);
    }
  }

  return enabledUserIds;
}

/**
 * Store name + truncated brand list for a post, e.g.
 * "Circle K #204 · Modelo, Corona +2 more" — used to give
 * notifications context about which display they refer to.
 */
async function getPostContext(postId?: string): Promise<string | null> {
  if (!postId) return null;

  try {
    const snap = await db.doc(`posts/${postId}`).get();
    if (!snap.exists) return null;

    const post = snap.data() as {
      accountName?: string;
      brands?: string[];
    };

    const parts: string[] = [];
    if (post.accountName) parts.push(post.accountName);

    const brands = (post.brands || []).filter(Boolean);
    if (brands.length) {
      parts.push(
        brands.slice(0, 2).join(", ") +
          (brands.length > 2 ? ` +${brands.length - 2} more` : "")
      );
    }

    return parts.length ? parts.join(" · ") : null;
  } catch (err) {
    console.warn("getPostContext failed:", err);
    return null;
  }
}

export const onActivityEventCreated = onDocumentCreated(
  "activityEvents/{eventId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const {
      type,
      postId,
      commentId,
      actorUserId,
      actorName,
      targetUserIds = [],
    } = data as {
      type: ActivityEventType;
      postId?: string;
      commentId?: string;
      actorUserId?: string;
      actorName?: string;
      targetUserIds?: string[];
      commentText?: string;
      goalDescription?: string;
      goalTitle?: string;
    };

    const cleanedTargetUserIds = targetUserIds.filter(
      (uid) => uid && uid !== actorUserId
    );

    if (cleanedTargetUserIds.length === 0) {
      console.warn("ActivityEvent has no valid recipients:", data);
      return;
    }

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      console.warn("ActivityEvent missing targetUserIds[]:", data);
      return;
    }

    const safeActorName = actorName || "Someone";

    let title = "";
    let message = "";

    switch (type) {
      case "post.like":
        title = `${safeActorName} liked your post`;
        message = "Tap to view the post.";
        break;

      case "post.comment":
        title = `${safeActorName} commented on your post`;
        message = data.commentText
          ? String(data.commentText).slice(0, 120)
          : "Tap to view the comment.";
        break;

      case "post.commentLike":
        title = `${safeActorName} liked your comment`;
        message = data.commentText
          ? String(data.commentText).slice(0, 120)
          : "Tap to view the comment.";
        break;

      case "post.mention":
        title = `${safeActorName} mentioned you`;
        message = data.goalDescription
          ? String(data.goalDescription).slice(0, 120)
          : "You were mentioned.";
        break;

      case "goal.assignment":
        title = "New Goal Assigned";
        message = `${safeActorName} assigned you a goal: ${data.goalTitle}`;
        break;

      case "goal.reportResolved":
        // Handled by the coalescing block below, which builds its own title
        // and message per recipient. This case exists only so the type
        // doesn't fall through to `default` and bail out.
        break;

      default:
        console.warn("Unhandled activity type:", type, data);
        return;
    }

    // ------------------------------------------------------------------
    // Goal report decisions get COALESCED, not fanned out per event.
    //
    // An admin working through fifteen accounts one at a time would
    // otherwise fire fifteen notifications at one rep. Instead, the
    // notification id is deterministic per recipient + goal + day, so
    // repeat activity updates a single notification and its count grows.
    // The detail lives in the app; the notification's job is only to say
    // that something happened.
    // ------------------------------------------------------------------
    if (type === "goal.reportResolved") {
      const goalId = String(data.goalId ?? "");
      const goalTitleText = String(data.goalTitle ?? "the goal");
      const isFollowUp = data.resolution === "follow_up";
      const newCount =
        Number(data.accountCount) ||
        (Array.isArray(data.accountNames) ? data.accountNames.length : 1);

      // Bucket by Eastern date, matching the 5pm digest. A UTC date would
      // roll over at 8pm ET and split one evening's work across two
      // notifications.
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
      }).format(new Date());
      const nowTs = admin.firestore.FieldValue.serverTimestamp();

      // The rep always hears the outcome. The supervisor hears about it too,
      // but only when work is actually being routed to them — they're the
      // party expected to act, and were previously the least informed party
      // in the whole loop.
      //
      // Keyed by uid so a supervisor who is also a target of the same event
      // gets one notification, not two writes racing on the same document.
      // Supervisor wins the tie: it's the more actionable framing.
      const recipients = new Map<string, "rep" | "supervisor">();
      for (const uid of cleanedTargetUserIds) recipients.set(uid, "rep");

      if (isFollowUp) {
        for (const repUid of cleanedTargetUserIds) {
          try {
            const repSnap = await db.doc(`users/${repUid}`).get();
            const supUid = String(repSnap.data()?.reportsTo ?? "").trim();
            if (supUid && supUid !== actorUserId) {
              recipients.set(supUid, "supervisor");
            }
          } catch (err) {
            console.warn(`Could not resolve supervisor for ${repUid}`, err);
          }
        }
      }

      const onlyAccountName =
        Array.isArray(data.accountNames) && data.accountNames.length === 1
          ? String(data.accountNames[0])
          : null;

      await Promise.all(
        Array.from(recipients.entries()).map(async ([uid, role]) => {
          const notificationId = `goalreport_${goalId}_${uid}_${day}`;
          const ref = db.doc(`users/${uid}/notifications/${notificationId}`);

          // Transaction, not a plain read-then-write: an admin clicking
          // through accounts quickly fires overlapping invocations, and a
          // lost update here would undercount the accounts in the message.
          await db.runTransaction(async (tx) => {
            const existing = await tx.get(ref);
            const prior = Number(existing.data()?.accountCount ?? 0);
            const total = prior + newCount;

            const subject =
              total === 1 && onlyAccountName
                ? onlyAccountName
                : `${total} accounts`;

            const nextTitle =
              role === "supervisor"
                ? "Accounts need your follow-up"
                : isFollowUp
                  ? "Follow-up on your feedback"
                  : "Your feedback was accepted";

            const nextMessage =
              role === "supervisor"
                ? `${safeActorName} asked you to follow up on ${subject} for ${goalTitleText}.`
                : isFollowUp
                  ? `${safeActorName} asked your supervisor to follow up on ${subject}.`
                  : `${subject} removed from ${goalTitleText}.`;

            tx.set(
              ref,
              {
                id: notificationId,
                userId: uid,
                title: nextTitle,
                message: nextMessage,
                type,
                intent: "activity",
                priority: "normal",
                link: `${APP_ORIGIN}/notifications`,
                actorUserId: actorUserId || null,
                actorName: safeActorName,
                goalId,
                accountCount: total,
                // Re-open it: later activity on the same day shouldn't hide
                // under an already-read notification. createdAt is bumped so
                // the refreshed item resurfaces at the top of the list rather
                // than staying buried where the first one landed.
                readAt: null,
                createdAt: nowTs,
                firstSeenAt: existing.exists
                  ? (existing.data()?.firstSeenAt ?? nowTs)
                  : nowTs,
                updatedAt: nowTs,
                deliveredVia: { inApp: nowTs },
              },
              { merge: true }
            );
          });
        })
      );

      return;
    }

    // Add display context (store · brands) to post-related notifications
    const postContext = await getPostContext(postId);
    if (postContext) {
      const isPlaceholder =
        message === "Tap to view the post." ||
        message === "Tap to view the comment.";
      message = isPlaceholder ? postContext : `${message} — ${postContext}`;
    }

    const link = postId
      ? `${APP_ORIGIN}/p/${postId}`
      : `${APP_ORIGIN}/notifications`;

    const now = admin.firestore.FieldValue.serverTimestamp();

    // -----------------------------
    // Fan out in-app notifications
    // -----------------------------
    const writes = cleanedTargetUserIds.map((uid: string) => {
      const notificationId = `${event.id}_${uid}`;
      const ref = db.doc(`users/${uid}/notifications/${notificationId}`);

      return ref.set(
        {
          id: notificationId,
          userId: uid,

          title,
          message,

          type,
          intent: "activity",
          priority: "normal",

          postId: postId || null,
          commentId: commentId || null,
          link,

          actorUserId: actorUserId || null,
          actorName: safeActorName,

          createdAt: now,

          deliveredVia: {
            inApp: now,
          },
        },
        { merge: false }
      );
    });

    await Promise.all(writes);

    // -----------------------------
    // Email delivery for comments
    // -----------------------------
    if (type === "post.comment") {
      const emailRecipients = await getUsersWithEmailSettingEnabled(
        cleanedTargetUserIds,
        "emailComments"
      );

      if (emailRecipients.length > 0) {
        const link = postId
          ? `${APP_ORIGIN}/p/${postId}`
          : `${APP_ORIGIN}/notifications`;

        await sendEmailNotificationCore({
          title,
          message,
          link,
          notificationId: event.id,
          recipientUserIds: emailRecipients,
        });

        await Promise.all(
          emailRecipients.map((uid) => {
            const notificationId = `${event.id}_${uid}`;

            return db.doc(`users/${uid}/notifications/${notificationId}`).set(
              {
                deliveredVia: {
                  email: admin.firestore.FieldValue.serverTimestamp(),
                },
              },
              { merge: true }
            );
          })
        );
      }
    }
  }
);
