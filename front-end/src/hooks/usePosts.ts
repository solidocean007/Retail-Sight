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
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAppDispatch } from "../utils/store";
import {
  mergeAndSetPosts,
  setLastVisible,
  setPosts,
} from "../Slices/postsSlice";
import {
  addPostsToIndexedDB,
  getPostsFromIndexedDB,
  shouldRefetch,
  getFetchDate,
  storeFilteredSet,
  shouldRefetchTimeline,
} from "../utils/database/indexedDBUtils";
import { normalizePost } from "../utils/normalizePost";
import { PostWithID, PostQueryFilters } from "../utils/types";

function getTimestampKey(mode: UsePostsMode): string {
  switch (mode.type) {
    case "distributor":
      return `company:${mode.distributorId}`;
    case "supplierNetwork":
      return `supplier:${mode.supplierId}`;
    case "highlighted":
      return `highlighted:${mode.supplierId}`;
    default:
      return "timeline:default";
  }
}

type UsePostsMode =
  | { type: "distributor"; distributorId: string }
  | { type: "supplierNetwork"; supplierId: string }
  | { type: "highlighted"; supplierId: string };

interface UsePostsOptions {
  mode: UsePostsMode;
  batchSize?: number;
  filters?: PostQueryFilters;
}

interface UsePostsResult {
  lastVisibleSnap: QueryDocumentSnapshot<DocumentData> | null; // local snapshot for pagination
  lastVisibleId: string | null; // string stored in Redux/debug
}

function usePosts(companyId?: string, batchSize?: number): UsePostsResult;
function usePosts(options: UsePostsOptions): UsePostsResult;

function usePosts(arg1?: any, arg2?: any) {
  const dispatch = useAppDispatch();
  const unsubscribeRef = useRef<() => void>();
  const [lastVisibleSnap, setLastVisibleSnap] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // Normalize args
  const opts: UsePostsOptions | null =
    typeof arg1 === "string"
      ? arg1
        ? {
            mode: { type: "distributor", distributorId: arg1 },
            batchSize: arg2,
          }
        : null
      : arg1 ?? null;

  const batchSize = opts?.batchSize ?? 10;

  useEffect(() => {
    if (!opts?.mode) return;
    const { mode } = opts;
    const key = getTimestampKey(mode);

    let cancelled = false;

    async function loadAndListen() {
      // --- 1️⃣ Try IndexedDB first
      const cached = await getPostsFromIndexedDB();
      const newestCachedIso = cached?.[0]?.displayDate || null;
      const needsUpdate = await shouldRefetchTimeline(key, newestCachedIso);

      if (cached.length > 0 && !needsUpdate) {
        dispatch(setPosts(cached.map(normalizePost)));
      } else {
        // --- 2️⃣ Fetch from Firestore if needed
        let q;
        if (mode.type === "distributor") {
          q = query(
            collection(db, "posts"),
            where("companyId", "==", mode.distributorId),
            where("migratedVisibility", "in", ["companyOnly", "network"]),
            orderBy("displayDate", "desc"),
            limit(batchSize)
          );
        } else if (mode.type === "highlighted") {
          q = query(
            collection(db, "posts"),
            where("highlightedBySuppliers", "array-contains", mode.supplierId),
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
          setLastVisibleSnap(newLast); // keep snapshot locally
          dispatch(setLastVisible(newLast.id)); // save only ID to Redux
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
      } else if (mode.type === "highlighted") {
        qRealtime = query(
          collection(db, "posts"),
          where("highlightedBySuppliers", "array-contains", mode.supplierId),
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
    } // <-- CLOSE loadAndListen here ✅

    loadAndListen();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [opts?.mode, batchSize, dispatch]);

  return {
    lastVisibleSnap,
    lastVisibleId: lastVisibleSnap?.id ?? null, // 👈 add this
  };
}

export default usePosts;
