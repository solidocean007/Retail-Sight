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
import { Box, Button, CircularProgress, IconButton, Link, Typography } from "@mui/material";
import "./collectionsPage.css";
import {
  addOrUpdateCollection,
  getCollectionsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import CustomConfirmation from "./CustomConfirmation";
import { useDispatch } from "react-redux";
import { showMessage } from "../Slices/snackbarSlice";
import { getFunctions, httpsCallable } from "@firebase/functions";
import LinkShareModal from "./LinkShareModal";
import {
  Delete,
  LinkSharp,
} from "@mui/icons-material";

interface ShareTokenResponse {
  shareToken: string;
  // Include other properties if your function returns more information
}

const CollectionsViewer = () => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null
  );
  const [linkModalLoading, setLinkModalLoading] = useState(false);
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] =
    useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch collections from Firestore
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
      // Store collections in IndexedDB
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

  // Load collections either from IndexedDB or Firestore
  useEffect(() => {
    const loadCollections = async () => {
      setLoading(true);
      const indexedDbCollections = await getCollectionsFromIndexedDB();
      if (indexedDbCollections.length > 0) {
        setCollections(indexedDbCollections);
      } else {
        await fetchCollections();
      }
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
    console.log("handleDelete");
    console.log(collectionToDelete); // this isn't logging
    if (collectionToDelete) {
      try {
        await deleteDoc(doc(db, "collections", collectionToDelete));
        setCollectionToDelete(null);
        await fetchCollections();
      } catch (error) {
        console.error("Error deleting collection: ", error);
      }
    }
    setIsConfirmationOpen(false);
  };

  const handleOpenCreateCollectionDialog = () =>
    setShowCreateCollectionDialog(true);
  const handleCloseCreateCollectionDialog = () =>
    setShowCreateCollectionDialog(false);

  const openConfirmDeletionDialog = (collectionId: string) => {
    console.log(collectionId);
    setCollectionToDelete(collectionId);
    setIsConfirmationOpen(true);
  };

  const handleCollectionClick = (collection: CollectionWithId) => {
    // check if the collection.posts.length has a length greater than 0
    if (collection.posts.length > 0) {
      navigate(`/view-collection/${collection.id}`);
    } else {
      dispatch(showMessage("No posts are in this collection yet. "));
    }
  };

  const handleCreateLinkClick = async (collectionId: string) => {
    setLinkModalLoading(true);
    const functions = getFunctions(); // Initialize Firebase Functions
    const generateShareTokenFunction = httpsCallable(
      functions,
      "generateShareToken"
    );
    let shareableUrl = ""; // Declare shareableUrl outside of the try-catch block to widen its scope

    try {
      const result = await generateShareTokenFunction({ collectionId });
      // Assert the type of result.data directly without intermediate assignment
      const shareToken = (result.data as ShareTokenResponse).shareToken;
      // Construct the shareable URL with the token
      shareableUrl = `${window.location.origin}/view-collection/${collectionId}?token=${shareToken}`;

      setGeneratedLink(shareableUrl); // Assume shareableUrl is generated here
      setLinkModalLoading(false);
      setShowLinkModal(true);

      // Here you can copy the URL to the clipboard, display it to the user, or send it through email/text
      console.log("shareableURl: ", shareableUrl); // For demonstration purposes
    } catch (error) {
      console.error("Error generating share token:", error);
      setLinkModalLoading(false);
      // Handle the error appropriately
    }
  };

  return (
    <div className="collections-container">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 2,
        }}
      >
        <Typography variant="h4">Your Collections</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenCreateCollectionDialog}
        >
          Create collection
        </Button>
      </Box>

      {collections.length === 0 && <div>No collections</div>}
      {loading ? (
        <CircularProgress />
      ) : (
        <Box
          component="ul"
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 2,
            padding: 0,
            listStyle: "none",
          }}
        >
          {collections.map((collection) => (
            <Box
              component="li"
              key={collection.id}
              sx={{
                padding: 2,
                borderRadius: 2,
                boxShadow: 3,
                backgroundColor: "background.paper",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "center",
              }}
            >
              <Typography variant="h6" sx={{ marginBottom: 1 }}>
                {collection.name}
              </Typography>
              <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
                Posts: {collection.posts.length}
              </Typography>
              <Button
                variant="outlined"
                onClick={() => handleCollectionClick(collection)}
                sx={{ marginBottom: 1 }}
              >
                View
              </Button>
              <Box>
                <IconButton onClick={() => handleCreateLinkClick(collection.id)}>
                  <LinkSharp />
                </IconButton>
                <IconButton onClick={() => openConfirmDeletionDialog(collection.id)}>
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <CollectionForm
        isOpen={showCreateCollectionDialog}
        onAddCollection={handleAddCollection}
        onClose={handleCloseCreateCollectionDialog}
      />
      <CustomConfirmation
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={handleDeleteCollectionConfirmed}
        message="Are you sure you want to delete this collection?"
      />
      <LinkShareModal
        open={showLinkModal}
        handleClose={() => setShowLinkModal(false)}
        link={generatedLink}
        loading={linkModalLoading}
      />
    </div>
  );
};

export default CollectionsViewer;
