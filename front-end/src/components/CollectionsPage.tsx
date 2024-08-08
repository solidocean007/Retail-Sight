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
import { Button, CircularProgress } from "@mui/material";
import "./collectionsPage.css";
import { addOrUpdateCollection, getCollectionsFromIndexedDB } from "../utils/database/indexedDBUtils";
import CustomConfirmation from "./CustomConfirmation";
import { useDispatch } from "react-redux";
import { showMessage } from "../Slices/snackbarSlice";
import { getFunctions, httpsCallable } from "@firebase/functions";
import LinkShareModal from "./LinkShareModal";

interface ShareTokenResponse {
  shareToken: string;
  // Include other properties if your function returns more information
}

const CollectionsPage = () => {
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
        console.log("found collections");
        setCollections(indexedDbCollections);
      } else {
        console.log("didn't find collections");
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
      <div className="button-box">
        {/* <Button className="home-btn" onClick={() => navigate("/")}>Go Back Home</Button> */}
        <button className="home-btn" onClick={() => navigate("/")}>
          Home
        </button>
      </div>
      <h2>Your Collections</h2>
      <button className="home-btn" onClick={handleOpenCreateCollectionDialog}>
        Create collection
      </button>

      {collections.length === 0 && <div>No collections</div>}
      {loading ? (
        <CircularProgress />
      ) : (
        <ul className="collections-list">
          {collections.map((collection) => (
            <li className="collection-list-item" key={collection.id}>
              <button onClick={() => handleCollectionClick(collection)}>
                {collection.name} - {collection.posts.length} Posts
              </button>
              <Button onClick={() => handleCreateLinkClick(collection.id)}>
                Create Link
              </Button>
              <Button onClick={() => openConfirmDeletionDialog(collection.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
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

export default CollectionsPage;
