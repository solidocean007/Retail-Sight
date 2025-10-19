// utils/PostLogic/duplicatePostWithNewGoal.ts
import {
  addDoc,
  collection,
  Timestamp,
} from "firebase/firestore";
import { showMessage } from "../../Slices/snackbarSlice";
import { PostWithID } from "../types";
import { AppDispatch } from "../store";
import { db } from "../firebase";
import { mergeAndSetPosts } from "../../Slices/postsSlice";
import { normalizePost } from "../normalizePost";
import { addPostsToIndexedDB } from "../database/postStoreUtils";
import { updateGoalWithSubmission } from "../helperFunctions/updateGoalWithSubmission";

export const duplicatePostWithNewGoal = async (
  originalPost: PostWithID,
  newGoalId: string,
  newGoalTitle: string,
  dispatch: AppDispatch
) => {
  try {
    const postToDuplicate = {
      ...originalPost,
      displayDate: new Date().toISOString(),
      companyGoalId: newGoalId,
      companyGoalTitle: newGoalTitle,
      timestamp: Timestamp.now(), // i need a brand new timestamp?
    };

    // Remove Firestore-managed fields
    delete (postToDuplicate as any).id; // if id isnt stored on the post is this just a fail-safe

    const docRef = await addDoc(collection(db, "posts"), postToDuplicate);

    const newPost = {
      ...postToDuplicate,
      id: docRef.id,
    };

    if (newGoalId) {
       await updateGoalWithSubmission(newPost, newPost.id);
    }

    // Optional: update Redux and IndexedDB
    dispatch(mergeAndSetPosts([normalizePost(newPost)]));
    await addPostsToIndexedDB([newPost]);

    dispatch(showMessage("Post duplicated for new goal."));
  } catch (error) {
    console.error("❌ Error duplicating post:", error);
    dispatch(showMessage("Failed to duplicate post."));
  }
};
