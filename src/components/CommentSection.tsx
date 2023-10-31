// CommentSection
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { TextField, Button } from "@mui/material";
import { CommentType, PostType } from "../utils/types";
import { Timestamp, deleteDoc, increment } from "firebase/firestore";
import { useDispatch } from "react-redux";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import DeleteIcon from "@mui/icons-material/Delete";
import { handleUserNameClick } from "../utils/userModalUtils.ts";
// import { UserType } from "../utils/types";

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
// import { UserState } from "../Slices/userSlice.ts";

interface CommentProps {
  post: PostType;
  showAllComments: boolean;
  setShowAllComments: React.Dispatch<React.SetStateAction<boolean>>;
}

const CommentSection: React.FC<CommentProps> = ({
  post,
  showAllComments,
  setShowAllComments,
}) => {
  const [sortedComments, setSortedComments] = useState<CommentType[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const user = useSelector((state: RootState) => state.user.currentUser);  // state.user is of type unknown
  const userFullName = user?.firstName + " " + user?.lastName; // or just user?.username

  const [newComment, setNewComment] = useState<CommentType>({
    commentId: "",
    text: "",
    userName: userFullName,
    userId: user?.uid,
    // userId: currentUser?.uid,
    postId: post.id,
    timestamp: undefined,
    likes: [],
  });

  const dispatch = useDispatch();
  // const selectedUid = useSelector(selectSelectedUid);

  const onUserNameClick = (uid: string) => {
    handleUserNameClick(uid, dispatch);
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment({ ...newComment, text: e.target.value });
  };

  const toggleComments = async () => {
    if (!showAllComments) {
      try {
        const commentQuery = query(
          collection(db, "comments"),
          where("postId", "==", post.id)
        );
        const commentSnapshot = await getDocs(commentQuery);
        const comments = commentSnapshot.docs.map(
          (doc) => ({ commentId: doc.id, ...doc.data() } as CommentType)
        );

        setSortedComments(comments);
      } catch (error) {
        console.error("Failed to fetch comments from Firestore:", error);
      }
    }
    setShowAllComments(!showAllComments);
  };

  const handleCommentSubmit = async () => {
    const timestamp = Timestamp.now();
    if (newComment.text.length > 0) {
        try {
            // Type commentToAdd to exclude commentId property
            const commentToAdd: Omit<CommentType, 'commentId'> = {
                ...newComment,
                timestamp: timestamp,
            };

            const docRef = await addDoc(collection(db, "comments"), commentToAdd);

            const commentIdFromFirestore = docRef.id;
            const updatedComment: CommentType = {
                ...commentToAdd,
                commentId: commentIdFromFirestore,
                timestamp: timestamp,
            };

            setSortedComments(prevComments => [...prevComments, updatedComment]);
            setCommentCount(prevCount => prevCount + 1);

            const postRef = doc(db, "posts", post.id);
            await updateDoc(postRef, { commentCount: increment(1) });

            setNewComment({ ...newComment, text: "" });
        } catch (error) {
            console.error("Failed to add comment in Firestore:", error);
        }
    }
};

  const handleDeleteComment = async (commentId: string) => {
    console.log("Deleting comment with ID:", commentId);

    try {
      const commentRef = doc(db, "comments", commentId);
      await deleteDoc(commentRef);

      // Decrement local commentCount
      setCommentCount((prevCount) => prevCount - 1);

      // Decrement the commentCount for the relevant post
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, {
        commentCount: increment(-1),
      });

      // Remove the comment from local state
      setSortedComments(
        sortedComments.filter((comment) => comment.commentId !== commentId)
      );
    } catch (error) {
      console.error("Failed to delete comment:", error);
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

      {showAllComments && sortedComments.length > 0 ? (
        <div className="comments-container">
          {sortedComments.map((comment) => (
            <div className="comment-details" key={comment.commentId}>
              <div className="comment">
                <span onClick={() => onUserNameClick(post.user.postUserId!)} className="user-of-comment">{comment.userName}: </span> 
                <span>{comment.text}</span>
              </div>
              <div>
                <ThumbUpIcon
                  // disabled={comment.likes.includes(user?.uid || "")}
                  onClick={() => handleLike(comment.commentId, comment.likes)}
                >
                  Like ({comment.likes.length})
                </ThumbUpIcon>
                {comment.userId === user?.uid ? (
                  <DeleteIcon
                    className="delete-comment-btn"
                    onClick={() => handleDeleteComment(comment.commentId)}
                    // onClick={() => console.log(comment)}
                  >
                    Delete
                  </DeleteIcon>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {commentCount > 0 && (
        <Button onClick={toggleComments}>
          {showAllComments ? "Hide Comments" : `${commentCount} Comments`}
        </Button>
      )}
      {/* <UserModal isOpen={isUserModalOpen} /> */}
    </div>
  );
};

export default CommentSection;
