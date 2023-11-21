// postsThunks.ts
import { PostType } from "../utils/types";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import { collection, query, orderBy, limit, getDocs, Query, DocumentData } from "firebase/firestore";
import {
  filterByCategories,
  filterByChannels,
} from "../services/postsServices";
import { getFilteredPostsFromIndexedDB, storeFilteredPostsInIndexedDB } from "../utils/database/indexedDBUtils";

type FetchPostsArgs = {
  filters: {
    channels: string[];
    categories: string[];
    states: string[];
    cities: string[];
  };
  // lastVisible: DocumentSnapshot; // This should be the type for your lastVisible document snapshot
};

export const fetchLatestPosts = createAsyncThunk<
  PostType[],
  void,
  { rejectValue: string }
>("posts/fetchLatest", async (_, { rejectWithValue }) => {
  // console.log("Attempting to fetch the latest posts...");
  const postsCollectionRef = collection(db, "posts");
  const baseQuery = query(
    postsCollectionRef,
    orderBy("timestamp", "desc"),
    limit(10)
  );

  // console.log("Constructed query for latest posts:", baseQuery);

  try {
    const postSnapshot = await getDocs(baseQuery);

    if (postSnapshot.empty) {
      console.log("No posts found in the snapshot.");
      return []; // Return an empty array if no documents are found
    }

    console.log(
      `Found ${postSnapshot.docs.length} posts, preparing to map them to PostType...`
    );

    const posts: PostType[] = postSnapshot.docs.map((doc) => ({
      ...(doc.data() as PostType),
      id: doc.id,
    }));

    console.log("Successfully fetched the latest posts:", posts);
    return posts;
  } catch (error) {
    console.error("Error fetching latest posts:", error);
    return rejectWithValue("Error fetching latest posts.");
  }
});

export const fetchFilteredPosts = createAsyncThunk<
  PostType[],
  FetchPostsArgs,
  { rejectValue: string }
>("posts/fetchFiltered", async ({ filters }, { getState, rejectWithValue }) => { // getState is defined but never used // Type 'Promise<unknown>' is not assignable to type 'Promise<PostType[]>'.
  console.log(filters, ' : filters')
  // Type 'unknown' is not assignable to type 'PostType[]'.
  try {
    // First, try to get filtered posts from IndexedDB
    const cachedPosts = await getFilteredPostsFromIndexedDB(filters);

    if (cachedPosts.length > 0) { // cachedPosts is of type unknown
      // If there are cached posts, return them
      return cachedPosts;
    } else {
      // If there are no cached posts, fetch from Firestore
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
      const postSnapshot = await getDocs(queryToExecute);

      if (postSnapshot.empty) {
        // No documents found with the current filters
        return [];
      }

      // Transform Firestore docs into PostType array
      const posts = postSnapshot.docs.map((doc) => ({
        ...(doc.data() as PostType),
        id: doc.id,
      }));

      // Store the fetched posts in IndexedDB
      await storeFilteredPostsInIndexedDB(posts, filters);

      // Return the fetched posts
      return posts;
    }
  } catch (error) {
    console.error("Error fetching filtered posts:", error);
    return rejectWithValue("Error fetching filtered posts.");
  }
});
