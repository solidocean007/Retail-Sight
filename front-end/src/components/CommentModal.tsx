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
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  post,
  comments,
  onLikeComment,
  onDeleteComment,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  if(!currentUser?.uid) return;
  

  return (
    <Modal open={isOpen} onClose={onClose} className="comment-modal">
      <div className="comment-modal-content">
        {[...comments].reverse().map((comment) => {
          const likedByUser = comment.likes?.includes(currentUser?.uid);
          if(!comment.userId) return;
          return (
            <div key={comment.commentId} className="comment-item">
              {/* LEFT: user name + comment text */}
              <div className="comment-name-text">
                <p>
                  <strong
                    className="comment-user-name"
                    onClick={() =>
                      comment.userId && onUserNameClick(comment.userId, dispatch) // Argument of type 'string' is not assignable to parameter of type 'PostType'
                    }
                  >
                    {comment.userName}:
                  </strong>{" "}
                  <span className="comment-text">{comment.text}</span>
                </p>
              </div>

              {/* RIGHT: timestamp + actions */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <small className="comment-timestamp">
                  {comment.timestamp?.seconds
                    ? new Date(comment.timestamp.seconds * 1000).toLocaleString(
                        undefined,
                        {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }
                      )
                    : ""}
                </small>

                {comment.commentId && (
                  <div className="comment-actions">
                    <button
                      onClick={() => onLikeComment(comment, comment.likes)}
                      className="like-button"
                    >
                      {likedByUser ? "❤️" : "🤍"}{" "}
                      {comment.likes?.length || 0}
                    </button>

                    {currentUser?.uid === comment.userId && (
                      <button
                        onClick={() => onDeleteComment(comment.commentId!)}
                        className="delete-button"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default CommentModal;
