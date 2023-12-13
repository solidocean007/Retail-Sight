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
import { onUserNameClick } from "../utils/PostLogic/onUserNameClick";

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
    (Array.isArray(post.likes) && post.likes.includes(currentUserUid)) || false
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
        <div className="card-top">
          <div>view: {post.visibility}</div>
        </div>

        <div className="post-header">
          <div className="store-details">
            <h3>{post.selectedStore}</h3>
            <h5>{formattedDate}</h5>
            <h5>{post.storeAddress}</h5>
          </div>
          <div className="post-user-details">
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
                  // postLink={`https://yourwebsite.com/post/${postId}`}
                  postLink={`https://yourwebsite.com/post`}
                  postTitle="Check out this awesome post!"
                />
              </div>
            </div>

            <Typography
              onClick={() => onUserNameClick(post, dispatch)}
              variant="h6"
            >
              by:<a href=""> {post.user.postUserName}</a>
            </Typography>
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
