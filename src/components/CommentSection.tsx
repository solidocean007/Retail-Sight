// CommentSection
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { TextField } from "@mui/material";
import { CommentType, PostWithID } from "../utils/types";
import { Timestamp, increment } from "firebase/firestore";
// import { useDispatch } from "react-redux";
// import ThumbUpIcon from "@mui/icons-material/ThumbUp";
// import DeleteIcon from "@mui/icons-material/Delete";
// import { onUserNameClick } from "../utils/PostLogic/onUserNameClick";
import { doc, collection, addDoc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./commentSection.css";
// import { UserState } from "../Slices/userSlice.ts";

interface CommentProps {
  post: PostWithID;
}

const CommentSection: React.FC<CommentProps> = ({ post }) => {
  const user = useSelector((state: RootState) => state.user.currentUser);
  const userFullName = user?.firstName + " " + user?.lastName; // or just user?.username
  // const dispatch = useDispatch();
  const [newComment, setNewComment] = useState("");

  // const dispatch = useDispatch();
  // const selectedUid = useSelector(selectSelectedUid);

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(e.target.value );
  };

  const handleCommentSubmit = async () => {
    if (newComment.length > 0 && user) {
      try {
        const commentToAdd: CommentType = {
          text: newComment,
          userName: userFullName || "Anonymous", // Handle cases where user might not have a displayName
          userId: user.uid,
          postId: post.id,
          timestamp: Timestamp.now(),
          likes: [],
        };

        await addDoc(collection(db, "comments"), commentToAdd);

        // Update the comment count for the post
        const postRef = doc(db, "posts", post.id);
        await updateDoc(postRef, { commentCount: increment(1) });

        // Clear the comment input field
        setNewComment("");
      } catch (error) {
        console.error("Failed to add comment in Firestore:", error);
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
            value={newComment}
            onChange={handleCommentChange}
            fullWidth
          />
          <button type="submit">Submit</button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
