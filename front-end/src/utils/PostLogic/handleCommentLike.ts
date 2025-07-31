// handleLikeComment.ts
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { CommentType, NotificationType, PostWithID, UserType } from "../types";
import { sendNotification } from "../../thunks/notificationsThunks";
import { db } from "../firebase";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";

export const handleCommentLike = async ({
  comment,
  post,
  user,
  liked,
}: {
  comment: CommentType;
  post: PostWithID;
  user: UserType;
  liked: boolean;
}) => {
  const commentId = comment.commentId;
  await updatePostWithNewTimestamp(post.id);
  const commentRef = doc(db, "comments", commentId);
  const isSelf = user.uid === comment.userId;

  try {
    // ✅ 1. Update Firestore comment likes
    await updateDoc(commentRef, {
      likes: liked ? arrayUnion(user.uid) : arrayRemove(user.uid),
    });

    // ✅ 2. Notification logic
    if (liked && !isSelf && post.postedByUid) {
      const notif: NotificationType = {
        id: "",
        title: "Like on Your Comment",
        message: `${user.firstName} ${user.lastName} liked your comment on: ${
          post.accountName || "a store"
        }`,
        sentAt: Timestamp.now(),
        sentBy: user,
        recipientUserIds: [post.postedByUid],
        recipientCompanyIds: [],
        recipientRoles: [],
        readBy: [],
        priority: "low",
        pinned: false,
        type: "like",
        postId: post.id,
        commentId: comment.commentId,
      };

      await sendNotification({ notification: notif } as any);
    }

    // ✅ 3. Remove notification if unliked
    if (!liked && !isSelf) {
      const snap = await getDocs(
        query(
          collection(db, "notifications"),
          where("sentBy.uid", "==", user.uid),
          where("recipientUserIds", "array-contains", comment.userId),
          where("postId", "==", post.id),
          where("commentId", "==", comment.commentId),
          where("type", "==", "like")
        )
      );

      snap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });
    }
  } catch (error) {
    console.error("Failed to like/unlike comment:", error);
  }
};
