import { deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { PostWithID } from "../types";
import { db, storage } from "../firebase";
import {
  deleteUserCreatedPostInIndexedDB,
  purgeDeletedPostFromFilteredSets,
  removePostFromIndexedDB,
} from "../database/indexedDBUtils";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";
import { deletePost } from "../../Slices/postsSlice";

interface userDeletePostProps {
  post: PostWithID;
  dispatch: any; // ✅ allow passing in the dispatch
}

export const userDeletePost = async ({
  post,
  dispatch,
}: userDeletePostProps) => {
  try {
    // ✅ Optimistically remove from Redux
    dispatch(deletePost(post.id));

    // ✅ Update timestamp (optional if used for analytics)
    await updatePostWithNewTimestamp(post.id);

    // ✅ Delete Firestore doc
    const postRef = doc(db, "posts", post.id);
    await deleteDoc(postRef);

    // ✅ Clean up IndexedDB
    await removePostFromIndexedDB(post.id);
    await deleteUserCreatedPostInIndexedDB(post.id);
    await purgeDeletedPostFromFilteredSets(post.id);

    // ✅ Delete image if exists
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
      }
    }

    // ✅ Remove from Gallo goal
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
      }
    }

    console.log(
      `✅ Post ${post.id} fully deleted from Firestore, Redux, and cache`
    );
  } catch (error) {
    console.error("❌ Error deleting post:", error);
    throw error;
  }
};
