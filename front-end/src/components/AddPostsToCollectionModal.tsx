import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
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
import { CollectionType, CollectionWithId, PostWithID } from "../utils/types";
import { addOrUpdateCollection } from "../utils/database/indexedDBUtils";

import "./addPostToCollectionModal.css";

interface AddPostToCollectionModalProps {
  post: PostWithID;
  onClose: () => void;
  onCollectionChange?: () => void;
}

const AddPostToCollectionModal: React.FC<AddPostToCollectionModalProps> = ({
  post,
  onClose,
  onCollectionChange,
}) => {
  const user = useSelector(selectUser);

  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingCollectionId, setAddingCollectionId] = useState<string | null>(
    null,
  );
  const [collectionSearch, setCollectionSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const companyId = user?.companyId;
  const uid = user?.uid;

  const visibleCollections = useMemo(() => {
    const search = collectionSearch.trim().toLowerCase();

    if (!search) return collections;

    return collections.filter((collectionItem) => {
      const name = collectionItem.name?.toLowerCase() ?? "";
      const description = collectionItem.description?.toLowerCase() ?? "";

      return name.includes(search) || description.includes(search);
    });
  }, [collections, collectionSearch]);

  const getThumbnailUrl = (imageUrl: string): string => {
    if (!imageUrl) return "";

    try {
      const url = new URL(imageUrl);
      const segments = url.pathname.split("/");
      const filename = segments.pop();

      if (!filename) return imageUrl;

      const lastDotIndex = filename.lastIndexOf(".");
      if (lastDotIndex === -1) return imageUrl;

      const base = filename.slice(0, lastDotIndex);
      const ext = filename.slice(lastDotIndex + 1);

      segments.push(`${base}_200x200.${ext}`);
      url.pathname = segments.join("/");

      return url.toString();
    } catch {
      return imageUrl;
    }
  };

  const postThumbnailUrl = useMemo(() => {
    return getThumbnailUrl(post.imageUrl ?? "");
  }, [post.imageUrl]);

  const fetchCollections = async () => {
    if (!companyId) return;

    setLoading(true);

    try {
      const q = query(
        collection(db, "collections"),
        where("companyId", "==", companyId),
      );

      const querySnapshot = await getDocs(q);

      const fetchedCollections = querySnapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as CollectionType),
        id: docSnap.id,
      })) as CollectionWithId[];

      fetchedCollections.sort((a, b) => {
        const aName = a.name || "";
        const bName = b.name || "";
        return aName.localeCompare(bName);
      });

      setCollections(fetchedCollections);
    } catch (error) {
      console.error("Error fetching collections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [companyId]);

  const handleAddPostToCollection = async (collectionId: string) => {
    if (!collectionId || !post.id) return;

    setAddingCollectionId(collectionId);

    try {
      const collectionRef = doc(db, "collections", collectionId);
      const snapshot = await getDoc(collectionRef);

      if (!snapshot.exists()) return;

      const existing = snapshot.data() as CollectionType;

      if (existing.companyId !== companyId) {
        console.warn(
          "Blocked adding post to collection outside company scope.",
        );
        return;
      }

      if (existing.posts?.includes(post.id)) {
        onClose();
        return;
      }

      const updates: Partial<CollectionType> & {
        posts: ReturnType<typeof arrayUnion>;
        previewImages?: ReturnType<typeof arrayUnion>;
        updatedAt?: ReturnType<typeof serverTimestamp>;
      } = {
        posts: arrayUnion(post.id), // Type 'FieldValue' is not assignable to type 'string[] & FieldValue'.
  // Type 'FieldValue' is missing the following properties from type 'string[]': length, pop, push, concat, and 28 more.ts(2322)
// types.ts(601, 3): The expected type comes from property 'posts' which is declared here on type 'Partial<CollectionType> & { posts: FieldValue; previewImages?: FieldValue | undefined; updatedAt?: FieldValue | undefined; }'
        updatedAt: serverTimestamp(),
      };

      if (
        postThumbnailUrl &&
        (!existing.previewImages || existing.previewImages.length < 6)
      ) {
        updates.previewImages = arrayUnion(postThumbnailUrl); // Type 'FieldValue' is not assignable to type 'string[] & FieldValue'.
  // Type 'FieldValue' is missing the following properties from type 'string[]': length, pop, push, concat, and 28 more.ts(2322)
      }

      await updateDoc(collectionRef, updates);

      const updatedDoc = await getDoc(collectionRef);

      const updatedCollection = {
        ...(updatedDoc.data() as CollectionType),
        id: collectionId,
      };

      await addOrUpdateCollection(updatedCollection);

      onCollectionChange?.();
      onClose();
    } catch (error) {
      console.error("Error adding post to collection:", error);
    } finally {
      setAddingCollectionId(null);
    }
  };

  const handleCreateCollectionAndAddPost = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    const trimmedName = newCollectionName.trim();

    if (!trimmedName || !companyId || !uid || creating) return;

    setCreating(true);

    try {
      const newCollectionData = {
        companyId,
        ownerId: uid,
        name: trimmedName,
        description: newCollectionDescription.trim(),
        posts: [post.id],
        previewImages: postThumbnailUrl ? [postThumbnailUrl] : [],
        sharedWith: [],
        shareToken: "",
        isShareableOutsideCompany: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "collections"),
        newCollectionData,
      );

      const snapshot = await getDoc(docRef);

      const savedCollection = {
        ...(snapshot.data() as CollectionType),
        id: docRef.id,
      };

      await addOrUpdateCollection(savedCollection);

      setCollections((prev) => [...prev, savedCollection]);
      onCollectionChange?.();
      onClose();
    } catch (error) {
      console.error("Error creating new collection:", error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <section className="add-collection-modal">
        <header className="add-collection-header">
          <div>
            <h2>Add Post to Collection</h2>
            <p>Choose an existing collection or create a new one.</p>
          </div>

          <button
            type="button"
            className="modal-icon-button"
            onClick={onClose}
            aria-label="Close add to collection modal"
          >
            ×
          </button>
        </header>

        {postThumbnailUrl && (
          <div className="add-collection-post-preview">
            <img src={postThumbnailUrl} alt="Post preview" />
            <div>
              <strong>{post.accountName || "Selected post"}</strong>
              <span>{post.postUserDisplayName || post.postUserName || ""}</span> // Property 'postUserDisplayName' does not exist on type 'PostWithID'. Did you mean 'postUserLastName'? Property 'postUserName' does not exist on type 'PostWithID'. Did you mean 'postUserLastName'?
            </div>
          </div>
        )}

        <div className="add-collection-body">
          <div className="collection-list-header">
            <h3>Your Collections</h3>

            <button
              type="button"
              className="btn-secondary-small"
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? "Cancel New" : "+ New Collection"}
            </button>
          </div>

          <input
            className="collection-search-input"
            value={collectionSearch}
            onChange={(e) => setCollectionSearch(e.target.value)}
            placeholder="Search collections..."
          />

          {showCreateForm && (
            <form
              className="inline-create-collection-form"
              onSubmit={handleCreateCollectionAndAddPost}
            >
              <input
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
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
                disabled={!newCollectionName.trim() || creating}
                className={
                  !newCollectionName.trim() || creating
                    ? "disabled-button"
                    : "btn-primary-full"
                }
              >
                {creating ? "Creating..." : "Create & Add Post"}
              </button>
            </form>
          )}

          {loading ? (
            <div className="collection-modal-empty">Loading collections...</div>
          ) : collections.length === 0 ? (
            <div className="collection-modal-empty">
              <strong>No collections yet</strong>
              <span>Create one above to save this post.</span>
            </div>
          ) : visibleCollections.length === 0 ? (
            <div className="collection-modal-empty">
              <strong>No matching collections</strong>
              <span>Try a different search or create a new collection.</span>
            </div>
          ) : (
            <div className="collection-picker-list">
              {visibleCollections.map((collectionItem) => {
                const alreadyAdded = collectionItem.posts?.includes(post.id);
                const isAdding = addingCollectionId === collectionItem.id;

                return (
                  <button
                    key={collectionItem.id}
                    type="button"
                    className="collection-picker-row"
                    disabled={alreadyAdded || isAdding}
                    onClick={() => handleAddPostToCollection(collectionItem.id)}
                  >
                    <div className="collection-picker-info">
                      <strong>{collectionItem.name}</strong>
                      <span>
                        {collectionItem.posts?.length ?? 0} post
                        {(collectionItem.posts?.length ?? 0) === 1 ? "" : "s"}
                      </span>
                    </div>

                    <span
                      className={
                        alreadyAdded
                          ? "collection-status-added"
                          : "collection-status-add"
                      }
                    >
                      {alreadyAdded ? "Added" : isAdding ? "Adding..." : "Add"}
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

export default AddPostToCollectionModal;
