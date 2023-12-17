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
  comments: CommentType[]; // Use CommentType[] directly if it includes the necessary fields
  onLikeComment: (commentId: string, likes: string[]) => void;
  likes: number;
  onDeleteComment: (commentId: string) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  post,
  comments,
  onLikeComment,
  likes,
  onDeleteComment,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  console.log(comments, " : comments ");

  return (
    <Modal open={isOpen} onClose={onClose} className="comment-modal">
      <div className="comment-modal-content">
        {comments.map((comment) => (
          <div key={comment.commentId} className="comment-item">
            <a
              onClick={() => onUserNameClick(post, dispatch)}
              className="comment-user-name"
            >
              {comment.userName}
            </a>
            {/* Expected 2 arguments, but got 1.ts(2554)  for the onUserNameClick on the line above*/}
            <p className="comment-text"> {comment.text} </p>
            <div className="comment-actions">
              <button
                onClick={() => onLikeComment(comment.id, likes)}
                className="like-button"
              >
                {comment.userLiked ? "❤️" : "🤍"} {comment.likes} 
              </button>
              {currentUser?.uid === comment.userId && (
                <button
                  onClick={() => onDeleteComment(comment.id)}
                  className="delete-button"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default CommentModal;
