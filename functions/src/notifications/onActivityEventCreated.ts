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
  | "goal.assignment";

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

      default:
        console.warn("Unhandled activity type:", type, data);
        return;
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
