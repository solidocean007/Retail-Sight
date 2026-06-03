// hooks/useCompanyCollections.ts
import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useDispatch } from "react-redux";
import { db } from "../utils/firebase";
import { showMessage } from "../Slices/snackbarSlice";
import {
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

    const scoped = cached
      .filter((collection) => collection.companyId === companyId)
      .map((collection: any) => ({
        ...collection,
        title: collection.title ?? collection.name ?? "Untitled Collection",
        postIds: collection.postIds ?? collection.posts ?? [],
        previewImages: collection.previewImages ?? [],
        sharedWith: collection.sharedWith ?? [],
        isShareableOutsideCompany:
          collection.isShareableOutsideCompany ?? false,
        collectionType: collection.collectionType ?? "collection",

        // playbook fields
        playbookStatus: collection.playbookStatus ?? null,
        managerNotes: collection.managerNotes ?? "",
        whenToUse: collection.whenToUse ?? "",
        executionGoal: collection.executionGoal ?? "",
        audience: collection.audience ?? "all",
        featuredPostIds: collection.featuredPostIds ?? [],
        playbookPostSnapshots: collection.playbookPostSnapshots ?? [],
        featuredPostSnapshots: collection.featuredPostSnapshots ?? [],
      }));
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

      const fetched = snap.docs.map((docSnap) => {
        const data = docSnap.data() as any;

        return {
          ...data,
          id: docSnap.id,

          // Backward compatibility
          title: data.title ?? data.name ?? "Untitled Collection",
          postIds: data.postIds ?? data.posts ?? [],

          // Defaults
          previewImages: data.previewImages ?? [],
          sharedWith: data.sharedWith ?? [],
          isShareableOutsideCompany: data.isShareableOutsideCompany ?? false,
          collectionType: data.collectionType ?? "collection",

          // playbook fields
          playbookStatus: data.playbookStatus ?? null,
          managerNotes: data.managerNotes ?? "",
          whenToUse: data.whenToUse ?? "",
          executionGoal: data.executionGoal ?? "",
          audience: data.audience ?? "all",
          featuredPostIds: data.featuredPostIds ?? [],
          playbookPostSnapshots: data.playbookPostSnapshots ?? [],
          featuredPostSnapshots: data.featuredPostSnapshots ?? [],
        };
      }) as CollectionWithId[];

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
        title: newCollection.title,
        description: newCollection.description ?? "",

        postIds: newCollection.postIds ?? [],
        previewImages: newCollection.previewImages ?? [],

        sharedWith: newCollection.sharedWith ?? [],
        shareToken: newCollection.shareToken ?? null,
        isShareableOutsideCompany:
          newCollection.isShareableOutsideCompany ?? false,

        collectionType: newCollection.collectionType ?? "collection",
        playbookStatus: newCollection.playbookStatus ?? null,
        managerNotes: newCollection.managerNotes ?? "",
        whenToUse: newCollection.whenToUse ?? "",
        executionGoal: newCollection.executionGoal ?? "",
        audience: newCollection.audience ?? "all",

        goalIds: newCollection.goalIds ?? [],
        brandIds: newCollection.brandIds ?? [],
        supplierId: newCollection.supplierId ?? null,
        featuredPostIds: newCollection.featuredPostIds ?? [],
        playbookPostSnapshots: newCollection.playbookPostSnapshots ?? [],
        featuredPostSnapshots: newCollection.featuredPostSnapshots ?? [],

        companyId,
        ownerId: uid,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "collections"), payload);
      await fetchCollections();

      dispatch(
        showMessage(
          payload.collectionType === "playbook"
            ? "Playbook created successfully."
            : "Collection created successfully.",
        ),
      );
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
