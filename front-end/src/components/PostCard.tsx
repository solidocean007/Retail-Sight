// PostCard.tsx
import React, { useEffect } from "react";
import { useState } from "react";
import {
  // Card,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  // Typography,
  CircularProgress,
  Chip,
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
import LinkShareModal from "./LinkShareModal";
import BlurUpImage from "./BlurUpImage";
import { getLowResUrl } from "../utils/helperFunctions/getLowResUrl";

// import TotalCaseCount from "./TotalCaseCount";

interface PostCardProps {
  id: string;
  currentUserUid: string;
  post: PostWithID;
  style: React.CSSProperties;
  getPostsByTag?: (
    hashTag: string,
    companyID?: string
  ) => Promise<PostWithID[]>;
  getPostsByStarTag?: (starTag: string) => Promise<PostWithID[]>;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  postIdToScroll?: string | null; // New prop to control highlighting
}

const PostCard: React.FC<PostCardProps> = ({
  id,
  currentUserUid,
  post,
  style,
  getPostsByTag,
  getPostsByStarTag,
  setCurrentHashtag,
  setActivePostSet,
  setIsSearchActive,
  postIdToScroll = null, // Default to null if not provided
}) => {
  const dispatch = useDispatch();
  const protectedAction = useProtectedAction();
  const [commentCount] = useState(post.commentCount);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [showAllComments] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const user = useSelector(selectUser);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  // New state for controlling the visibility of the SharePost component
  const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] =
    useState(false);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [fullSizeImageUrl, setFullSizeImageUrl] = useState("");

  const [_selectedCompanyAccount, setSelectedCompanyAccount] =
    useState<CompanyAccountType | null>(null);
  const [shouldHighlight, setShouldHighlight] = useState(false);

  useEffect(() => {
    if (postIdToScroll === post.id) {
      setShouldHighlight(true);

      // Optional: Clear highlight after scroll
      const timer = setTimeout(() => {
        setShouldHighlight(false);
      }, 2000); // give enough time for scroll and visibility

      return () => clearTimeout(timer);
    }
  }, [postIdToScroll, post.id]);

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
    try {
      setIsSharing(true);
      const link = await handlePostShare(post.id);

      if (navigator.share) {
        await navigator.share({
          title: "Displaygram Post",
          text: "Check out this post on Displaygram!",
          url: link,
        });
      } else {
        setShareLink(link);
        setShareModalOpen(true);
      }
    } catch (error) {
      console.error("Error sharing post:", error);
    } finally {
      setIsSharing(false);
      handleClose();
    }
  };

  const createdOnBehalf =
    post.postedBy && post.postUser?.uid !== post.postedBy.uid;

  return (
    <>
      <div
        className={`post-card-container ${
          shouldHighlight ? "shouldHighlight" : ""
        }`}
        style={{ position: "relative" }}
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
                <div>
                  {Boolean(anchorEl) && (
                    <Menu
                      id="post-card-menu"
                      anchorEl={anchorEl}
                      open={true}
                      onClose={() => setAnchorEl(null)}
                    >
                      <MenuItem
                        onClick={() => handleShare()}
                        disabled={isSharing}
                      >
                        {isSharing ? <CircularProgress size={20} /> : "Share"}
                      </MenuItem>
                      {(user?.uid === post.postUser?.uid ||
                        user?.role === "admin" ||
                        user?.role === "super-admin") && (
                        <MenuItem
                          onClick={() => {
                            setAnchorEl(null); // Close menu completely
                            setIsEditModalOpen(true); // Open edit modal
                          }}
                        >
                          Update Post
                        </MenuItem>
                      )}
                      <MenuItem
                        onClick={() => setIsAddToCollectionModalOpen(true)}
                      >
                        Add to Collections
                      </MenuItem>
                    </Menu>
                  )}
                </div>
                <Dialog
                  open={isAddToCollectionModalOpen}
                  onClose={() => setIsAddToCollectionModalOpen(false)}
                >
                  <AddPostToCollectionModal
                    post={post}
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
                {" "}
                {/* i need to eventually add store names to the filters*/}
                <div className="store-name-number">
                  <h3>{post.account?.accountName} </h3>

                  <h5>{formattedDate}</h5>
                </div>
                <div className="store-address-box">
                  <h5>{post.account?.accountAddress}</h5>{" "}
                </div>
              </div>
            </div>
            <div className="post-user-details">
              <div className="post-user-name">
                <p>
                  by:{" "}
                  <a href="#" onClick={handleOnUserNameClick}>
                    {post.postUser?.firstName && post.postUser?.lastName
                      ? `${post.postUser.firstName} ${post.postUser.lastName}`
                      : "Unknown User"}
                  </a>
                </p>
              </div>

              <div className="created-On-Behalf">
                {createdOnBehalf && (
                  <h5>
                    Created for: {post.postedBy?.firstName}{" "}
                    {post.postedBy?.lastName}
                  </h5>
                )}
              </div>

              <div className="user-company-box">
                <p>company: {post.postUser?.company}</p>{" "}
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

        <div className={post.companyGoalId ? "company-goal-box" : ""}>
          {post.companyGoalId
            ? `Company goal: ${post.companyGoalTitle}` /* this renders null */
            : post.oppId
            ? `Gallo goal: ${post.galloGoalTitle}`
            : ""}
        </div>
        {/* {post.brands && post.brands.length > 0 && (
          <div className="brands-list">
            {post.brands.map((brand) => (
              <Chip key={brand} label={brand} size="small" />
            ))}
          </div>
        )} */}
    {post.id}
    {post.productType}
        <div className="description-image">
          <div className="like-quantity-row">
            <h4>
              {post.productType}
              {post.totalCaseCount > 0 && ` quantity: ${post.totalCaseCount}`}
            </h4>
            <div className="likes-box">
              <button
                className="like-button"
                onClick={handleLikePostButtonClick}
                disabled={!user}
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
              <BlurUpImage
                lowResSrc={getLowResUrl(post.imageUrl)}
                fullResSrc={post.imageUrl}
                alt="Post image"
                openImageModal={handleImageClick}
              />
            )}
            {/* <img
              src={post.imageUrl}
              alt="Post image"
              className="post-image"
              onClick={handleImageClick}
            /> */}
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
        {user && <CommentSection post={post} />}
      </div>
      <EditPostModal
        post={post}
        setSelectedCompanyAccount={setSelectedCompanyAccount}
        isOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
      />

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        post={post}
        comments={comments}
        onLikeComment={handleLikeComment}
        onDeleteComment={handleDeleteComment}
        likedByUser={likedByUser}
      />
      <ImageModal
        isOpen={isImageModalOpen}
        src={fullSizeImageUrl}
        onClose={() => setIsImageModalOpen(false)}
      />
      <LinkShareModal
        open={shareModalOpen}
        handleClose={() => setShareModalOpen(false)}
        link={shareLink}
        loading={isSharing}
      />
    </>
  );
};

const MemoizedPostCard = React.memo(PostCard);
export default MemoizedPostCard;
