import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const updatePostWithNewTimestamp = async (postId : string) => {
  try {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      timestamp: serverTimestamp() // Update the timestamp field
    });
  } catch (error) {
    console.error("Error updating post:", error);
  }
};
