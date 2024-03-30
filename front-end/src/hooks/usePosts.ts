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
      if (!currentUser) return;
  
      const processDocChanges = async (snapshot: QuerySnapshot) => {
        let mostRecentTimeStamp = new Date(lastSeenTimestamp);
      
        const changes = snapshot.docChanges();
        changes.forEach((change: DocumentChange) => {
          const docData = change.doc.data();
          let docTimestamp = docData.timestamp;
      
          // Convert Firestore Timestamp to JavaScript Date
          if (docTimestamp?.toDate) {
            docTimestamp = docTimestamp.toDate();
          } else if (typeof docTimestamp === "string") {
            docTimestamp = new Date(docTimestamp);
          }
      
          // Skip processing if the document's timestamp is not newer than the lastSeenTimestamp
          if (docTimestamp <= new Date(lastSeenTimestamp)) {
            return;
          }
      
          // Update the most recent timestamp seen
          if (docTimestamp > mostRecentTimeStamp) {
            mostRecentTimeStamp = docTimestamp;
          }
      
          const postData = { id: change.doc.id, ...docData } as PostWithID;
      
          // Handle 'added' changes with imageUrl
          if (change.type === "added" && docData.imageUrl) {
            dispatch(mergeAndSetPosts([postData]));
            updatePostInIndexedDB(postData);
          }
      
          // Handle 'modified' changes
          if (change.type === "modified") {
            dispatch(mergeAndSetPosts([postData]));
            updatePostInIndexedDB(postData);
          }
      
          // Handle 'removed' changes
          if (change.type === "removed") {
            dispatch(deletePost(change.doc.id));
            removePostFromIndexedDB(change.doc.id);
            deleteUserCreatedPostInIndexedDB(change.doc.id);
          }
        });
      
        // After processing changes, update lastSeenTimestamp in IndexedDB to the most recent one
        if (mostRecentTimeStamp > new Date(lastSeenTimestamp)) {
          await setLastSeenTimestamp(mostRecentTimeStamp.toISOString());
        }
      };
      
  
      // Define queries for public and company-specific posts
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
  
      // Return a cleanup function to unsubscribe from listeners
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
