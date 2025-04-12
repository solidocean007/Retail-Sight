//EditPostModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { userDeletePost } from "../../utils/PostLogic/deletePostLogic";
import Modal from "@mui/material/Modal";
import { PostWithID } from "../../utils/types";
import { useDispatch } from "react-redux";
import { showMessage } from "../../Slices/snackbarSlice";
import { doc, collection, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { deletePost, updatePost } from "../../Slices/postsSlice";
import { Input, InputAdornment, SelectChangeEvent } from "@mui/material";
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
} from "../../utils/database/indexedDBUtils";
import { updatePostWithNewTimestamp } from "../../utils/PostLogic/updatePostWithNewTimestamp";
import { extractHashtags, extractStarTags } from "../../utils/extractHashtags";
import TotalCaseCount from "../TotalCaseCount";
import CategorySelector, { CategoryType } from "./CategorySelector";
import ChannelSelector, { ChannelType } from "./ChannelSelector";

import { set } from "react-hook-form";
import { useOutsideAlerter } from "../../utils/useOutsideAlerter";

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
  const wrapperRef = useRef(null);
  const dispatch = useDispatch();
  const [description, setDescription] = useState<string>(
    post.description || ""
  );
  const [category, setCategory] = useState<CategoryType | "">(
    (post.category as CategoryType) || ""
  );
  const [channel, setChannel] = useState<ChannelType | "">(
    (post.channel as ChannelType) || ""
  );

  const [postVisibility, setPostVisibility] = useState<
    "public" | "company" | "supplier" | "private" | undefined
  >("public");
  const [updatedCaseCount, setUpdatedCaseCount] = useState(post.totalCaseCount);

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  // what is this useEffect for?
  useEffect(() => {
    setDescription(post?.description || "");
    setPostVisibility(post?.visibility || "public");
    setCategory(post?.category || "");
    setChannel(post?.channel || "");
  }, [post]);

  const handleSavePost = async (updatedPost: PostWithID) => {
    const postRef = doc(collection(db, "posts"), updatedPost.id);

    if (!category) {
      dispatch(showMessage("Please select a category"));
      return;
    }

    if (!channel) {
      dispatch(showMessage("Please select a channel"));
      return;
    }

    try {
      const updatedFields = {
        description: updatedPost.description,
        visibility: updatedPost.visibility,
        totalCaseCount: updatedPost.totalCaseCount,
        hashtags: updatedPost.hashtags,
        starTags: updatedPost.starTags,
        category: updatedPost.category,
        channel: updatedPost.channel,
      };

      // Update Firestore document
      await updateDoc(postRef, updatedFields);
      await updatePostWithNewTimestamp(post.id);

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
      totalCaseCount: updatedCaseCount,
      hashtags: extractedHashtags,
      starTags: extractedStarTags,
      category,
      channel,
    };

    handleSavePost(updatedPost);
  };

  const handleDeletePostClick = async () => {
    try {
      await userDeletePost({ post });
      await removePostFromIndexedDB(post.id);
      await deleteUserCreatedPostInIndexedDB(post.id);
      dispatch(deletePost(post.id));
      handleCloseEditModal();
      dispatch(showMessage("Post deleted successfully!"));
    } catch (error) {
      console.error("Failed to delete post:", error);
      dispatch(showMessage("Error deleting post."));
    }
  };

  useOutsideAlerter(wrapperRef, handleCloseEditModal);

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
            <CategorySelector
              selectedCategory={category} 
              onCategoryChange={setCategory}
            />

            <ChannelSelector
              selectedChannel={channel}
              onChannelChange={setChannel}
            />

            <TotalCaseCount
              handleTotalCaseCountChange={setUpdatedCaseCount}
              initialValue={post.totalCaseCount}
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
