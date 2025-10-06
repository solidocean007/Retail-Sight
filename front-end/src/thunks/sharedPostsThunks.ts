// src/thunks/sharedPostsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { PostWithID } from "../utils/types";
import {
  saveSharedPostsToIndexedDB,
  getSharedPostsFromIndexedDB,
} from "../utils/database/sharedPostsStoreUtils";

interface FetchSharedPostsArgs {
  companyId: string;
  lastVisible?: QueryDocumentSnapshot<DocumentData> | null;
  limit?: number;
}

export const fetchSharedPostsBatch = createAsyncThunk(
  "sharedPosts/fetchBatch",
  async (
    { companyId, lastVisible = null, limit: batchSize = 10 }: FetchSharedPostsArgs,
    { rejectWithValue }
  ) => {
    try {
      if (!companyId) throw new Error("Missing companyId");

      let q = query(
        collection(db, "posts"),
        where("sharedWithCompanies", "array-contains", companyId),
        orderBy("displayDate", "desc"),
        limit(batchSize)
      );

      if (lastVisible) {
        q = query(
          collection(db, "posts"),
          where("sharedWithCompanies", "array-contains", companyId),
          orderBy("displayDate", "desc"),
          startAfter(lastVisible),
          limit(batchSize)
        );
      }

      const snap = await getDocs(q);
      const posts: PostWithID[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as PostWithID),
      }));

      // cache locally
      await saveSharedPostsToIndexedDB(posts);

      return {
        posts,
        lastVisible: snap.docs[snap.docs.length - 1] || null,
      };
    } catch (error: any) {
      console.error("Error fetching shared posts:", error);
      return rejectWithValue(error.message);
    }
  }
);

export const loadSharedPostsFromCache = createAsyncThunk(
  "sharedPosts/loadFromCache",
  async () => {
    const cached = await getSharedPostsFromIndexedDB();
    return cached || [];
  }
);

interface FetchMoreSharedPostsArgs {
  companyId: string;
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  limit?: number;
}

export const fetchMoreSharedPostsBatch = createAsyncThunk(
  "sharedPosts/fetchMoreBatch",
  async (
    { companyId, lastVisible, limit: batchSize = 10 }: FetchMoreSharedPostsArgs,
    { rejectWithValue }
  ) => {
    try {
      if (!companyId) throw new Error("Missing companyId");
      if (!lastVisible) return { posts: [], lastVisible: null };

      const q = query(
        collection(db, "posts"),
        where("sharedWithCompanies", "array-contains", companyId),
        orderBy("displayDate", "desc"),
        startAfter(lastVisible),
        limit(batchSize)
      );

      const snap = await getDocs(q);
      const posts: PostWithID[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as PostWithID),
      }));

      await saveSharedPostsToIndexedDB(posts);

      const newLastVisible = snap.docs[snap.docs.length - 1] || null;
      const hasMore = posts.length === batchSize;

      return { posts, lastVisible: newLastVisible, hasMore };
    } catch (error: any) {
      console.error("Error fetching more shared posts:", error);
      return rejectWithValue(error.message);
    }
  }
);
