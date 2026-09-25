import React, { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@mui/material/Modal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../utils/store";
import "./CommentModal.css";
import { onUserNameClick } from "../utils/PostLogic/onUserNameClick";
import { CommentType, PostType } from "../utils/types";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostType;
  comments: CommentType[];
  onLikeComment: (comment: CommentType, likes: string[] | undefined) => void;
  onDeleteComment: (commentId: string) => void;
  onReplyComment: (
    comment: CommentType,
    text: string,
  ) => Promise<string | undefined>;
  headerAccessory?: React.ReactNode;
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
  onReplyComment,
  headerAccessory,
  focusCommentId = null,
}) => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

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

  const commentThreads = useMemo(() => {
    const visibleIds = new Set(
      visibleComments.map((comment) => comment.commentId),
    );
    const repliesByRoot = new Map<string, CommentType[]>();
    const roots: CommentType[] = [];

    visibleComments.forEach((comment) => {
      const rootId = comment.rootCommentId;

      if (rootId && visibleIds.has(rootId)) {
        const replies = repliesByRoot.get(rootId) || [];
        replies.push(comment);
        repliesByRoot.set(rootId, replies);
        return;
      }

      // Legacy comments and replies whose parent was deleted remain visible.
      roots.push(comment);
    });

    return roots.map((comment) => ({
      comment,
      replies: repliesByRoot.get(comment.commentId!) || [],
    }));
  }, [visibleComments]);

  useEffect(() => {
    if (!isOpen) {
      setReplyTargetId(null);
      setReplyText("");
      return;
    }

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

  const openReplyComposer = (comment: CommentType) => {
    setReplyTargetId(comment.commentId || null);
    setReplyText("");
  };

  const closeReplyComposer = () => {
    setReplyTargetId(null);
    setReplyText("");
  };

  const submitReply = async (comment: CommentType) => {
    if (!replyText.trim() || isSubmittingReply) return;

    try {
      setIsSubmittingReply(true);
      const replyId = await onReplyComment(comment, replyText);
      closeReplyComposer();

      if (replyId) {
        window.setTimeout(() => {
          commentRefs.current[replyId]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    } catch (error) {
      console.error("Failed to reply to comment:", error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const renderComment = (comment: CommentType, isReply = false) => {
    const commentId = comment.commentId!;
    const likedByUser = comment.likes?.includes(currentUser.uid);
    const isOwnComment = currentUser.uid === comment.userId;
    const isFocused = focusCommentId === commentId;
    const isReplying = replyTargetId === commentId;

    return (
      <div
        key={commentId}
        className={`comment-entry ${isReply ? "comment-entry-reply" : ""}`}
      >
        <article
          ref={(el) => {
            commentRefs.current[commentId] = el;
          }}
          className={`comment-item ${isReply ? "comment-reply-item" : ""} ${
            isFocused ? "comment-item-focused" : ""
          }`}
        >
          <div className="comment-main">
            {isReply && comment.replyToUserName && (
              <small className="comment-replying-to">
                Replying to {comment.replyToUserName}
              </small>
            )}

            <p className="comment-copy">
              <button
                type="button"
                className="comment-user-name"
                onClick={() =>
                  comment.userId && onUserNameClick(comment.userId, dispatch)
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
              aria-label={likedByUser ? "Unlike comment" : "Like comment"}
            >
              <span>{likedByUser ? "❤️" : "🤍"}</span>
              <span>{comment.likes?.length || 0}</span>
            </button>

            <button
              type="button"
              onClick={() => openReplyComposer(comment)}
              className="comment-action-btn reply-button"
              aria-label={`Reply to ${comment.userName}`}
            >
              Reply
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

        {isReplying && (
          <form
            className="comment-reply-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submitReply(comment);
            }}
          >
            <label htmlFor={`reply-${commentId}`}>
              Reply to {comment.userName}
            </label>
            <div className="comment-reply-controls">
              <input
                id={`reply-${commentId}`}
                type="text"
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write a reply..."
                autoFocus
                maxLength={1000}
              />
              <button
                type="button"
                className="comment-reply-cancel"
                onClick={closeReplyComposer}
                disabled={isSubmittingReply}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="comment-reply-submit"
                disabled={!replyText.trim() || isSubmittingReply}
              >
                {isSubmittingReply ? "Sending..." : "Reply"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };

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

          <div className="comment-modal-header-actions">
            {headerAccessory}
            <button
              type="button"
              className="comment-modal-close"
              onClick={onClose}
              aria-label="Close comments"
            >
              <CloseRoundedIcon aria-hidden="true" />
            </button>
          </div>
        </header>

        <div ref={scrollContainerRef} className="comment-modal-content">
          {visibleComments.length === 0 ? (
            <div className="comment-empty-state">
              <span>💬</span>
              <p>No comments yet.</p>
            </div>
          ) : (
            commentThreads.map(({ comment, replies }) => (
              <section className="comment-thread" key={comment.commentId}>
                {renderComment(comment)}

                {replies.length > 0 && (
                  <div
                    className="comment-replies"
                    aria-label={`Replies to ${comment.userName}`}
                  >
                    {replies.map((reply) => renderComment(reply, true))}
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </section>
    </Modal>
  );
};

export default CommentModal;
