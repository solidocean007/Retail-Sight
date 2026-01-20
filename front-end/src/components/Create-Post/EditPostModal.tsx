//EditPostModal.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { userDeletePost } from "../../utils/PostLogic/deletePostLogic";
import {
  CompanyAccountType,
  CompanyGoalWithIdType,
  FireStoreGalloGoalDocType,
  PostInputType,
  PostWithID,
  UserType,
} from "../../utils/types";
import { useDispatch, useSelector } from "react-redux";
import { showMessage } from "../../Slices/snackbarSlice";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import { Box, Chip, Dialog, Typography } from "@mui/material";
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
import { RootState, useAppDispatch } from "../../utils/store";
import AccountModalSelector from "./AccountModalSelector";
import BrandsSelector from "../ProductsManagement/BrandsSelector";
import { selectAllCompanyGoals } from "../../Slices/companyGoalsSlice";
import CompanyGoalDropdown from "./CompanyGoalDropdown";
import { getActiveCompanyGoalsForAccount } from "../../utils/helperFunctions/getActiveCompanyGoalsForAccount";
import { useIsDirty } from "../../hooks/useIsDirty";
import { selectUser } from "../../Slices/userSlice";
import CreatePostOnBehalfOfOtherUser from "./CreatePostOnBehalfOfOtherUser";
import GoalChangeConfirmation from "./GoalChangeConfirmation";
import { duplicatePostWithNewGoal } from "../../utils/PostLogic/dupilcatePostWithNewGoal";
import { updatePost } from "../../Slices/postsSlice";
import { useIntegrations } from "../../hooks/useIntegrations";
import GalloGoalDropdown from "./GalloGoalDropdown";
import { getActiveGalloGoalsForAccount } from "../../utils/helperFunctions/getActiveGalloGoalsForAccount";
import { selectAllGalloGoals } from "../../Slices/galloGoalsSlice";
import { normalizePost } from "../../utils/normalize";
import { markGalloAccountAsSubmitted } from "../../thunks/galloGoalsThunk";

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
  const { isEnabled } = useIntegrations();
  const wrapperRef = useRef(null); // its used on a div
  const [editablePost, setEditablePost] = useState<PostWithID>(post);
  const galloEnabled = isEnabled("galloAxis");
  const [allAccountsForCompany, setAllAccountsForCompany] = useState<
    CompanyAccountType[]
  >([]);
  const dispatch = useAppDispatch();
  const [description, setDescription] = useState<string>(
    post.description || ""
  );
  const [showGoalChangeConfirm, setShowGoalChangeConfirm] = useState(false);
  const userData = useSelector(selectUser)!;
  const [onBehalf, setOnBehalf] = useState<UserType | null>(null);
  const [useOnBehalf, setUseOnBehalf] = useState(false);
  const [migratedVisibility, setMigratedVisibility] = useState<
    "companyOnly" | "network" | "public"
  >(post.migratedVisibility || "network");

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
  const allGalloGoals = useSelector(selectAllGalloGoals);

  const allActiveGalloGoals = useMemo(() => {
    if (!galloEnabled || !editablePost.account?.accountNumber) return [];
    return getActiveGalloGoalsForAccount(
      editablePost.account.accountNumber,
      allGalloGoals
    );
  }, [galloEnabled, editablePost.account?.accountNumber, allGalloGoals]);

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

  const editModeGalloGoals = galloEnabled
    ? getActiveGalloGoalsForAccount(
        editablePost.account?.accountNumber,
        allGalloGoals
      )
    : [];

  const isDirty = useIsDirty(
    {
      description: post.description,
      totalCaseCount: post.totalCaseCount,
      brands: post.brands || [],
      companyGoalId: post.companyGoalId,
      productType: post.productType || [],
      postUserUid: post.postUserUid,
      accountNumber: post.account?.accountNumber ?? "",
      galloGoal: post.galloGoal, // 👈 original
    },
    {
      description,
      totalCaseCount: updatedCaseCount,
      brands: editablePost.brands || [],
      companyGoalId: selectedCompanyGoal?.id ?? null,
      productType: editablePost.productType || [],
      postUserUid: onBehalf?.uid ?? post.postUserUid,
      accountNumber: editablePost.account?.accountNumber ?? "",
      galloOppId: editablePost.galloGoal?.oppId ?? null, // 👈 edited
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
    setMigratedVisibility(post?.migratedVisibility || "network");
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
      migratedVisibility: updatedPost.migratedVisibility,
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

      // ✅ THIS WAS MISSING
      galloGoal: updatedPost.galloGoal ?? null,

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
      console.log("updated fields: ", updatedFields); // this doesnt log

      await updateDoc(postRef, updatedFields);
      await updatePostWithNewTimestamp(updatedPost.id);

      //--------------------------------------------------------
      // ⭐ OPTIMISTIC UI UPDATE (Redux + IndexedDB + filteredSets)
      //--------------------------------------------------------
      const mergedPost: PostWithID = {
        ...existing,
        ...updatedFields,
        id: updatedPost.id,
      };

      // after updateDoc(postRef, updatedFields);

      if (
        updatedPost.galloGoal?.goalId &&
        updatedPost.galloGoal?.oppId &&
        updatedPost.account?.accountNumber
      ) {
        const galloGoal = allGalloGoals.find(
          (g) => g.goalDetails.goalId === updatedPost.galloGoal?.goalId
        );

        if (galloGoal) {
          dispatch(
            markGalloAccountAsSubmitted({
              goal: galloGoal,
              accountNumber: updatedPost.account.accountNumber,
              postId: updatedPost.id,
            })
          );
        }
      }

      // 1. Redux main feed
      const normalized = normalizePost(mergedPost);
      dispatch(updatePost(normalized));

      // 2. IndexedDB cached posts
      await updatePostInIndexedDB(normalized);

      // 3. FilteredSets (for filter pages that were showing stale data)
      await updatePostInFilteredSets(normalized);

      //--------------------------------------------------------

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
    const hadOriginalCompanyGoal = !!post.companyGoalId;
    const companyGoalChanged = selectedCompanyGoal?.id !== post.companyGoalId;

    // ⚠️ Only show confirm when COMPANY goal changes
    if (hadOriginalCompanyGoal && companyGoalChanged) {
      setShowGoalChangeConfirm(true);
      return;
    }

    const extractedHashtags = extractHashtags(description);
    const extractedStarTags = extractStarTags(description);

    const updatedPost: PostWithID = {
      ...editablePost, // ✅ keeps galloGoal
      description,
      migratedVisibility,
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

  const handleGalloGoalSelection = (goal?: FireStoreGalloGoalDocType) => {
    if (!goal || !editablePost.account) return;

    const match = goal.accounts.find(
      (a) => a.distributorAcctId === editablePost.account?.accountNumber
    );

    if (!match?.oppId) {
      dispatch(showMessage("Selected goal has no oppId for this account"));
      return;
    }

    setEditablePost((prev) => ({
      ...prev,
      galloGoal: {
        goalId: goal.goalDetails.goalId,
        title: goal.goalDetails.goal,
        env: goal.goalDetails.goalEnv,
        oppId: match.oppId,
      },
    }));
  };

  const hadOriginalGoal = !!originalGoalId;
  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleCloseEditModal}
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
                    title="account button"
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

              {galloEnabled && (
                <Box mt={2}>
                  <GalloGoalDropdown
                    goals={editModeGalloGoals} // ✅ ALL goals
                    label="Gallo Goals"
                    loading={false}
                    onSelect={handleGalloGoalSelection}
                    selectedGoalId={editablePost.galloGoal?.goalId ?? null}
                  />
                </Box>
              )}

              <div className="visibility-select">
                <label htmlFor="visibilitySelect">
                  <strong>Post Visibility</strong>
                </label>
                <select
                  id="visibilitySelect"
                  value={migratedVisibility}
                  onChange={(e) =>
                    setMigratedVisibility(
                      e.target.value as "companyOnly" | "network"
                    )
                  }
                  className="input-select"
                >
                  <option value="network">
                    Network (Shared with Connections)
                  </option>
                  <option value="companyOnly">Company Only</option>
                </select>
                <p className="visibility-hint">
                  {migratedVisibility === "companyOnly"
                    ? "Visible only to your company’s team."
                    : "Visible to connected companies for shared brands."}
                </p>
              </div>

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
