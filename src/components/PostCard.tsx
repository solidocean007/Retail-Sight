// PostCard.tsx
import React, { useEffect } from "react";
import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import { PostType } from "../utils/types"; // Assuming you have types defined somewhere
import { PostDescription } from "./PostDescription";
import EditPostModal from "./EditPostModal";
import { useSelector } from 'react-redux';
import { selectUser } from "../Slices/userSlice";
import { db } from "../firebase";
import { collection, doc, updateDoc, deleteDoc } from "firebase/firestore";


interface PostCardProps {
  post: PostType;
  getPostsByTag: (hashTag: string)=> void;
  style?: React.CSSProperties;
}

const PostCard: React.FC<PostCardProps> = ({ post, getPostsByTag, style }) => {
  const [comment, setComment] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const user = useSelector(selectUser);
  useEffect(()=>{
    console.log(user?.uid) // logs undefined
  },[user])

  const handleEditPost = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleSavePost = async (updatedPost: PostType) => {
    const postRef = doc(collection(db, 'posts'), updatedPost.id);
    try {
      await updateDoc(postRef, updatedPost);
      console.log("Post updated successfully");
      // After saving, you can close the modal
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating post: ", error);
    }
  };
  
  const handleDeletePost = async (postId: string) => {
    const postRef = doc(collection(db, 'posts'), postId);
    try {
      await deleteDoc(postRef);
      console.log("Post deleted successfully");
      // After deleting, you can close the modal and maybe refresh the post list
      handleCloseEditModal();
      // You may want to call a function here to refresh the list of posts or handle it in another way.
    } catch (error) {
      console.error("Error deleting post: ", error);
    }
  };
  
  

  let formattedDate = "N/A"; // default value
  if (post.timestamp && post.timestamp.toDate) {
    const jsDate = post.timestamp.toDate();
    formattedDate = jsDate.toLocaleDateString();
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value);
  };

  const submitComment = () => {
    // Logic to submit comment here
  };

  return (
    <Card style={{...style}}>
      <CardContent>
      {user?.uid && user.uid === post.user?.userId && ( // I cant check this because user is undefined.
        <Button onClick={handleEditPost}>Edit Post</Button>
        )}

        <Typography variant="h6">
          {post.user?.name} ({post.user?.company})
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
        {/* <Typography variant="body2">{post.description}</Typography>{" "} */}
        <PostDescription description={post.description} getPostsByTag={getPostsByTag} />
        {/* Display the post's description */}
        <TextField
          label="Comment"
          value={comment}
          onChange={handleCommentChange}
          fullWidth
        />
        <Button onClick={submitComment}>Post Comment</Button>
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
