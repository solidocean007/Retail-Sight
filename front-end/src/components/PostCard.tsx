// PostCard.tsx
import React, { useRef } from "react";
import { useState } from "react";
import {
  Card,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  Typography,
} from "@mui/material";
import { CommentType, CompanyAccountType, PostWithID } from "../utils/types";
import { PostDescription } from "./PostDescription";
import EditPostModal from "./Create-Post/EditPostModal";
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
import { useOutsideAlerter } from "../utils/useOutsideAlerter";
import { set } from "react-hook-form";

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

  const menuRef = useRef<HTMLDivElement | null>(null);

  useOutsideAlerter(menuRef, () => setAnchorEl(null));

  const getAnimatedPostCardGradient = () => {
    const theme = document.body.getAttribute("data-theme");
    return getComputedStyle(document.body)
      .getPropertyValue(
        theme === "dark"
          ? "--post-card-animated-gradient-dark"
          : "--post-card-animated-gradient-light"
      )
      .trim();
  };

  // New state for controlling the visibility of the SharePost component
  const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] =
    useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState("");

  const [selectedCompanyAccount, setSelectedCompanyAccount] =
    useState<CompanyAccountType | null>(null);

  const handleImageClick = () => {
    // Assuming post.imageUrl is available and contains the 'resized' keyword
    if (post.imageUrl) {
      const originalImageUrl = post.imageUrl.replace("resized", "original");
      setFullSizeImageUrl(originalImageUrl);
      setIsImageModalOpen(true);
    }
  };

  // Use the postId to fetch the latest post data from the Redux store
  const updatedPost = useSelector((state: RootState) =>
    state.posts.posts.find((p) => p.id === post.id)
  );

  // Extract the likes count and likedByUser status from the updated post object
  const likesCount = updatedPost?.likes?.length || 0;
  const likedByUser = updatedPost?.likes?.includes(currentUserUid) || false;

  const openCommentModal = async () => {
    setIsCommentModalOpen(true);
    await fetchCommentsForPost(post.id);
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

  const createdOnBehalf =
    post.postedFor && post.createdBy?.uid !== post.postedFor.uid;

  return (
    <>
      <Card
        className="post-card textured-background"
        style={{
          // height: "70%", // 👈 important
          // width: "95%", // optional slight side margin
          // margin: "auto",
          ...style,
          backgroundImage: getAnimatedPostCardGradient(),
          backgroundSize: "600% 600%",
          animation: "gradientShift 10s ease infinite",
        }}
      >
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
                <div ref={menuRef}>
                  <Menu
                    id="post-card-menu"
                    anchorEl={anchorEl}
                    keepMounted
                    open={open}
                    onClose={() => setAnchorEl(null)}
                  >
                    <MenuItem onClick={() => handleShare()}>Share</MenuItem>
                    {(user?.uid === post.createdBy?.uid ||
                      user?.uid === post.userId ||
                      user?.role === "admin" ||
                      user?.role === "super-admin") && (
                      <MenuItem onClick={() => setIsEditModalOpen(true)}>
                        Edit
                      </MenuItem>
                    )}

                    <MenuItem
                      onClick={() => setIsAddToCollectionModalOpen(true)}
                    >
                      Add to Collection
                    </MenuItem>
                  </Menu>
                </div>
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
                    {post.account?.accountName}{" "}
                    {/* this matches the saved post but not the future account object.  should it do either or both?*/}
                    {/* <span> {post.storeNumber}</span> */}
                  </h3>

                  <h5>{formattedDate}</h5>
                </div>
                <div className="store-address-box">
                  <h5>{post.account?.accountAddress}</h5>{" "}
                  {/* this matches the saved post but not the future account object.  should it do either or both?*/}
                  {/* <h5>{post.id}</h5> */}
                </div>
              </div>
            </div>
            <div className="post-user-details">
              {/* <div onClick={handleOnUserNameClick}> */}
              <div className="post-user-name">
                <p>
                  by:{" "}
                  <a href="#" onClick={handleOnUserNameClick}>
                    {post.createdBy?.firstName && post.createdBy?.lastName
                      ? `${post.createdBy.firstName} ${post.createdBy.lastName}`
                      : "Unknown User"}
                  </a>
                </p>
              </div>

              <div className="created-On-Behalf">
                {createdOnBehalf && (
                  <h5>
                    Created for: {post.postedFor?.firstName}{" "}
                    {post.postedFor?.lastName}
                  </h5>
                )}
              </div>

              <div className="user-company-box">
                <p>company: {post.createdBy?.company}</p>{" "}
                {/* this matches the saved post but not the future account object.  should it do either or both?*/}
              </div>
            </div>
          </div>
        </div>
        {!post.account && (
          <div className="missing-account-banner">
            🚨 Missing Account Info — Please Edit
          </div>
        )}

        <Typography>
          {post.companyGoalId
            ? `Company goal: ${post.companyGoalTitle}` /* this renders null */
            : post.oppId
            ? `Gallo goal: ${post.galloGoalTitle}`
            : ""}
        </Typography>

        <div className="description-image">
          <div className="like-quantity-row">
            <h4>
              {post.category}
              {post.totalCaseCount > 0 && ` quantity: ${post.totalCaseCount}`}
            </h4>
            {/* {post.id} */}
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
          </div>
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

          <div className="activity-post-image-box">
            {post.imageUrl && (
              <img
                className="post-image"
                onClick={handleImageClick}
                src={post.imageUrl}
                alt="Post image"
              />
            )}
          </div>

          {commentCount > 0 && (
            <div className="comment-button-container">
              {commentCount > 0 && (
                <button
                  className="view-comment-button"
                  onClick={openCommentModal}
                >
                  {showAllComments
                    ? "Hide Comments"
                    : `${commentCount} Comments`}
                </button>
              )}
            </div>
          )}
        </div>
        <CommentSection post={post} />
      </Card>
      {isEditModalOpen ? (
        <EditPostModal
          post={post}
          // setPost={setPost}
          setSelectedCompanyAccount={setSelectedCompanyAccount}
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
