// utils/PostLogic/handleLikePost.ts

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

import { db } from "../firebase";
import { PostWithID, UserType } from "../types";
import { updatePost } from "../../Slices/postsSlice";
import { updatePostInIndexedDB } from "../database/indexedDBUtils";
import { AppDispatch } from "../store";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";

/**
 * Handles liking/unliking a post.
 * Frontend updates post document *and* creates/deletes a postLikes/{id} document.
 * Cloud Functions will generate notifications.
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

    // 1️⃣ Update Firestore post.likes array
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

    // 3️⃣ Write to postLikes/{id} for backend notification triggers
    const postLikesCol = collection(db, "postLikes");

    if (liked) {
      // Create a new like record
      await addDoc(postLikesCol, {
        postId: post.id,
        userId: user.uid,
        userName: `${user.firstName} ${user.lastName}`,
        createdAt: serverTimestamp(),
      });
    } else {
      // Unlike → delete any existing postLikes entry
      const q = query(
        postLikesCol,
        where("postId", "==", post.id),
        where("userId", "==", user.uid)
      );

      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }

    // 4️⃣ Update timestamp for feed ordering
    await updatePostWithNewTimestamp(post.id);
  } catch (error) {
    console.error("Error updating likes:", error);
  }
};
