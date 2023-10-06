import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../utils/store";
import { TextField, Button } from "@mui/material";
import { CommentType, PostType } from "../utils/types";
import { Timestamp, increment } from "firebase/firestore";

import { doc, collection, addDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";

interface CommentProps {
  post: PostType;
}

const CommentSection: React.FC<CommentProps> = ({ post }) => {
  const [showAllComments, setShowAllComments] = useState(false);
  const [sortedComments, setSortedComments] = useState<CommentType[]>([]);
  const user = useSelector((state: RootState) => state.user.user);
  const timestamp = Timestamp.now();
  const milliseconds = timestamp.toMillis();

  const [newComment, setNewComment] = useState<CommentType>({
    id: "",
    text: "",
    userId: user?.uid,
    userName: user?.displayName,
    // timestamp: timestamp,
    timestamp: milliseconds,
    likes: [],
  });

  useEffect(() => {
    const fetchComments = async () => {
      const commentQuery = query(collection(db, 'comments'), where('postId', '==', post.id));
      const commentSnapshot = await getDocs(commentQuery);
      const comments = commentSnapshot.docs.map(doc => doc.data() as CommentType);
      setSortedComments(comments.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds));
    };
    fetchComments();
  }, [post.id]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment({ ...newComment, text: e.target.value });
  };

  const toggleComments = () => {
    setShowAllComments(!showAllComments);
  };

  const handleCommentSubmit = async () => {
    if (newComment.text.length > 0) {
      try {
        await addDoc(collection(db, 'comments'), {
          ...newComment,
          postId: post.id,
        });
        // Increment commentCount for the relevant post
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentCount: increment(1) // Increase commentCount by 1
      });
        setSortedComments([...sortedComments, newComment]);
        setNewComment({ ...newComment, text: "" });
      } catch (error) {
        console.error("Failed to add comment in Firestore:", error);
      }
    }
  };

  const handleLike = async (commentId: string, likes: string[]) => {
    if (user?.uid && !likes.includes(user.uid)) {
      try {
        const commentRef = doc(db, 'comments', commentId);
        const updatedLikes = [...likes, user.uid];
        await updateDoc(commentRef, { likes: updatedLikes });
      } catch (error) {
        console.error("Failed to update like in Firestore:", error);
      }
    }
  };

  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); handleCommentSubmit(); }}>
        <TextField
          label="New Comment"
          value={newComment.text}
          onChange={handleCommentChange}
          fullWidth
        />
        <Button type="submit">Submit</Button>
      </form>
      <div>
        {showAllComments && sortedComments.map((comment) => (
          <div key={comment.id}>
            <span>{comment.userName} </span>
            <span>{comment.text}</span>
            <button
              disabled={comment.likes.includes(user?.uid || '')}
              onClick={() => handleLike(comment.id, comment.likes)}
            >
              Like ({comment.likes.length})
            </button>
          </div>
        ))}
      </div>
      <Button onClick={toggleComments}>
        {/* {showAllComments ? "Hide Comments" : `${sortedComments.length} Comments`} */}
        {showAllComments ? "Hide Comments" : `${post.commentCount} Comments`}
      </Button>
    </div>
  );
};

export default CommentSection;


