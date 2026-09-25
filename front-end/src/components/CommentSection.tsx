// CommentSection.tsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { PostWithID } from "../utils/types";
import "./commentSection.css";
import { updatePost } from "../Slices/postsSlice";
import { updatePostInIndexedDB } from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";
import { updatePostWithNewTimestamp } from "../utils/PostLogic/updatePostWithNewTimestamp";
import { createPostComment } from "../utils/PostLogic/createPostComment";

interface CommentProps {
  post: PostWithID;
}

const CommentSection: React.FC<CommentProps> = ({ post }) => {
  const protectedAction = useProtectedAction();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const userFullName = user ? `${user.firstName} ${user.lastName}` : "";
  const dispatch = useAppDispatch();
  const storedPost = useSelector((state: RootState) =>
    state.posts.posts.find((candidate) => candidate.id === post.id),
  );

  const [newComment, setNewComment] = useState("");

  const commentSubmit = async () => {
    if (!newComment.trim() || !user) return;

    try {
      const activePost = storedPost || post;
      await createPostComment({ post: activePost, user, text: newComment });

      const updatedPost = {
        ...activePost,
        commentCount: (activePost.commentCount || 0) + 1,
      };

      dispatch(updatePost(updatedPost));
      await updatePostInIndexedDB(updatedPost);

      await updatePostWithNewTimestamp(post.id);

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
