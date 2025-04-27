//EditPostModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { userDeletePost } from "../../utils/PostLogic/deletePostLogic";
import Modal from "@mui/material/Modal";
import { CompanyAccountType, PostWithID } from "../../utils/types";
import { useDispatch, useSelector } from "react-redux";
import { showMessage } from "../../Slices/snackbarSlice";
import { doc, collection, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { deletePost, updatePost } from "../../Slices/postsSlice";
import {
  Input,
  InputAdornment,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
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
import { useOutsideAlerter } from "../../utils/useOutsideAlerter";
import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { RootState } from "../../utils/store";
import AccountModalSelector from "./AccountModalSelector";

interface EditPostModalProps {
  post: PostWithID;
  // setPost: React.Dispatch<React.SetStateAction<PostWithID>>; // Added this line
  isOpen: boolean;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCompanyAccount: (account: CompanyAccountType) => void;
  // onClose: () => void;
  // onSave: (updatedPost: PostType) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  // setPost,
  isOpen,
  setIsEditModalOpen,
  setSelectedCompanyAccount,
  // onClose,
  // onSave,
}) => {
  const wrapperRef = useRef(null);
  const [allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
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
  const [openAccountModal, setOpenAccountModal] = useState(true);

  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  useEffect(() => {
    if (openAccountModal) {
      const loadAllCompanyAccounts = async () => {
        // setLoadingAccounts(true);
        try {
          const accounts = await fetchAllCompanyAccounts(companyId);
          setAllAccountsForCompany(accounts);
        } catch (error) {
          console.error("Error fetching all company accounts:", error);
        } finally {
          // setLoadingAccounts(false);
        }
      };

      loadAllCompanyAccounts();
    } else {
      // If toggled back to "My Stores", reset accounts
      // setAccountsToSelect(myAccounts);
    }
  }, [openAccountModal, companyId]);

  // Handler for Account Selection
  const handleAccountSelect = async (account: CompanyAccountType) => {
    try {
      const postRef = doc(db, "posts", post.id);

      await updateDoc(postRef, {
        account: {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountAddress: account.accountAddress,
          salesRouteNums: account.salesRouteNums || [],
        },
      });

      dispatch(
        updatePost({
          ...post,
          account: {
            accountNumber: account.accountNumber,
            accountName: account.accountName,
            accountAddress: account.accountAddress,
            salesRouteNums: account.salesRouteNums || [],
          },
        })
      );

      await updatePostInIndexedDB({
        ...post,
        account: {
          accountNumber: account.accountNumber,
          accountName: account.accountName,
          accountAddress: account.accountAddress,
          salesRouteNums: account.salesRouteNums || [],
        },
      });

      dispatch(showMessage("Account updated successfully!"));
      setOpenAccountModal(false);
    } catch (error) {
      console.error("Error updating post account:", error);
      dispatch(showMessage("Error updating account for post."));
    }
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
        account: updatedPost.account,
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

  useOutsideAlerter(wrapperRef, () => {
    if (!openAccountModal) {
      handleCloseEditModal();
    }
  });
  

  return (
    <>
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
            {/* {post.imageUrl && (
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
            )} */}
            {post.account && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Selected Account: {post.account.accountName}
              </Typography>
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
              {/* Account Search/Select */}
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={() => setOpenAccountModal(true)}
                sx={{ mt: 2 }}
              >
                Select Account
              </Button>

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
      <AccountModalSelector
        open={openAccountModal}
        onClose={() => setOpenAccountModal(false)}
        accounts={allAccountsForCompany}
        onAccountSelect={handleAccountSelect}
        isAllStoresShown={true}
        setIsAllStoresShown={() => {}} // dummy function
      />
    </>
  );
};

export default EditPostModal;
