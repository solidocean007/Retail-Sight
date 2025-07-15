import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

export const updatePostWithNewTimestamp = async (postId: string) => {
  try {
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      timestamp: Timestamp.now(), // ✅ Save as Firestore Timestamp
    });
  } catch (error) {
    console.error("Error updating post timestamp:", error);
  }
};