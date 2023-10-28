import { PostType } from "../types";
import { doc, updateDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { updatedPost } from "../../Slices/postsSlice";

export const handleSavePost = async (updatedPost: PostType) => {
  const postRef = doc(collection(db, "posts"), updatedPost.id);
  try {
    await updateDoc(postRef, updatedPost);
    dispatch(updatePost(updatedPost));
    console.log("Post updated successfully");
    handleCloseEditModal();
  } catch (error) {
    console.error("Error updating post: ", error);
  }
};