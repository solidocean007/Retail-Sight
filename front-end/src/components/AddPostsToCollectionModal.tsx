import React, { useState, useEffect } from "react";
import { db } from "../utils/firebase";
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
  doc,
} from "firebase/firestore";
import CollectionForm from "./CollectionForm";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import {
  CollectionType,
  CollectionWithId,
  PostType,
  PostWithID,
} from "../utils/types";
import { Dialog } from "@mui/material";
import { addOrUpdateCollection } from "../utils/database/indexedDBUtils";

interface AddPostToCollectionModalProps {
  post: PostWithID;
  onClose: () => void;
  onCollectionChange?: () => void; // Optional: trigger refresh in parent
}

const AddPostToCollectionModal: React.FC<AddPostToCollectionModalProps> = ({
  post,
  onClose,
  onCollectionChange,
}) => {
  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const user = useSelector(selectUser);

  const getThumbnailUrl = (imageUrl: string): string => {
    try {
      const url = new URL(imageUrl);
      const segments = url.pathname.split("/");
      const filename = segments.pop();
      if (!filename) return imageUrl;

      const [base, ext] = filename.split(".");
      const thumbFilename = `${base}_200x200.${ext}`;
      segments.push(thumbFilename);
      url.pathname = segments.join("/");
      return url.toString();
    } catch {
      return imageUrl;
    }
  };

  useEffect(() => {
    const fetchCollections = async () => {
      if (user?.uid) {
        const q = query(
          collection(db, "collections"),
          where("ownerId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedCollections: CollectionWithId[] = querySnapshot.docs.map(
          (doc) => ({
            ...(doc.data() as CollectionType),
            id: doc.id,
          })
        );
        setCollections(fetchedCollections);
      }
    };
    fetchCollections();
  }, [user?.uid]);

  const handleAddPostToCollection = async (collectionId: string) => {
    const collectionRef = doc(db, "collections", collectionId);
    try {
      const snapshot = await getDoc(collectionRef);
      const existing = snapshot.data() as CollectionType;

      if (!existing.posts?.includes(post.id)) {
        const updates: any = {
          posts: arrayUnion(post.id),
        };

        const imageUrl = getThumbnailUrl(post.imageUrl ?? "");
        if (
          imageUrl &&
          (!existing.previewImages || existing.previewImages.length < 4)
        ) {
          updates.previewImages = arrayUnion(imageUrl);
        }

        await updateDoc(collectionRef, updates);

        const updatedDoc = await getDoc(collectionRef);
        const updatedCollection = {
          ...(updatedDoc.data() as CollectionType),
          id: collectionId,
        };

        await addOrUpdateCollection(updatedCollection);
        onCollectionChange?.();
      }

      onClose(); // always close modal
    } catch (error) {
      console.error("Error adding post to collection:", error);
    }
  };

  const onAddNewCollection = async (
    collectionData: Omit<CollectionType, "id">
  ) => {
    try {
      const imageUrl = getThumbnailUrl(post.imageUrl ?? "");
      const newCollectionData = {
        ...collectionData,
        posts: [post.id],
        previewImages: imageUrl ? [imageUrl] : [],
      };

      const docRef = await addDoc(
        collection(db, "collections"),
        newCollectionData
      );
      const snapshot = await getDoc(docRef);
      const savedCollection = {
        ...(snapshot.data() as CollectionType),
        id: docRef.id,
      };

      await addOrUpdateCollection(savedCollection);
      onCollectionChange?.(); // Optional refresh hook
      onClose();
    } catch (error) {
      console.error("Error creating new collection:", error);
    }
  };

  return (
    <div>
      <h2>Add Post to Collection</h2>
      {collections.map((collection) => (
        <button
          key={collection.id}
          onClick={() => handleAddPostToCollection(collection.id)}
        >
          Add to {collection.name}
        </button>
      ))}
      <CollectionForm
        isOpen={false}
        onAddCollection={onAddNewCollection}
        onClose={onClose}
      />

      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default AddPostToCollectionModal;
