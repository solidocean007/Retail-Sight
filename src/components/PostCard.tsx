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
import { updatePostWithNewTimestamp } from "../utils/PostLogic/updatePostWithNewTimestamp";
import { RootState } from "../utils/store";

interface PostCardProps {
  id: string;
  currentUserUid: string;
  post: PostWithID;
  getPostsByTag: (hashTag: string) => Promise<PostWithID[]>; // Updated return type
  style?: React.CSSProperties;
  setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
}

const PostCard: React.FC<PostCardProps> = ({
  currentUserUid,
  post,
  getPostsByTag,
  style,
  setSearchResults,
  setCurrentHashtag,
}) => {
  const dispatch = useDispatch();
  const protectedAction = useProtectedAction();
  const [commentCount] = useState(post.commentCount);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]); // State to store comments for the modal
  const [showAllComments] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const user = useSelector(selectUser);

  // Use the postId to fetch the latest post data from the Redux store
  const updatedPost = useSelector(
    (state: RootState) => state.posts.posts.find((p) => p.id === post.id) // Parameter 'p' implicitly has an 'any' type. This error appeared out of nowhere.
  );

  // Extract the likes count and likedByUser status from the updated post object
  const likesCount = updatedPost?.likes?.length || 0;
  const likedByUser = updatedPost?.likes?.includes(currentUserUid) || false;

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
    try {
      const newLikedByUser = !likedByUser;
      await handleLikePost(post, currentUserUid, newLikedByUser, dispatch);
    } catch (error) {
      console.error("Failed to update like status:", error);
    }
  };

  const handleLikePostButtonClick = () => {
    protectedAction(onLikePostButtonClick);
  };

  const handleEditPost = () => {
    setIsEditModalOpen(true);
  };

  let formattedDate = "N/A"; // default value
  if (post.displayDate) {
    const jsDate = new Date(post.displayDate); // Creating a Date object from ISO string
    formattedDate = jsDate.toLocaleDateString();
  }

  const handleDeleteComment = async (commentId: string) => {
    console.log("Deleting comment with ID:", commentId);
    await updatePostWithNewTimestamp(post.id);
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
      await updatePostWithNewTimestamp(post.id);
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

  const handleOnUserNameClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Call this if you need to prevent the default action
    protectedAction(() => {
      onUserNameClick(post, dispatch);
    });
  };

  return (
    <Card className="post-card dynamic-height" style={{ ...style }}>
      <div className="card-content">
        <div className="post-header">
          <div className="visibility">
            <div className="view-box">view: {post.visibility}</div>
          </div>
          <div className="header-top">
            <div className="likes-comments">
              {likesCount === 0 ? null : likesCount === 1 ? (
                <h5>{likesCount} like</h5>
              ) : (
                <h5>{likesCount} likes</h5>
              )}

              <button
                className="like-button"
                onClick={handleLikePostButtonClick}
              >
                {likedByUser ? "❤️" : "🤍"}
              </button>
            </div>
            <div className="share-button-container">
              <SharePost
                postLink={`https://displaygram.com/`}
                postTitle="Check out this display!"
                postId={post.id}
              />
            </div>

            <div className="visibility-edit-box">
              {user?.uid === post.user?.postUserId && (
                <div className="edit-box">
                  <div className="edit-block">
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleEditPost}
                      className="edit-btn"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="header-bottom">
            <div className="store-details">
              <div className="store-name-number">
                <h3>
                  {post.selectedStore}
                  <span> {post.storeNumber}</span>
                </h3>
              </div>

              <h5>{post.storeAddress}</h5>
            </div>
          </div>
          <div className="post-user-details">
            {/* <div onClick={handleOnUserNameClick}> */}
            <div>
              by:{"  "}
              <a href="#" onClick={handleOnUserNameClick}>
                {post.user.postUserName}
              </a>
            </div>
            <h4>date: {formattedDate}</h4>
          </div>
          <a href="#" onClick={(e) => e.preventDefault()}> 
                {/* create a onCompanyNameClick */}
            {post.user.postUserCompany}
          </a>
        </div>

        <div className="image-new-comment-box">
          <div className="hash-tag-container">
            {/* Display hashtags above the image */}
            <PostDescription
              description={post.description}
              getPostsByTag={getPostsByTag}
              setSearchResults={setSearchResults}
              setCurrentHashtag={setCurrentHashtag} // string is not assignable to null
            />
          </div>
          {/* Display the post's image */}
          {post.imageUrl && (
            <img className="post-image" src={post.imageUrl} alt="Post image" />
          )}
          {commentCount > 0 && (
            <div className="comment-button-container">
              {commentCount > 0 && (
                <button onClick={openCommentModal}>
                  {showAllComments
                    ? "Hide Comments"
                    : `${commentCount} Comments`}
                </button>
              )}
            </div>
          )}

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
          onDeleteComment={handleDeleteComment}
          likedByUser={likedByUser}
        />
      )}
    </Card>
  );
};

const MemoizedPostCard = React.memo(PostCard);
export default MemoizedPostCard;
