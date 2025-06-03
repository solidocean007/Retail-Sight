import { useState, useEffect } from "react";
import {
  collection as firestoreCollection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import CollectionForm from "./CollectionForm";
import { CollectionType, CollectionWithId } from "../utils/types";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import "./collectionsPage.css";
import {
  addOrUpdateCollection,
  deleteUserCreatedCollectionFromIndexedDB,
  getCollectionsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import CustomConfirmation from "./CustomConfirmation";
import { useDispatch } from "react-redux";
import { showMessage } from "../Slices/snackbarSlice";
import { Delete } from "@mui/icons-material";

const CollectionsViewer = () => {
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

      // Load from IndexedDB immediately for fast UI
      const localCollections = await getCollectionsFromIndexedDB();
      setCollections(localCollections);

      // Then fetch fresh from Firestore and overwrite
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
      navigate(`/view-collection/${collection.id}`);
    } else {
      dispatch(showMessage("No posts are in this collection yet."));
    }
  };

  return (
    <div className="collections-container">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">Your Collections</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setShowCreateCollectionDialog(true)}
        >
          Create Collection
        </Button>
      </Box>

      {collections.length === 0 && !loading && (
        <Box textAlign="center" mt={4}>
          <Typography variant="h6">No collections found.</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowCreateCollectionDialog(true)}
            sx={{ mt: 2 }}
          >
            Create Your First Collection
          </Button>
        </Box>
      )}

      {loading ? (
        <CircularProgress />
      ) : (
        <Box
          component="ul"
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 2,
            p: 0,
            listStyle: "none",
          }}
        >
          {collections.map((collection) => (
            <Box
              component="li"
              key={collection.id}
              sx={{
                p: 3,
                borderRadius: 3,
                boxShadow: 4,
                backgroundColor: "background.paper",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "center",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": { transform: "scale(1.02)", boxShadow: 6 },
              }}
            >
              <Typography variant="h6" sx={{ mb: 1 }}>
                {collection.name}
              </Typography>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Posts: {collection.posts.length}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => handleCollectionClick(collection)}
                sx={{ mb: 1 }}
              >
                View
              </Button>
              <IconButton onClick={() => setCollectionToDelete(collection.id)}>
                <Delete />
              </IconButton>
            </Box>
          ))}
        </Box>
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
        message="Are you sure you want to delete this collection?"
      />
    </div>
  );
};

export default CollectionsViewer;
