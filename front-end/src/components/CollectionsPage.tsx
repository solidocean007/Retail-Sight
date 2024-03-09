// CollectionsPage.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CollectionForm from './CollectionForm'; 
import { CollectionType, CollectionWithId } from '../utils/types';

const CollectionsPage = () => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch collections from Firestore
  const fetchCollections = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "collections"));
      const collectionsData : CollectionWithId[] = querySnapshot.docs.
        map(doc => {
          const collectionData: CollectionType = doc.data() as CollectionType;
          return {
            ...collectionData,
            id: doc.id
          }
      });
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

  // Handler to add a new collection
  const handleAddCollection = async (newCollection: CollectionType) => {
    try {
      await addDoc(collection(db, "collections"), newCollection);
      fetchCollections(); // Refresh the list after adding
    } catch (error) {
      console.error("Error adding collection: ", error);
    }
  };

  return (
    <div>
      <h2>Your Collections</h2>
      <CollectionForm onAddCollection={handleAddCollection} />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {collections.map(collection => (
            <li key={collection.id}>{collection.name}</li> 
          ))}
        </ul>
      )}
    </div>
  );
};

export default CollectionsPage;
