// hooks/useCompanyCollections.ts
import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useDispatch } from "react-redux";
import { db } from "../utils/firebase";
import { showMessage } from "../Slices/snackbarSlice";
import {
  CollectionType,
  CollectionWithId,
  CreateCollectionInput,
  UserType,
} from "../utils/types";
import {
  addOrUpdateCollection,
  deleteUserCreatedCollectionFromIndexedDB,
  getCollectionsFromIndexedDB,
} from "../utils/database/indexedDBUtils";

export const useCompanyCollections = (user: UserType | null | undefined) => {
  const dispatch = useDispatch();

  const companyId = user?.companyId;
  const uid = user?.uid;

  const [collections, setCollections] = useState<CollectionWithId[]>([]);
  const [loading, setLoading] = useState(false);

  const hydrateFromCache = useCallback(async () => {
    if (!companyId) return;

    const cached = await getCollectionsFromIndexedDB();

    const scoped = cached.filter((collection) => {
      return collection.companyId === companyId;
    });

    setCollections(scoped);
  }, [companyId]);

  const fetchCollections = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);

    try {
      const q = query(
        collection(db, "collections"),
        where("companyId", "==", companyId),
        // orderBy("updatedAt", "desc"),
      );

      const snap = await getDocs(q);

      const fetched = snap.docs.map((docSnap) => ({
        ...(docSnap.data() as CollectionType),
        id: docSnap.id,
      })) as CollectionWithId[];

      await Promise.all(
        fetched.map((collectionItem) => addOrUpdateCollection(collectionItem)),
      );

      setCollections(fetched);
    } catch (error) {
      console.error("[useCompanyCollections] Failed to fetch:", error);
      dispatch(showMessage("Could not load collections."));
    } finally {
      setLoading(false);
    }
  }, [companyId, dispatch]);

  const createCollection = useCallback(
    async (newCollection: CreateCollectionInput) => {
      if (!companyId || !uid) {
        dispatch(showMessage("You must be signed in to create a collection."));
        return;
      }

      const payload = {
        name: newCollection.name,
        description: newCollection.description ?? "",
        posts: newCollection.posts ?? [],
        previewImages: newCollection.previewImages ?? [],
        sharedWith: newCollection.sharedWith ?? [],
        shareToken: newCollection.shareToken ?? null,
        isShareableOutsideCompany:
          newCollection.isShareableOutsideCompany ?? false,

        companyId,
        ownerId: uid,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "collections"), payload);
      await fetchCollections();
    },
    [companyId, uid, dispatch, fetchCollections],
  );

  const deleteCollection = useCallback(async (collectionId: string) => {
    await deleteDoc(doc(db, "collections", collectionId));
    await deleteUserCreatedCollectionFromIndexedDB(collectionId);

    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
  }, []);

  useEffect(() => {
    if (!companyId) return;

    hydrateFromCache();
    fetchCollections();
  }, [companyId, hydrateFromCache, fetchCollections]);

  return {
    collections,
    loading,
    fetchCollections,
    createCollection,
    deleteCollection,
  };
};