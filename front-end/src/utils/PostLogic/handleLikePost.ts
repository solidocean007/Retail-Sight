import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { NotificationType, PostWithID, UserType } from "../types";
import { updatePost } from "../../Slices/postsSlice";
import { updatePostInIndexedDB } from "../database/indexedDBUtils";
import { AppDispatch } from "../store";
import { updatePostWithNewTimestamp } from "./updatePostWithNewTimestamp";
import { sendNotification } from "../../thunks/notificationsThunks";

export const handleLikePost = async (
  post: PostWithID,
  user: UserType,
  liked: boolean,
  dispatch: AppDispatch
) => {
  try {
    await updatePostWithNewTimestamp(post.id);
    const postRef = doc(db, "posts", post.id);
    const updatedLikes = liked ? arrayUnion(user.uid) : arrayRemove(user.uid);
    await updateDoc(postRef, { likes: updatedLikes });

    const recipientId = post.postUser.uid;
    const isSelf = user.uid === recipientId;

    // ✅ LIKE
    // Only send a notification if the user is not liking their own post
    if (liked && !isSelf) {
      const notif: NotificationType = {
        id: "",
        title: "New Like on Your Post",
        message: `${user.firstName} ${user.lastName} liked your post about ${
          post.accountName || "a store"
        }.`,
        sentAt: Timestamp.now(),
        sentBy: user,
        recipientUserIds: [recipientId],
        recipientCompanyIds: [],
        recipientRoles: [],
        readBy: [],
        priority: "low",
        pinned: false,
        type: "like",
        postId: post.id,
      };

      dispatch(sendNotification({ notification: notif }));
    }

    // ✅ UNLIKE: Delete related notification
    if (!liked && !isSelf) {
      const snap = await getDocs(
        query(
          collection(db, "notifications"),
          where("sentBy.uid", "==", user.uid),
          where("recipientUserIds", "array-contains", recipientId),
          where("postId", "==", post.id),
          where("type", "==", "like")
        )
      );
      snap.forEach(async (notifDoc) => {
        await deleteDoc(notifDoc.ref);
      });
    }

    // ✅ Local state update
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
