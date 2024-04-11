// usePosts.ts
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { useEffect } from "react";
import {
  DocumentChange,
  QuerySnapshot,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { PostWithID } from "../utils/types";
import { deletePost, mergeAndSetPosts } from "../Slices/postsSlice";
import {
  addPostsToIndexedDB,
  deleteUserCreatedPostInIndexedDB,
  getLastSeenTimestamp,
  getPostsFromIndexedDB,
  removePostFromIndexedDB,
  setLastSeenTimestamp,
  updatePostInIndexedDB,
} from "../utils/database/indexedDBUtils";
import { db } from "../utils/firebase";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";

const usePosts = (
  currentUserCompanyId: string | undefined,
  POSTS_BATCH_SIZE: number
) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  useEffect(() => {
    const setupListeners = async () => {
      const lastSeen = await getLastSeenTimestamp();
      const lastSeenTimestamp = lastSeen || new Date(0).toISOString();
      console.log(
        `Setup listeners - Last seen timestamp: ${lastSeenTimestamp}`
      );
      if (!currentUser) return;

      const processDocChanges = async (snapshot: QuerySnapshot) => {
        let mostRecentTimeStamp = new Date(lastSeenTimestamp);
        let postsToUpdate: PostWithID[] = []; // Collect posts to sort them by displayDate later

        console.log(
          `Received snapshot with ${snapshot.docChanges().length} changes`
        );
        snapshot.docChanges().forEach((change) => {
          const docData = change.doc.data();
          let docTimestamp = docData.timestamp;

          // Convert Firestore Timestamp to JavaScript Date
          if (docTimestamp?.toDate) {
            docTimestamp = docTimestamp.toDate();
          } else if (typeof docTimestamp === "string") {
            docTimestamp = new Date(docTimestamp);
          }

          console.log(
            `Processing change for doc ID: ${change.doc.id}, Type: ${change.type}, Timestamp: ${docTimestamp}`
          );

          // Skip processing if the document's timestamp is not newer than the lastSeenTimestamp
          if (docTimestamp <= new Date(lastSeenTimestamp)) {
            console.log(
              `Skipping doc ID: ${change.doc.id} - Timestamp not newer than lastSeenTimestamp`
            );
            return;
          }

          // Update the most recent timestamp seen
          if (docTimestamp > mostRecentTimeStamp) {
            mostRecentTimeStamp = docTimestamp;
          }

          const postData = { id: change.doc.id, ...docData } as PostWithID;

          // Filter posts to those that have been added or modified with imageUrl
          if (
            (change.type === "added" || change.type === "modified") &&
            docData.imageUrl
          ) {
            console.log(`Adding/Updating post with ID: ${change.doc.id}`);
            postsToUpdate.push(postData); // Collect for sorting and updating
          }

          // Handle 'removed' changes
          if (change.type === "removed") {
            console.log(`Deleting post with ID: ${change.doc.id}`);
            dispatch(deletePost(change.doc.id));
            removePostFromIndexedDB(change.doc.id);
            deleteUserCreatedPostInIndexedDB(change.doc.id);
            return;
          }
        });

        // Sort collected posts by displayDate and dispatch for state update and IndexedDB
        postsToUpdate.sort(
          (a, b) =>
            new Date(b.displayDate).getTime() -
            new Date(a.displayDate).getTime()
        );
        if (postsToUpdate.length > 0) {
          console.log(
            `Dispatching mergeAndSetPosts with ${postsToUpdate.length} posts.`
          );
          dispatch(mergeAndSetPosts(postsToUpdate));
          postsToUpdate.forEach((post) => updatePostInIndexedDB(post));
        }

        // Update lastSeenTimestamp with the most recent timestamp seen
        if (mostRecentTimeStamp > new Date(lastSeenTimestamp)) {
          await setLastSeenTimestamp(mostRecentTimeStamp.toISOString());
        }
      };

      // Listening queries remain based on timestamp for catching updates
      // No changes needed here since we handle displayDate sorting after fetching

      const qPublic = query(
        collection(db, "posts"),
        where("timestamp", ">", lastSeenTimestamp),
        where("visibility", "==", "public"),
        orderBy("timestamp", "desc")
      );
      const unsubscribePublic = onSnapshot(qPublic, processDocChanges);

      let unsubscribeCompany = () => {};
      if (currentUserCompanyId) {
        const qCompany = query(
          collection(db, "posts"),
          where("timestamp", ">", lastSeenTimestamp),
          where("postUserCompanyId", "==", currentUserCompanyId),
          orderBy("timestamp", "desc")
        );
        unsubscribeCompany = onSnapshot(qCompany, processDocChanges);
      }

      // Cleanup function
      return () => {
        unsubscribePublic();
        unsubscribeCompany();
      };
    };

    setupListeners();
  }, [currentUserCompanyId, dispatch, currentUser]);

  // load indexDB posts or fetch from firestore
  useEffect(() => {
    const fetchPostsForLoggedInUser = async (currentUserCompanyId: string) => {
      try {
        const indexedDBPosts = await getPostsFromIndexedDB();
        if (indexedDBPosts.length > 0) {
          console.log("mergeandsetposts from indexedDb");
          dispatch(mergeAndSetPosts(indexedDBPosts)); // Update Redux store with posts from IndexedDB
        } else {
          const action = await dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompanyId })
          );
          if (fetchInitialPostsBatch.fulfilled.match(action)) {
            const fetchedPosts = action.payload.posts;
            console.log("mergeandsetposts from firestore");
            dispatch(mergeAndSetPosts(fetchedPosts));
            addPostsToIndexedDB(fetchedPosts); // Add fetched posts to IndexedDB
          }
        }
      } catch (error) {
        console.error("Error fetching posts from IndexedDB:", error);
      }
    };

    const fetchPublicPosts = async () => {
      try {
        const publicPostsQuery = query(
          collection(db, "posts"),
          where("visibility", "==", "public"),
          orderBy("displayDate", "desc"),
          limit(4)
        );
        const querySnapshot = await getDocs(publicPostsQuery);
        const publicPosts = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as PostWithID))
          .filter((post) => post.visibility === "public");
        console.log("merge and set public posts");
        dispatch(mergeAndSetPosts(publicPosts));
      } catch (error) {
        console.error("Error fetching public posts:", error);
      }
    };

    if (currentUser === null) {
      fetchPublicPosts();
    } else if (currentUserCompanyId) {
      fetchPostsForLoggedInUser(currentUserCompanyId);
    }
  }, [currentUser, dispatch, currentUserCompanyId]);
};

export default usePosts;
