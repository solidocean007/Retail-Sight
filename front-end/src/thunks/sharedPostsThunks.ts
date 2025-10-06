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
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { PostType, PostWithID, UserType } from "../utils/types";
import {
  addSharedPostsToIndexedDB,
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
    {
      companyId,
      lastVisible = null,
      limit: batchSize = 10,
    }: FetchSharedPostsArgs,
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
        ...(doc.data() as PostType),
      }));

      // cache locally
      await addSharedPostsToIndexedDB(posts);

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
  lastVisible: string | null;
  limit?: number;
  currentUser: UserType | null;
}

export const fetchMoreSharedPostsBatch = createAsyncThunk(
  "sharedPosts/fetchMoreBatch",
  async (
    {
      lastVisible,
      limit: batchSize = 10,
      currentUser,
    }: FetchMoreSharedPostsArgs,
    { rejectWithValue }
  ) => {
    const companyId = currentUser?.companyId;
    try {
      if (!companyId) {
        throw new Error("Missing companyId");
        return { posts: [], lastVisible: null };
      }
      if (!lastVisible) return { posts: [], lastVisible: null };

      const postsCollectionRef = collection(db, "posts");
      let moreSharedPostsBatch;

      if (lastVisible) {
        const lastVisibleSnapshot = await getDoc(doc(db, "posts", lastVisible)); //  Type 'Firestore' is missing the following properties from type 'DocumentReference<unknown, DocumentData>': converter, firestore, id, path, and 2 more.ts(2
        if (!lastVisibleSnapshot.exists()) {
          console.warn("⚠️ lastVisible document not found:", lastVisible);
        }

        moreSharedPostsBatch = query(
          postsCollectionRef,
          where("sharedWithCompanies", "array-contains", companyId),
          orderBy("displayDate", "desc"),
          startAfter(lastVisible),
          limit(batchSize)
        );
      } else {
         moreSharedPostsBatch = query(
          postsCollectionRef,
          where("sharedWithCompanies", "array-contains", companyId),
          orderBy("displayDate", "desc"),
          limit(batchSize)
        );
      }

      const snap = await getDocs(moreSharedPostsBatch);
      const postsWithIds: PostWithID[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as PostType),
      }));

      await addSharedPostsToIndexedDB(postsWithIds);

      const newLastVisible = snap.docs[snap.docs.length - 1]?.id || null;
      const hasMore = postsWithIds.length === batchSize;

      return { postsWithIds, lastVisible: newLastVisible, hasMore };
    } catch (error: any) {
      console.error("Error fetching more shared posts:", error);
      return rejectWithValue(error.message);
    }
  }
);
