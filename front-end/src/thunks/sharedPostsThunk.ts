// postsThunks.ts
import {
  CollectionType,
  PostQueryFilters,
  PostType,
  PostWithID,
  UserType,
} from "../utils/types";
import {
  filterExactMatch,
  // filterInMatch,
  filterArrayContains,
} from "../filters/postFilterServices"; // adjust path as needed
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
  // QueryConstraint,
} from "firebase/firestore";

import { normalizePost } from "../utils/normalizePost";

// 🔎 Types
interface FetchSharedPostsArgs {
  lastVisible?: string | null; // post ID, not snapshot
  batchSize: number;
  currentUserCompanyId: string;
}

// 🔁 Initial load of shared posts
export const fetchInitialSharedPosts = createAsyncThunk(
  "posts/fetchInitialSharedPosts",
  async (
    { batchSize, currentUserCompanyId }: { batchSize: number; currentUserCompanyId: string },
    { rejectWithValue }
  ) => {
    try {
      const postsCollectionRef = collection(db, "posts");

      const postsQuery = query(
        postsCollectionRef,
        where("sharedWithCompanies", "array-contains", currentUserCompanyId),
        orderBy("displayDate", "desc"),
        limit(batchSize)
      );

      const snapshot = await getDocs(postsQuery);

      const posts: PostWithID[] = snapshot.docs.map((doc) =>
        normalizePost({ id: doc.id, ...(doc.data() as PostType) })
      );

      const lastVisible =
        snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;

      return { posts, lastVisible };
    } catch (error) {
      console.error("❌ Error in fetchInitialSharedPosts:", error);
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

// 🔁 Pagination for shared posts
export const fetchMoreSharedPosts = createAsyncThunk(
  "posts/fetchMoreSharedPosts",
  async (
    { lastVisible, batchSize, currentUserCompanyId }: FetchSharedPostsArgs,
    { rejectWithValue }
  ) => {
    try {
      if (!lastVisible) {
        return { posts: [], lastVisible: null };
      }

      const lastSnap = await getDoc(doc(db, "posts", lastVisible));
      if (!lastSnap.exists()) {
        console.warn("⚠️ lastVisible doc not found for shared posts:", lastVisible);
        return { posts: [], lastVisible: null };
      }

      const postsCollectionRef = collection(db, "posts");
      const postsQuery = query(
        postsCollectionRef,
        where("sharedWithCompanies", "array-contains", currentUserCompanyId),
        orderBy("displayDate", "desc"),
        startAfter(lastSnap),
        limit(batchSize)
      );

      const snapshot = await getDocs(postsQuery);

      const posts: PostWithID[] = snapshot.docs.map((doc) =>
        normalizePost({ id: doc.id, ...(doc.data() as PostType) })
      );

      const newLastVisible =
        snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;

      return { posts, lastVisible: newLastVisible };
    } catch (error) {
      console.error("❌ Error in fetchMoreSharedPosts:", error);
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
    }
  }
);
