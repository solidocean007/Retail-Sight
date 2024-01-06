//EditPostModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { userDeletePost } from "../utils/PostLogic/deletePostLogic";
import Modal from "@mui/material/Modal";
import { PostWithID } from "../utils/types";
import { useDispatch } from "react-redux";
import { showMessage } from "../Slices/snackbarSlice";
import { doc, collection, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { updatePost } from "../Slices/postsSlice";
import { SelectChangeEvent } from "@mui/material";
import './editPostModal.css'

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
import { updatePostInIndexedDB } from "../utils/database/indexedDBUtils";
import { updatePostWithNewTimestamp } from "../utils/PostLogic/updatePostWithNewTimestamp";
import { extractHashtags } from "../utils/extractHashtags";

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
    await updatePostWithNewTimestamp(post.id);
    
    try {
      const updatedFields = {
        description: updatedPost.description,
        visibility: updatedPost.visibility,
        hashtags: updatedPost.hashtags,
        // add other fields you want to update here
      };
      await updateDoc(postRef, updatedFields);
      dispatch(updatePost(updatedPost));
      await updatePostInIndexedDB(updatedPost);
      // console.log("postRef", postRef);
      // console.log("Post updated successfully");
      handleCloseEditModal();
    } catch (error) {
      // console.error("Error updating post: ", error);
    }
  };

  const handleSave = () => {
    const extractedHashtags = extractHashtags(description);
    const updatedPost: PostWithID = {
      ...post,
      description,
      visibility: postVisibility,
      hashtags: extractedHashtags,
    };
    handleSavePost(updatedPost);
    dispatch(showMessage("Post edited successfully!"));
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
            <button
              className="delete-btn"
              onClick={() => {
                userDeletePost({ post, setIsEditModalOpen, dispatch });
                dispatch(showMessage("Post deleted successfully!"));
              }}
            >
              Delete Post
            </button>
          </div>
        </div>
      </>
    </Modal>
  );
};

export default EditPostModal;