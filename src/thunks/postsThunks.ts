// postsThunks.ts
import { PostType } from "../utils/types";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import { collection, query, orderBy, limit, doc, getDocs, getDoc, Query, DocumentData, startAfter } from "firebase/firestore";
import {
  filterByCategories,
  filterByChannels,
} from "../services/postsServices";
import { getFilteredPostsFromIndexedDB, storeFilteredPostsInIndexedDB, storeLatestPostsInIndexedDB, getLatestPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { DocumentSnapshot } from "firebase/firestore";


// const POSTS_BATCH_SIZE = 10; // Number of posts to fetch per batch

type FetchPostsArgs = {
  filters: {
    channels: string[];
    categories: string[];
    states: string[];
    cities: string[];
  };
  lastVisible: DocumentSnapshot | null; // This should be the type for your lastVisible document snapshot
};

export const fetchInitialPostsBatch = createAsyncThunk(
  'posts/fetchInitial',
  async (POSTS_BATCH_SIZE: number, { rejectWithValue }) => {
    try {
      // Define the reference to the posts collection
      const postsCollectionRef = collection(db, "posts");
      console.log(`Attempting to fetch initial batch of posts with size: ${POSTS_BATCH_SIZE}`);
      const postsQuery = query(postsCollectionRef, orderBy("timestamp", "desc"), limit(POSTS_BATCH_SIZE));
      const snapshot = await getDocs(postsQuery);

      console.log(`Fetched ${snapshot.docs.length} posts.`);
      const posts = snapshot.docs.map(doc => {
        const postData = doc.data() as PostType;
        console.log(`Post ID: ${doc.id}`, postData);
        return { id: doc.id, ...postData }; 
      });
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      console.log(`Last visible post ID: ${lastVisible?.id}`);

      return { posts, lastVisible: lastVisible?.id }; // Ensure you return just the ID, not the whole DocumentSnapshot
    } catch (error) {
      console.error('Error fetching initial posts:', error);
      return rejectWithValue(error instanceof Error ? error.message : error);
    }
  }
);



// Define a type for the thunk argument
type FetchMorePostsArgs = {
  lastVisible: string | null;  // Use string to represent the last document ID
  limit: number;
};

export const fetchMorePostsBatch = createAsyncThunk(
  'posts/fetchMore',
  async ({ lastVisible, limit: BatchSize }: FetchMorePostsArgs, { rejectWithValue }) => {
    try {
      const postsCollectionRef = collection(db, "posts");
      let postsQuery;
      
      // If lastVisible is not null, convert it to a DocumentSnapshot
      if (lastVisible) {
        const lastVisibleSnapshot = await getDoc(doc(db, "posts", lastVisible));
        postsQuery = query(postsCollectionRef, orderBy("timestamp", "desc"), startAfter(lastVisibleSnapshot), limit(BatchSize));
      } else {
        postsQuery = query(postsCollectionRef, orderBy("timestamp", "desc"), limit(BatchSize));
      }

      const snapshot = await getDocs(postsQuery);
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PostType[];
      // Get the last visible document's ID for pagination
      const newLastVisible = snapshot.docs[snapshot.docs.length - 1]?.id || null;

      return { posts, lastVisible: newLastVisible };
    } catch (error) {
      // Check if error is an instance of Error and has a message property
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      // If it's not an Error instance or doesn't have a message, return a default message
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const fetchLatestPosts = createAsyncThunk<
  PostType[],
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
      
      console.log('fetchLatestPosts read')
      const postSnapshot = await getDocs(baseQuery);

      if (postSnapshot.empty) {
        return [];
      }

      const posts: PostType[] = postSnapshot.docs.map((doc) => ({
        ...(doc.data() as PostType),
        id: doc.id,
      }));

      // Optionally, store the fetched posts in IndexedDB
      await storeLatestPostsInIndexedDB(posts); // Assume this function exists

      return posts;
    }
  }  catch (error) {
    console.error("Error fetching latest posts:", error);
    return rejectWithValue("Error fetching latest posts.");
  }
});

export const fetchFilteredPosts = createAsyncThunk<
  PostType[],
  FetchPostsArgs,
  { rejectValue: string }
>("posts/fetchFiltered", async ({ filters }, { rejectWithValue }) => { 
  try {
    // First, try to get filtered posts from IndexedDB
    console.log("Attempting to fetch filtered posts from IndexedDB...");
    const cachedPosts = await getFilteredPostsFromIndexedDB(filters);

    if (cachedPosts.length > 0) { 
      console.log(`Found ${cachedPosts.length} cached posts in IndexedDB. Using cached data.`);
      return cachedPosts;
    } else {
      // If there are no cached posts, fetch from Firestore
      console.log("No suitable cached posts found in IndexedDB. Fetching from Firestore...");
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
      const queryToExecute = query(baseQuery, limit(25)); // or any other limit you prefer
      console.log('fetchFilteredPosts read')
      const postSnapshot = await getDocs(queryToExecute);

      if (postSnapshot.empty) {
        console.log("No documents found with the current filters in Firestore.");
        return [];
      }

      // Transform Firestore docs into PostType array
      const posts = postSnapshot.docs.map((doc) => ({
        ...(doc.data() as PostType),
        id: doc.id,
      }));

      // Store the fetched posts in IndexedDB
      console.log(`Fetched ${posts.length} posts from Firestore. Storing in IndexedDB.`);
      await storeFilteredPostsInIndexedDB(posts, filters);

      // Return the fetched posts
      return posts;
    }
  } catch (error) {
    console.error("Error fetching filtered posts:", error);
    return rejectWithValue("Error fetching filtered posts.");
  }
});
