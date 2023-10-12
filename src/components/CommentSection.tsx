import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { TextField, Button } from "@mui/material";
import { CommentType, PostType } from "../utils/types";
import { Timestamp, increment } from "firebase/firestore";

import {
  doc,
  collection,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import "./commentSection.css";

interface CommentProps {
  post: PostType;
}

const CommentSection: React.FC<CommentProps> = ({ post }) => {
  const [showAllComments, setShowAllComments] = useState(false);
  const [sortedComments, setSortedComments] = useState<CommentType[]>([]);
  const user = useSelector((state: RootState) => state.user.user);
  const [newComment, setNewComment] = useState<CommentType>({
    text: "",
    userId: user?.uid,
    userName: `${user?.displayName}`,
    timestamp: 0,
    likes: [],
  });

  // Removed the useEffect that fetches comments on mount

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment({ ...newComment, text: e.target.value });
  };

  const toggleComments = async () => {
    if (!showAllComments) {
      // Only fetch comments if they are not already fetched (i.e., when the user clicks to show comments)
      const commentQuery = query(
        collection(db, "comments"),
        where("postId", "==", post.id)
      );
      const commentSnapshot = await getDocs(commentQuery);
      const comments = commentSnapshot.docs.map(
        (doc) => doc.data() as CommentType
      );
      setSortedComments(
        comments.sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      );
    }
    setShowAllComments(!showAllComments);
  };

  const handleCommentSubmit = async () => {
    const timestamp = Timestamp.now();
    if (newComment.text.length > 0) {
      try {
        // The following line will automatically generate an ID for the new comment
        const docRef = await addDoc(collection(db, "comments"), {
          ...newComment,
          postId: post.id,
          timestamp: timestamp,
        });

        // Increment commentCount for the relevant post
        const postRef = doc(db, "posts", post.id);
        await updateDoc(postRef, {
          commentCount: increment(1),
        });

        // Here's the part where you add the ID to your local state
        const addedComment = { ...newComment, id: docRef.id };
        setSortedComments([...sortedComments, addedComment]);
        setNewComment({ ...newComment, text: "" });
      } catch (error) {
        console.error("Failed to add comment in Firestore:", error);
      }
    }
  };

  const handleLike = async (commentId: string, likes: string[]) => {
    if (user?.uid && !likes.includes(user.uid)) {
      try {
        const commentRef = doc(db, "comments", commentId);
        const updatedLikes = [...likes, user.uid];
        await updateDoc(commentRef, { likes: updatedLikes });
      } catch (error) {
        console.error("Failed to update like in Firestore:", error);
      }
    }
  };
//  console.log(user, ' comment section user')
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCommentSubmit();
        }}
      >
        <div className="new-comment-container">
          <TextField
            label="New Comment"
            value={newComment.text}
            onChange={handleCommentChange}
            fullWidth
          />
          <Button type="submit">Submit</Button>
        </div>
      </form>
      <div>
        {showAllComments &&
          sortedComments.map((comment) => (
            <div key={comment.timestamp}>
              <span>{comment.userName} </span>
              <span>{comment.text}</span>
              <button
                disabled={comment.likes.includes(user?.uid || "")}
                onClick={() => handleLike(comment.id, comment.likes)}
              >
                Like ({comment.likes.length})
              </button>
            </div>
          ))}
      </div>
      <Button onClick={toggleComments} disabled={sortedComments.length === 0}>
        {showAllComments ? "Hide Comments" : `${post.commentCount} Comments`}
      </Button>
    </div>
  );
};

export default CommentSection;
