// PostCard.tsx
import React, { useEffect } from "react";
import { useState } from "react";
import { Card, CardContent, Typography, Button } from "@mui/material";
import { PostType } from "../utils/types";
import { PostDescription } from "./PostDescription";
import EditPostModal from "./EditPostModal";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { db } from "../utils/firebase";
import { collection, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { deletePost, updatePost } from "../Slices/postsSlice";
import "./postCard.css";
import CommentSection from "./CommentSection";
import SharePost from "./SharePost";

interface PostCardProps {
  post: PostType;
  getPostsByTag: (hashTag: string) => void;
  style?: React.CSSProperties;
}

const PostCard: React.FC<PostCardProps> = ({ post, getPostsByTag, style }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const dispatch = useDispatch();
  // const posts = useSelector((state) => state.posts); // posts is declared but value is never read.

  const user = useSelector(selectUser);

  const handleEditPost = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSavePost = async (updatedPost: PostType) => {
    const postRef = doc(collection(db, "posts"), updatedPost.id);
    try {
      const { id, ...restOfUpdatedPost } = updatedPost; // id is assigned but value never used
      await updateDoc(postRef, restOfUpdatedPost);
      dispatch(updatePost(updatedPost));
      console.log("Post updated successfully");
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating post: ", error);
    }
  };

  let formattedDate = "N/A"; // default value
  if (post.timestamp) {
    const jsDate = new Date(post.timestamp); // Creating a Date object from ISO string
    formattedDate = jsDate.toLocaleDateString();
  }

  // console.log(post.user.postUserId, ": post userId");
  // console.log(": post");

  return (
    <Card className="post-card dynamic-height" style={{ ...style }}>
      <CardContent>
        <div className="post-header">
          <div className="store-details">
            <Typography variant="h6">{formattedDate}</Typography>
            <Typography variant="h6">{post.selectedStore}</Typography>
            <Typography variant="h6">{post.storeAddress}</Typography>
          </div>
          <div className="post-user-details">
            {user.user?.uid && user.user.uid === post.user?.postUserId && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleEditPost}
                className="edit-btn"
              >
                Edit Post
              </Button>
            )}
            <Typography variant="h6"> by: {post.user.postUserName}</Typography>
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

        <CommentSection post={post} />
      </CardContent>

      <EditPostModal
        post={post}
        isOpen={isEditModalOpen}
        setIsEditModalOpen={setIsEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSavePost}
      />
    </Card>
  );
};

const MemoizedPostCard = React.memo(PostCard);
export default MemoizedPostCard;
