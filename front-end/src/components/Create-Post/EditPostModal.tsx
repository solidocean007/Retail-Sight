//EditPostModal.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { userDeletePost } from "../../utils/PostLogic/deletePostLogic";
import {
  CompanyAccountType,
  CompanyGoalWithIdType,
  PostWithID,
} from "../../utils/types";
import { useDispatch, useSelector } from "react-redux";
import { showMessage } from "../../Slices/snackbarSlice";
import { doc, collection, updateDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { deletePost, updatePost } from "../../Slices/postsSlice";
import { Chip, Dialog, SelectChangeEvent, Typography } from "@mui/material";
import "./editPostModal.css";

import { Button, TextField, Select, MenuItem } from "@mui/material";

import "./editPostModal.css";
import {
  deleteUserCreatedPostInIndexedDB,
  purgeDeletedPostFromFilteredSets,
  removePostFromIndexedDB,
  updatePostInIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { updatePostWithNewTimestamp } from "../../utils/PostLogic/updatePostWithNewTimestamp";
import { extractHashtags, extractStarTags } from "../../utils/extractHashtags";
import TotalCaseCount from "../TotalCaseCount";
import { fetchAllCompanyAccounts } from "../../utils/helperFunctions/fetchAllCompanyAccounts";
import { RootState } from "../../utils/store";
import AccountModalSelector from "./AccountModalSelector";
import BrandsSelector from "../ProductsManagement/BrandsSelector";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import CompanyGoalDropdown from "./CompanyGoalDropdown";
import { getActiveCompanyGoalsForAccount } from "../../utils/helperFunctions/getActiveCompanyGoalsForAccount";
import { useIsDirty } from "../../hooks/useIsDirty";

interface EditPostModalProps {
  post: PostWithID;
  isOpen: boolean;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCompanyAccount: (account: CompanyAccountType) => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  setIsEditModalOpen,
}) => {
  const wrapperRef = useRef(null); // its used on a div
  const [editablePost, setEditablePost] = useState<PostWithID>(post);
  const [allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
  const dispatch = useDispatch();
  const [description, setDescription] = useState<string>(
    post.description || ""
  );

  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    post.brands || []
  );
  const userId = useSelector((state: RootState) => state.user.currentUser?.uid);
  const [postVisibility, setPostVisibility] = useState<
    "public" | "company" | "supplier" | "private" | undefined
  >("public");
  const [updatedCaseCount, setUpdatedCaseCount] = useState(post.totalCaseCount);

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };
  const [openAccountModal, setOpenAccountModal] = useState(false);

  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const allCompanyGoals = useSelector(selectAllCompanyGoals);
  const activeCompanyGoals = useMemo(() => {
    if (!post.account?.accountNumber || allCompanyGoals.length === 0) return [];
    return getActiveCompanyGoalsForAccount(
      post.account.accountNumber,
      allCompanyGoals
    );
  }, [post.account?.accountNumber, allCompanyGoals]);

  const [selectedCompanyGoal, setSelectedCompanyGoal] = useState<
    CompanyGoalWithIdType | undefined
  >(allCompanyGoals.find((g) => g.id === post.companyGoalId));

  const isDirty = useIsDirty(
    {
      description: post.description,
      totalCaseCount: post.totalCaseCount,
      brands: post.brands || [],
      companyGoalId: post.companyGoalId,
      productType: post.productType || [],
    },
    {
      description,
      totalCaseCount: updatedCaseCount,
      brands: editablePost.brands || [],
      companyGoalId: selectedCompanyGoal?.id ?? null, // string|null
      productType: editablePost.productType || [],
    }
  );

 useEffect(() => setEditablePost(post), [post])


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
        totalCaseCount: updatedPost.totalCaseCount,
        hashtags: updatedPost.hashtags,
        starTags: updatedPost.starTags,
        account: updatedPost.account,
        brands: updatedPost.brands ?? [],
        productType: updatedPost.productType ?? [],
        companyGoalId: selectedCompanyGoal?.id || null,
        companyGoalTitle: selectedCompanyGoal?.goalTitle || null,
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
      visibility: postVisibility ?? post.visibility,
      totalCaseCount: updatedCaseCount,
      hashtags: extractedHashtags,
      starTags: extractedStarTags,
      brands: editablePost.brands,
      productType: editablePost.productType,
      companyGoalId: selectedCompanyGoal?.id || null,
      companyGoalTitle: selectedCompanyGoal?.goalTitle || null,
    };

    handleSavePost(updatedPost);
  };

  const handleDeletePostClick = async () => {
    try {
      console.log("🗑️ Starting delete for post:", {
        id: post.id,
        description: post.description,
        from: "EditPostModal",
      });

      await userDeletePost({ post });
      console.log("✅ Finished Firestore + Storage deletion for:", post.id);

      await removePostFromIndexedDB(post.id);
      await purgeDeletedPostFromFilteredSets(post.id);

      await deleteUserCreatedPostInIndexedDB(post.id);

      dispatch(deletePost(post.id));
      console.log("🧹 Dispatched Redux delete for:", post.id);

      handleCloseEditModal();
      dispatch(showMessage("Post deleted successfully!"));
    } catch (error) {
      console.error("❌ Failed to delete post:", error);
      dispatch(showMessage("Error deleting post."));
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleCloseEditModal} // Type '() => void' is not assignable to type 'ReactNode'.
        aria-labelledby="edit-post-dialog"
      >
        {" "}
        <>
          <div className="edit-post-modal-container" ref={wrapperRef}>
            <div
              className="edit-post-header"
              style={{ justifyContent: "space-between", alignItems: "center" }}
            >
              <Typography variant="h6">Edit Post</Typography>
              <Button onClick={handleCloseEditModal} size="small">
                ×
              </Button>
            </div>
            <div className="edit-post-top">
              {post.account && (
                <Chip
                  label={post.account.accountName}
                  size="small"
                  sx={{
                    mb: 2,
                    backgroundColor: "var(--gray-100)",
                    color: "var(--text-color)",
                  }}
                />
              )}
              {isDirty && (
                <button className="btn btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
              )}
            </div>

            <div className="input-container">
              <TextField
                fullWidth
                variant="filled"
                label="Description"
                multiline
                minRows={1} // start at one line
                maxRows={2} // expand up to two lines
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mb: 2 }}
              />

              <CompanyGoalDropdown
                goals={activeCompanyGoals}
                label="Company Goal"
                loading={false}
                selectedGoal={selectedCompanyGoal}
                onSelect={(goal) => {
                  setSelectedCompanyGoal(goal);
                }}
              />

              <BrandsSelector
                selectedBrands={editablePost.brands ?? []}
                selectedProductType={editablePost.productType ?? []}
                onChange={(brands, productTypes) =>
                  setEditablePost((prev) => ({
                    ...prev,
                    brands,
                    productType: productTypes,
                  }))
                }
              />

              <TotalCaseCount
                handleTotalCaseCountChange={setUpdatedCaseCount}
                initialValue={post.totalCaseCount}
              />

              <button className="btn btn-error" onClick={handleDeletePostClick}>
                Delete Post
              </button>
            </div>
          </div>
        </>
      </Dialog>
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
