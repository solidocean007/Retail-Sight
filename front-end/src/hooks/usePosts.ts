// hooks/usePosts.ts
import { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  getDocs,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
  startAfter,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAppDispatch } from "../utils/store";
import { mergeAndSetPosts, setLastVisible, setPosts } from "../Slices/postsSlice";
import {
  addPostsToIndexedDB,
  getPostsFromIndexedDB,
  shouldRefetchTimeline,
} from "../utils/database/indexedDBUtils";
import { normalizePost } from "../utils/normalizePost";
import { PostWithID } from "../utils/types";

type UsePostsMode =
  | { type: "distributor"; distributorId: string }
  | { type: "supplierNetwork"; supplierId: string };

interface UsePostsOptions {
  mode: UsePostsMode;
  batchSize?: number;
}

interface UsePostsResult {
  lastVisibleSnap: QueryDocumentSnapshot<DocumentData> | null;
  lastVisibleId: string | null;
}

function getTimelineKey(mode: UsePostsMode): string {
  switch (mode.type) {
    case "distributor":
      return `company:${mode.distributorId}`;
    case "supplierNetwork":
      return `supplier:${mode.supplierId}`;
  }
}

function usePosts(options: UsePostsOptions): UsePostsResult {
  const dispatch = useAppDispatch();
  const unsubscribeRef = useRef<() => void>();
  const [lastVisibleSnap, setLastVisibleSnap] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const { mode, batchSize = 10 } = options;

  useEffect(() => {
    if (!mode) return;
    const key = getTimelineKey(mode);
    let cancelled = false;

    async function loadAndListen() {
      // --- 1️⃣ Try IndexedDB first
      const cached = await getPostsFromIndexedDB();
      const newestCachedIso = cached?.[0]?.displayDate || null;
      const needsUpdate = await shouldRefetchTimeline(key, newestCachedIso);

      if (cached.length > 0 && !needsUpdate) {
        dispatch(setPosts(cached.map(normalizePost)));
      } else {
        // --- 2️⃣ Fetch initial batch from Firestore
        let q;
        if (mode.type === "distributor") {
          q = query(
            collection(db, "posts"),
            where("companyId", "==", mode.distributorId),
            where("migratedVisibility", "in", ["companyOnly", "network"]),
            orderBy("displayDate", "desc"),
            limit(batchSize)
          );
        } else if (mode.type === "supplierNetwork") {
          q = query(
            collection(db, "posts"),
            where("sharedWithSuppliers", "array-contains", mode.supplierId),
            orderBy("displayDate", "desc"),
            limit(batchSize)
          );
        }

        const snap = q ? await getDocs(q) : null;
        if (snap && !snap.empty) {
          const newLast = snap.docs[snap.docs.length - 1];
          setLastVisibleSnap(newLast); // local snapshot
          dispatch(setLastVisible(newLast.id)); // Redux only gets ID
          const posts = snap.docs.map((d) =>
            normalizePost({ id: d.id, ...d.data() } as PostWithID)
          );
          dispatch(setPosts(posts));
          await addPostsToIndexedDB(posts);
        }
      }

      if (cancelled) return;

      // --- 3️⃣ Realtime listener
      let qRealtime;
      if (mode.type === "distributor") {
        qRealtime = query(
          collection(db, "posts"),
          where("companyId", "==", mode.distributorId),
          where("migratedVisibility", "in", ["companyOnly", "network"]),
          orderBy("displayDate", "desc"),
          limit(batchSize)
        );
      } else if (mode.type === "supplierNetwork") {
        qRealtime = query(
          collection(db, "posts"),
          where("sharedWithSuppliers", "array-contains", mode.supplierId),
          orderBy("displayDate", "desc"),
          limit(batchSize)
        );
      }

      if (qRealtime) {
        unsubscribeRef.current = onSnapshot(qRealtime, (snap) => {
          const posts = snap.docs.map((d) =>
            normalizePost({ id: d.id, ...d.data() } as PostWithID)
          );
          if (posts.length > 0) {
            dispatch(mergeAndSetPosts(posts));
            addPostsToIndexedDB(posts);
          }
        });
      }
    }

    loadAndListen();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [mode, batchSize, dispatch]);

  return {
    lastVisibleSnap,
    lastVisibleId: lastVisibleSnap?.id ?? null,
  };
}

export default usePosts;
