// CollectionsViewer.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgress, IconButton } from "@mui/material";
import { Delete, Share } from "@mui/icons-material";
import { useDispatch } from "react-redux";

import CollectionForm from "./CollectionForm";
import CustomConfirmation from "./CustomConfirmation";
import {
  CollectionWithId,
  CreateCollectionInput,
  DashboardModeType,
} from "../utils/types";
import { showMessage } from "../Slices/snackbarSlice";
import "./collectionsViewer.css";

interface CollectionsViewerProps {
  setDashboardMode: React.Dispatch<React.SetStateAction<DashboardModeType>>;
  collections: CollectionWithId[];
  loading: boolean;
  createCollection: (input: CreateCollectionInput) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
}

const CollectionsViewer: React.FC<CollectionsViewerProps> = ({
  collections,
  loading,
  createCollection,
  deleteCollection,
}) => {
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  );
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] =
    useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleAddCollection = async (newCollection: CreateCollectionInput) => {
    try {
      await createCollection({
        ...newCollection,
        collectionType: "collection",
        postIds: newCollection.postIds ?? [],
        previewImages: newCollection.previewImages ?? [],
        sharedWith: newCollection.sharedWith ?? [],
        isShareableOutsideCompany:
          newCollection.isShareableOutsideCompany ?? false,
      });

      setShowCreateCollectionDialog(false);
    } catch (error) {
      console.error("Error adding collection:", error);
      dispatch(showMessage("Could not create collection."));
    }
  };

  const handleDeleteCollectionConfirmed = async () => {
    if (!collectionToDelete) return;

    try {
      await deleteCollection(collectionToDelete);
      setCollectionToDelete(null);
    } catch (error) {
      console.error("Error deleting collection:", error);
      dispatch(showMessage("Could not delete collection."));
    } finally {
      setIsConfirmationOpen(false);
    }
  };

  const handleCollectionClick = (collectionId: string, postCount: number) => {
    if (postCount > 0) {
      navigate(`/view-collection/${collectionId}`, {
        state: { returnToDashboard: true },
      });
    } else {
      dispatch(showMessage("No displays are in this collection yet."));
    }
  };

  const handleCopyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/view-collection/${id}`,
      );
      dispatch(showMessage("Link copied to clipboard"));
    } catch (error) {
      console.error("Error copying collection link:", error);
      dispatch(showMessage("Could not copy link."));
    }
  };

  const selectedCollectionTitle =
    collections.find((c) => c.id === collectionToDelete)?.title ||
    "this collection";

  return (
    <div className="collections-viewer-container">
      <div className="collections-header">
        <h2>Your Collections</h2>

        <button
          className="create-btn"
          onClick={() => setShowCreateCollectionDialog(true)}
        >
          Create Collection
        </button>
      </div>

      {loading ? (
        <CircularProgress />
      ) : collections.length === 0 ? (
        <div className="collections-empty-state">
          <h3>No collections yet</h3>
          <p>Create a collection to organize displays for your company.</p>
        </div>
      ) : (
        <div className="collections-grid">
          {collections.map((collection) => {
            const sampleImages = (collection.previewImages || []).slice(0, 6);
            const postCount = collection.postIds?.length ?? 0;

            return (
              <div className="collection-card" key={collection.id}>
                <div className="collection-images">
                  {sampleImages.map((url, index) => (
                    <img
                      key={`${collection.id}-${url}-${index}`}
                      src={url}
                      alt={`${collection.title} preview ${index + 1}`}
                      className="collection-thumbnail"
                      style={{
                        transform: `rotate(${index * -1.5 - 5}deg)`,
                        marginLeft: index === 0 ? 0 : -20,
                        zIndex: sampleImages.length - index,
                      }}
                    />
                  ))}
                </div>

                <div className="collection-content">
                  <h4>{collection.title}</h4>

                  {collection.description && (
                    <p className="collection-description">
                      {collection.description}
                    </p>
                  )}

                  <p>
                    {postCount} display{postCount !== 1 ? "s" : ""}
                  </p>

                  <div className="collection-actions">
                    <button
                      onClick={() =>
                        handleCollectionClick(collection.id, postCount)
                      }
                    >
                      View
                    </button>

                    <IconButton
                      aria-label={`Copy share link for ${collection.title}`}
                      onClick={() => handleCopyLink(collection.id)}
                    >
                      <Share />
                    </IconButton>

                    <IconButton
                      aria-label={`Delete ${collection.title}`}
                      onClick={() => {
                        setCollectionToDelete(collection.id);
                        setIsConfirmationOpen(true);
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CollectionForm
        isOpen={showCreateCollectionDialog}
        onAddCollection={handleAddCollection}
        onClose={() => setShowCreateCollectionDialog(false)}
      />

      <CustomConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleDeleteCollectionConfirmed}
        message={`Are you sure you want to delete "${selectedCollectionTitle}"?`}
      />
    </div>
  );
};

export default CollectionsViewer;