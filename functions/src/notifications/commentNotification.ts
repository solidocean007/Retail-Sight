// functions/src/notifications/commentNotification.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { sendNotification, admin } from "./sendNotification";

export const commentNotification = onDocumentCreated(
  "comments/{commentId}",
  async (event) => {
    const comment = event.data?.data() as any;
    if (!comment) return;

    const postId: string = comment.postId;
    const commenterUid: string = comment.userId; // adjust if your field name differs
    const commenterName: string = comment.userName || "Someone";
    const text: string = comment.text || "";

    if (!postId || !commenterUid) return;

    const postSnap = await admin.firestore().doc(`posts/${postId}`).get();
    if (!postSnap.exists) return;

    const post = postSnap.data() as any;
    const postOwnerUid: string | undefined =
      post.postUser?.uid || post.postUserUid || post.userId;
    const postOwnerCompanyId: string | undefined =
      post.postUser?.companyId || post.companyId;

    if (!postOwnerUid) return;

    // 🚫 Prevent self-comment notification
    if (postOwnerUid === commenterUid) return;

    await sendNotification({
      type: "post-comment",
      message: `${commenterName} commented on your post`,
      postId,
      recipientUserIds: [postOwnerUid],
      recipientCompanyIds: postOwnerCompanyId ? [postOwnerCompanyId] : [],
      sentByUid: commenterUid,
      extra: {
        snippet: text.slice(0, 140),
      },
    });
  }
);
