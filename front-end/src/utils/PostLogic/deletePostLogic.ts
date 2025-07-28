import {
  deleteDoc,
  doc,
  updateDoc,
  arrayRemove,
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

export const 

userDeletePost = async ({ post }: userDeletePostProps) => {
  // const storage = getStorage();

  try {
    // ✅ Update timestamp of post that is being changed
    await updatePostWithNewTimestamp(post.id);

    // ✅ Delete post document from 'posts' collection
    const postRef = doc(db, "posts", post.id);
    await deleteDoc(postRef);

    // ✅ Remove from IndexedDB
    await removePostFromIndexedDB(post.id);
    await deleteUserCreatedPostInIndexedDB(post.id);

    // ✅ Delete post's image from Firebase Storage
    if (post.imageUrl) {
      const imageRef = ref(storage, post.imageUrl);
      await deleteObject(imageRef);
    }

    // // ✅ Remove post ID from 'channels' collection
    // if (post.channel) {
    //   const channelRef = doc(db, "channels", post.channel);
    //   await updateDoc(channelRef, {
    //     postIds: arrayRemove(post.id),
    //   });
    // }

    // // ✅ Remove post ID from 'categories' collection
    // if (post.category) {
    //   const categoryRef = doc(db, "categories", post.category);
    //   await updateDoc(categoryRef, {
    //     postIds: arrayRemove(post.id),
    //   });
    // }

    // ✅ 🔥 Now clean up from goal's submittedPosts if applicable
    if (post.companyGoalId) {
      const goalRef = doc(db, "companyGoals", post.companyGoalId);
      const goalSnap = await getDoc(goalRef);

      if (goalSnap.exists()) {
        const goalData = goalSnap.data();
        const updatedSubmittedPosts = (goalData.submittedPosts || []).filter(
          (submission: any) => submission.postId !== post.id,
        );

        await updateDoc(goalRef, {
          submittedPosts: updatedSubmittedPosts,
        });

        console.log(
          `✅ Removed post ${post.id} from company goal ${post.companyGoalId}`,
        );
      } else {
        console.warn(
          `⚠️ Goal ${post.companyGoalId} not found while cleaning submittedPosts`,
        );
      }
    }
  } catch (error) {
    console.error("❌ Error deleting post:", error);
    throw error; // Rethrow to handle in UI or retry
  }
};
