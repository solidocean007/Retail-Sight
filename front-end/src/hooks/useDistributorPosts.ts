import { useEffect } from "react";
import {
  DocumentSnapshot,
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
} from "firebase/firestore";
import { useAppDispatch } from "../utils/store";
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

const useDistributorPosts = (
  currentUserCompanyId: string | undefined,
  POSTS_BATCH_SIZE: number,
  setLastVisibleDoc: React.Dispatch<React.SetStateAction<DocumentSnapshot | null>>
) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!currentUserCompanyId) return;

    let unsubscribeCompany: () => void = () => {};

    const loadAndListen = async () => {
      // 1️⃣ Load initial posts (IndexedDB → Firestore fallback)
      const cached = await getPostsFromIndexedDB();
      const newestCachedDate = cached?.[0]?.displayDate || null;
      const needsUpdate = await shouldRefetchPosts(currentUserCompanyId, newestCachedDate);

      if (cached.length > 0 && !needsUpdate) {
        dispatch(setPosts(cached.map(normalizePost)));
      } else {
        const action = await dispatch(
          fetchInitialPostsBatch({
            currentUserCompanyId,
            POSTS_BATCH_SIZE,
          })
        );
        if (fetchInitialPostsBatch.fulfilled.match(action)) {
          const posts = action.payload.posts.map(normalizePost);
          dispatch(setPosts(posts));
          addPostsToIndexedDB(posts);

          // Set last visible doc for pagination
          const lastDoc = action.payload.lastVisibleDoc || null;
          setLastVisibleDoc(lastDoc);
        }
      }

      // 2️⃣ Setup real-time listener for company posts
      const lastSeenISO = (await getLastSeenTimestamp()) || new Date(0).toISOString();
      const lastSeenDate = new Date(lastSeenISO);
      const lastSeenTs = Timestamp.fromDate(lastSeenDate);

      unsubscribeCompany = onSnapshot(
        query(
          collection(db, "posts"),
          where("displayDate", ">", lastSeenTs),
          where("postUserCompanyId", "==", currentUserCompanyId),
          orderBy("displayDate", "desc"),
          limit(POSTS_BATCH_SIZE)
        ),
        (snapshot) => {
          const updates: PostWithID[] = [];

          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();

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

          if (updates.length > 0) {
            setLastSeenTimestamp(new Date().toISOString());
          }
        }
      );
    };

    loadAndListen();

    return () => {
      unsubscribeCompany();
    };
  }, [currentUserCompanyId, dispatch, POSTS_BATCH_SIZE, setLastVisibleDoc]);
};

export default useDistributorPosts;
