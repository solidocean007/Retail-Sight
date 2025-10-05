// hooks/usePosts.ts
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
import { normalizePost } from "../utils/normalizePost";

const usePosts = (
  currentUserCompanyId: string | undefined,
  POSTS_BATCH_SIZE: number
) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const isDeveloper = currentUser?.role === "developer";
  const [initialLoaded, setInitialLoaded] = useState(false);

  // 1️⃣ Initial load: IndexedDB or Firestore
  useEffect(() => {
    if (!currentUserCompanyId) return;

    const loadInitialPosts = async (companyId: string) => {
      const cached = await getPostsFromIndexedDB();
      console.log("Cached posts: ", cached);
      const newestCachedDate = cached?.[0]?.displayDate || null;
      const needsUpdate = await shouldRefetchPosts(companyId, newestCachedDate);

      if (cached.length > 0 && !needsUpdate) {
        dispatch(setPosts(cached.map(normalizePost)));
      } else {
        const action = await dispatch(
          fetchInitialPostsBatch({
            POSTS_BATCH_SIZE,
            currentUser,
          })
        );
        if (fetchInitialPostsBatch.fulfilled.match(action)) {
          const posts = action.payload.posts.map(normalizePost);
          console.log(posts)
          dispatch(setPosts(posts));
          await addPostsToIndexedDB(posts);
        }
      }
      setInitialLoaded(true);
    };

    loadInitialPosts(currentUserCompanyId);
  }, [currentUserCompanyId, currentUser, dispatch, POSTS_BATCH_SIZE]);

  // 2️⃣ Catch-up + real-time listeners
  useEffect(() => {
    if (!initialLoaded || !currentUserCompanyId) return;
    let unsubCompany: () => void = () => {};
    let unsubShared: () => void = () => {};

    const setupListeners = async () => {
      const lastSeenISO =
        (await getLastSeenTimestamp()) || new Date(0).toISOString();
      const lastSeenDate = new Date(lastSeenISO);
      const lastSeenTs = Timestamp.fromDate(lastSeenDate);

      const processDocChanges = async (snapshot: QuerySnapshot) => {
        let mostRecent = lastSeenDate;
        const updates: PostWithID[] = [];

        for (const change of snapshot.docChanges()) {
          const data = change.doc.data() as PostType;
          let updatedAt: any = data.timestamp;
          if (updatedAt?.toDate) updatedAt = updatedAt.toDate();
          else if (typeof updatedAt === "string")
            updatedAt = new Date(updatedAt);

          if (updatedAt <= mostRecent) continue;
          mostRecent = updatedAt;

          if (change.type === "removed") {
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

        if (updates.length) dispatch(mergeAndSetPosts(updates));
        if (mostRecent > lastSeenDate)
          await setLastSeenTimestamp(mostRecent.toISOString());
      };

      // 🔹 Company posts (own company)
      unsubCompany = onSnapshot(
        query(
          collection(db, "posts"),
          where("timestamp", ">", lastSeenTs),
          ...(isDeveloper ? [] : [where("companyId", "==", currentUserCompanyId)]),
          where("migratedVisibility", "in", ["companyOnly", "network"]),
          orderBy("timestamp", "desc"),
          limit(POSTS_BATCH_SIZE)
        ),
        processDocChanges
      );

      // 🔹 Shared posts (network)
     
    };

    setupListeners();

    return () => {
      unsubCompany();
      unsubShared();
    };
  }, [initialLoaded, currentUserCompanyId, dispatch, POSTS_BATCH_SIZE, isDeveloper]);
};

export default usePosts;
