import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

if (!admin.apps.length) admin.initializeApp();

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

    // -----------------------------
    // Build notification content
    // -----------------------------
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
        message = data.commentText
          ? data.commentText.slice(0, 120)
          : "Tap to view the comment.";
        break;

      case "post.mention":
        title = `${actorName} mentioned you`;
        message = data.goalDescription
          ? data.goalDescription.slice(0, 120)
          : "You were mentioned.";
        break;

      case "goal.assignment":
        title = "New Goal Assigned";
        message = `${actorName} assigned you a goal: ${data.goalTitle}`;
        break;

      default:
        console.warn("Unhandled activity type:", type, data);
        return;
    }

    // -----------------------------
    // Fan out per user (idempotent)
    // -----------------------------
    const writes = targetUserIds.map((uid: string) => {
      const notificationId = `${event.id}_${uid}`;
      const ref = db.doc(`users/${uid}/notifications/${notificationId}`);

      return ref.set(
        {
          id: notificationId,
          userId: uid,

          title,
          message,

          type, // activity type (post.like, etc.)
          intent: "activity", // ✅ REQUIRED
          priority: "normal", // delivery quality only

          postId: postId || null,
          commentId: commentId || null,

          actorUserId,
          actorName,

          createdAt: admin.firestore.FieldValue.serverTimestamp(),

          deliveredVia: {
            inApp: admin.firestore.FieldValue.serverTimestamp(),
          },
        },
        { merge: false }
      );
    });

    await Promise.all(writes);
  }
);
