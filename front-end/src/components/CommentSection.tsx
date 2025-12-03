// CommentSection.tsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { CommentType, PostWithID } from "../utils/types";
import { Timestamp, increment } from "firebase/firestore";
import { doc, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./commentSection.css";
import { updatePost } from "../Slices/postsSlice";
import { updatePostInIndexedDB } from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";
import { updatePostWithNewTimestamp } from "../utils/PostLogic/updatePostWithNewTimestamp";

interface CommentProps {
  post: PostWithID;
}

const CommentSection: React.FC<CommentProps> = ({ post }) => {
  const protectedAction = useProtectedAction();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const userFullName = user ? `${user.firstName} ${user.lastName}` : "";
  const dispatch = useAppDispatch();

  const [newComment, setNewComment] = useState("");

  const commentSubmit = async () => {
    if (!newComment.trim() || !user) return;

    try {
      // 1️⃣ Build comment object
      const commentToAdd: CommentType = {
        text: newComment.trim(),
        userName: userFullName,
        userId: user.uid,
        postId: post.id,
        timestamp: Timestamp.now(),
        likes: [],
      };

      // 2️⃣ Add comment → backend Cloud Function will auto-notify
      const docRef = await addDoc(collection(db, "comments"), commentToAdd);

      // 3️⃣ Store commentId
      await updateDoc(docRef, { commentId: docRef.id });

      // 2️⃣ Notify post owner via activityEvents
      try {
        const targetUserIds: string[] = [];

        if (post.postUser?.uid && post.postUser.uid !== user.uid) {
          targetUserIds.push(post.postUser.uid);
        }

        if (targetUserIds.length > 0) {
          await addDoc(collection(db, "activityEvents"), {
            type: "post.comment",
            postId: post.id,
            commentId: docRef.id,
            actorUserId: user.uid,
            actorName: userFullName,
            commentText: newComment.trim(), // 👈 add this
            targetUserIds,
            createdAt: Timestamp.now(),
          });
        }
      } catch (err) {
        console.error("Failed writing comment activity event:", err);
      }

      // 4️⃣ Update post.commentCount
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, { commentCount: increment(1) });

      const updatedPost = {
        ...post,
        commentCount: post.commentCount + 1,
      };

      dispatch(updatePost(updatedPost));
      await updatePostInIndexedDB(updatedPost);

      // 5️⃣ Update timestamp for feed ordering
      await updatePostWithNewTimestamp(post.id);

      // 6️⃣ Reset form
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  return (
    <div className="comment-section-box">
      <form
        className="comment-form"
        onSubmit={(e) => {
          e.preventDefault();
          protectedAction(commentSubmit);
        }}
      >
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={`Comment as ${userFullName}`}
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
