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
  Avatar,
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
// import "./viewSharedPost.css";
import LinkShareModal from "./LinkShareModal";
import { handleCommentLike } from "../utils/PostLogic/handleCommentLike";
import { formatDisplayDate } from "../utils/PostLogic/formatDisplayDate";
import { FeedImageSet } from "./PostCardRenderer";

// import TotalCaseCount from "./TotalCaseCount";

interface PostCardProps {
  imageSet: FeedImageSet;
  id: string;
  currentUserUid: string | undefined;
  post: PostWithID;
  style?: React.CSSProperties;
  getPostsByTag?: (
    hashTag: string,
    companyID?: string
  ) => Promise<PostWithID[]>;
  getPostsByStarTag?: (starTag: string) => Promise<PostWithID[]>;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePostSet?: React.Dispatch<
    React.SetStateAction<"posts" | "filteredPosts">
  >;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  postIdToScroll?: string | null; // New prop to control highlighting
}

const PostCard: React.FC<PostCardProps> = ({
  imageSet,
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
  // console.log(imageSet);
  // const { small, medium, original } = imageSet;
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
  // const feedList = [...small, ...medium];
  // const { feed, modal } = resolvePostImage(imageSet);

  useEffect(() => {
    let startTimer: NodeJS.Timeout;
    let stopTimer: NodeJS.Timeout;

    if (postIdToScroll === post.id) {
      startTimer = setTimeout(() => {
        setShouldHighlight(true);
        stopTimer = setTimeout(() => setShouldHighlight(false), 4000);
      }, 600);
    }

    return () => {
      clearTimeout(startTimer);
      clearTimeout(stopTimer);
    };
  }, [postIdToScroll, post.id]);

  // Use the postId to fetch the latest post data from the Redux store
  const updatedPost = useSelector((state: RootState) =>
    state.posts.posts.find((p) => p.id === post.id)
  );

  // Extract the likes count and likedByUser status from the updated post object
  const likesCount = updatedPost?.likes?.length || 0;
  const likedByUser =
    !!currentUserUid && updatedPost?.likes?.includes(currentUserUid);

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
      if (user) {
        await handleLikePost(post, user, newLikedByUser, dispatch);
      }
    } catch (error) {
      console.error("Failed to update like status:", error);
    }
  };

  const handleLikePostButtonClick = () => {
    protectedAction(onLikePostButtonClick);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, { commentCount: increment(-1) });

      const commentRef = doc(db, "comments", commentId);
      await deleteDoc(commentRef);

      const updatedPost = { ...post, commentCount: post.commentCount - 1 };
      dispatch(updatePost(updatedPost));
      await updatePostInIndexedDB(updatedPost);

      setComments(
        comments.filter((comment) => comment.commentId !== commentId)
      );

      await updatePostWithNewTimestamp(post.id); // ✅ Only if everything else worked
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleLikeComment = async (
    comment: CommentType,
    likes: string[] | undefined
  ) => {
    if (user?.uid && !likes?.includes(user.uid)) {
      try {
        await handleCommentLike({ comment, post, user, liked: true });
        await updatePostWithNewTimestamp(post.id); // ✅ Wait for like to finish
      } catch (error) {
        console.error("Error updating like in Firestore:", error);
      }
    }
  };

  useEffect(() => {
    if (comments.length === 0) {
      setIsCommentModalOpen(false);
    }
  }, [comments]);

  const handleOnUserNameClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Call this if you need to prevent the default action
    protectedAction(() => {
      onUserNameClick(post, dispatch);
    });
  };

  const handleVertIconClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      setShareModalOpen(true);

      const longUrl = `https://displaygram.com/p/${post.id}`;

      // 🔄 Start short-link generation in background
      const shortLinkPromise = handlePostShare(longUrl);

      // ⏳ Timeout fallback (5 seconds)
      const timeoutPromise = new Promise<string>((resolve) =>
        setTimeout(() => resolve(longUrl), 5000)
      );

      // 🏁 Whichever resolves first wins
      const finalUrl = await Promise.race([shortLinkPromise, timeoutPromise]);

      setShareLink(finalUrl);

      // 📱 If device supports native sharing
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Displaygram Post",
            text: "Check out this retail display!",
            url: finalUrl,
          });

          setShareModalOpen(false); // User shared → close modal
          return;
        } catch (err) {
          console.warn("Native share failed:", err);
        }
      }

      // 🖥 Desktop users will just see the modal with finalUrl
    } catch (err) {
      console.error("Error sharing post:", err);
    } finally {
      setIsSharing(false);
    }
  };

  const createdOnBehalf =
    post.postedBy && post.postUser?.uid !== post.postedBy.uid;

  return (
    <>
      <div className="card-border">
        <div
          className={`post-card-container ${
            shouldHighlight ? "shouldHighlight" : ""
          }`}
          style={{ position: "relative" }}
        >
          <div className="post-header">
            <div className="visibility">
              <div className="view-box">
                <p>view: {post.migratedVisibility}</p>
                <div className="post-card-controls">
                  <button
                    aria-label="settings"
                    aria-controls="post-card-menu"
                    aria-haspopup="true"
                    onClick={handleVertIconClick}
                  >
                    <MoreVert />
                  </button>
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

                    <h5>{formatDisplayDate(post.displayDate)}</h5>
                  </div>
                  <div className="store-address-box">
                    <h6>{post.account?.accountAddress}</h6>{" "}
                  </div>
                </div>
              </div>
              <div className="post-user-details">
                <div className="avatar-name">
                  {/* <div
                  className="post-user-avatar"
                  onClick={handleOnUserNameClick} // type mismatch here
                  style={{ cursor: "pointer" }}
                >
                  {post.postUserProfileUrlThumbnail ? (
                    <Avatar
                      src={post.postUserProfileUrlThumbnail}
                      alt={`${post.postUser?.firstName} ${post.postUser?.lastName}`}
                      sx={{ width: 30, height: 30 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 40, height: 40 }}>
                      {post.postUser?.firstName?.[0] || "?"}
                    </Avatar>
                  )}
                </div> */}

                  <div className="post-user-name">
                    <p>
                      <a href="#" onClick={handleOnUserNameClick}>
                        {post.postUser?.firstName && post.postUser?.lastName
                          ? `${post.postUser.firstName} ${post.postUser.lastName}`
                          : "Unknown User"}
                      </a>
                    </p>
                  </div>
                </div>

                <div className="created-On-Behalf">
                  {createdOnBehalf && (
                    <h5>
                      Created by: {post.postedBy?.firstName}{" "}
                      {post.postedBy?.lastName}
                    </h5>
                  )}
                </div>

                <div className="user-company-box">
                  <p>company: {post.postUser?.company}</p>{" "}
                </div>
              </div>
            </div>
          </div>
          {post.companyGoalId && (
            <div className="company-goal-banner textured-background">
              Company Goal: {post.companyGoalTitle}
            </div>
          )}
          {/* {post.galloGoal?.oppId || post.oppId && post.galloGoal && ( */}
          {post.galloGoal?.oppId && (
            <div className="gallo-goal-banner gallo-textured-background">
              Gallo Goal: {post.galloGoal?.title}
            </div>
          )}
          {post.brands && post.brands.length > 0 && (
            <div className="brands-list">
              {post.brands.map((brand) => (
                <Chip key={brand} label={brand} size="small" />
              ))}
            </div>
          )}
          {/* {post.id} */}
          <div className="description-image">
            <div className="like-quantity-row">
              <h4>
                {/* {post.productType} */}
                {post.totalCaseCount > 0 && ` quantity: ${post.totalCaseCount}`}
              </h4>
              <div className="likes-box">
                <button
                  className="like-heart like-button"
                  onClick={handleLikePostButtonClick}
                  disabled={!user}
                >
                  {likedByUser ? "❤️" : "🤍"}
                </button>

                {likesCount > 0 && (
                  <div
                    className={`likes-count-badge ${
                      likesCount >= 10 ? "is-double" : ""
                    } ${likesCount >= 100 ? "is-triple" : ""}`}
                    aria-label={`${likesCount} likes`}
                    title={`${likesCount} likes`}
                  >
                    <h6>{likesCount >= 100 ? "99+" : likesCount}</h6>
                  </div>
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
                <div className="image-aspect-wrapper">
                  {/* <FadeImage
                    srcList={feed}
                    alt="Post image"
                    onClick={() => {
                      setFullSizeImageUrl(original[0]);
                      setIsImageModalOpen(true);
                    }}
                  /> */}
                  {imageSet.feedSrc && (
                    <img
                      title="display image"
                      src={imageSet.feedSrc}
                      className="post-image"
                      loading="lazy"
                      onClick={() => {
                        setIsImageModalOpen(true);
                      }}
                    />
                  )}
                </div>
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
          {user && <CommentSection post={post} />}
        </div>
      </div>

      {isEditModalOpen && (
        <EditPostModal
          post={post}
          setSelectedCompanyAccount={setSelectedCompanyAccount}
          isOpen={isEditModalOpen}
          setIsEditModalOpen={setIsEditModalOpen}
        />
      )}

      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        post={post}
        comments={comments}
        onLikeComment={handleLikeComment}
        onDeleteComment={handleDeleteComment}
      />
      <ImageModal
        isOpen={isImageModalOpen}
        srcList={imageSet.modalChain}
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
