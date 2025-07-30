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

// ✅ Helper: Check if a similar notification already exists
const shouldSendNotification = async ({
  senderId,
  recipientId,
  postId,
  type,
}: {
  senderId: string;
  recipientId: string;
  postId: string;
  type: string;
}) => {
  const notifQuery = query(
    collection(db, "notifications"),
    where("senderId", "==", senderId),
    where("recipientUserIds", "array-contains", recipientId),
    where("postId", "==", postId),
    where("type", "==", type)
  );
  const snap = await getDocs(notifQuery);
  return snap.empty;
};

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
    if (liked && !isSelf) {
      const shouldSend = await shouldSendNotification({
        senderId: user.uid,
        recipientId,
        postId: post.id,
        type: "like",
      });

      if (shouldSend) {
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
    }

    // ✅ UNLIKE: Delete related notification
    if (!liked && !isSelf) {
      const snap = await getDocs(
        query(
          collection(db, "notifications"),
          where("senderId", "==", user.uid),
          where("recipientUserIds", "array-contains", recipientId),
          where("postId", "==", post.id),
          where("type", "==", "like")
        )
      );
      snap.forEach(async (doc) => {
        await deleteDoc(doc.ref);
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
