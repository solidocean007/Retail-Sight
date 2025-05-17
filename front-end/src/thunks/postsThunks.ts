// postsThunks.ts
import { CollectionType, PostType, PostWithID } from "../utils/types";
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
  Timestamp,
} from "firebase/firestore";
import {
  filterByCategories,
  filterByChannels,
  filterByCities,
  filterByHashtag,
  filterByStarTag,
  filterByStates,
} from "../filters/postFilterServices";
import {
  // getFilteredPostsFromIndexedDB,
  storeLatestPostsInIndexedDB,
  getLatestPostsFromIndexedDB,
} from "../utils/database/indexedDBUtils";

type FetchInitialPostsArgs = {
  POSTS_BATCH_SIZE: number;
  currentUserCompanyId: string | undefined;
};

// just noting this function fetches but doesn't store to redux or indexedDb
export const fetchInitialPostsBatch = createAsyncThunk(
  "posts/fetchInitial",
  async (
    { POSTS_BATCH_SIZE, currentUserCompanyId }: FetchInitialPostsArgs,
    { rejectWithValue },
  ) => {
    try {
      const postsCollectionRef = collection(db, "posts");

      const postsQuery = query(
        postsCollectionRef,
        orderBy("displayDate", "desc"),
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
            post.createdBy.companyId === currentUserCompanyId;
          const isSupplier = // add the posts where visibility is "supplier"
            post.visibility === "supplier" &&
            post.createdBy.companyId === currentUserCompanyId;
          return isPublic || isCompanyPost || isSupplier;
        })
        .slice(0, POSTS_BATCH_SIZE);

      const lastVisible = postsWithIds[postsWithIds.length - 1]?.id;

      return { posts: postsWithIds, lastVisible };
    } catch (error) {
      console.error("Error fetching initial posts:", error);
      return rejectWithValue(error instanceof Error ? error.message : error);
    }
  },
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
    { lastVisible, limit: batchSize, currentUserCompanyId }: FetchMorePostsArgs,
    { rejectWithValue },
  ) => {
    try {
      if (!currentUserCompanyId) {
        console.warn(
          "⚠️ fetchMorePostsBatch called without a valid companyId.",
        );
        return { posts: [], lastVisible: null };
      }

      const postsCollectionRef = collection(db, "posts");
      let postsQuery;

      if (lastVisible) {
        const lastVisibleSnapshot = await getDoc(doc(db, "posts", lastVisible));
        if (!lastVisibleSnapshot.exists()) {
          console.warn("⚠️ lastVisible document not found:", lastVisible);
        }

        postsQuery = query(
          postsCollectionRef,
          orderBy("displayDate", "desc"),
          startAfter(lastVisibleSnapshot),
          limit(batchSize),
        );
      } else {
        postsQuery = query(
          postsCollectionRef,
          orderBy("displayDate", "desc"),
          limit(batchSize),
        );
      }

      const snapshot = await getDocs(postsQuery);

      const postsWithIds: PostWithID[] = snapshot.docs
        .map((doc) => {
          const data = doc.data() as PostType;

          const isPublic = data.visibility === "public";
          const isCompanyPost =
            data.visibility === "company" &&
            data.createdBy?.companyId === currentUserCompanyId;
          const isSupplierPost =
            data.visibility === "supplier" &&
            data.createdBy?.companyId === currentUserCompanyId;

          const include = isPublic || isCompanyPost || isSupplierPost;

          return include ? { id: doc.id, ...data } : null;
        })
        .filter((post): post is PostWithID => post !== null);

      const newLastVisible =
        snapshot.docs[snapshot.docs.length - 1]?.id || null;

      return { posts: postsWithIds, lastVisible: newLastVisible };
    } catch (error) {
      console.error("❌ Error in fetchMorePostsBatch:", error);
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue("An unknown error occurred");
    }
  },
);

type FetchFilteredPostsArgs = {
  filters: {
    channels: string[];
    categories: string[];
    states: string[];
    cities: string[];
    dateRange: { startDate: string | null; endDate: string | null };
  };
  currentHashtag: string | null;
  currentStarTag?: string | null;
  // should i rename currentHashtag to currentTag or also define a currentStarTag?
};

