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
import { PostWithID } from "../utils/types";
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
    const loadInitialPosts = async (companyId: string) => {
      const cached = await getPostsFromIndexedDB();
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
          dispatch(setPosts(posts));
          addPostsToIndexedDB(posts);
        }
      }

      setInitialLoaded(true);
    };

    const loadPublic = async () => {
      const snap = await getDocs(
        query(
          collection(db, "posts"),
          where("visibility", "==", "public"),
          orderBy("displayDate", "desc"),
          limit(POSTS_BATCH_SIZE)
        )
      );
      const publicPosts = snap.docs.map((doc) =>
        normalizePost({ id: doc.id, ...doc.data() } as PostWithID)
      );
      dispatch(setPosts(publicPosts));
      setInitialLoaded(true);
    };

    if (!currentUser) {
      loadPublic();
    } else if (currentUserCompanyId) {
      loadInitialPosts(currentUserCompanyId);
    }
  }, [currentUser, currentUserCompanyId, dispatch, POSTS_BATCH_SIZE]);

  // 2️⃣ Real-time listeners: only after initial load
  useEffect(() => {
    if (!initialLoaded) return;
    let unsubscribePublic: () => void = () => {};
    let unsubscribeCompany: () => void = () => {};

    const setupListeners = async () => {
      const lastSeenISO =
        (await getLastSeenTimestamp()) || new Date(0).toISOString();
      const lastSeenDate = new Date(lastSeenISO);
      const lastSeenTs = Timestamp.fromDate(lastSeenDate);

      const processDocChanges = async (snapshot: QuerySnapshot) => {
        let mostRecent = lastSeenDate;
        const updates: PostWithID[] = [];

        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          let dDValue: any = data.displayDate;
          if (dDValue?.toDate) dDValue = dDValue.toDate();
          else if (typeof dDValue === "string") dDValue = new Date(dDValue);

          if (dDValue <= mostRecent) return;
          mostRecent = dDValue;

          if (change.type === "removed") {
            dispatch(deletePost(change.doc.id));
            removePostFromIndexedDB(change.doc.id);
            deleteUserCreatedPostInIndexedDB(change.doc.id);
          } else if (
            (change.type === "added" || change.type === "modified") &&
            data.imageUrl
          ) {
            updates.push(
              normalizePost({ id: change.doc.id, ...data } as PostWithID)
            );
          }
        });

        if (updates.length) {
          updates.sort(
            (a, b) =>
              new Date(b.displayDate).getTime() -
              new Date(a.displayDate).getTime()
          );
          dispatch(mergeAndSetPosts(updates));
          updates.forEach((p) => updatePostInIndexedDB(p));
        }

        if (mostRecent > lastSeenDate) {
          await setLastSeenTimestamp(mostRecent.toISOString());
        }
      };

      // 🔁 Listen for public posts
      unsubscribePublic = onSnapshot(
        query(
          collection(db, "posts"),
          where("displayDate", ">", lastSeenTs),
          where("visibility", "==", "public"),
          orderBy("displayDate", "desc"),
          limit(POSTS_BATCH_SIZE)
        ),
        processDocChanges
      );

      // 🔁 Listen for company posts
      if (currentUserCompanyId) {
        unsubscribeCompany = onSnapshot(
          query(
            collection(db, "posts"),
            where("displayDate", ">", lastSeenTs),
            ...(isDeveloper
              ? []
              : [where("companyId", "==", currentUser?.companyId)]),
            orderBy("displayDate", "desc"),
            limit(POSTS_BATCH_SIZE)
          ),
          processDocChanges
        );
      }
    };

    setupListeners();

    return () => {
      unsubscribePublic();
      unsubscribeCompany();
    };
  }, [initialLoaded, currentUserCompanyId, dispatch, POSTS_BATCH_SIZE]);
};

export default usePosts;
