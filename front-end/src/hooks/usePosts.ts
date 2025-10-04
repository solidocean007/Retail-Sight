// import { useSelector } from "react-redux";
// import { useEffect, useState } from "react";
// import {
//   QuerySnapshot,
//   Timestamp,
//   collection,
//   getDocs,
//   limit,
//   onSnapshot,
//   orderBy,
//   query,
//   where,
// } from "firebase/firestore";
// import { useAppDispatch, RootState } from "../utils/store";
// import { PostType, PostWithID } from "../utils/types";
// import { deletePost, mergeAndSetPosts, setPosts } from "../Slices/postsSlice";
// import {
//   getPostsFromIndexedDB,
//   addPostsToIndexedDB,
//   getLastSeenTimestamp,
//   setLastSeenTimestamp,
//   removePostFromIndexedDB,
//   deleteUserCreatedPostInIndexedDB,
//   updatePostInIndexedDB,
//   shouldRefetchPosts,
// } from "../utils/database/indexedDBUtils";
// import { db } from "../utils/firebase";
// import { fetchInitialPostsBatch } from "../thunks/postsThunks";
// import { normalizePost } from "../utils/normalizePost";
// import {
//   updatePostInFilteredSets,
//   purgeDeletedPostFromFilteredSets,
// } from "../utils/database/indexedDBUtils";

// const usePosts = (
//   currentUserCompanyId: string | undefined,
//   POSTS_BATCH_SIZE: number
// ) => {
//   const dispatch = useAppDispatch();
//   const currentUser = useSelector((state: RootState) => state.user.currentUser);
//   const isDeveloper = currentUser?.role === "developer";
//   const [initialLoaded, setInitialLoaded] = useState(false);

//   // 1️⃣ Initial load: IndexedDB or Firestore
//   useEffect(() => {
//     const loadInitialPosts = async (companyId: string) => {
//       const cached = await getPostsFromIndexedDB();
//       const newestCachedDate = cached?.[0]?.displayDate || null;

//       const needsUpdate = await shouldRefetchPosts(companyId, newestCachedDate);

//       if (cached.length > 0 && !needsUpdate) {
//         dispatch(setPosts(cached.map(normalizePost)));
//       } else {
//         const action = await dispatch(
//           fetchInitialPostsBatch({
//             POSTS_BATCH_SIZE,
//             currentUser,
//           })
//         );
//         console.log("Initial posts fetched:", action);
//         if (fetchInitialPostsBatch.fulfilled.match(action)) {
//           const posts = action.payload.posts.map(normalizePost);
//           dispatch(setPosts(posts));
//           addPostsToIndexedDB(posts);
//         }
//       }

//       setInitialLoaded(true);
//     };

//     const loadCompanyNetworkPosts = async () => {
//       const snap = await getDocs(
//         query(
//           collection(db, "posts"),
//           where("migratedVisibility", "==", "network" ),
//           where("companyId", "==", currentUserCompanyId || null),
//           orderBy("displayDate", "desc"),
//           limit(POSTS_BATCH_SIZE)
//         )
//       );
//       const companyPosts = snap.docs.map((doc) =>
//         normalizePost({ id: doc.id, ...doc.data() } as PostWithID)
//       );
//       dispatch(setPosts(companyPosts));
//       setInitialLoaded(true);
//     };

//     if (!currentUser) {
//       loadCompanyNetworkPosts();
//     } else if (currentUserCompanyId) {
//       loadInitialPosts(currentUserCompanyId);
//     }
//   }, [currentUser, currentUserCompanyId, dispatch, POSTS_BATCH_SIZE]);

//   // 2️⃣ Real-time listeners: only after initial load
//   useEffect(() => {
//     if (!initialLoaded) return;
//     // let unsubscribePublic: () => void = () => {};
//     // let unsubscribeCompany: () => void = () => {};
//     let unsubscribeCompanyOnlyPosts: () => void = () => {};
//     let unsubscribeNetworkPosts: () => void = () => {};

//     const setupListeners = async () => {
//       const lastSeenISO =
//         (await getLastSeenTimestamp()) || new Date(0).toISOString();
//       const lastSeenDate = new Date(lastSeenISO);
//       const lastSeenTs = Timestamp.fromDate(lastSeenDate);

