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
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
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
import CustomConfirmation from "../CustomConfirmation";
import GoalChangeConfirmation from "./GoalChangeConfirmation";
import { duplicatePostWithNewGoal } from "../../utils/PostLogic/dupilcatePostWithNewGoal";

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
  console.log("post in EditPostModal: ", post.id, post);
  const wrapperRef = useRef(null); // its used on a div
  const [editablePost, setEditablePost] = useState<PostWithID>(post);

  const [allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
  const dispatch = useDispatch();
  const [description, setDescription] = useState<string>(
    post.description || ""
  );
  const [showGoalChangeConfirm, setShowGoalChangeConfirm] = useState(false);

  const userData = useSelector(selectUser)!;
  const [onBehalf, setOnBehalf] = useState<UserType | null>(null);
  const [useOnBehalf, setUseOnBehalf] = useState(false);
  const [postVisibility, setPostVisibility] = useState<
    "public" | "company" | "supplier" | "private" | undefined
  >("public");
  const [updatedCaseCount, setUpdatedCaseCount] = useState(post.totalCaseCount);

  const handleCloseEditModal = () => {
    setEditablePost(post);
    setIsEditModalOpen(false);
  };
  const [openAccountModal, setOpenAccountModal] = useState(false);

  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const allCompanyGoals = useSelector(selectAllCompanyGoals);
  const [originalGoalId] = useState(post.companyGoalId); // capture on mount

  const activeCompanyGoals = useMemo(() => {
    const acct = editablePost.account?.accountNumber;
    if (!acct || allCompanyGoals.length === 0) return [];

    const active = getActiveCompanyGoalsForAccount(acct, allCompanyGoals);

    // Include original goal if missing from active list
    const originalGoal = allCompanyGoals.find((g) => g.id === originalGoalId);
    const isOriginalMissing =
      originalGoal && !active.some((g) => g.id === originalGoalId);

    return isOriginalMissing ? [...active, originalGoal] : active;
  }, [editablePost.account?.accountNumber, allCompanyGoals, originalGoalId]);

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
      postUserUid: post.postUserUid,
      accountNumber: post.account?.accountNumber ?? "", // ✅ enforce string
    },
    {
      description,
      totalCaseCount: updatedCaseCount,
      brands: editablePost.brands || [],
      companyGoalId: selectedCompanyGoal?.id ?? null,
      productType: editablePost.productType || [],
      postUserUid: onBehalf?.uid ?? post.postUserUid,
      accountNumber: editablePost.account?.accountNumber ?? "", // ✅ enforce string
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
      // keep flattened fields in sync too
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountAddress: account.accountAddress,
      streetAddress: account.streetAddress || "",
      city: account.city || "",
      state: account.state || "",
      chain: account.chain || "",
      chainType: account.chainType || "",
    }));
    dispatch(showMessage("Account selected. Don't forget to save!"));
    setOpenAccountModal(false);
  };

  useEffect(() => {
    setDescription(post?.description || "");
    setPostVisibility(post?.visibility || "public");
  }, [post]);

  const handleSavePost = async (updatedPost: PostWithID) => {
    const postRef = doc(db, "posts", updatedPost.id);
    const snap = await getDoc(postRef);
    const existing = snap.data() || {};

    const creator = userData; // supervisor/editor
    const actor = useOnBehalf && onBehalf ? onBehalf : post.postUser;

    const ownershipCorrection =
      useOnBehalf && onBehalf && onBehalf.uid !== post.postUserUid;

    const updatedFields: any = {
      description: updatedPost.description,
      visibility: updatedPost.visibility,
      totalCaseCount: updatedPost.totalCaseCount,
      hashtags: updatedPost.hashtags,
      starTags: updatedPost.starTags,
      account: updatedPost.account,
      accountAddress: updatedPost.accountAddress,
      accountName: updatedPost.accountName,
      accountNumber: updatedPost.accountNumber,
      chain: updatedPost.chain,
      chainType: updatedPost.chainType,
      city: updatedPost.city,
      brands: updatedPost.brands ?? [],
      productType: updatedPost.productType ?? [],
      companyGoalId: selectedCompanyGoal?.id ?? null,
      companyGoalTitle: selectedCompanyGoal?.goalTitle ?? null,

      // audit trail
      lastEditedByUid: creator.uid,
      lastEditedByFirstName: creator.firstName,
      lastEditedByLastName: creator.lastName,
      lastEditedAt: new Date().toISOString(),
    };

    if (ownershipCorrection) {
      // ✅ Supervisor switched post to another user
      updatedFields.postUser = actor;
      updatedFields.postUserUid = actor.uid;
      updatedFields.postUserFirstName = actor.firstName;
      updatedFields.postUserLastName = actor.lastName;
      updatedFields.postUserEmail = actor.email;
      updatedFields.postUserCompanyName = actor.company;
      updatedFields.postUserSalesRouteNum = actor.salesRouteNum ?? null;
      updatedFields.postUserRole = actor.role;

      // ✅ Redefine the creator to the supervisor doing it on behalf
      updatedFields.createdByUid = creator.uid;
      updatedFields.createdByFirstName = creator.firstName;
      updatedFields.createdByLastName = creator.lastName;
      updatedFields.createdAt = existing.createdAt || new Date().toISOString();
    } else {
      // Preserve existing creator if present
      if (existing.createdByUid) {
        updatedFields.createdByUid = existing.createdByUid;
        updatedFields.createdByFirstName = existing.createdByFirstName;
        updatedFields.createdByLastName = existing.createdByLastName;
        updatedFields.createdAt = existing.createdAt;
      } else {
        // Backfill if missing
        updatedFields.createdByUid = post.postUserUid;
        updatedFields.createdByFirstName = post.postUserFirstName;
        updatedFields.createdByLastName = post.postUserLastName;
        updatedFields.createdAt = post.displayDate || new Date().toISOString();
      }
    }

    try {
      await updateDoc(postRef, updatedFields);
      await updatePostWithNewTimestamp(updatedPost.id);

      // Update goal submittedPosts array
      if (selectedCompanyGoal?.id) {
        const goalRef = doc(db, "companyGoals", selectedCompanyGoal.id);
        const snap = await getDoc(goalRef);
        const existingPosts: any[] = snap.data()?.submittedPosts || [];

        const filtered = existingPosts.filter(
          (e) => e.postId !== updatedPost.id
        );
        filtered.push({
          postId: updatedPost.id,
          account: updatedPost.account,
          submittedBy: actor,
          submittedAt: updatedPost.displayDate,
        });

        await updateDoc(goalRef, { submittedPosts: filtered });
      }

      handleCloseEditModal();
      dispatch(showMessage("Post edited successfully!"));
    } catch (err) {
      console.error("Error updating post:", err);
      dispatch(showMessage("Error updating post."));
    }
  };

  const handleSave = () => {
    const hadOriginalGoal = !!post.companyGoalId;

    if (hadOriginalGoal && selectedCompanyGoal?.id !== post.companyGoalId) {
      setShowGoalChangeConfirm(true);
      return;
    }
    const extractedHashtags = extractHashtags(description);
    const extractedStarTags = extractStarTags(description);

    const updatedPost: PostWithID = {
      ...editablePost,
      description,
      // visibility: postVisibility ?? post.visibility,
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

      // 🔥 Delete from Firestore (and Storage, if your logic handles images)
      await userDeletePost({ post, dispatch });
      console.log("✅ Finished Firestore + Storage deletion for:", post.id);

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

  const hadOriginalGoal = !!originalGoalId;
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
            {authToCreateOnBehalf && (
              <div className="onbehalf-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={useOnBehalf}
                    onChange={(e) => setUseOnBehalf(e.target.checked)}
                  />
                  Edit on behalf of another user
                </label>
              </div>
            )}
            <div className="edit-post-top">
              {authToCreateOnBehalf && useOnBehalf && (
                <CreatePostOnBehalfOfOtherUser
                  onBehalf={onBehalf}
                  setOnBehalf={setOnBehalf}
                  handleFieldChange={handleFieldChange}
                />
              )}
              {editablePost.account && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <button
                    className="btn-outline"
                    onClick={() => setOpenAccountModal(true)}
                  >
                    <Chip
                      label={editablePost.account.accountName}
                      size="small"
                      sx={{
                        // backgroundColor: "var(--gray-100)",
                        color: "var(--text-color)",
                      }}
                    />
                  </button>
                </div>
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

              {activeCompanyGoals.length > 0 && hadOriginalGoal && (
                <>
                  {selectedCompanyGoal?.id == originalGoalId && (
                    <div className="edit-post-info-banner">
                      <strong>Heads up:</strong>
                      If you change the goal you can save this post with it or
                      have the option to duplicate this post with an additional
                      goal.
                    </div>
                  )}
                  {selectedCompanyGoal &&
                    selectedCompanyGoal?.id !== originalGoalId && (
                      <div className="edit-post-info-banner">
                        <strong>Heads up:</strong>
                        You’ll be asked whether to update this post or create a
                        new one when you save changes.
                      </div>
                    )}
                </>
              )}

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

              <button className="btn-error" onClick={handleDeletePostClick}>
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
      <GoalChangeConfirmation
        isOpen={showGoalChangeConfirm}
        onClose={() => setShowGoalChangeConfirm(false)}
        onReplace={() => {
          // Just patch the goal ID and title directly
          const updatedPost = {
            ...editablePost,
            companyGoalId: selectedCompanyGoal?.id || null,
            companyGoalTitle: selectedCompanyGoal?.goalTitle || null,
          };
          handleSavePost(updatedPost);
          setShowGoalChangeConfirm(false);
        }}
        onDuplicate={async () => {
          if (!selectedCompanyGoal) return;

          await duplicatePostWithNewGoal(
            editablePost,
            selectedCompanyGoal.id,
            selectedCompanyGoal.goalTitle,
            dispatch
          );

          setShowGoalChangeConfirm(false);
          setIsEditModalOpen(false);
        }}
      />
    </>
  );
};

export default EditPostModal;
