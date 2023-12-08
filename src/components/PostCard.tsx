// PostCard.tsx
import React from "react";
import { useState } from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { PostWithID } from "../utils/types";
import { PostDescription } from "./PostDescription";
import EditPostModal from "./EditPostModal";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./postCard.css";
import CommentSection from "./CommentSection";
import SharePost from "./SharePost";
import { handleLikePost } from "../utils/PostLogic/handleLikePost";

// UserModalImports
import { handleUserNameClick } from "../utils/userModalUtils";

interface PostCardProps {
  id: string;
  currentUserUid: string;
  post: PostWithID;
  getPostsByTag: (hashTag: string) => void;
  style?: React.CSSProperties;
}

const PostCard: React.FC<PostCardProps> = ({
  id,
  currentUserUid,
  post,
  getPostsByTag,
  style,
}) => {
  const [showAllComments, setShowAllComments] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const dispatch = useDispatch();
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [likedByUser, setLikedByUser] = useState(
    post.likes?.includes(currentUserUid) || false
  );

  const onLikeButtonClick = async () => {
    const newLikedByUser = !likedByUser; // Optimistically toggle the liked state
    const newLikes = newLikedByUser ? likes + 1 : likes - 1; // Adjust like count optimistically

    setLikedByUser(newLikedByUser); // Set the new liked state
    setLikes(newLikes); // Set the new like count

    try {
      await handleLikePost(id, currentUserUid, newLikedByUser);
      // If you want to refetch or subscribe to the post to get the updated likes, do so here
    } catch (error) {
      console.error("Failed to update like status:", error);
      // Revert the optimistic updates in case of error
      setLikedByUser(likedByUser);
      setLikes(likes);
    }
  };

  // grab user from redux
  const user = useSelector(selectUser);

  const onUserNameClick = (uid: string) => {
    handleUserNameClick(uid, dispatch);
  };

  const handleEditPost = () => {
    setIsEditModalOpen(true);
  };

  let formattedDate = "N/A"; // default value
  if (post.timestamp) {
    const jsDate = new Date(post.timestamp); // Creating a Date object from ISO string
    formattedDate = jsDate.toLocaleDateString();
  }

  return (
    <Card
      className="post-card dynamic-height"
      style={{ ...style, height: showAllComments ? "auto" : "900px" }}
    >
      <CardContent className="card-content">
        <div className="post-header">
          <div className="store-details">
            <Typography variant="h6">{formattedDate}</Typography>
            <Typography variant="h6">{post.selectedStore}</Typography>
            <Typography variant="h6">{post.storeAddress}</Typography>
          </div>
          <div className="post-user-details">
            {user?.uid === post.user?.postUserId && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleEditPost}
                className="edit-btn"
              >
                Edit Post
              </Button>
            )}
            <Typography
              onClick={() => onUserNameClick(post.user.postUserId!)}
              variant="h6"
            >
              {" "}
              by: {post.user.postUserName}
            </Typography>
            <SharePost
              // postLink={`https://yourwebsite.com/post/${postId}`}
              postLink={`https://yourwebsite.com/post`}
              postTitle="Check out this awesome post!"
            />
          </div>
        </div>

        {/* Display hashtags above the image */}
        <PostDescription
          description={post.description}
          getPostsByTag={getPostsByTag}
        />

        {/* Display the post's image */}
        {post.imageUrl && (
          <img className="post-image" src={post.imageUrl} alt="Post" />
        )}

        <div className="likes-comments">
          <h5>{likes} likes</h5>
          <button className="like-button" onClick={onLikeButtonClick}>
            {likedByUser ? "❤️" : "🤍"}
          </button>
          <p>{post.commentCount} Comments</p>
        </div>

        <CommentSection
          post={post}
          showAllComments={showAllComments}
          setShowAllComments={setShowAllComments}
        />
      </CardContent>
      {isEditModalOpen ? (
        <EditPostModal
          post={post}
          isOpen={isEditModalOpen}
          setIsEditModalOpen={setIsEditModalOpen}
          // onClose={handleCloseEditModal}
          // onSave={handleSavePost}
        />
      ) : null}
    </Card>
  );
};

const MemoizedPostCard = React.memo(PostCard);
export default MemoizedPostCard;
