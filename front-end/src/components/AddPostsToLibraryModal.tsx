// src/components/AddPostToLibraryModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Dialog } from "@mui/material";

import { db } from "../utils/firebase";
import { selectUser } from "../Slices/userSlice";
import {
  CollectionWithId,
  PlaybookPostSnapshot,
  PostWithID,
} from "../utils/types";
import { addOrUpdateCollection } from "../utils/database/indexedDBUtils";
import { showMessage } from "../Slices/snackbarSlice";

import "./addPostToCollectionModal.css";

type LibraryTarget = "collections" | "playbooks";
type PlaybookAddMode = "supporting" | "featured";

interface AddPostToLibraryModalProps {
  post: PostWithID;
  onClose: () => void;
  onCollectionChange?: () => void;
}

const canManagePlaybooksByRole = (role?: string | null) =>
  role === "admin" ||
  role === "super-admin" ||
  role === "supervisor" ||
  role === "developer";

const normalizeCollection = (id: string, data: any): CollectionWithId => {
  return {
    ...data,
    id,
    title: data.title ?? data.name ?? "Untitled Collection",
    postIds: data.postIds ?? data.posts ?? [],
    previewImages: data.previewImages ?? [],
    sharedWith: data.sharedWith ?? [],
    isShareableOutsideCompany: data.isShareableOutsideCompany ?? false,
    collectionType: data.collectionType ?? "collection",
    playbookStatus: data.playbookStatus ?? null,
    featuredPostIds: data.featuredPostIds ?? [],
    playbookPostSnapshots: data.playbookPostSnapshots ?? [],
    featuredPostSnapshots: data.featuredPostSnapshots ?? [],
  } as CollectionWithId;
};

const getPostDisplayDate = (post: PostWithID) => {
  const value: any = post.displayDate;

  if (!value) return "";

  if (typeof value === "string") return value;

  if (value?.toDate) {
    return value.toDate().toISOString();
  }

  return "";
};

const buildPlaybookPostSnapshot = (
  post: PostWithID,
): PlaybookPostSnapshot => {
  return {
    postId: post.id,

    imageUrl: post.imageUrl || "",
    originalImageUrl: post.originalImageUrl || "",

    accountName: post.accountName || post.account?.accountName || "",
    accountNumber:
      post.accountNumber?.toString() ||
      post.account?.accountNumber?.toString() ||
      "",
    accountAddress: post.accountAddress || post.account?.accountAddress || "",
    city: post.city || post.account?.city || "",
    state: post.state || post.account?.state || "",
    chain: post.chain || post.account?.chain || "",
    chainType: post.chainType || post.account?.chainType || "",

    brands: post.brands ?? [],
    brandIds: post.brandIds ?? [],
    productType: post.productType ?? [],

    description: post.description || "",
    totalCaseCount: Number(post.totalCaseCount ?? 0),

    postUserUid: post.postUserUid || post.postUser?.uid || "",
    postUserFirstName:
      post.postUserFirstName || post.postUser?.firstName || "",
    postUserLastName:
      post.postUserLastName || post.postUser?.lastName || "",
    postUserCompanyName:
      post.postUserCompanyName || post.postUser?.company || "",

    displayDate: getPostDisplayDate(post),
    addedToPlaybookAt: new Date().toISOString(),
  };
};

