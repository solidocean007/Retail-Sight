// handleLikePost.ts
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { NotificationType, PostWithID } from "../types";
import { updatePost } from "../../Slices/postsSlice";
import { updatePostInIndexedDB } from "../database/indexedDBUtils";
import { AppDispatch } from "../store";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";
import { sendNotification } from "../../thunks/notificationsThunks";

// handleLikePost.ts
export const handleLikePost = async (
  post: PostWithID,
  user: UserType, // ⬅️ now passing full user
  liked: boolean,
  dispatch: AppDispatch
) => {
  try {
    await updatePostWithNewTimestamp(post.id);

    const updatedLikes = liked ? arrayUnion(user.uid) : arrayRemove(user.uid);
    await updateDoc(doc(db, "posts", post.id), { likes: updatedLikes });

    if (liked && user.uid !== post.postUser.uid) {
      const notif: NotificationType = {
        id: "",
        title: "New Like on Your Post",
        message: `${user.firstName} ${user.lastName} liked your post about ${
          post.accountName || "a store"
        }.`,
        sentAt: Timestamp.now(),
        sentBy: "system",
        recipientUserIds: [post.postUser.uid],
        recipientCompanyIds: [],
        recipientRoles: [],
        readBy: [],
        priority: "Low",
        pinned: false,
        type: "like",
      };

      dispatch(sendNotification({ notification: notif }));
    }

    const updatedPost = {
      ...post,
      likes: liked
        ? [...(post.likes || []), user.uid]
        : (post.likes || []).filter((uid) => uid !== user.uid),
    };

    dispatch(updatePost(updatedPost));
    await updatePostInIndexedDB(updatedPost);
  } catch (error) {
    console.error("Error updating likes:", error);
  }
};
