import {
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { PostWithID } from "../types";
import { db, storage } from "../firebase";
import {
  deleteUserCreatedPostInIndexedDB,
  removePostFromIndexedDB,
} from "../database/indexedDBUtils";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";

interface userDeletePostProps {
  post: PostWithID;
}

export const userDeletePost = async ({ post }: userDeletePostProps) => {
  try {
    // ✅ Update timestamp
    await updatePostWithNewTimestamp(post.id);

    // ✅ Delete post document
    const postRef = doc(db, "posts", post.id);
    await deleteDoc(postRef);

    // ✅ Remove from IndexedDB
    await removePostFromIndexedDB(post.id);
    await deleteUserCreatedPostInIndexedDB(post.id);

    // ✅ Delete image from Firebase Storage
    if (post.imageUrl) {
      const imageRef = ref(storage, post.imageUrl);
      try {
        await deleteObject(imageRef);
      } catch (err) {
        console.warn(`⚠️ Could not delete image: ${post.imageUrl}`, err);
      }
    }

    // ✅ Remove from company goal
    if (post.companyGoalId) {
      const goalRef = doc(db, "companyGoals", post.companyGoalId);
      const goalSnap = await getDoc(goalRef);

      if (goalSnap.exists()) {
        const goalData = goalSnap.data();
        const submitted: any[] = Array.isArray(goalData.submittedPosts)
          ? goalData.submittedPosts
          : [];

        const updatedSubmittedPosts = submitted.filter(
          (s) => s.postId !== post.id
        );

        await updateDoc(goalRef, { submittedPosts: updatedSubmittedPosts });

        console.log(
          `✅ Removed post ${post.id} from company goal ${post.companyGoalId}`
        );
      } else {
        console.warn(
          `⚠️ Company goal ${post.companyGoalId} not found during cleanup`
        );
      }
    }

    // ✅ Remove from gallo goal
    if (post.oppId) {
      const galloGoalRef = doc(db, "galloGoals", post.oppId);
      const galloGoalSnap = await getDoc(galloGoalRef);

      if (galloGoalSnap.exists()) {
        const goalData = galloGoalSnap.data();
        const submitted: any[] = Array.isArray(goalData.submittedPosts)
          ? goalData.submittedPosts
          : [];

        const updated = submitted.filter((s) => s.postId !== post.id);
        await updateDoc(galloGoalRef, { submittedPosts: updated });

        console.log(`🧼 Removed post ${post.id} from gallo goal ${post.oppId}`);
      } else {
        console.warn(`⚠️ Gallo goal ${post.oppId} not found during cleanup`);
      }
    }
  } catch (error) {
    console.error("❌ Error deleting post:", error);
    throw error;
  }
};
