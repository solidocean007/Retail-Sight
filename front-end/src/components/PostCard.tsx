// PostCard.tsx
import React from "react";
import { useState } from "react";
import { Card, IconButton, Menu, MenuItem, Dialog } from "@mui/material";
import { CommentType, PostWithID } from "../utils/types";
import { PostDescription } from "./PostDescription";
import EditPostModal from "./EditPostModal";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./postCard.css";
import CommentSection from "./CommentSection";
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
import ImageModal from "./ImageModal";
import { MoreVert } from "@mui/icons-material";
import AddPostToCollectionModal from "./AddPostsToCollectionModal";
import { handlePostShare } from "../utils/handlePostShare";
import "./viewSharedPost.css";

// import TotalCaseCount from "./TotalCaseCount";

interface PostCardProps {
  id: string;
  currentUserUid: string;
  post: PostWithID;
  getPostsByTag: (hashTag: string, companyID?: string) => Promise<PostWithID[]>;
  getPostsByStarTag: (starTag: string) => Promise<PostWithID[]>;
  style?: React.CSSProperties;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
}

const PostCard: React.FC<PostCardProps> = ({
  currentUserUid,
  post,
  getPostsByTag,
  getPostsByStarTag,
  style,
  setCurrentHashtag,
  setActivePostSet,
  setIsSearchActive,
}) => {
  const dispatch = useDispatch();
  const protectedAction = useProtectedAction();
  const [commentCount] = useState(post.commentCount);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]); // State to store comments for the modal
  const [showAllComments] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const user = useSelector(selectUser);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  // New state for controlling the visibility of the SharePost component
  const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] =
    useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState("");

  const handleImageClick = () => {
    // Assuming post.imageUrl is available and contains the 'resized' keyword
    if (post.imageUrl) {
      const originalImageUrl = post.imageUrl.replace("resized", "original");
      setFullSizeImageUrl(originalImageUrl);
      setIsImageModalOpen(true);
    }
  };

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

  const handleVertIconClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShare = async () => {
    handlePostShare(post.id, post.token);
    // updatePostWithNewTimestamp(post.id);
    handleClose(); // Close the menu after sharing
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
    handleClose();
  };

  const handleAddToCollection = () => {
    setIsAddToCollectionModalOpen(true);
    handleClose();
  };

  return (
    <>
      <Card className="post-card dynamic-height" style={{ ...style }}>
        <div className="card-content">
          <div className="post-header">
            <div className="visibility">
              <div className="view-box">
                <p>view: {post.visibility}</p>
                <div className="dot-box">
                  <IconButton
                    aria-label="settings"
                    aria-controls="post-card-menu"
                    aria-haspopup="true"
                    onClick={handleVertIconClick}
                  >
                    <MoreVert />
                  </IconButton>
                  <Menu
                    id="post-card-menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={open}
                    onClose={handleClose}
                  >
                    <MenuItem onClick={handleShare}>Share</MenuItem>
                    {user?.uid === post?.postUserId && (
                      <MenuItem onClick={handleEdit}>Edit</MenuItem>
                    )}
                    <MenuItem onClick={handleAddToCollection}>
                      Add to Collection
                    </MenuItem>
                  </Menu>
                  <Dialog
                    open={isAddToCollectionModalOpen}
                    onClose={() => setIsAddToCollectionModalOpen(false)}
                  >
                    <AddPostToCollectionModal
                      postId={post.id}
                      onClose={() => setIsAddToCollectionModalOpen(false)}
                    />
                  </Dialog>
                </div>
              </div>
            </div>
            <div className="post-header-top"></div>
            <div className="header-bottom">
              <div className="details-date">
                <div className="store-details">
                  <div className="store-name-number">
                    <h3>
                      {post.selectedStore}
                      <span> {post.storeNumber}</span>
                    </h3>
                  </div>
                  <div className="store-address-box">
                    <h5>{post.storeAddress}</h5>
                  </div>
                </div>
                <h5>date: {formattedDate}</h5>
              </div>

              <div className="post-user-details">
                {/* <div onClick={handleOnUserNameClick}> */}
                <div className="post-user-name">
                  <p>by:</p>
                  <a href="#" onClick={handleOnUserNameClick}>
                    {post.postUserName}
                  </a>
                </div>
                <div className="user-company-box">
                  <p>company: </p>
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    {/* create a onCompanyNameClick */}
                    {post.postUserCompany}
                  </a>
                </div>
              </div>
            </div>
          </div>
          {/* <div className="token-box"> */}
            {/* {post.postUserId} */}
            {/* <h6>id: {post.id}</h6> */}
            {/* <h6>token: {post.token?.sharedToken}</h6> */}
            {/* <h6>token: {post.token?.tokenExpiry}</h6> */}
          {/* </div> */}

          <div className="like-quantity-row">
            <div className="likes-box">
              <button
                className="like-button"
                onClick={handleLikePostButtonClick}
              >
                {likedByUser ? "❤️" : "🤍"}
              </button>
              {likesCount === 0 ? null : likesCount === 1 ? (
                <h5>{likesCount} like</h5>
              ) : (
                <h5>{likesCount} likes</h5>
              )}
            </div>

            {post.totalCaseCount > 1 ? (
              <div className="post-quantity">
                <h4>Quantity: {post.totalCaseCount}</h4>
              </div>
            ) : null}
          </div>

          <div className="description-image">
            <div className="hash-tag-container">
              {/* Display hashtags above the image */}
              <PostDescription
                description={post.description}
                getPostsByTag={getPostsByTag}
                getPostsByStarTag={getPostsByStarTag}
                setCurrentHashtag={setCurrentHashtag}
                setActivePostSet={setActivePostSet}
                setIsSearchActive={setIsSearchActive}
              />
            </div>

            {post.imageUrl && (
              <img
                className="post-image"
                onClick={handleImageClick}
                src={post.imageUrl}
                alt="Post image"
              />
            )}
            {commentCount > 0 && (
              <div className="comment-button-container">
                {commentCount > 0 && (
                  <button className="view-comment-button" onClick={openCommentModal}>
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
      <ImageModal
        isOpen={isImageModalOpen}
        src={fullSizeImageUrl}
        onClose={() => setIsImageModalOpen(false)}
      />
    </>
  );
};

const MemoizedPostCard = React.memo(PostCard);
export default MemoizedPostCard;
