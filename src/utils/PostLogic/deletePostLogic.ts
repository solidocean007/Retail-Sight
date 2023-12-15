// deletePostLogic.ts
import {
  deleteDoc,
  doc,
  updateDoc,
  arrayRemove,
} from "firebase/firestore";
import { ref, deleteObject, getStorage } from "firebase/storage";
import { PostWithID } from "../types";
import { deletePost } from "../../Slices/postsSlice";
import { AnyAction } from "redux";
import { db } from "../firebase";
import { removePostFromIndexedDB } from "../database/indexedDBUtils";

interface userDeletePostProps {
  post: PostWithID;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dispatch: React.Dispatch<AnyAction>;
}

export const userDeletePost = async ({ post, setIsEditModalOpen, dispatch }: userDeletePostProps) => {
  // Optimistically remove the post from the UI
  dispatch(deletePost(post.id));

  const storage = getStorage();
  try {
    // Delete post from 'posts' collection
    const postRef = doc(db, "posts", post.id);
    await deleteDoc(postRef);
    // Remove from IndexedDB
    await removePostFromIndexedDB(post.id);

    // Delete post's image from Firebase Storage
    const imageRef = ref(storage, post.imageUrl); // corrected to post.imageUrl
    await deleteObject(imageRef);

    // Remove post ID from 'channels' collection
    if (post.channel) {
      const channelRef = doc(db, "channels", post.channel);
      await updateDoc(channelRef, {
        postIds: arrayRemove(post.id), // corrected to post.id
      });
    }

    // Remove post ID from 'categories' collection
    if (post.category) {
      const categoryRef = doc(db, "categories", post.category);
      await updateDoc(categoryRef, {
        postIds: arrayRemove(post.id), // corrected to post.id
      });
    }
    setIsEditModalOpen(false);
  } catch (error) {
    console.error("Error deleting post:", error);
    throw error; // re-throwing error so that you can handle it in UI or retry if necessary
  }
};
