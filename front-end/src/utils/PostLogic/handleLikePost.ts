// utils/PostLogic/handleLikePost.ts

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
import { PostWithID, UserType } from "../types";
import { updatePost } from "../../Slices/postsSlice";
import { updatePostInFilteredSets, updatePostInIndexedDB } from "../database/indexedDBUtils";
import { AppDispatch } from "../store";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";

/**
 * Handles liking/unliking a post.
 * All notification logic now flows through Cloud Functions using activityEvents.
 */
export const handleLikePost = async (
  post: PostWithID,
  user: UserType,
  liked: boolean,
  dispatch: AppDispatch
) => {
  try {
    const postRef = doc(db, "posts", post.id);

    // Normalized likes array
    const currentLikes = Array.isArray(post.likes) ? post.likes : [];

    const likeMutation = liked ? arrayUnion(user.uid) : arrayRemove(user.uid);

    // 1️⃣ Update Firestore likes array
    await updateDoc(postRef, { likes: likeMutation });

    // 2️⃣ Update Redux + IndexedDB snapshot
    const updatedLikes = liked
      ? [...currentLikes, user.uid]
      : currentLikes.filter((uid) => uid !== user.uid);

    const updatedPost: PostWithID = {
      ...post,
      likes: updatedLikes,
    };

    dispatch(updatePost(updatedPost));
    await updatePostInIndexedDB(updatedPost);
    await updatePostInFilteredSets(updatedPost);

    // 3️⃣ Trigger activity event for Cloud Functions (ONLY when liking)
    if (liked) {
      // Determine notification recipients
      // Usually the post owner, but more advanced rules could be added here.
      const targetUserIds: string[] = [];
      if (post.postUser?.uid) targetUserIds.push(post.postUser.uid);

      // Could expand here:
      // - notify supervisors
      // - notify connected companies
      // - notify tagged users
      // - notify everyone with a role
      // The CF will iterate targetUserIds.

      await addDoc(collection(db, "activityEvents"), {
        type: "post.like",
        postId: post.id,
        actorUserId: user.uid,
        actorName: `${user.firstName} ${user.lastName}`,
        targetUserIds, // ARRAY of recipients
        createdAt: serverTimestamp(),
      });
    }

    // 4️⃣ Update ordering timestamp
    await updatePostWithNewTimestamp(post.id);

  } catch (error) {
    console.error("Error updating likes:", error);
  }
};

