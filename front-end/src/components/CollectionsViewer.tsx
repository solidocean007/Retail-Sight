import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { Delete, Share } from "@mui/icons-material";
import { db } from "../utils/firebase";
import {
  collection as firestoreCollection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useDispatch } from "react-redux";
import CollectionForm from "./CollectionForm";
import CustomConfirmation from "./CustomConfirmation";
import {
  CollectionType,
  CollectionWithId,
  DashboardModeType,
} from "../utils/types";
import {
  addOrUpdateCollection,
  deleteUserCreatedCollectionFromIndexedDB,
  getCollectionsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { showMessage } from "../Slices/snackbarSlice";
import "./collectionsViewer.css";

const CollectionsViewer = ({
  setDashboardMode,
}: {
  setDashboardMode: React.Dispatch<React.SetStateAction<DashboardModeType>>;
}) => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null
  );
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] =
    useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(
        firestoreCollection(db, "collections")
      );
      const fetchedCollections = querySnapshot.docs.map((doc) => ({
        ...(doc.data() as CollectionType),
        id: doc.id,
      }));

      for (const collection of fetchedCollections) {
        await addOrUpdateCollection(collection);
      }

      setCollections(fetchedCollections);
    } catch (error) {
      console.error("Error fetching collections: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCollections = async () => {
      setLoading(true);
      const localCollections = await getCollectionsFromIndexedDB();
      setCollections(localCollections);
      await fetchCollections();
      setLoading(false);
    };

    loadCollections();
  }, []);

  const handleAddCollection = async (newCollection: CollectionType) => {
    try {
      await addDoc(firestoreCollection(db, "collections"), newCollection);
      await fetchCollections();
    } catch (error) {
      console.error("Error adding collection: ", error);
    }
  };

  const handleDeleteCollectionConfirmed = async () => {
    console.log("Deleting collection:", collectionToDelete);
    if (collectionToDelete) {
      try {
        await deleteDoc(doc(db, "collections", collectionToDelete));
        await deleteUserCreatedCollectionFromIndexedDB(collectionToDelete);
        setCollections((prev) =>
          prev.filter((c) => c.id !== collectionToDelete)
        );
        setCollectionToDelete(null);
      } catch (error) {
        console.error("Error deleting collection: ", error);
      }
    }
    setIsConfirmationOpen(false);
  };

  const handleCollectionClick = (collection: CollectionWithId) => {
    if (collection.posts.length > 0) {
      navigate(`/view-collection/${collection.id}`, {
        state: { returnToDashboard: true },
      });
    } else {
      dispatch(showMessage("No posts are in this collection yet."));
    }
  };

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/view-collection/${id}`
    );
    dispatch(showMessage("Link copied to clipboard"));
  };

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
      ) : (
        <div className="collections-grid">
          {collections.map((collection) => {
            const sampleImages = (collection.previewImages || []).slice(0, 6);
            return (
              <div className="collection-card" key={collection.id}>
                <div className="collection-images">
                  {sampleImages.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`preview-${index}`}
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
                  <h4>{collection.name}</h4>
                  <p>
                    {collection.posts.length} post
                    {collection.posts.length !== 1 ? "s" : ""}
                  </p>
                  <div className="collection-actions">
                    <button onClick={() => handleCollectionClick(collection)}>
                      View
                    </button>
                    <IconButton onClick={() => handleCopyLink(collection.id)}>
                      <Share />
                    </IconButton>
                    <IconButton
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
        message={`Are you sure you want to delete "${
          collections.find((c) => c.id === collectionToDelete)?.name ||
          "this collection"
        }"?`}
      />
    </div>
  );
};

export default CollectionsViewer;