//       const processDocChanges = async (snapshot: QuerySnapshot) => {
//         let mostRecent = lastSeenDate;
//         const updates: PostWithID[] = [];

//         for (const change of snapshot.docChanges()) {
//           const data = change.doc.data() as PostType;
//           let updatedAt: any = data.timestamp;
//           if (updatedAt?.toDate) updatedAt = updatedAt.toDate();
//           else if (typeof updatedAt === "string")
//             updatedAt = new Date(updatedAt);

//           if (updatedAt <= mostRecent) continue;
//           mostRecent = updatedAt;

//           if (change.type === "removed") {
//             dispatch(deletePost(change.doc.id));
//             removePostFromIndexedDB(change.doc.id);
//             deleteUserCreatedPostInIndexedDB(change.doc.id);
//             await purgeDeletedPostFromFilteredSets(change.doc.id); // ✅ now valid
//           } else if (
//             (change.type === "added" || change.type === "modified") &&
//             data.imageUrl
//           ) {
//             const normalized = normalizePost({
//               id: change.doc.id,
//               ...data,
//             } as PostWithID);
//             updates.push(normalized);
//             await updatePostInIndexedDB(normalized);
//             await updatePostInFilteredSets(normalized); // ✅ now valid
//           }
//         }

//         if (updates.length) {
//           dispatch(mergeAndSetPosts(updates));
//         }

//         if (mostRecent > lastSeenDate) {
//           await setLastSeenTimestamp(mostRecent.toISOString());
//         }
//       };

//       // 🔁 Listen for network posts
//       unsubscribeNetworkPosts = onSnapshot(
//         query(
//           collection(db, "posts"),
//           where("timestamp", ">", lastSeenTs),
//           where("migratedVisibility", "==", "network"),
//           where("companyId", "==", currentUserCompanyId || null),
//           orderBy("timestamp", "desc"),
//           limit(POSTS_BATCH_SIZE)
//         ),
//         processDocChanges
//       );

//       // 🔁 Listen for network posts
//       if (currentUserCompanyId) {
//         unsubscribeCompanyOnlyPosts = onSnapshot(
//           query(
//             collection(db, "posts"),
//             where("timestamp", ">", lastSeenTs),
//             where("migratedVisibility", "==", "companyOnly"),
//             ...(isDeveloper
//               ? []
//               : [where("companyId", "==", currentUserCompanyId)]),
//             orderBy("timestamp", "desc"),
//             limit(POSTS_BATCH_SIZE)
//           ),
//           processDocChanges
//         );
//       }
//     };

//     setupListeners();

//     return () => {
//       unsubscribeNetworkPosts();
//       unsubscribeCompanyOnlyPosts();
//     };
//   }, [initialLoaded, currentUserCompanyId, dispatch, POSTS_BATCH_SIZE]);
// };

// export default usePosts;

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

    const loadCompanyNetworkPosts = async () => {
      const snap = await getDocs(
        query(
          collection(db, "posts"),
          where("companyId", "==", currentUserCompanyId || null),
          where("migratedVisibility", "in", [
            "companyOnly",
            "network",
          ]),
          orderBy("displayDate", "desc"),
          limit(POSTS_BATCH_SIZE)
        )
      );
      const companyPosts = snap.docs.map((doc) =>
        normalizePost({ id: doc.id, ...doc.data() } as PostWithID)
      );
      dispatch(setPosts(companyPosts));
      setInitialLoaded(true);
    };

    if (!currentUser) {
      loadCompanyNetworkPosts();
    } else if (currentUserCompanyId) {
      loadInitialPosts(currentUserCompanyId);
    }
  }, [currentUser, currentUserCompanyId, dispatch, POSTS_BATCH_SIZE]);

  // 2️⃣ Real-time listener for new posts only
  useEffect(() => {
    if (!initialLoaded || !currentUserCompanyId) return;
    let unsubscribe: () => void = () => {};

    const setupListener = async () => {
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

        if (updates.length) {
          dispatch(mergeAndSetPosts(updates));
        }

        if (mostRecent > lastSeenDate) {
          await setLastSeenTimestamp(mostRecent.toISOString());
        }
      };

      unsubscribe = onSnapshot(
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

    setupListener();
    return () => unsubscribe();
  }, [initialLoaded, currentUserCompanyId, dispatch, POSTS_BATCH_SIZE]);
};

export default usePosts;
