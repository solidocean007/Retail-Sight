import {
  collection,
  doc,
  increment,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { CommentType, PostWithID, UserType } from "../types";

type CreatePostCommentInput = {
  post: PostWithID;
  user: UserType;
  text: string;
  parentComment?: CommentType;
};

/**
 * Creates either a top-level comment or a reply and keeps the post count in
 * the same atomic write. Replies stay in the existing top-level collection so
 * older clients continue to load them without a data migration.
 */
export const createPostComment = async ({
  post,
  user,
  text,
  parentComment,
}: CreatePostCommentInput): Promise<CommentType> => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Comment text is required.");
  }

  const commentRef = doc(collection(db, "comments"));
  const createdAt = Timestamp.now();
  const userName = `${user.firstName} ${user.lastName}`.trim();
  const rootCommentId = parentComment
    ? parentComment.rootCommentId || parentComment.commentId
    : undefined;

  if (parentComment && (!parentComment.commentId || !rootCommentId)) {
    throw new Error("The comment being replied to is missing its id.");
  }

  const comment: CommentType = {
    commentId: commentRef.id,
    text: trimmedText,
    userName,
    userId: user.uid,
    postId: post.id,
    timestamp: createdAt,
    likes: [],
    ...(parentComment
      ? {
          parentCommentId: parentComment.commentId,
          rootCommentId,
          replyToUserId: parentComment.userId,
          replyToUserName: parentComment.userName,
        }
      : {}),
  };

  const batch = writeBatch(db);
  batch.set(commentRef, comment);
  batch.update(doc(db, "posts", post.id), { commentCount: increment(1) });

  const postOwnerId = post.postUser?.uid;
  const parentAuthorId = parentComment?.userId;

  if (parentComment && parentAuthorId && parentAuthorId !== user.uid) {
    const replyEventRef = doc(collection(db, "activityEvents"));
    batch.set(replyEventRef, {
      type: "post.commentReply",
      postId: post.id,
      commentId: commentRef.id,
      parentCommentId: parentComment.commentId,
      actorUserId: user.uid,
      actorName: userName,
      commentText: trimmedText,
      targetUserIds: [parentAuthorId],
      createdAt,
    });
  }

  // A reply from someone other than the post owner still counts as new post
  // activity. Avoid sending a duplicate if the owner wrote the parent comment.
  if (
    postOwnerId &&
    postOwnerId !== user.uid &&
    postOwnerId !== parentAuthorId
  ) {
    const postCommentEventRef = doc(collection(db, "activityEvents"));
    batch.set(postCommentEventRef, {
      type: "post.comment",
      postId: post.id,
      commentId: commentRef.id,
      actorUserId: user.uid,
      actorName: userName,
      commentText: trimmedText,
      targetUserIds: [postOwnerId],
      createdAt,
    });
  }

  await batch.commit();

  return comment;
};
