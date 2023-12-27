// PostCard.tsx
import React from "react";
import { useState } from "react";
import { Card, Button } from "@mui/material";
import { CommentType, PostWithID } from "../utils/types";
import { PostDescription } from "./PostDescription";
import EditPostModal from "./EditPostModal";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./postCard.css";
import CommentSection from "./CommentSection";
import SharePost from "./SharePost";
import { handleLikePost } from "../utils/PostLogic/handleLikePost";
import { onUserNameClick } from "../utils/PostLogic/onUserNameClick";
import CommentModal from "./CommentModal";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { updatePost } from "../Slices/postsSlice";
import { updatePostInIndexedDB } from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";

interface PostCardProps {
  id: string;
  currentUserUid: string;
  post: PostWithID;
  getPostsByTag: (hashTag: string) => void;
  style?: React.CSSProperties;
}

const PostCard: React.FC<PostCardProps> = ({
  currentUserUid,
  post,
  getPostsByTag,
  style,
}) => {
  const protectedAction = useProtectedAction();
  const [commentCount] = useState(post.commentCount);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]); // State to store comments for the modal
  const [showAllComments] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const dispatch = useDispatch();
  const [likes] = useState(post.likes?.length || 0);
  const [likedByUser, setLikedByUser] = useState(
    (Array.isArray(post.likes) && post.likes.includes(currentUserUid)) || false
  );

  const openCommentModal = async () => {
    setIsCommentModalOpen(true);
    await fetchCommentsForPost(post.id); // resolved type error
  };

  const fetchCommentsForPost = async (postId: string) => {
    console.log("try to fetch comments");
    try {
      const commentQuery = query(
        collection(db, "comments"),
        where("postId", "==", postId)
      );
      const commentSnapshot = await getDocs(commentQuery);
      const comments: CommentType[] = commentSnapshot.docs.map((doc) => ({
        ...(doc.data() as CommentType),
        commentId: doc.id, // using doc.id as the unique identifier
        likes: doc.data().likes || [],
      }));

      setComments(comments);
    } catch (error) {
      console.error("Failed to fetch comments from Firestore:", error);
    }
  };

  const onLikePostButtonClick = async () => {
    const newLikedByUser = !likedByUser;
    setLikedByUser(newLikedByUser); // Optimistic UI update

    try {
      await handleLikePost(post, currentUserUid, newLikedByUser, dispatch);
      // Redux and IndexedDB updates are handled inside handleLikePost
    } catch (error) {
      console.error("Failed to update like status:", error);
      setLikedByUser(likedByUser); // Revert optimistic updates in case of error
    }
  };

  const handleLikePostButtonClick = () => {
    protectedAction(() => {
      onLikePostButtonClick();
    });
  };

  // grab user from redux
  const user = useSelector(selectUser);

  const handleEditPost = () => {
    setIsEditModalOpen(true);
  };

  let formattedDate = "N/A"; // default value
  if (post.timestamp) {
    const jsDate = new Date(post.timestamp); // Creating a Date object from ISO string
    formattedDate = jsDate.toLocaleDateString();
  }

  const handleDeleteComment = async (commentId: string) => {
    console.log("Deleting comment with ID:", commentId);

    try {
      // Decrement the commentCount for the relevant post in Firestore
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, { commentCount: increment(-1) });

      const commentRef = doc(db, "comments", commentId);
      await deleteDoc(commentRef);

      // Update the post object locally to reflect the new comment count
      const updatedPost = { ...post, commentCount: post.commentCount - 1 };

      // Update Redux
      dispatch(updatePost(updatedPost));

      // Update IndexedDB
      await updatePostInIndexedDB(updatedPost);

      // Remove the comment from local state
      setComments(
        comments.filter((comment) => comment.commentId !== commentId)
      );
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleLikeComment = async (commentId: string, likes: string[]) => {
    if (user?.uid && !likes.includes(user.uid)) {
      try {
        const commentRef = doc(db, "comments", commentId);
        const updatedLikes = [...likes, user.uid];
        await updateDoc(commentRef, { likes: updatedLikes });
        // Update state or dispatch Redux action as needed
      } catch (error) {
        console.error("Error updating like in Firestore:", error);
      }
    }
  };

  const handleOnUserNameClick = () => {
    protectedAction(() => {
      onUserNameClick(post, dispatch);
    });
  };


  return (
    <Card className="post-card dynamic-height" style={{ ...style }}>
      <div className="card-content">
        <div className="post-header">
          <div className="header-top">
            <div className="likes-comments">
              {likes === 0 ? null : likes === 1 ? (
                <h5>{likes} like</h5>
              ) : (
                <h5>{likes} likes</h5>
              )}

              <button
                className="like-button"
                onClick={handleLikePostButtonClick}
              >
                {likedByUser ? "❤️" : "🤍"}
              </button>
            </div>
            <div className="share-edit-block">
              {user?.uid === post.user?.postUserId && (
                <div className="edit-block">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleEditPost}
                    className="edit-btn"
                  >
                    Edit Post
                  </Button>
                </div>
              )}
              <div className="share-button">
                <SharePost
                  // postLink={`https://displaygram.com/post/${post.id}`}
                  postLink={`https://displaygram.com/`}
                  postTitle="Check out this display!"
                  postId={post.id}
                />
              </div>
            </div>

            <div>view: {post.visibility}</div>
          </div>
          <div className="header-bottom">
            <div className="store-details">
              <div className="store-name-number">
                <h3>{post.selectedStore}<span> {post.storeNumber}</span></h3>
                
              </div>

              <h5>{post.storeAddress}</h5>
            </div>
          </div>
          <div className="post-user-details">
            <div onClick={handleOnUserNameClick}>
              by:<a href=""> {post.user.postUserName}</a>
            </div>
            <h5>{formattedDate}</h5>
          </div>
        </div>
        <div className="hash-tag-container">
          {/* Display hashtags above the image */}
          <PostDescription
            description={post.description}
            getPostsByTag={getPostsByTag}
          />
        </div>

        <div className="image-new-comment-box">
          {/* Display the post's image */}
          {post.imageUrl && (
            <img className="post-image" src={post.imageUrl} alt="Post image" />
          )}
          <div className="comment-button-container">
            {commentCount > 0 && (
              <button onClick={openCommentModal}>
                {showAllComments ? "Hide Comments" : `${commentCount} Comments`}
              </button>
            )}
          </div>

          <CommentSection post={post} />
        </div>
      </div>
      {isEditModalOpen ? (
        <EditPostModal
          post={post}
          isOpen={isEditModalOpen}
          setIsEditModalOpen={setIsEditModalOpen}
          // onClose={handleCloseEditModal}
          // onSave={handleSavePost}
        />
      ) : null}
      {isCommentModalOpen && comments.length > 0 && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          post={post}
          comments={comments}
          onLikeComment={handleLikeComment}
          likes={likes}
          onDeleteComment={handleDeleteComment}
          likedByUser={likedByUser}
        />
      )}
    </Card>
  );
};

const MemoizedPostCard = React.memo(PostCard);
export default MemoizedPostCard;
