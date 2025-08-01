// CommentModal.tsx
import React from "react";
import Modal from "@mui/material/Modal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../utils/store";
import "./CommentModal.css";
import { onUserNameClick } from "../utils/PostLogic/onUserNameClick";
import { CommentType, PostType } from "../utils/types";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostType;
  comments: CommentType[];
  onLikeComment: (comment: CommentType, likes: string[] | undefined) => void;
  onDeleteComment: (commentId: string) => void;
  likedByUser: boolean | undefined;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  post,
  comments,
  onLikeComment,
  onDeleteComment,
  likedByUser,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  return (
    <Modal open={isOpen} onClose={onClose} className="comment-modal">
      <div className="comment-modal-content">
       {[...comments].reverse().map((comment) => (
  <div key={comment.commentId} className="comment-item">
    {/* LEFT: user name + comment text */}
    <div className="comment-name-text">
      <p>
        <strong className="comment-user-name">{comment.userName}:</strong>{" "}
        <span className="comment-text">{comment.text}</span>
      </p>
    </div>

    {/* RIGHT: timestamp + like button */}
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      <small className="comment-timestamp">
        {comment.timestamp?.seconds
          ? new Date(comment.timestamp.seconds * 1000).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : ""}
      </small>
      <div className="comment-actions">
        <button
          onClick={() => comment.commentId && onLikeComment(comment, post.likes)}
          className="like-button"
        >
          {likedByUser ? "❤️" : "🤍"} {comment.likes}
        </button>
        {currentUser?.uid === comment.userId && (
          <button
            onClick={() => comment.commentId && onDeleteComment(comment.commentId)}
            className="delete-button"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  </div>
))}

      </div>
    </Modal>
  );
};

export default CommentModal;
