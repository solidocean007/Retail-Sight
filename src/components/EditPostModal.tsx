//EditPostModal.tsx
import React, { useState, useEffect } from "react";
import { userDeletePost } from "../utils/PostLogic/deletePostLogic";
import Modal from "@mui/material/Modal";
import { PostType } from "../utils/types";
import { useDispatch } from "react-redux";
import { showMessage } from "../Slices/snackbarSlice";
import { doc, collection, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { updatePost } from "../Slices/postsSlice";
import { SelectChangeEvent } from "@mui/material";

import {
  Button,
  TextField,
  Select,
  MenuItem,
  Card,
  CardMedia,
} from "@mui/material";

import './editPostModal.css'

interface EditPostModalProps {
  post: PostType;
  isOpen: boolean;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  // onClose: () => void;
  // onSave: (updatedPost: PostType) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  setIsEditModalOpen,
  // onClose,
  // onSave,
}) => {

  const dispatch = useDispatch();
  const [description, setDescription] = useState<string>(
    post.description || ""
  );
  const [postVisibility, setPostVisibility] = useState<"public" | "company" | "supplier" | "private" | undefined>("public");


  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  useEffect(() => {
    setDescription(post?.description || ""); 
    setPostVisibility(post?.visibility || "public");
  }, [post]);

  const handleSavePost = async (updatedPost: PostType) => {
    const postRef = doc(collection(db, "posts"), updatedPost.id); 
    try {
      const updatedFields = {
        description: updatedPost.description,
        visibility: updatedPost.visibility,
        // add other fields you want to update here
    };
      await updateDoc(postRef, updatedFields);
      dispatch(updatePost(updatedPost));
      console.log('postRef', postRef)
      console.log("Post updated successfully");
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating post: ", error);
    }
  };

  const handleSave = () => {
    const updatedPost: PostType = {
      ...post,
      description,
      visibility: postVisibility,
    };
    handleSavePost(updatedPost);
    dispatch(showMessage("Post edited successfully!"));
  };

  console.log(post, "edit post");
  return (
    // <Modal open={isOpen} onClose={onClose}>
    <Modal open={isOpen}>
      <div className="edit-post-modal-container">
        {/* <h4 className="store-title">Store: {post.selectedStore}</h4>
        <h6 className="store-address">Address: {post.storeAddress}</h6> */}
        {post.imageUrl && (
          <div className="image-container">
            <Card>
              <CardMedia
                component="img"
                image={post.imageUrl}
                alt="Selected Preview"
                className="image"
              />
            </Card>
          </div>
        )}
        <div className="input-container">
          <TextField
            fullWidth
            variant="outlined"
            label="Description"
            multiline
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="description-input"
          />
          <Select
            fullWidth
            variant="outlined"
            value={postVisibility}
            onChange={(e: SelectChangeEvent<'public' | 'company' | 'supplier' | 'private' | undefined>) => {
              setPostVisibility(e.target.value as 'public' | 'company' | 'supplier' | 'private');
            }}
            className="select-input"
          >
            <MenuItem value="public">Public</MenuItem>
            {/* <MenuItem value="private">Private</MenuItem> */}
            <MenuItem value="company">Company</MenuItem>
            {/* <MenuItem value="group">Group</MenuItem> */}
          </Select>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleSave}
            className="save-btn"
          >
            Save Changes
          </Button>
          <Button
            className="delete-btn"
            onClick={() => {
              userDeletePost({ post, setIsEditModalOpen, dispatch });
              dispatch(showMessage("Post deleted successfully!"));
            }}
          >
            Delete Post
          </Button>
        </div>
      </div>
    </Modal>
  );
  
};

export default EditPostModal;
