// hooks/useSharedPosts.ts
import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAppDispatch } from "../utils/store";
import { setPosts, mergeAndSetPosts } from "../Slices/postsSlice";
import { normalizePost } from "../utils/normalizePost";
import { addPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import { PostWithID } from "../utils/types";

interface UseSharedPostsResult {
  lastVisibleSnap: QueryDocumentSnapshot<DocumentData> | null;
  lastVisibleId: string | null;
}

export default function useSharedPosts(
  companyId: string | undefined,
  batchSize: number = 10
): UseSharedPostsResult {
  const dispatch = useAppDispatch();
  const unsubscribeRef = useRef<() => void>();
  const [lastVisibleSnap, setLastVisibleSnap] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    async function loadAndListen() {
      const q = query(
        collection(db, "posts"),
        where("sharedWithCompanies", "array-contains", companyId),
        orderBy("displayDate", "desc"),
        limit(batchSize)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const newLast = snap.docs[snap.docs.length - 1];
        setLastVisibleSnap(newLast);

        const posts = snap.docs.map((d) =>
          normalizePost({ id: d.id, ...d.data() } as PostWithID)
        );

        dispatch(setPosts(posts));
        await addPostsToIndexedDB(posts);
      }

      if (cancelled) return;

      // 🔁 realtime listener
      unsubscribeRef.current = onSnapshot(q, (snap) => {
        const posts = snap.docs.map((d) =>
          normalizePost({ id: d.id, ...d.data() } as PostWithID)
        );
        if (posts.length > 0) {
          dispatch(mergeAndSetPosts(posts));
          addPostsToIndexedDB(posts);
        }
      });
    }

    loadAndListen();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [companyId, batchSize, dispatch]);

  return {
    lastVisibleSnap,
    lastVisibleId: lastVisibleSnap?.id ?? null,
  };
}
