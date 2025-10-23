import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import {
  QuerySnapshot,
  Timestamp,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAppDispatch, RootState } from "../utils/store";
import { PostType, PostWithID } from "../utils/types";
import { deletePost, mergeAndSetPosts, setPosts } from "../Slices/postsSlice";
import {
  getPostsFromIndexedDB,
  addPostsToIndexedDB,
  getLastSeenTimestamp,
  setLastSeenTimestamp,
  removePostFromIndexedDB,
  deleteUserCreatedPostInIndexedDB,
  updatePostInIndexedDB,
  shouldRefetchPosts,
  updatePostInFilteredSets,
  purgeDeletedPostFromFilteredSets,
} from "../utils/database/indexedDBUtils";
import { db } from "../utils/firebase";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import { normalizePost } from "../utils/normalize";

const usePosts = (
  currentUserCompanyId: string | undefined,
  POSTS_BATCH_SIZE: number
) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const isDeveloper = currentUser?.role === "developer";
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 1️⃣ INITIAL LOAD — IndexedDB first, Firestore fallback
useEffect(() => {
  const loadInitialPosts = async (companyId: string) => {
    //  console.group("🪣 [usePosts] loadInitialPosts");
      // console.log("companyId:", companyId);
    const cached = await getPostsFromIndexedDB();
    console.log("Cached posts in IndexedDB:", cached.length);
    const newestCachedDate = cached?.[0]?.displayDate || null;
    const needsUpdate = await shouldRefetchPosts(companyId, newestCachedDate);

    if (cached.length > 0 && !needsUpdate) {
        // console.log("✅ Using cached posts only");
      dispatch(setPosts(cached.map(normalizePost)));
    } else {
      // console.log("📡 Fetching fresh posts from Firestore");
      const action = await dispatch(
        fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUser })
      );
      if (fetchInitialPostsBatch.fulfilled.match(action)) {
        const posts = action.payload.posts.map(normalizePost);
        // console.log("Fetched Firestore posts count:", posts.length);
        dispatch(setPosts(posts));
        await addPostsToIndexedDB(posts);
      } else {
        console.warn("⚠️ fetchInitialPostsBatch rejected:", action);
      }
    }

    setInitialLoaded(true);
    console.groupEnd();
  };

  const loadDeveloperPosts = async () => {
    // console.group("🧑‍💻 [usePosts] Developer mode");
    const snap = await getDocs(
      query(collection(db, "posts"), orderBy("displayDate", "desc"), limit(POSTS_BATCH_SIZE))
    );
    //  console.log("Developer fetched docs:", snap.size);
    const allPosts = snap.docs.map((doc) =>
      normalizePost({ id: doc.id, ...doc.data() } as PostWithID)
    );
    dispatch(setPosts(allPosts));
    await addPostsToIndexedDB(allPosts);
    setInitialLoaded(true);
    // console.groupEnd();
  };

  const loadPublic = async () => {
    //  console.group("🌍 [usePosts] Public mode");
    const snap = await getDocs(
      query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("displayDate", "desc"),
        limit(POSTS_BATCH_SIZE)
      )
    );
    //  console.log("Public fetched docs:", snap.size);
    const publicPosts = snap.docs.map((doc) =>
      normalizePost({ id: doc.id, ...doc.data() } as PostWithID)
    );
    dispatch(setPosts(publicPosts));
    setInitialLoaded(true);
    // console.groupEnd();
  };

  // ✅ Wrapper async IIFE
  (async () => {
    if (isDeveloper) {
      await loadDeveloperPosts();
    } else if (currentUserCompanyId) {
      await loadInitialPosts(currentUserCompanyId);
    } else {
      await loadPublic();
    }
  })();
}, [currentUserCompanyId, currentUser, dispatch, POSTS_BATCH_SIZE, isDeveloper]);


  // 2️⃣ REAL-TIME LISTENERS — only after initial load
  useEffect(() => {
    if (!initialLoaded || !currentUserCompanyId) return;

    let unsubscribePublic: () => void = () => {};
    let unsubscribeCompany: () => void = () => {};

    const setupListeners = async () => {
      //  console.group("👂 [usePosts] setupListeners");
      //  console.log("initialLoaded:", initialLoaded, "companyId:", currentUserCompanyId);

      const lastSeenISO =
        (await getLastSeenTimestamp()) || new Date(0).toISOString();
      const lastSeenDate = new Date(lastSeenISO);
      const lastSeenTs = Timestamp.fromDate(lastSeenDate);
      // console.log("lastSeenTimestamp:", lastSeenISO);

      const processDocChanges = async (snapshot: QuerySnapshot) => {
        //  console.group("📦 onSnapshot -> processDocChanges");
        // console.log("Doc changes count:", snapshot.docChanges().length);
        let mostRecent = lastSeenDate;
        const updates: PostWithID[] = [];

        for (const change of snapshot.docChanges()) {
          //  console.log("→ Change type:", change.type, "Doc ID:", change.doc.id);
          const data = change.doc.data() as PostType;
          let updatedAt: any = data.timestamp;

          if (updatedAt?.toDate) updatedAt = updatedAt.toDate();
          else if (typeof updatedAt === "string")
            updatedAt = new Date(updatedAt);

          if (updatedAt <= mostRecent) continue;
          mostRecent = updatedAt;

          if (change.type === "removed") {
            //  console.log("🗑 Removed post:", change.doc.id);
            dispatch(deletePost(change.doc.id));
            removePostFromIndexedDB(change.doc.id);
            deleteUserCreatedPostInIndexedDB(change.doc.id);
            await purgeDeletedPostFromFilteredSets(change.doc.id);
          } else if (
            (change.type === "added" || change.type === "modified") &&
            data.imageUrl
          ) {
            const normalized = normalizePost({
              id: change.doc.id,
              ...data,
            } as PostWithID);
            updates.push(normalized);
            await updatePostInIndexedDB(normalized);
            await updatePostInFilteredSets(normalized);
          }
        }

        //  console.log("✅ Updates ready to merge:", updates.length);
        if (updates.length) dispatch(mergeAndSetPosts(updates));
        if (mostRecent > lastSeenDate)
          await setLastSeenTimestamp(mostRecent.toISOString());
        // console.groupEnd();
      };

      // 🔁 Developer listens to *all posts*
      if (isDeveloper) {
        //  console.log("🔁 Listening: developer (all posts)");
        unsubscribePublic = onSnapshot(
          query(
            collection(db, "posts"),
            where("timestamp", ">", lastSeenTs),
            orderBy("timestamp", "desc"),
            limit(POSTS_BATCH_SIZE)
          ),
          processDocChanges
        );
        // console.groupEnd();
      }

      //  console.log("🔁 Listening: company posts (network/companyOnly)");
      // 🔁 Company posts: both "companyOnly" and "network"
      unsubscribeCompany = onSnapshot(
        query(
          collection(db, "posts"),
          where("timestamp", ">", lastSeenTs),
          where("companyId", "==", currentUserCompanyId),
          where("migratedVisibility", "in", ["companyOnly", "network"]),
          orderBy("timestamp", "desc"),
          limit(POSTS_BATCH_SIZE)
        ),
        processDocChanges
      );
    };

    setupListeners();

    return () => {
      unsubscribePublic();
      unsubscribeCompany();
      // console.log("🧹 Unsubscribed usePosts listeners");
    };
  }, [
    initialLoaded,
    currentUserCompanyId,
    dispatch,
    POSTS_BATCH_SIZE,
    isDeveloper,
  ]);
};

export default usePosts;
