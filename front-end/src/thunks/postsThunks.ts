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
  filterByCities,
  filterByHashtag,
  filterByStates,
} from "../filters/postFilterServices";
import {
  // getFilteredPostsFromIndexedDB,
  storeLatestPostsInIndexedDB,
  getLatestPostsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { DocumentSnapshot } from "firebase/firestore";
// import { showMessage } from "../Slices/snackbarSlice";

type FetchInitialPostsArgs = {
  POSTS_BATCH_SIZE: number;
  currentUserCompanyId: string | undefined;
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
        orderBy("displayDate", "desc")
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
          const isCompanyPost =
            post.visibility === "company" &&
            post.postUserCompanyId === currentUserCompanyId;
          return isPublic || isCompanyPost;
        })
        .slice(0, POSTS_BATCH_SIZE);

      const lastVisible = postsWithIds[postsWithIds.length - 1]?.id;
      console.log(
        `Last visible post ID: ${lastVisible}, Number of posts after filter: ${postsWithIds.length}`
      );

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
  currentUserCompanyId: string | undefined;
};

export const fetchMorePostsBatch = createAsyncThunk(
  "posts/fetchMore",
  async (
    { lastVisible, limit: BatchSize, currentUserCompanyId }: FetchMorePostsArgs,
    { rejectWithValue }
  ) => {
    try {
      const postsCollectionRef = collection(db, "posts");
      let postsQuery;

      if (lastVisible) {
        const lastVisibleSnapshot = await getDoc(doc(db, "posts", lastVisible));
        postsQuery = query(
          postsCollectionRef,
          orderBy("displayDate", "desc"),
          startAfter(lastVisibleSnapshot),
          limit(BatchSize)
        );
      } else {
        postsQuery = query(
          postsCollectionRef,
          orderBy("displayDate", "desc"),
          limit(BatchSize)
        );
      }

      const snapshot = await getDocs(postsQuery);
      const postsWithIds: PostWithID[] = snapshot.docs
        .map((doc) => {
          const data = doc.data() as PostType;
          const isPublic = data.visibility === "public";
          const isCompanyPost =
            data.visibility === "company" &&
            data.postUserCompanyId === currentUserCompanyId;
          return isPublic || isCompanyPost ? { id: doc.id, ...data } : null;
        })
        .filter((post) => post !== null) as PostWithID[];

      const newLastVisible =
        snapshot.docs[snapshot.docs.length - 1]?.id || null;
      return { posts: postsWithIds, lastVisible: newLastVisible };
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("An unknown error occurred");
    }
  }
);

type FetchFilteredPostsArgs = {
  filters: {
    channels: string[];
    categories: string[];
    states: string[]; // not currently using this in my filtered fetching
    cities: string[]; // not currently using this in my filtered fetching
  };
  currentHashtag: string | null;
};

export const fetchFilteredPosts = createAsyncThunk(
  "posts/fetchFiltered",
  async ({ filters, currentHashtag }: FetchFilteredPostsArgs, { rejectWithValue }) => {
    try {
      let queryToExecute: Query<DocumentData> = collection(db, "posts");

      // Apply filters if they are present
      if (filters.channels && filters.channels.length > 0) {
        queryToExecute = filterByChannels(filters.channels, queryToExecute);
      }
      if (filters.categories && filters.categories.length > 0) {
        queryToExecute = filterByCategories(filters.categories, queryToExecute);
      }
      if (filters.states && filters.states.length > 0) {
        queryToExecute = filterByStates(filters.states, queryToExecute);
      }
      if (filters.cities && filters.cities.length > 0) {
        queryToExecute = filterByCities(filters.cities, queryToExecute);
      }
      if (currentHashtag && currentHashtag.length > 0) {
        queryToExecute = filterByHashtag(currentHashtag, queryToExecute);
      }

      // Execute the query
      queryToExecute = query(queryToExecute, orderBy("displayDate", "desc"));
      console.log(queryToExecute)
      const postSnapshot = await getDocs(queryToExecute);
      console.log(postSnapshot)

      if (postSnapshot.empty) {
        return [];
      }

      const fetchedFilteredPosts: PostWithID[] = postSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as PostType),
      }));
      console.log(fetchedFilteredPosts)
      return fetchedFilteredPosts;
    } catch (error) {
      console.error("Error fetching filtered posts:", error);
      return rejectWithValue("Error fetching filtered posts.");
    }
  }
);


// New function to fetch more filtered posts
// export const fetchMoreFilteredPostsBatch = createAsyncThunk(
//   "posts/fetchMoreFiltered",
//   async (
//     { filters, lastVisible }: FetchFilteredPostsArgs,
//     { rejectWithValue }
//   ) => {
//     try {
//       // Construct the query with filters and lastVisible for pagination
//       let queryToExecute: Query<DocumentData> = collection(db, "posts");
//       // ...apply filters...
//       // Apply channel filters if they are present
//       if (filters.channels && filters.channels.length > 0) {
//         queryToExecute = filterByChannels(filters.channels, queryToExecute);
//       }
//       // Apply category filters if they are present
//       if (filters.categories && filters.categories.length > 0) {
//         queryToExecute = filterByCategories(filters.categories, queryToExecute);
//       }

//       if (lastVisible) {
//         queryToExecute = query(
//           queryToExecute,
//           orderBy("displayDate", "desc"),
//           startAfter(lastVisible),
//           limit(5) // Set your desired batch size
//         );
//       } else {
//         // If there's no lastVisible, it means it's the first fetch
//         queryToExecute = query(
//           queryToExecute,
//           orderBy("displayDate", "desc"),
//           limit(5)
//         );
//       }

//       // Execute the query
//       const postSnapshot = await getDocs(queryToExecute);

//       if (postSnapshot.empty) {
//         return { moreFilteredPosts: [], lastVisible: null };
//       }

//       // When mapping, create PostWithID objects
//       const moreFilteredPosts: PostWithID[] = postSnapshot.docs.map((doc) => ({
//         id: doc.id,
//         ...(doc.data() as PostType),
//       }));

//       const newLastVisible = postSnapshot.docs[postSnapshot.docs.length - 1];

//       return { moreFilteredPosts, lastVisible: newLastVisible.id };
//     } catch (error) {
//       console.error("Error fetching more filtered posts:", error);
//       return rejectWithValue("Error fetching more filtered posts.");
//     }
//   }
// );

// Thunk for fetching user posts
export const fetchUserCreatedPosts = createAsyncThunk<PostWithID[], string>(
  "posts/fetchUserPosts",
  async (userId, { rejectWithValue }) => {
    try {
      // Firestore query to fetch user posts
      const q = query(
        collection(db, "posts"),
        where("user.postUserId", "==", userId)
      );
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

      return posts;
    }
  } catch (error) {
    console.error("Error fetching latest posts:", error);
    return rejectWithValue("Error fetching latest posts.");
  }
});
