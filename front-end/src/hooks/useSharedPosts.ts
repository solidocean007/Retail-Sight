import { useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { PostWithID } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";
import {
  addSharedPosts,
  updateSharedPost,
  setLoading,
  setError,
  setHasMore,
  setSharedPosts,
} from "../Slices/sharedPostsSlice";
import {
  addSharedPostsToIndexedDB,
  getSharedPostsFromIndexedDB,
} from "../utils/database/sharedPostsStoreUtils";
import { useSelector } from "react-redux";

export const useSharedPosts = (
  companyId: string | undefined,
  batchSize: number = 10
) => {
  const dispatch = useAppDispatch();
  const sharedPosts = useSelector((s: RootState) => s.sharedPosts.sharedPosts);
  const hasMore = useSelector((s: RootState) => s.sharedPosts.hasMore);
  const loading = useSelector((s: RootState) => s.sharedPosts.loading);
  const lastVisibleRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(
    null
  );

  // 🔹 Load cached posts first
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const cached = await getSharedPostsFromIndexedDB();
      if (cached?.length) {
        dispatch(setSharedPosts(cached));
      } else {
        await fetchInitialBatch();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // 🔹 Initial batch
  const fetchInitialBatch = useCallback(async () => {
    if (!companyId) return;
    try {
      dispatch(setLoading(true));

      const q = query(
        collection(db, "posts"),
        where("sharedWithCompanies", "array-contains", companyId),
        orderBy("displayDate", "desc"),
        limit(batchSize)
      );

      const snap = await getDocs(q);
      const docs = snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as PostWithID)
      );

      dispatch(setSharedPosts(docs));
      await addSharedPostsToIndexedDB(docs);

      lastVisibleRef.current = snap.docs[snap.docs.length - 1] || null;
      dispatch(setHasMore(snap.docs.length === batchSize));
    } catch (err: any) {
      dispatch(setError(err.message));
      console.error("Error fetching shared posts:", err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [companyId, batchSize, dispatch]);

  // 🔹 Fetch more posts (pagination)
  const fetchMore = useCallback(async () => {
    if (!companyId || !hasMore || !lastVisibleRef.current) return;

    try {
      dispatch(setLoading(true));

      const q = query(
        collection(db, "posts"),
        where("sharedWithCompanies", "array-contains", companyId),
        orderBy("displayDate", "desc"),
        startAfter(lastVisibleRef.current),
        limit(batchSize)
      );

      const snap = await getDocs(q);
      const morePosts = snap.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as PostWithID)
      );

      if (morePosts.length > 0) {
        dispatch(addSharedPosts(morePosts));
        await addSharedPostsToIndexedDB([...sharedPosts, ...morePosts]);
        lastVisibleRef.current = snap.docs[snap.docs.length - 1] || null;
        dispatch(setHasMore(morePosts.length === batchSize));
      } else {
        dispatch(setHasMore(false));
      }
    } catch (err: any) {
      dispatch(setError(err.message));
      console.error("Error fetching more shared posts:", err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [companyId, hasMore, sharedPosts, batchSize, dispatch]);

  // 🔹 Real-time listener
  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, "posts"),
      where("sharedWithCompanies", "array-contains", companyId),
      orderBy("displayDate", "desc"),
      limit(batchSize)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const post = { id: change.doc.id, ...change.doc.data() } as PostWithID;

        if (change.type === "added") {
          dispatch(addSharedPosts([post]));
        } else if (change.type === "modified") {
          dispatch(updateSharedPost(post));
        } else if (change.type === "removed") {
          dispatch({ type: "sharedPosts/removeSharedPost", payload: post.id });
        }
      });
    });

    return () => unsubscribe();
  }, [companyId, dispatch, batchSize]);

  return {
    posts: sharedPosts,
    loading,
    hasMore,
    fetchMore,
    refresh: fetchInitialBatch,
  };
};
