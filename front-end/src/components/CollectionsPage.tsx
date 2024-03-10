// CollectionsPage.tsx
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import CollectionForm from "./CollectionForm";
import { CollectionType, CollectionWithId } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { Button, Dialog } from "@mui/material";
import "./collectionsPage.css";

const CollectionsPage = () => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch collections from Firestore
  const fetchCollections = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "collections"));
      const collectionsData: CollectionWithId[] = querySnapshot.docs.map(
        (doc) => {
          const collectionData: CollectionType = doc.data() as CollectionType;
          return {
            ...collectionData,
            id: doc.id,
          };
        }
      );
      setCollections(collectionsData);
    } catch (error) {
      console.error("Error fetching collections: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const goBackHome = () => {
    navigate("/"); // or history.push('/') for React Router v5
  };

  // Handler to add a new collection
  const handleAddCollection = async (newCollection: CollectionType) => {
    try {
      await addDoc(collection(db, "collections"), newCollection);
      fetchCollections(); // Refresh the list after adding
    } catch (error) {
      console.error("Error adding collection: ", error);
    }
  };

  // Handler to create a link for a collection
  const handleCreateLink = (collectionId: string) => {
    // Logic for creating a sharable link
  };

  // Handler for deleting a collection
  const handleDeleteCollection = async (collectionId: string) => {
    if (window.confirm("Are you sure you want to delete this collection?")) {
      try {
        await deleteDoc(doc(db, "collections", collectionId));
        fetchCollections(); // Refresh the list after deletion
      } catch (error) {
        console.error("Error deleting collection: ", error);
      }
    }
  };

  const handleCreateCollectionClick = () => {
    setShowCreateCollection(true);
  };

  const handleCloseCreateCollection = () => {
    setShowCreateCollection(false);
  };

  return (
    <div className="collections-container">
      <div className="button-box">
        <Button onClick={goBackHome}>Go Back Home</Button>
      </div>
      <h2>Your Collections</h2>
      <Button onClick={handleCreateCollectionClick}>Create collection</Button>

      <Dialog
        open={showCreateCollection}
        onClose={() => setShowCreateCollection(false)}
        sx={{
          "& .MuiDialog-paper": { padding: "20px" },
        }}
      >
        <div className="collection-form-container">
          <CollectionForm
            onAddCollection={handleAddCollection}
            onClose={handleCloseCreateCollection}
          />
        </div>
      </Dialog>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="collections-list">
          <ul>
            {collections.map((collection) => (
              <li className="collection-list-item" key={collection.id}>
                {collection.name} - {collection.posts.length} Posts
                <Button onClick={() => handleCreateLink(collection.id)}>
                  Create Link
                </Button>
                <Button onClick={() => handleDeleteCollection(collection.id)}>
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CollectionsPage;
