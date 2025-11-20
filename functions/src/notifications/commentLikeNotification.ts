// functions/src/notifications/commentLikeNotification.ts

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendNotification, admin } from "./sendNotification";

export const commentLikeNotification = onDocumentCreated(
  "commentLikes/{likeId}",
  async (event) => {
    const like = event.data?.data() as any;
    if (!like) return;

    const { postId, commentId, userId: likerUid, userName: likerName } = like;
    if (!postId || !commentId || !likerUid) return;

    // Fetch the comment to determine the comment's author
    const commentSnap = await admin
      .firestore()
      .doc(`comments/${commentId}`)
      .get();
    if (!commentSnap.exists) return;

    const comment = commentSnap.data() as any;
    const commentAuthorUid: string | undefined = comment.userId;

    if (!commentAuthorUid) return;

    // Prevent self-like notifications
    if (commentAuthorUid === likerUid) return;

    // Fetch comment author's company (optional if stored in `users`)
    const userSnap = await admin
      .firestore()
      .doc(`users/${commentAuthorUid}`)
      .get();
    const userData = userSnap.exists ? userSnap.data() : null;

    const commentAuthorCompanyId =
      userData?.companyId || userData?.company || null;

    await sendNotification({
      type: "comment-like",
      message: `${likerName} liked your comment`,
      postId,
      recipientUserIds: [commentAuthorUid],
      recipientCompanyIds: commentAuthorCompanyId
        ? [commentAuthorCompanyId]
        : [],
      sentByUid: likerUid,
      extra: {
        commentId,
      },
    });
  }
);
