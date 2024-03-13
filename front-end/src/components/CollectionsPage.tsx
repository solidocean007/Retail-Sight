import React, { useState, useEffect } from "react";
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
import { Button, dividerClasses } from "@mui/material";
import "./collectionsPage.css";
import { getCollectionsFromIndexedDB } from "../utils/database/indexedDBUtils";
import CustomConfirmation from "./CustomConfirmation";
import { useDispatch } from "react-redux";
import { showMessage } from "../Slices/snackbarSlice";

const CollectionsPage = () => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [showCreateCollectionDialog, setShowCreateCollectionDialog] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch collections from Firestore
  const fetchCollections = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(firestoreCollection(db, "collections"));
      const fetchedCollections = querySnapshot.docs.map(doc => ({
        ...doc.data() as CollectionType,
        id: doc.id,
      }));
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
    console.log('handleDelete')
    console.log(collectionToDelete) // this isnt logging
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

  const handleOpenCreateCollectionDialog = () => setShowCreateCollectionDialog(true);
  const handleCloseCreateCollectionDialog = () => setShowCreateCollectionDialog(false);

  const openConfirmDeletionDialog = (collectionId: string) => {
    console.log(collectionId)
    setCollectionToDelete(collectionId);
    setIsConfirmationOpen(true);
  };

  const handleLinkClick = (collection: CollectionWithId) => {
    // check if the collection.posts.length has a length greater than 0
    if (collection.posts.length > 0) {
      navigate(`/view-collection/${collection.id}`);
    } else {
      dispatch(showMessage("No posts are in this collection yet."))
    }
  };
  

  return (
    <div className="collections-container">
      <div className="button-box">
        {/* <Button className="home-btn" onClick={() => navigate("/")}>Go Back Home</Button> */}
        <button className="home-btn" onClick={() => navigate("/")}>Home</button>
      </div>
      <h2>Your Collections</h2>
      <button className="home-btn" onClick={handleOpenCreateCollectionDialog}>Create collection</button>

      {collections.length === 0 && 
        <div>No collections</div>
      }
      {loading ? <p>Loading...</p> : (
        <ul className="collections-list">
          {collections.map(collection => (
            <li className="collection-list-item" key={collection.id}>
              <span onClick={()=>handleLinkClick(collection)}>
                {collection.name} - {collection.posts.length} Posts
              </span>
              <Button onClick={() => {/* handleCreateLink logic here */}}>
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
    </div>
  );
};

export default CollectionsPage;
