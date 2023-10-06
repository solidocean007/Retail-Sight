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
    console.log(user.user?.uid);
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

  // console.log(post.uid, ": post uid");
  console.log(post, ': post')

  return (
    <Card className="post-card" style={{ ...style }}>
      <CardContent>
        {user.user?.uid && user.user.uid === post.uid && (
          <Button onClick={handleEditPost}>Edit Post</Button>
        )}

        <Typography variant="h6">
          {post.user.name} {post.user?.company}
        </Typography>
        {/* <Typography color="textSecondary">{new Date(post.createdAt).toLocaleDateString()}</Typography> */}
        <Typography color="textSecondary">{formattedDate}</Typography>
        {/* Display the post's image */}
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post"
            style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
          />
        )}
        <PostDescription
          description={post.description}
          getPostsByTag={getPostsByTag}
        />
        {/* Display the post's description */}
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
