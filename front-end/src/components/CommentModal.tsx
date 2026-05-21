import React, { useEffect, useMemo, useRef } from "react";
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
  focusCommentId?: string | null;
}

const formatCommentTime = (timestamp: CommentType["timestamp"]) => {
  if (!timestamp) return "";

  try {
    if ("toDate" in timestamp) {
      return timestamp.toDate().toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    if ("seconds" in timestamp) {
      return new Date(timestamp.seconds * 1000).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }

    return "";
  } catch {
    return "";
  }
};

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  onClose,
  post,
  comments,
  onLikeComment,
  onDeleteComment,
  focusCommentId = null,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const visibleComments = useMemo(() => {
    return [...comments]
      .filter((comment) => comment.commentId && comment.userId)
      .sort((a, b) => {
        const aSeconds = a.timestamp?.seconds ?? 0;
        const bSeconds = b.timestamp?.seconds ?? 0;
        return aSeconds - bSeconds;
      });
  }, [comments]);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => {
      if (focusCommentId && commentRefs.current[focusCommentId]) {
        commentRefs.current[focusCommentId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }

      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [isOpen, focusCommentId, visibleComments.length]);

  if (!currentUser?.uid) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      className="comment-modal"
      aria-labelledby="comment-modal-title"
      aria-describedby="comment-modal-description"
    >
      <section className="comment-modal-panel">
        <header className="comment-modal-header">
          <div>
            <h2 id="comment-modal-title">Comments</h2>
            <p id="comment-modal-description">
              {post.accountName || post.account?.accountName || "Post comments"}
            </p>
          </div>

          <button
            type="button"
            className="comment-modal-close"
            onClick={onClose}
            aria-label="Close comments"
          >
            ✕
          </button>
        </header>

        <div ref={scrollContainerRef} className="comment-modal-content">
          {visibleComments.length === 0 ? (
            <div className="comment-empty-state">
              <span>💬</span>
              <p>No comments yet.</p>
            </div>
          ) : (
            visibleComments.map((comment) => {
              const commentId = comment.commentId!;
              const likedByUser = comment.likes?.includes(currentUser.uid);
              const isOwnComment = currentUser.uid === comment.userId;
              const isFocused = focusCommentId === commentId;

              return (
                <article
                  key={commentId}
                  ref={(el) => {
                    commentRefs.current[commentId] = el;
                  }}
                  className={`comment-item ${isFocused ? "comment-item-focused" : ""}`}
                >
                  <div className="comment-main">
                    <p className="comment-copy">
                      <button
                        type="button"
                        className="comment-user-name"
                        onClick={() =>
                          comment.userId &&
                          onUserNameClick(comment.userId, dispatch)
                        }
                      >
                        {comment.userName}
                      </button>

                      <span className="comment-text">{comment.text}</span>
                    </p>

                    <small className="comment-timestamp">
                      {formatCommentTime(comment.timestamp)}
                    </small>
                  </div>

                  <div className="comment-actions">
                    <button
                      type="button"
                      onClick={() => onLikeComment(comment, comment.likes)}
                      className={`comment-action-btn like-button ${
                        likedByUser ? "liked" : ""
                      }`}
                      aria-label={
                        likedByUser ? "Unlike comment" : "Like comment"
                      }
                    >
                      <span>{likedByUser ? "❤️" : "🤍"}</span>
                      <span>{comment.likes?.length || 0}</span>
                    </button>

                    {isOwnComment && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(commentId)}
                        className="comment-action-btn delete-button"
                        aria-label="Delete comment"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </Modal>
  );
};

export default CommentModal;
