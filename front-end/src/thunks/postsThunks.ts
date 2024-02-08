// postsThunks.ts
import { PostType, PostWithID } from "../utils/types";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  doc,
  getDocs,
  getDoc,
  Query,
  DocumentData,
  startAfter,
  where,
} from "firebase/firestore";
import {
  filterByCategories,
  filterByChannels,
} from "../services/postsServices";
import {
  // getFilteredPostsFromIndexedDB,
  storeFilteredPostsInIndexedDB,
  storeLatestPostsInIndexedDB,
  getLatestPostsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { DocumentSnapshot } from "firebase/firestore";
import { incrementRead } from "../Slices/firestoreReadsSlice";
// import { showMessage } from "../Slices/snackbarSlice";

type FetchPostsArgs = {
  filters: {
    channels: string[];
    categories: string[];
    states: string[];
    cities: string[];
  };
  lastVisible: DocumentSnapshot | null; // This should be the type for your lastVisible document snapshot
};

type FetchInitialPostsArgs = {
  POSTS_BATCH_SIZE: number;
  currentUserCompanyId: string;
};

// just noting this function fetches but doesn't store to redux or indexedDb
export const fetchInitialPostsBatch = createAsyncThunk(
  "posts/fetchInitial",
  async (
    { POSTS_BATCH_SIZE, currentUserCompanyId }: FetchInitialPostsArgs,
    { rejectWithValue }
  ) => {
    try {
      const postsCollectionRef = collection(db, "posts");

      const postsQuery = query(
        postsCollectionRef,
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(postsQuery);

      const postsWithIds: PostWithID[] = querySnapshot.docs
        .map((doc) => {
          const postData: PostType = doc.data() as PostType;
          return {
            ...postData,
            id: doc.id,
          };
        })
        .filter((post) => {
          const isPublic = post.visibility === "public";
          const isCompanyPost = post.visibility === "company" && post.postUserCompanyId === currentUserCompanyId;
          return isPublic || isCompanyPost;
        })
        .slice(0, POSTS_BATCH_SIZE);

      const lastVisible = postsWithIds[postsWithIds.length - 1]?.id;
      console.log(`Last visible post ID: ${lastVisible}, Number of posts after filter: ${postsWithIds.length}`);

      return { posts: postsWithIds, lastVisible };
    } catch (error) {
      console.error("Error fetching initial posts:", error);
      return rejectWithValue(error instanceof Error ? error.message : error);
    }
  }
);


// Define a type for the thunk argument
type FetchMorePostsArgs = {
  lastVisible: string | null; // Use string to represent the last document ID
  limit: number;
};

export const fetchMorePostsBatch = createAsyncThunk(
  "posts/fetchMore",
  async (
    { lastVisible, limit: BatchSize }: FetchMorePostsArgs,
    { rejectWithValue, dispatch }
  ) => {
    try {
      const postsCollectionRef = collection(db, "posts");
      let postsQuery;

      // If lastVisible is not null, convert it to a DocumentSnapshot
      if (lastVisible) {
        const lastVisibleSnapshot = await getDoc(doc(db, "posts", lastVisible));
        postsQuery = query(
          postsCollectionRef,
          orderBy("timestamp", "desc"),
          startAfter(lastVisibleSnapshot),
          limit(BatchSize)
        );
      } else {
        postsQuery = query(
          postsCollectionRef,
          orderBy("timestamp", "desc"),
          limit(BatchSize)
        );
      }

      const snapshot = await getDocs(postsQuery);
      const postsWithIds: PostWithID[] = snapshot.docs.map((doc) => {
        const data = doc.data() as PostType;
        return { id: doc.id, ...data };
      });
      // Get the last visible document's ID for pagination
      const newLastVisible =
        snapshot.docs[snapshot.docs.length - 1]?.id || null;

      // Dispatch incrementRead action
      dispatch(
        incrementRead({
          source: "fetchMoreBatch",
          description: "Fetching more posts",
          timestamp: new Date().toISOString(), // ISO 8601 format timestamp
        })
      );

      return { posts: postsWithIds, lastVisible: newLastVisible };
    } catch (error) {
      // Check if error is an instance of Error and has a message property
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      // If it's not an Error instance or doesn't have a message, return a default message
      return rejectWithValue("An unknown error occurred");
    }
  }
);

export const fetchLatestPosts = createAsyncThunk<
  PostWithID[],
  void,
  { rejectValue: string }
>("posts/fetchLatest", async (_, { rejectWithValue }) => {
  try {
    // First, try to get the latest posts from IndexedDB
    const cachedPosts = await getLatestPostsFromIndexedDB(); // Assume this function exists

    if (cachedPosts.length > 0) {
      return cachedPosts; // Return cached posts to avoid Firestore reads
    } else {
      // Fetch from Firestore as fallback
      const postsCollectionRef = collection(db, "posts");
      const baseQuery = query(
        postsCollectionRef,
        orderBy("timestamp", "desc"),
        limit(10)
      );

      console.log("fetchLatestPosts read");
      const postSnapshot = await getDocs(baseQuery);

      if (postSnapshot.empty) {
        return [];
      }

      const posts: PostWithID[] = postSnapshot.docs.map((doc) => ({
        ...(doc.data() as PostType),
        id: doc.id,
      }));

      // Optionally, store the fetched posts in IndexedDB
      await storeLatestPostsInIndexedDB(posts); // Assume this function exists

      // Dispatch incrementRead action
      dispatch(
        incrementRead({
          source: "fetchLatestPosts",
          description: "Fetching latest posts",
          timestamp: new Date().toISOString(), // ISO 8601 format timestamp
        })
      );

      return posts;
    }
  } catch (error) {
    console.error("Error fetching latest posts:", error);
    return rejectWithValue("Error fetching latest posts.");
  }
});

export const fetchFilteredPosts = createAsyncThunk<
  PostWithID[],
  FetchPostsArgs,
  { rejectValue: string }
>("posts/fetchFiltered", async ({ filters }, { rejectWithValue }) => {
  try {
    
    let baseQuery: Query<DocumentData> = collection(db, "posts");

    // Apply channel filters if they are present
    if (filters.channels && filters.channels.length > 0) {
      baseQuery = filterByChannels(filters.channels, baseQuery);
    }
    // Apply category filters if they are present
    if (filters.categories && filters.categories.length > 0) {
      baseQuery = filterByCategories(filters.categories, baseQuery);
    }

    // Execute the query
    const queryToExecute = query(baseQuery);
    const postSnapshot = await getDocs(queryToExecute);

    if (postSnapshot.empty) {
      return [];
    }

    // When mapping, create PostWithID objects
    const posts: PostWithID[] = postSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as PostType),
    }));

    // Store the fetched posts in IndexedDB
    await storeFilteredPostsInIndexedDB(posts, filters);

    // Return the fetched posts
    return posts;
  } catch (error) {
    console.error("Error fetching filtered posts:", error);
    return rejectWithValue("Error fetching filtered posts.");
  }
});

// Thunk for fetching user posts
export const fetchUserCreatedPosts = createAsyncThunk<PostWithID[], string>(
  "posts/fetchUserPosts",
  async (userId, { rejectWithValue }) => {
    try {
      // Firestore query to fetch user posts
      const q = query(collection(db, "posts"), where("user.postUserId", "==", userId));
      const querySnapshot = await getDocs(q);
      const userCreatedPosts: PostWithID[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as PostType),
      }));
      // You would add your IndexedDB caching logic here or perhaps handle it when the function is called.
      // add Post to redux?
      // addUserPostsToIndexedDB
      return userCreatedPosts;
    } catch (error) {
      // showMessage
      return rejectWithValue("Error fetching user posts");
    }
  }
);
