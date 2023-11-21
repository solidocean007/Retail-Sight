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
import { firestoreRead } from "../utils/firestoreUtils";

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
    const posts = await firestoreRead(async () => {
      const postSnapshot = await getDocs(baseQuery);
      if (postSnapshot.empty) return [];

      return postSnapshot.docs.map((doc) => ({
        ...(doc.data() as PostType),
        id: doc.id,
      }));
    }, 'Fetching the latest posts');

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
>("posts/fetchFiltered", async ({ filters }, { rejectWithValue }) => { // getState is defined but never used // Type 'Promise<unknown>' is not assignable to type 'Promise<PostType[]>'.
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

      const posts = await firestoreRead(async () => {
        const postSnapshot = await getDocs(query(baseQuery, limit(25)));
        if (postSnapshot.empty) return [];

        return postSnapshot.docs.map((doc) => ({
          ...(doc.data() as PostType),
          id: doc.id,
        }));
      }, 'Fetching filtered posts');

      await storeFilteredPostsInIndexedDB(posts, filters);
      return posts;
    }
  } catch (error) {
    console.error("Error fetching filtered posts:", error);
    return rejectWithValue("Error fetching filtered posts.");
  }
});
