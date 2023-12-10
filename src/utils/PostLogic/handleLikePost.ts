// handleLilkePost.ts
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase";

export const handleLikePost = async (postId: string, userId: string, liked?: boolean) => {
  const postRef = doc(db, "posts", postId);
  console.log(postId, userId, liked)
  try {
    if (!liked) {
      console.log(postRef)
      // Remove the user ID from the likes array if already liked
      await updateDoc(postRef, {
        likes: arrayRemove(userId)
      });
    } else {
      console.log(postRef, " :postRef")
      // Add the user ID to the likes array if not liked yet
      await updateDoc(postRef, {
        likes: arrayUnion(userId)
      });
    }
  } catch (error) {
    console.error("Error updating likes:", error);
    // Handle the error as needed
  }
};
