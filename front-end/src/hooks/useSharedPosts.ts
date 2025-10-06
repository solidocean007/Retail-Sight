import { useEffect, useState, useCallback } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, startAfter } from "firebase/firestore";
import { db } from "../utils/firebase";
import { PostWithID } from "../utils/types";
import { useAppDispatch } from "../utils/store";
import { addSharedPosts, updateSharedPost } from "../Slices/sharedPostsSlice";
import { addSharedPostsToIndexedDB, getSharedPostsFromIndexedDB } from "../utils/database/sharedPostsStoreUtils";

export const useSharedPosts = (companyId: string | undefined, batchSize: number = 10) => {
  const dispatch = useAppDispatch();
  const [posts, setPosts] = useState<PostWithID[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // 🔹 Load cached shared posts
  useEffect(() => {
    if (!companyId) return;
    getSharedPostsFromIndexedDB().then((cached) => {
      if (cached?.length) setPosts(cached);
    });
  }, [companyId]);

  // 🔹 Fetch first batch
  const fetchInitialBatch = useCallback(async () => {
    if (!companyId) return;

    setLoading(true);
    const q = query(
      collection(db, "posts"),
      where("sharedWithCompanies", "array-contains", companyId),
      orderBy("displayDate", "desc"),
      limit(batchSize)
    );

    const snap = await getDocs(q);
    const newPosts: PostWithID[] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as PostWithID[];

    setPosts(newPosts);
    setLastVisible(snap.docs[snap.docs.length - 1]);
    setHasMore(snap.docs.length === batchSize);
    dispatch(addSharedPosts(newPosts));
    await addSharedPostsToIndexedDB(newPosts);
    setLoading(false);
  }, [companyId, batchSize, dispatch]);

  // 🔹 Fetch more posts
  const fetchMore = useCallback(async () => {
    if (!companyId || !hasMore || !lastVisible) return;

    const q = query(
      collection(db, "posts"),
      where("sharedWithCompanies", "array-contains", companyId),
      orderBy("displayDate", "desc"),
      startAfter(lastVisible),
      limit(batchSize)
    );

    const snap = await getDocs(q);
    const morePosts: PostWithID[] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as PostWithID[];

    if (!morePosts.length) {
      setHasMore(false);
      return;
    }

    setPosts((prev) => [...prev, ...morePosts]);
    setLastVisible(snap.docs[snap.docs.length - 1]);
    dispatch(addSharedPosts(morePosts));
    await addSharedPostsToIndexedDB([...posts, ...morePosts]);
  }, [companyId, lastVisible, hasMore, batchSize, dispatch, posts]);

  // 🔹 Real-time updates
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
          setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
          dispatch(addSharedPosts([post]));
        } else if (change.type === "modified") {
          setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
          dispatch(updateSharedPost(post));
        }
      });
    });

    return () => unsubscribe();
  }, [companyId, dispatch, batchSize]);

  return { posts, loading, fetchMore, hasMore, refresh: fetchInitialBatch };
};
