// PostCard.tsx
import React from "react";
import { useState } from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { PostType } from "../utils/types";
import { PostDescription } from "./PostDescription";
import EditPostModal from "./EditPostModal";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import "./postCard.css";
import CommentSection from "./CommentSection";
import SharePost from "./SharePost";

// UserModalImports
import { handleUserNameClick } from "../utils/userModalUtils";
// import { selectIsUserModalOpen, selectSelectedUid } from "../Slices/userModalSlice";

interface PostCardProps {
  post: PostType;
  getPostsByTag: (hashTag: string) => void;
  style?: React.CSSProperties;
}

const PostCard: React.FC<PostCardProps> = ({ post, getPostsByTag, style }) => {
  const [showAllComments, setShowAllComments] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const dispatch = useDispatch();

  // grab user from redux
  const user = useSelector(selectUser);

  const onUserNameClick = (uid: string) => {
    handleUserNameClick(uid, dispatch);
  }

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
            {/* {user.user.uid === post.user?.postUserId && ( */}
            {user.currentUser?.uid === post.user?.postUserId && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleEditPost}
                className="edit-btn"
              >
                Edit Post
              </Button>
            )}
            <Typography onClick={() => onUserNameClick(post.user.postUserId)} variant="h6"> by: {post.user.postUserName}</Typography>
            {/* <Typography onClick={() => console.log('clicked!')} variant="h6"> by: {post.user.postUserName}</Typography> */}
            {/* <button onClick={() => onUserNameClick(post.user.postUserId)} > by: {post.user.postUserName}</button> */}
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
          <h5>{post.likes} likes</h5>
          {/* Placeholder for like button, logic to be implemented */}
          <button className="like-button">❤</button>
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
