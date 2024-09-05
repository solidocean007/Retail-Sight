//EditPostModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { userDeletePost } from "../utils/PostLogic/deletePostLogic";
import Modal from "@mui/material/Modal";
import { PostWithID } from "../utils/types";
import { useDispatch } from "react-redux";
import { showMessage } from "../Slices/snackbarSlice";
import { doc, collection, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { deletePost, updatePost } from "../Slices/postsSlice";
import { SelectChangeEvent } from "@mui/material";
import "./editPostModal.css";

import {
  Button,
  TextField,
  Select,
  MenuItem,
  Card,
  CardMedia,
} from "@mui/material";

import "./editPostModal.css";
// import { useOutsideAlerter } from "../utils/useOutsideAlerter";
import {
  deleteUserCreatedPostInIndexedDB,
  removePostFromIndexedDB,
  updatePostInIndexedDB,
} from "../utils/database/indexedDBUtils";
import { updatePostWithNewTimestamp } from "../utils/PostLogic/updatePostWithNewTimestamp";
import { extractHashtags, extractStarTags } from "../utils/extractHashtags";

interface EditPostModalProps {
  post: PostWithID;
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
  const [postVisibility, setPostVisibility] = useState<
    "public" | "company" | "supplier" | "private" | undefined
  >("public");

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };
  const wrapperRef = useRef(null);

  // what is this useEffect for?
  useEffect(() => {
    setDescription(post?.description || "");
    setPostVisibility(post?.visibility || "public");
  }, [post]);

  const handleSavePost = async (updatedPost: PostWithID) => {
    const postRef = doc(collection(db, "posts"), updatedPost.id);
  
    try {
      const updatedFields = {
        description: updatedPost.description,
        visibility: updatedPost.visibility,
        hashtags: updatedPost.hashtags || [],  // Ensure hashtags are being passed
        starTags: updatedPost.starTags || [],  // Ensure starTags are being passed
        // add other fields you want to update here
      };
  
      // Update Firestore document
      await updateDoc(postRef, updatedFields);
  
      // Dispatch actions to update local state (Redux and IndexedDB)
      dispatch(updatePost(updatedPost));
      await updatePostInIndexedDB(updatedPost);
  
      // Close the modal and notify success
      handleCloseEditModal();
      dispatch(showMessage("Post edited successfully!"));
    } catch (error) {
      console.error("Error updating post: ", error);
      dispatch(showMessage("Error updating post."));
    }
  };
  
  const handleSave = () => {
    const extractedHashtags = extractHashtags(description);
    const extractedStarTags = extractStarTags(description);
  
    const updatedPost: PostWithID = {
      ...post,
      description,
      visibility: postVisibility,
      hashtags: extractedHashtags,  // Assign extracted hashtags
      starTags: extractedStarTags,  // Assign extracted starTags
    };
  
    handleSavePost(updatedPost);
  };
  
  

  const handleDeletePostClick = async () => {
    try {
      await userDeletePost({ post }); // Assume userDeletePost now only needs postId
      dispatch(deletePost(post.id));
      handleCloseEditModal();
      dispatch(showMessage("Post deleted successfully!"));
    } catch (error) {
      console.error("Failed to delete post:", error);
      dispatch(showMessage("Error deleting post."));
    }
  };

  return (
    <Modal open={isOpen}>
      <>
        <div className="edit-post-modal-container" ref={wrapperRef}>
          <div className="edit-post-header">
            <button
              className="close-modal-button"
              onClick={handleCloseEditModal}
            >
              &times; {/* This is a common symbol used for close buttons */}
            </button>
          </div>
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
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="description-input"
            />
            <Select
              fullWidth
              variant="outlined"
              value={postVisibility}
              onChange={(
                e: SelectChangeEvent<
                  "public" | "company" | "supplier" | "private" | undefined
                >
              ) => {
                setPostVisibility(
                  e.target.value as
                    | "public"
                    | "company"
                    | "supplier"
                    | "private"
                );
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
            <button className="delete-btn" onClick={handleDeletePostClick}>
              Delete Post
            </button>
          </div>
        </div>
      </>
    </Modal>
  );
};

export default EditPostModal;
