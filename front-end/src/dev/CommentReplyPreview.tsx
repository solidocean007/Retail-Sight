import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore";
import CommentModal from "../components/CommentModal";
import { setUser } from "../Slices/userSlice";
import { CommentType, PostType, UserType } from "../utils/types";
import { useAppDispatch } from "../utils/store";
import "./commentReplyPreview.css";

const previewUser: UserType = {
  role: "supervisor",
  uid: "preview-alex",
  createdAt: null,
  updatedAt: null,
  firstName: "Alex",
  lastName: "Rivera",
  email: "preview@example.com",
  company: "Displaygram Demo",
  companyId: "preview-company",
  phone: undefined,
  status: "active",
  verified: true,
};

const previewPost = {
  accountName: "Market Street Store #214",
  account: { accountName: "Market Street Store #214" },
} as PostType;

const initialComments: CommentType[] = [
  {
    commentId: "comment-maya",
    text: "This endcap looks great. Can we use the same shelf strips next week?",
    userId: "preview-maya",
    userName: "Maya Chen",
    postId: "preview-post",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 1000)),
    likes: ["preview-alex"],
  },
  {
    commentId: "reply-alex",
    text: "Absolutely — I saved the setup notes and will send them over.",
    userId: "preview-alex",
    userName: "Alex Rivera",
    postId: "preview-post",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 31 * 60 * 1000)),
    likes: [],
    parentCommentId: "comment-maya",
    rootCommentId: "comment-maya",
    replyToUserId: "preview-maya",
    replyToUserName: "Maya Chen",
  },
  {
    commentId: "comment-jordan",
    text: "Do you have a wider photo showing the full aisle?",
    userId: "preview-jordan",
    userName: "Jordan Lee",
    postId: "preview-post",
    timestamp: Timestamp.fromDate(new Date(Date.now() - 12 * 60 * 1000)),
    likes: [],
  },
];

const CommentReplyPreview = () => {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(true);
  const [comments, setComments] = useState(initialComments);

  useEffect(() => {
    dispatch(setUser(previewUser));
  }, [dispatch]);

  const handleLike = (comment: CommentType) => {
    setComments((current) =>
      current.map((candidate) =>
        candidate.commentId === comment.commentId
          ? {
              ...candidate,
              likes: candidate.likes.includes(previewUser.uid)
                ? candidate.likes.filter((uid) => uid !== previewUser.uid)
                : [...candidate.likes, previewUser.uid],
            }
          : candidate,
      ),
    );
  };

  const handleDelete = (commentId: string) => {
    setComments((current) =>
      current.filter((comment) => comment.commentId !== commentId),
    );
  };

  const handleReply = async (parent: CommentType, text: string) => {
    const commentId = `preview-reply-${Date.now()}`;
    setComments((current) => [
      ...current,
      {
        commentId,
        text: text.trim(),
        userId: previewUser.uid,
        userName: `${previewUser.firstName} ${previewUser.lastName}`,
        postId: "preview-post",
        timestamp: Timestamp.now(),
        likes: [],
        parentCommentId: parent.commentId,
        rootCommentId: parent.rootCommentId || parent.commentId,
        replyToUserId: parent.userId,
        replyToUserName: parent.userName,
      },
    ]);

    return commentId;
  };

  return (
    <main className="comment-reply-preview">
      <section className="comment-reply-preview-card">
        <span className="comment-reply-preview-badge">Local UI preview</span>
        <h1>Comment replies</h1>
        <p>
          This page uses mock data only. Try replying, liking, deleting your
          reply, resizing the window, and switching between light and dark
          mode without changing Firestore.
        </p>
        <button type="button" onClick={() => setIsOpen(true)}>
          Open comment preview
        </button>
      </section>

      <CommentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        post={previewPost}
        comments={comments}
        onLikeComment={handleLike}
        onDeleteComment={handleDelete}
        onReplyComment={handleReply}
      />
    </main>
  );
};

export default CommentReplyPreview;
