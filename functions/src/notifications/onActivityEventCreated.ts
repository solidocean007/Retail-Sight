import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

if (!admin.apps.length) admin.initializeApp();

/**
 * Intakes activityEvents and fans out notifications to users.
 * Cloud Function #1 in the pipeline.
 *
 * This creates in-app notification docs. Your existing
 * onUserNotificationCreated.ts handles push notifications.
 */
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
    } = data;

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      console.warn("ActivityEvent missing targetUserIds[]:", data);
      return;
    }

    const db = admin.firestore();

    // Create notification text
    let title = "";
    let message = "";

    switch (type) {
      case "post.like":
        title = `${actorName} liked your post`;
        message = "Tap to view the post.";
        break;

      case "post.comment":
        title = `${actorName} commented on your post`;
        message = data.commentText
          ? data.commentText.slice(0, 120)
          : "Tap to view the comment.";
        break;

      case "post.commentLike":
        title = `${actorName} liked your comment`;

        // Use real comment text when available
        message = data.commentText
          ? data.commentText.slice(0, 120)
          : "Tap to view the comment.";

        break;

      case "post.mention":
        title = `${actorName} mentioned you`;
        message = data.goalDescription
          ? data.goalDescription.slice(0, 120)
          : "You have a new goal assignment.";

        break;

      case "goal.assignment":
        title = "New Goal Assigned";
        message = `${actorName} assigned you a goal: ${data.goalTitle}`;
        break;

      default:
        console.warn("Unhandled activity type:", type, data);
        return;
    }

    // Write a notification document for each target user
    const writes = targetUserIds.map((uid: string) =>
      db.collection(`users/${uid}/notifications`).add({
        title,
        message,
        type,
        postId: postId || null,
        commentId: commentId || null,

        actorUserId, // 👈 REQUIRED
        actorName, // 👈 also needed for UI

        readBy: [],
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(writes);
  }
);
