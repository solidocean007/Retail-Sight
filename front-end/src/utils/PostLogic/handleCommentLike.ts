// utils/PostLogic/handleCommentLike.ts

import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase";
import { PostWithID, CommentType, UserType } from "../types";

/**
 * Handles liking/unliking a comment.
 * Writes activityEvents so Cloud Functions fan-out the notifications.
 */
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
  // Guard: we must have the commentId
  if (!comment.commentId) {
    console.error("Comment missing commentId:", comment);
    return;
  }

  try {
    const commentRef = doc(db, "comments", comment.commentId);

    // 1️⃣ Update likes array
    const likeMutation = liked ? arrayUnion(user.uid) : arrayRemove(user.uid);
    await updateDoc(commentRef, { likes: likeMutation });

    // 2️⃣ Send activity event only when liking
    if (liked) {
      const targetUserIds: string[] = [];

      // Notify the author (but not if they liked their own comment)
      if (comment.userId && comment.userId !== user.uid) {
        targetUserIds.push(comment.userId);
      }

      if (targetUserIds.length > 0) {
        await addDoc(collection(db, "activityEvents"), {
          type: "post.commentLike",
          postId: post.id,
          commentId: comment.commentId,

          actorUserId: user.uid,
          actorName: `${user.firstName} ${user.lastName}`,

          // optional bonus: makes push previews better
          commentText: comment.text ?? "",

          targetUserIds,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error("Error updating comment like:", error);
  }
};
