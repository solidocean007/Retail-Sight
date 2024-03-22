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
import { PostType, PostWithID } from "../utils/types";
import { deletePost, mergeAndSetPosts } from "../Slices/postsSlice";
import {
  addPostsToIndexedDB,
  deleteUserCreatedPostInIndexedDB,
  getLastSeenTimestamp,
  getPostsFromIndexedDB,
  removePostFromIndexedDB,
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
      if (!currentUser) return undefined;

    // 
    const processDocChanges = (snapshot: QuerySnapshot) => {
      const changes = snapshot.docChanges();
      changes.forEach((change: DocumentChange) => {
        const docData = change.doc.data();
        let docTimestamp = docData.timestamp;
    
        // Check if timestamp exists and is a Firestore Timestamp object
        if (docTimestamp?.toDate) {
          docTimestamp = docTimestamp.toDate();
        } else if (typeof docTimestamp === 'string') {
          // Assume timestamp is an ISO string if not a Firestore Timestamp
          docTimestamp = new Date(docTimestamp);
        }
    
        // Compare with lastSeenTimestamp
        if (
          change.type === "added" &&
          lastSeenTimestamp &&
          docTimestamp <= new Date(lastSeenTimestamp)
        ) {
          // Skip this 'added' event
          return;
        }
    
        const postData = {
          id: change.doc.id,
          ...docData,
        } as PostWithID;
    
        // Handle the different types of changes
        if (change.type === "added" || change.type === "modified") {
          dispatch(mergeAndSetPosts([postData])); // Type '{ id: string; }' is not assignable to type 'PostWithID'.
          // Type '{ id: string; }' is missing the following properties from type 'PostType': category, channel, storeAddress, displayDate, and 11 more
          updatePostInIndexedDB(postData); // Argument of type '{ id: string; }' is not assignable to parameter of type 'PostWithID'
        } else if (change.type === "removed") {
          dispatch(deletePost(change.doc.id));
          removePostFromIndexedDB(change.doc.id);
          deleteUserCreatedPostInIndexedDB(change.doc.id);
        }
      });
    };
    
    

    // Setup the listeners
    const qPublic = query(
      collection(db, "posts"),
      where('timestamp', '>', lastSeenTimestamp),
      where("visibility", "==", "public"),
      orderBy("timestamp", "desc")
    );
    const unsubscribePublic = onSnapshot(qPublic, processDocChanges);

    let unsubscribeCompany = () => {};
    if (currentUserCompanyId) {
      const qCompany = query(
        collection(db, "posts"),
        where('timestamp', '>', lastSeenTimestamp),
        where("postUserCompanyId", "==", currentUserCompanyId),
        orderBy("timestamp", "desc")
      );
      unsubscribeCompany = onSnapshot(qCompany, processDocChanges);
    }

    // Cleanup function to unsubscribe from listeners
    return () => {
      unsubscribePublic();
      unsubscribeCompany();
    };
    }
    
    
    setupListeners();
  }, [currentUserCompanyId, dispatch, currentUser]);

  // load indexDB posts or fetch from firestore
  useEffect(() => {
    const fetchPostsForLoggedInUser = async (currentUserCompanyId: string) => {
      try {
        const indexedDBPosts = await getPostsFromIndexedDB();
        if (indexedDBPosts.length > 0) {
          dispatch(mergeAndSetPosts(indexedDBPosts)); // Update Redux store with posts from IndexedDB
        } else {
          const action = await dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompanyId })
          );
          if (fetchInitialPostsBatch.fulfilled.match(action)) {
            const fetchedPosts = action.payload.posts;
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
