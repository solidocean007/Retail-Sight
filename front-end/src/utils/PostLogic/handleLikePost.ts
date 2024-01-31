// handleLikePost.ts
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { PostWithID } from "../types";
import { updatePost } from "../../Slices/postsSlice";
import { updatePostInIndexedDB } from "../database/indexedDBUtils";
import { AppDispatch } from "../store";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";

// handleLikePost.ts
export const handleLikePost = async (
  post: PostWithID, 
  userId: string, 
  liked: boolean, 
  dispatch: AppDispatch
) => {
  try {
    // Update the timestamp of the post
    await updatePostWithNewTimestamp(post.id);

    // Update the likes array
    const updatedLikes = liked ? arrayUnion(userId) : arrayRemove(userId);
    await updateDoc(doc(db, "posts", post.id), { likes: updatedLikes });

    // Prepare the updated post object for Redux and IndexedDB
    const updatedPost = { 
      ...post, 
      likes: liked 
        ? [...(post.likes || []), userId]
        : (post.likes || []).filter(uid => uid !== userId)
      // Assume the timestamp update was successful
    };

    // Dispatch to Redux
    dispatch(updatePost(updatedPost));

    // Update in IndexedDB
    await updatePostInIndexedDB(updatedPost);
    
  } catch (error) {
    console.error("Error updating likes:", error);
  }
};