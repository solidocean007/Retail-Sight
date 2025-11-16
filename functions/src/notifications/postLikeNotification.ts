// functions/src/notifications/postLikeNotification.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendNotification, admin } from "./sendNotification";

export const postLikeNotification = onDocumentCreated(
  "postLikes/{likeId}",
  async (event) => {
    const like = event.data?.data() as any;
    if (!like) return;

    const { postId, userId: likerUid, userName: likerName } = like;
    if (!postId || !likerUid) return;

    // Fetch post (only lookup required)
    const postSnap = await admin.firestore().doc(`posts/${postId}`).get();
    if (!postSnap.exists) return;

    const post = postSnap.data() as any;
    const postOwnerUid = post.postUser?.uid;
    const postOwnerCompanyId = post.postUser?.company; // string in your schema

    if (!postOwnerUid) return;

    // Prevent self-like notification
    if (postOwnerUid === likerUid) return;

    await sendNotification({
      type: "post-like",
      message: `${likerName} liked your post`,
      postId,
      recipientUserIds: [postOwnerUid],
      recipientCompanyIds: postOwnerCompanyId ? [postOwnerCompanyId] : [],
      sentByUid: likerUid,
    });
  }
);