const AddPostToLibraryModal: React.FC<AddPostToLibraryModalProps> = ({
  post,
  onClose,
  onCollectionChange,
}) => {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();

  const companyId = user?.companyId;
  const uid = user?.uid;
  const canManagePlaybooks = canManagePlaybooksByRole(user?.role);

  const [allCollections, setAllCollections] = useState<CollectionWithId[]>([]);
  const [activeTarget, setActiveTarget] =
    useState<LibraryTarget>("collections");
  const [playbookAddMode, setPlaybookAddMode] =
    useState<PlaybookAddMode>("supporting");

  const [loading, setLoading] = useState(false);
  const [addingCollectionId, setAddingCollectionId] = useState<string | null>(
    null,
  );

  const [searchText, setSearchText] = useState("");
  const [showCreateCollectionForm, setShowCreateCollectionForm] =
    useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const postImageUrl = post.imageUrl || post.originalImageUrl || "";

  const collections = useMemo(() => {
    return allCollections.filter(
      (item) => !item.collectionType || item.collectionType === "collection",
    );
  }, [allCollections]);

  const playbooks = useMemo(() => {
    return allCollections.filter((item) => item.collectionType === "playbook");
  }, [allCollections]);

  const targetItems = activeTarget === "playbooks" ? playbooks : collections;

  const visibleItems = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) return targetItems;

    return targetItems.filter((item) => {
      const title = item.title?.toLowerCase() ?? "";
      const description = item.description?.toLowerCase() ?? "";
      const executionGoal = item.executionGoal?.toLowerCase() ?? "";
      const whenToUse = item.whenToUse?.toLowerCase() ?? "";

      return (
        title.includes(search) ||
        description.includes(search) ||
        executionGoal.includes(search) ||
        whenToUse.includes(search)
      );
    });
  }, [searchText, targetItems]);

  const fetchCollections = async () => {
    if (!companyId) return;

    setLoading(true);

    try {
      const q = query(
        collection(db, "collections"),
        where("companyId", "==", companyId),
      );

      const snapshot = await getDocs(q);

      const fetched = snapshot.docs
        .map((docSnap) => normalizeCollection(docSnap.id, docSnap.data()))
        .sort((a, b) => a.title.localeCompare(b.title));

      setAllCollections(fetched);
    } catch (error) {
      console.error("Error fetching library items:", error);
      dispatch(showMessage("Could not load library items."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [companyId]);

  const handleAddPostToLibraryItem = async (collectionId: string) => {
    if (!collectionId || !post.id || !companyId) return;

    setAddingCollectionId(collectionId);

    try {
      const collectionRef = doc(db, "collections", collectionId);
      const snapshot = await getDoc(collectionRef);

      if (!snapshot.exists()) {
        dispatch(showMessage("This library item no longer exists."));
        return;
      }

      const existing = normalizeCollection(collectionId, snapshot.data());

      if (existing.companyId !== companyId) {
        dispatch(
          showMessage("You cannot update a library item outside your company."),
        );
        return;
      }

      const alreadyAdded = existing.postIds?.includes(post.id);
      const alreadyFeatured = existing.featuredPostIds?.includes(post.id);

      if (activeTarget === "collections" && alreadyAdded) {
        dispatch(showMessage("This display is already in that collection."));
        onClose();
        return;
      }

      if (
        activeTarget === "playbooks" &&
        playbookAddMode === "supporting" &&
        alreadyAdded
      ) {
        dispatch(showMessage("This display is already in that playbook."));
        onClose();
        return;
      }

      if (
        activeTarget === "playbooks" &&
        playbookAddMode === "featured" &&
        alreadyAdded &&
        alreadyFeatured
      ) {
        dispatch(
          showMessage("This display is already featured in that playbook."),
        );
        onClose();
        return;
      }

      const updates: Record<string, any> = {
        postIds: arrayUnion(post.id),
        updatedAt: serverTimestamp(),
      };

      if (postImageUrl && (!existing.previewImages?.length || existing.previewImages.length < 6)) {
        updates.previewImages = arrayUnion(postImageUrl);
      }

      if (activeTarget === "playbooks") {
        const postSnapshot = buildPlaybookPostSnapshot(post);

        if (!alreadyAdded) {
          updates.playbookPostSnapshots = arrayUnion(postSnapshot);
        }

        if (playbookAddMode === "featured") {
          updates.featuredPostIds = arrayUnion(post.id);

          if (!alreadyFeatured) {
            updates.featuredPostSnapshots = arrayUnion(postSnapshot);
          }
        }
      }

      await updateDoc(collectionRef, updates);

      const updatedSnap = await getDoc(collectionRef);

      if (updatedSnap.exists()) {
        const updatedCollection = normalizeCollection(
          collectionId,
          updatedSnap.data(),
        );

        await addOrUpdateCollection(updatedCollection);

        setAllCollections((prev) =>
          prev.map((item) =>
            item.id === collectionId ? updatedCollection : item,
          ),
        );
      }

      dispatch(
        showMessage(
          activeTarget === "playbooks"
            ? playbookAddMode === "featured"
              ? "Display added as a featured playbook display."
              : "Display added to playbook."
            : "Display added to collection.",
        ),
      );

      onCollectionChange?.();
      onClose();
    } catch (error) {
      console.error("Error adding display to library item:", error);
      dispatch(showMessage("Could not add display."));
    } finally {
      setAddingCollectionId(null);
    }
  };

  const handleCreateCollectionAndAdd = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const trimmedTitle = newCollectionTitle.trim();

    if (!trimmedTitle || !companyId || !uid || creating) return;

    setCreating(true);

    try {
      const newCollectionData = {
        companyId,
        ownerId: uid,

        title: trimmedTitle,
        description: newCollectionDescription.trim(),

        postIds: [post.id],
        previewImages: postImageUrl ? [postImageUrl] : [],

        sharedWith: [],
        shareToken: null,
        isShareableOutsideCompany: false,

        collectionType: "collection",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "collections"),
        newCollectionData,
      );

      const savedSnap = await getDoc(docRef);

      if (savedSnap.exists()) {
        const savedCollection = normalizeCollection(docRef.id, savedSnap.data());

        await addOrUpdateCollection(savedCollection);

        setAllCollections((prev) =>
          [...prev, savedCollection].sort((a, b) =>
            a.title.localeCompare(b.title),
          ),
        );
      }

      dispatch(showMessage("Collection created and display added."));

      onCollectionChange?.();
      onClose();
    } catch (error) {
      console.error("Error creating collection:", error);
      dispatch(showMessage("Could not create collection."));
    } finally {
      setCreating(false);
    }
  };

  const title = canManagePlaybooks
    ? "Add Display to Library"
    : "Add Display to Collection";

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <section className="add-collection-modal">
        <header className="add-collection-header">
          <div>
            <h2>{title}</h2>
            <p>
              {canManagePlaybooks
                ? "Add this display to a collection or an existing playbook."
                : "Choose an existing collection or create a new one."}
            </p>
          </div>

          <button
            type="button"
            className="modal-icon-button"
            onClick={onClose}
            aria-label="Close add to library modal"
          >
            ×
          </button>
        </header>

        {postImageUrl && (
          <div className="add-collection-post-preview">
            <img src={postImageUrl} alt="Selected display preview" />

            <div>
              <strong>
                {post.accountName ||
                  post.account?.accountName ||
                  "Selected display"}
              </strong>

              {post.brands?.length > 0 && (
                <span>{post.brands.slice(0, 3).join(", ")}</span>
              )}
            </div>
          </div>
        )}

        {canManagePlaybooks && (
          <div className="library-target-tabs" aria-label="Library target">
            <button
              type="button"
              className={activeTarget === "collections" ? "active" : ""}
              onClick={() => {
                setActiveTarget("collections");
                setShowCreateCollectionForm(false);
                setSearchText("");
              }}
            >
              Collections
            </button>

            <button
              type="button"
              className={activeTarget === "playbooks" ? "active" : ""}
              onClick={() => {
                setActiveTarget("playbooks");
                setShowCreateCollectionForm(false);
                setSearchText("");
              }}
            >
              Playbooks
            </button>
          </div>
        )}

        {canManagePlaybooks && activeTarget === "playbooks" && (
          <div className="playbook-add-mode">
            <p>How should this display be used?</p>

            <label>
              <input
                type="radio"
                name="playbookAddMode"
                value="supporting"
                checked={playbookAddMode === "supporting"}
                onChange={() => setPlaybookAddMode("supporting")}
              />
              Supporting example
            </label>

            <label>
              <input
                type="radio"
                name="playbookAddMode"
                value="featured"
                checked={playbookAddMode === "featured"}
                onChange={() => setPlaybookAddMode("featured")}
              />
              Featured display
            </label>
          </div>
        )}

        <div className="add-collection-body">
          <div className="collection-list-header">
            <h3>
              {activeTarget === "playbooks"
                ? "Existing Playbooks"
                : "Your Collections"}
            </h3>

            {activeTarget === "collections" && (
              <button
                type="button"
                className="btn-secondary-small"
                onClick={() => setShowCreateCollectionForm((prev) => !prev)}
              >
                {showCreateCollectionForm ? "Cancel New" : "+ New Collection"}
              </button>
            )}
          </div>

          <input
            className="collection-search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={
              activeTarget === "playbooks"
                ? "Search playbooks..."
                : "Search collections..."
            }
          />

          {activeTarget === "collections" && showCreateCollectionForm && (
            <form
              className="inline-create-collection-form"
              onSubmit={handleCreateCollectionAndAdd}
            >
              <input
                value={newCollectionTitle}
                onChange={(e) => setNewCollectionTitle(e.target.value)}
                placeholder="Collection name"
                autoFocus
              />

              <textarea
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Description optional"
                rows={3}
              />

              <button
                type="submit"
                disabled={!newCollectionTitle.trim() || creating}
                className={
                  !newCollectionTitle.trim() || creating
                    ? "disabled-button"
                    : "btn-primary-full"
                }
              >
                {creating ? "Creating..." : "Create Collection & Add Display"}
              </button>
            </form>
          )}

          {loading ? (
            <div className="collection-modal-empty">Loading library...</div>
          ) : activeTarget === "playbooks" && playbooks.length === 0 ? (
            <div className="collection-modal-empty">
              <strong>No playbooks yet</strong>
              <span>
                Create a playbook from Library → Playbooks, then add displays to
                it.
              </span>
            </div>
          ) : targetItems.length === 0 ? (
            <div className="collection-modal-empty">
              <strong>No collections yet</strong>
              <span>Create a collection above to save this display.</span>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="collection-modal-empty">
              <strong>No matching results</strong>
              <span>Try a different search.</span>
            </div>
          ) : (
            <div className="collection-picker-list">
              {visibleItems.map((item) => {
                const alreadyAdded = item.postIds?.includes(post.id);
                const alreadyFeatured = item.featuredPostIds?.includes(post.id);
                const isAdding = addingCollectionId === item.id;

                const disabled =
                  isAdding ||
                  (activeTarget === "collections" && alreadyAdded) ||
                  (activeTarget === "playbooks" &&
                    playbookAddMode === "supporting" &&
                    alreadyAdded) ||
                  (activeTarget === "playbooks" &&
                    playbookAddMode === "featured" &&
                    alreadyAdded &&
                    alreadyFeatured);

                const displayCount = item.postIds?.length ?? 0;
                const featuredCount = item.featuredPostIds?.length ?? 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="collection-picker-row"
                    disabled={disabled}
                    onClick={() => handleAddPostToLibraryItem(item.id)}
                  >
                    <div className="collection-picker-info">
                      <strong>{item.title}</strong>

                      <span>
                        {displayCount} display{displayCount === 1 ? "" : "s"}
                        {activeTarget === "playbooks"
                          ? ` • ${featuredCount} featured`
                          : ""}
                      </span>

                      {activeTarget === "playbooks" && item.whenToUse && (
                        <small>When to use: {item.whenToUse}</small>
                      )}
                    </div>

                    <span
                      className={
                        disabled
                          ? "collection-status-added"
                          : "collection-status-add"
                      }
                    >
                      {isAdding
                        ? "Adding..."
                        : activeTarget === "playbooks" &&
                            playbookAddMode === "featured" &&
                            alreadyFeatured
                          ? "Featured"
                          : alreadyAdded
                            ? "Added"
                            : activeTarget === "playbooks" &&
                                playbookAddMode === "featured"
                              ? "Feature"
                              : "Add"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="add-collection-footer">
          <button type="button" className="btn-outline-full" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </Dialog>
  );
};

export default AddPostToLibraryModal;