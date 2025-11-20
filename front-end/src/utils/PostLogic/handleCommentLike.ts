// utils/PostLogic/handleCommentLike.ts

import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { CommentType, PostWithID, UserType } from "../types";
import { db } from "../firebase";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";

/**
 * Handles liking/unliking a comment.
 * Frontend updates comment likes + writes to commentLikes/{id}
 * Cloud Functions will generate the notification.
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
  try {
    if (!comment.commentId) {
      console.error("Comment missing commentId:", comment);
      return;
    }

    const commentRef = doc(db, "comments", comment.commentId);

    const likeMutation = liked ? arrayUnion(user.uid) : arrayRemove(user.uid);

    // 1️⃣ Update comment.likes array
    await updateDoc(commentRef, { likes: likeMutation });

    // 2️⃣ Write to commentLikes for backend triggers
    const commentLikesCol = collection(db, "commentLikes");

    if (liked) {
      await addDoc(commentLikesCol, {
        postId: post.id,
        commentId: comment.commentId,
        userId: user.uid,
        userName: `${user.firstName} ${user.lastName}`,
        createdAt: serverTimestamp(),
      });
    } else {
      // Unlike → delete any existing like record
      const q = query(
        commentLikesCol,
        where("commentId", "==", comment.commentId),
        where("userId", "==", user.uid)
      );

      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }

    // 3️⃣ Update post timestamp so feed reorders
    await updatePostWithNewTimestamp(post.id);
  } catch (error) {
    console.error("Failed to like/unlike comment:", error);
  }
};
