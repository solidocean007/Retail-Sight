// CommentSection
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { CommentType, NotificationType, PostWithID } from "../utils/types";
import { Timestamp, increment } from "firebase/firestore";
// import { useDispatch } from "react-redux";
// import ThumbUpIcon from "@mui/icons-material/ThumbUp";
// import DeleteIcon from "@mui/icons-material/Delete";
// import { onUserNameClick } from "../utils/PostLogic/onUserNameClick";
import { doc, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./commentSection.css";
import { updatePost } from "../Slices/postsSlice";
import { updatePostInIndexedDB } from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";
import { updatePostWithNewTimestamp } from "../utils/PostLogic/updatePostWithNewTimestamp";
import { sendNotification } from "../thunks/notificationsThunks";
// import { UserState } from "../Slices/userSlice.ts";

interface CommentProps {
  post: PostWithID;
}

const CommentSection: React.FC<CommentProps> = ({ post }) => {
  const protectedAction = useProtectedAction();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const userFullName = user?.firstName + " " + user?.lastName; // or just user?.username
  const dispatch = useAppDispatch();
  const [newComment, setNewComment] = useState("");

  // const dispatch = useDispatch();
  // const selectedUid = useSelector(selectSelectedUid);

  const commentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(e.target.value);
  };

  const commentSubmit = async () => {
    if (newComment.length > 0 && user) {
      try {
        const commentToAdd: CommentType = {
          text: newComment,
          userName: userFullName || "Anonymous",
          userId: user.uid,
          postId: post.id,
          timestamp: Timestamp.now(),
          likes: [],
        };

        const docRef = await addDoc(collection(db, "comments"), commentToAdd);

        // ✅ Write commentId to the newly created document
        await updateDoc(docRef, {
          commentId: docRef.id,
        });

        // Update comment count
        const postRef = doc(db, "posts", post.id);
        await updateDoc(postRef, { commentCount: increment(1) });

        // Update Redux and IndexedDB
        const updatedPost = { ...post, commentCount: post.commentCount + 1 };
        dispatch(updatePost(updatedPost));
        await updatePostInIndexedDB(updatedPost);

        // 🛎️ Send notification to post author (unless the commenter is the author)
        if (user.uid !== post.postUser.uid) {
          const notif: NotificationType = {
            id: "",
            title: "New Comment on Your Post",
            message: `${userFullName}: "${newComment}"`,
            sentAt: Timestamp.now(),
            sentBy: user,
            recipientUserIds: [post.postUser.uid],
            recipientCompanyIds: [],
            recipientRoles: [],
            readBy: [],
            priority: "normal",
            pinned: false,
            type: "comment",
            postId: post.id,
          };

          dispatch(sendNotification({ notification: notif }));
        }
        await updatePostWithNewTimestamp(post.id);

        setNewComment("");
      } catch (error) {
        console.error("Failed to add comment in Firestore:", error);
      }
    }
  };

  const handleCommentSubmit = () => {
    protectedAction(() => {
      commentSubmit();
    });
  };

  //  console.log(user, ' comment section user')
  return (
    <div className="comment-section-box">
      <form
        className="comment-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleCommentSubmit();
        }}
      >
        <input
          type="text"
          value={newComment}
          onChange={commentChange}
          placeholder={`Comment as ${user?.firstName ?? ""} ${
            user?.lastName ?? ""
          }`}
        />

        <button
          type="submit"
          className="btn-outline"
          disabled={!newComment.trim()}
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default CommentSection;