export const fetchFilteredPosts = createAsyncThunk(
  "posts/fetchFiltered",
  async (
    { filters, currentHashtag, currentStarTag }: FetchFilteredPostsArgs,
    { rejectWithValue },
  ) => {
    try {
      let queryToExecute: Query<DocumentData> = collection(db, "posts");

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
      if (currentStarTag && currentStarTag.length > 0) {
        queryToExecute = filterByStarTag(currentStarTag, queryToExecute);
      }
      if (currentHashtag && currentHashtag.length > 0) {
        queryToExecute = filterByHashtag(currentHashtag, queryToExecute);
      }
      // Apply date range filter using ISO strings
      if (filters.dateRange.startDate && filters.dateRange.endDate) {
        queryToExecute = query(
          queryToExecute,
          where("displayDate", ">=", filters.dateRange.startDate),
          where("displayDate", "<=", filters.dateRange.endDate),
        );
      }

      // i need more filters

      queryToExecute = query(queryToExecute, orderBy("displayDate", "desc"));
      const postSnapshot = await getDocs(queryToExecute);

      if (postSnapshot.empty) {
        return [];
      }

      const fetchedFilteredPosts: PostWithID[] = postSnapshot.docs.map(
        (doc) => ({
          id: doc.id,
          ...(doc.data() as PostType),
        }),
      );
      return fetchedFilteredPosts;
    } catch (error) {
      console.error("Error fetching filtered posts:", error);
      return rejectWithValue("Error fetching filtered posts.");
    }
  },
);

// Thunk for fetching user posts
export const fetchUserCreatedPosts = createAsyncThunk<PostWithID[], string>(
  "posts/fetchUserPosts",
  async (userId, { rejectWithValue }) => {
    console.log(userId);
    try {
      // Firestore query to fetch user posts
      const q = query(
        collection(db, "posts"),
        where("postUserId", "==", userId),
      );
      const querySnapshot = await getDocs(q);
      console.log(querySnapshot);
      const userCreatedPosts: PostWithID[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as PostType),
      }));
      return userCreatedPosts;
    } catch (error) {
      // showMessage
      return rejectWithValue("Error fetching user posts");
    }
  },
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
        limit(10),
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

// Define a type for the thunk argument

// Define the arguments for the fetchPostsByIds thunk
type FetchPostsByIdsArgs = {
  postIds: string[] | string; // This allows either a single string or an array of strings
  token?: string;
};

// The thunk to fetch posts by IDs after validating the token
export const fetchPostsByIds = createAsyncThunk<
  PostWithID[],
  FetchPostsByIdsArgs,
  { rejectValue: string }
>("posts/fetchPostsByIds", async ({ postIds, token }, { rejectWithValue }) => {
  try {
    const ids = Array.isArray(postIds) ? postIds : [postIds];

    const fetchPostPromises = ids.map(async (postId) => {
      const response = await fetch("https://my-fetch-data-api.vercel.app/api/validatePostShareToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, token: token || "" }),
      });

      const result = await response.json();

      if (!result.valid) {
        throw new Error(`Invalid token for post ${postId}`);
      }

      return result.post as PostWithID;
    });

    const postsWithIds = await Promise.all(fetchPostPromises);
    return postsWithIds;
  } catch (error) {
    console.error("Error fetching posts by IDs:", error);
    return rejectWithValue("Error fetching posts by IDs.");
  }
});

export const fetchPostsByCollectionId = createAsyncThunk<
  PostWithID[],
  string, // collectionId
  { rejectValue: string }
>(
  "posts/fetchPostsByCollectionId",
  async (collectionId, { rejectWithValue }) => {
    try {
      // Step 1: Look up the collection document
      const collectionDocRef = doc(db, "collections", collectionId);
      const collectionSnap = await getDoc(collectionDocRef);

      if (!collectionSnap.exists()) {
        return rejectWithValue("Collection not found.");
      }

      const collectionData = collectionSnap.data() as CollectionType;

      if (!Array.isArray(collectionData.posts) || collectionData.posts.length === 0) {
        return []; // No posts in collection
      }

      // Step 2: Look up each post by its ID
      const postFetchPromises = collectionData.posts.map(async (postId) => {
        const postDocRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postDocRef);

        if (!postSnap.exists()) {
          console.warn(`Post with ID ${postId} not found.`);
          return null;
        }

        return {
          id: postSnap.id,
          ...(postSnap.data() as PostType),
        } as PostWithID;
      });

      const fetchedPosts = await Promise.all(postFetchPromises);
      const validPosts = fetchedPosts.filter((post) => post !== null) as PostWithID[];

      return validPosts;
    } catch (error) {
      console.error("Error fetching posts for collection:", error);
      return rejectWithValue("Error fetching posts for collection.");
    }
  }
);

