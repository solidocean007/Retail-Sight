// AddPostsToCollectionModal.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../utils/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import CollectionForm from './CollectionForm';
import { useSelector } from 'react-redux';
import { selectUser } from '../Slices/userSlice';
import { CollectionType, CollectionWithId } from '../utils/types';
import { Dialog } from '@mui/material';

interface AddPostToCollectionModalProps {
  postId: string;
  onClose: () => void;
}

const AddPostToCollectionModal: React.FC<AddPostToCollectionModalProps> = ({ postId, onClose }) => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const user = useSelector(selectUser);

  useEffect(() => {
    const fetchCollections = async () => {
      if (user?.uid) {
        const q = query(collection(db, "collections"), where("ownerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedCollections: CollectionWithId[] = querySnapshot.docs.map((doc) => ({
          ...doc.data() as CollectionType,
          id: doc.id,
        }));
        setCollections(fetchedCollections);
      }
    };
    fetchCollections();
  }, [user?.uid]);

  const handleAddPostToCollection = async (collectionId: string) => {
    const collectionRef = doc(db, "collections", collectionId);
    try {
      await updateDoc(collectionRef, {
        posts: arrayUnion(postId), // Assumes arrayUnion is imported from 'firebase/firestore'
      });
      onClose(); // Close the modal after adding
    } catch (error) {
      console.error("Error adding post to collection:", error);
    }
  };
  
  const onAddNewCollection = async (collectionData: Omit<CollectionType, 'id'>) => {
    try {
      const newCollectionData = {
        ...collectionData,
        posts: [postId], // Automatically include the current post in the new collection
      };
      await addDoc(collection(db, "collections"), newCollectionData);
      onClose(); // Close the modal after creation
    } catch (error) {
      console.error("Error creating new collection:", error);
    }
  };
  
  

  return (
    <div>
      <h2>Add Post to Collection</h2>
      {/* List existing collections with an option to add post to them */}
      {collections.map((collection) => (
        <button key={collection.id} onClick={() => handleAddPostToCollection(collection.id)}>
          Add to {collection.name}
        </button>
      ))}
      <CollectionForm onAddCollection={onAddNewCollection} />
      <button onClick={onClose}>Close</button>
    </div>
  );
};


export default AddPostToCollectionModal;
