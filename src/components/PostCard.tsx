// PostCard.tsx
import React, { useEffect } from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
} from "@mui/material";
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

interface PostCardProps {
  post: PostType;
  getPostsByTag: (hashTag: string) => void;
  style?: React.CSSProperties;
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
}

const PostCard: React.FC<PostCardProps> = ({ post, getPostsByTag, style }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const dispatch = useDispatch();
  const posts = useSelector((state) => state.posts); // posts is declared but value is never read.

  const user = useSelector(selectUser);
  useEffect(() => {
    // console.log(user.user?.uid);
  }, [user]);

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

  const handleDeletePost = async (postId: string) => {
    const postRef = doc(collection(db, "posts"), postId);
    try {
      await deleteDoc(postRef);
      dispatch(deletePost(postId));
      console.log("Post deleted successfully");
      handleCloseEditModal();
    } catch (error) {
      console.error("Error deleting post: ", error);
    }
  };

  let formattedDate = "N/A"; // default value
  if (post.timestamp) {
    const jsDate = new Date(post.timestamp); // Creating a Date object from ISO string
    formattedDate = jsDate.toLocaleDateString();
  }

  // console.log(post.user.postUserId, ": post userId");
  // console.log(post, ': post')

  return (
    <Card className="post-card dynamic-height" style={{ ...style }}>
        <CardContent>
            <div className="post-header">
                <Typography variant="h6">
                    {post.user.postUserName}
                </Typography>
                
                {user.user?.uid && user.user.uid === post.user?.postUserId && (
                    <Button variant="contained" color="primary" onClick={handleEditPost} className="edit-btn">
                        Edit Post
                    </Button>
                )}
            </div>

            {/* Display hashtags above the image */}
            <PostDescription
                description={post.description}
                getPostsByTag={getPostsByTag}
            />

            {/* Display the post's image */}
            {post.imageUrl && (
                <img className="post-image"
                    src={post.imageUrl}
                    alt="Post"
                />
            )}

            <div className="likes-comments">
                <h5>{post.likes} likes</h5>
                {/* Placeholder for like button, logic to be implemented */}
                <button className="like-button">❤</button>
                <p>{post.commentCount} Comments</p>
            </div>
            
            <CommentSection post={post}/>
            
        </CardContent>

        <EditPostModal
            post={post}
            isOpen={isEditModalOpen}
            onClose={handleCloseEditModal}
            onSave={handleSavePost}
            onDelete={handleDeletePost}
        />
    </Card>
);


};

export default PostCard;
