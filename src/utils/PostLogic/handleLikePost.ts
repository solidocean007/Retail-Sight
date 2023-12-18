// handleLikePost.ts
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";
import { PostWithID } from "../types";
import { updatePost } from "../../Slices/postsSlice";
import { updatePostInIndexedDB } from "../database/indexedDBUtils";
import { AppDispatch } from "../store";

// handleLikePost.ts
export const handleLikePost = async (
  post: PostWithID, 
  userId: string, 
  liked: boolean, 
  dispatch: AppDispatch // Generic type 'Dispatch' requires 1 type argument(s).
) => {
  try {
    const updatedLikes = liked ? arrayUnion(userId) : arrayRemove(userId);
    await updateDoc(doc(db, "posts", post.id), { likes: updatedLikes });

    // Update the post object for Redux and IndexedDB
    const updatedPost = { 
      ...post, 
      likes: liked 
        ? [...(post.likes || []), userId] // Provide a default empty array if likes are undefined
        : (post.likes || []).filter(uid => uid !== userId)
    };

    // Dispatch to Redux
    dispatch(updatePost(updatedPost));

    // Update in IndexedDB
    await updatePostInIndexedDB(updatedPost);
    
  } catch (error) {
    console.error("Error updating likes:", error);
    // Handle the error as needed
  }
};

