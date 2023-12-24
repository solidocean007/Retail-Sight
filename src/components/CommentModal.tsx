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
  likedByUser: boolean;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  post,
  comments,
  // onLikeComment,
  // likes,
  onDeleteComment,
  // likedByUser,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  console.log(comments, " : comments ");

  return (
    <Modal open={isOpen} onClose={onClose} className="comment-modal">
      <div className="comment-modal-content">
        {comments.map((comment) => (
          
          <div key={comment.commentId} className="comment-item">
            <div className="comment-name-text">
            <a
              onClick={() => onUserNameClick(post, dispatch)}
              className="comment-user-name"
            >
              {comment.userName}:
            </a>
            <p className="comment-text"> {comment.text} </p>
            <div className="comment-actions">
              {/* <button
                onClick={() => comment.commentId && onLikeComment(comment.commentId, likes)} // onClick={() => comment.commentId && onDeleteComment(comment.commentId)}
                className="like-button"
              >
                {likedByUser ? "❤️" : "🤍"} {comment.likes} 
              </button> */}
            </div>
            
              
            </div>
            <div className="trash-box">
                {currentUser?.uid === comment.userId && (
                  <button
                    onClick={() =>
                      comment.commentId && onDeleteComment(comment.commentId)
                    }
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
