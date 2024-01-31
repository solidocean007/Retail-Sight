// updatePostWithNewTimestamp.ts
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const updatePostWithNewTimestamp = async (postId: string) => {
  try {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      timestamp: new Date().toISOString(), // Save the timestamp as an ISO string
    });
  } catch (error) {
    console.error("Error updating post timestamp:", error);
  }
};