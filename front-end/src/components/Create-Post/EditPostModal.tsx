//EditPostModal.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { userDeletePost } from "../../utils/PostLogic/deletePostLogic";
import {
  CompanyAccountType,
  CompanyGoalWithIdType,
  PostInputType,
  PostWithID,
  UserType,
} from "../../utils/types";
import { useDispatch, useSelector } from "react-redux";
import { showMessage } from "../../Slices/snackbarSlice";
import {
  doc,
  collection,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { db } from "../../utils/firebase";
import { deletePost, updatePost } from "../../Slices/postsSlice";
import { Chip, Dialog, Typography } from "@mui/material";
import "./editPostModal.css";

import { Button, TextField } from "@mui/material";

import "./editPostModal.css";
import {
  deleteUserCreatedPostInIndexedDB,
  purgeDeletedPostFromFilteredSets,
  removePostFromIndexedDB,
  updatePostInFilteredSets,
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
import { selectUser } from "../../Slices/userSlice";
import CreatePostOnBehalfOfOtherUser from "./CreatePostOnBehalfOfOtherUser";

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

  const userData = useSelector(selectUser)!;
  const [onBehalf, setOnBehalf] = useState<UserType | null>(null);
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

  const [selectedCompanyGoals, setSelectedCompanyGoals] = useState<
    CompanyGoalWithIdType[] | undefined
  >(allCompanyGoals.find((g) => g.id === post.companyGoalId));

  const isDirty = useIsDirty(
    {
      description: post.description,
      totalCaseCount: post.totalCaseCount,
      brands: post.brands || [],
      companyGoalIds: post.companyGoalIds,
      productType: post.productType || [],
      postUserUid: post.postUserUid,
    },
    {
      description,
      totalCaseCount: updatedCaseCount,
      brands: editablePost.brands || [],
      companyGoalIds: selectedCompanyGoals?.id ?? null, // string|null
      productType: editablePost.productType || [],
      postUserUid: onBehalf?.uid ?? post.postUserUid,
    }
  );

  useEffect(() => setEditablePost(post), [post]);

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
    setEditablePost((prev) => ({
      ...prev,
      account: {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountAddress: account.accountAddress,
        salesRouteNums: account.salesRouteNums || [],
        streetAddress: account.streetAddress || "",
      },
    }));

    dispatch(showMessage("Account selected. Don't forget to save!"));
    setOpenAccountModal(false);
  };

  useEffect(() => {
    setDescription(post?.description || "");
    setPostVisibility(post?.visibility || "public");
  }, [post]);

  const handleSavePost = async (updatedPost: PostWithID) => {
    // 1) Decide who “owns” this submission now
    const actor = onBehalf ?? post.postUser; // full UserType
    const creator = userData; // who actually clicked Save

    // 2) Prepare your post‐fields
    const postRef = doc(db, "posts", updatedPost.id);
    const updatedFields = {
      description: updatedPost.description,
      visibility: updatedPost.visibility,
      totalCaseCount: updatedPost.totalCaseCount,
      hashtags: updatedPost.hashtags,
      starTags: updatedPost.starTags,
      account: updatedPost.account,
      brands: updatedPost.brands ?? [],
      productType: updatedPost.productType ?? [],
      companyGoalIds: selectedCompanyGoals.map((g) => g.id),
      companyGoalTitles: selectedCompanyGoals.map((g) => g.goalTitle),

      // overwrite postUser → actor
      postUser: actor,
      postUserUid: actor.uid,
      postUserFirstName: actor.firstName,
      postUserLastName: actor.lastName,
      postUserProfileUrlThumbnail: actor.profileUrlThumbnail ?? "",
      postUserProfileUrlOriginal: actor.profileUrlOriginal ?? "",
      postUserEmail: actor.email,
      postUserCompanyName: actor.company,
      postUserSalesRouteNum: actor.salesRouteNum,
      postUserPhone: actor.phone,
      postUserRole: actor.role,

      // stamp who clicked save
      postedBy: creator,
      postedByUid: creator.uid,
      postedByFirstName: creator.firstName,
      postedByLastName: creator.lastName,
    };

    try {
      // A) update the post itself
      await updateDoc(postRef, updatedFields);
      await updatePostWithNewTimestamp(updatedPost.id);

      // B) if there's a goal selected, pull its array, filter out this postId,
      //    then re-push a single fresh entry with the correct actor
      for (const goal of selectedCompanyGoals) {
  const goalRef = doc(db, "companyGoals", goal.id);
  const snap = await getDoc(goalRef);
  const existing: any[] = snap.data()?.submittedPosts || [];
  const filtered = existing.filter((e) => e.postId !== updatedPost.id);
  filtered.push({
    postId: updatedPost.id,
    account: updatedPost.account,
    submittedBy: actor,
    submittedAt: updatedPost.displayDate,
  });
  await updateDoc(goalRef, { submittedPosts: filtered });
}


      // C) sync Redux + IndexedDB, close modal, toast
      dispatch(updatePost(updatedPost));
      await updatePostInIndexedDB(updatedPost);
      await updatePostInFilteredSets(post);

      handleCloseEditModal();
      dispatch(showMessage("Post edited successfully!"));
    } catch (err) {
      console.error("Error updating post:", err);
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

  const authToCreateOnBehalf =
    userData?.role === "admin" ||
    userData?.role === "super-admin" ||
    userData?.role === "employee";

  const handleFieldChange = <K extends keyof PostInputType>(
    field: K,
    value: PostInputType[K]
  ) => {
    setEditablePost((prev) => ({ ...prev, [field]: value }));
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
              {authToCreateOnBehalf && (
                <CreatePostOnBehalfOfOtherUser
                  onBehalf={onBehalf}
                  setOnBehalf={setOnBehalf}
                  handleFieldChange={handleFieldChange}
                />
              )}
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
