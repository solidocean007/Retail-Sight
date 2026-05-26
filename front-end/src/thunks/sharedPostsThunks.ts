// src/thunks/sharedPostsThunks.ts
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
  Query,
  Timestamp,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { PostQueryFilters, PostType, PostWithID, UserType } from "../utils/types";
import {
  addSharedPostsToIndexedDB,
  getSharedPostsFromIndexedDB,
} from "../utils/database/sharedPostsStoreUtils";
import { normalizePost } from "../utils/normalize";
import { locallyFilterPosts } from "../components/FilterSideBar/utils/filterUtils";

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
      const posts: PostWithID[] = snap.docs.map((doc) =>
        normalizePost({ id: doc.id, ...(doc.data() as PostType) })
      );

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

export const fetchFilteredSharedPostsBatch = createAsyncThunk(
  "sharedPosts/fetchFilteredBatch",
  async (
    {
      companyId,
      filters,
    }: {
      companyId: string | null | undefined;
      filters: PostQueryFilters;
    },
    { rejectWithValue },
  ) => {
    try {
      if (!companyId) throw new Error("Missing supplier companyId");

      let baseQuery: Query<DocumentData> = query(
        collection(db, "posts"),
        where("sharedWithCompanies", "array-contains", companyId),
      );

      if (filters.distributorCompanyId) {
        baseQuery = query(
          baseQuery,
          where("companyId", "==", filters.distributorCompanyId),
        );
      }

      if (filters.accountNumber) {
        const accountNumberString = String(filters.accountNumber).trim();
        const accountNumberNumber = Number(accountNumberString);

        const accountNumberValues: (string | number)[] = [accountNumberString];

        if (!Number.isNaN(accountNumberNumber)) {
          accountNumberValues.push(accountNumberNumber);
        }

        baseQuery = query(
          baseQuery,
          where("accountNumber", "in", accountNumberValues),
        );
      }

      if (filters.postUserUid) {
        baseQuery = query(
          baseQuery,
          where("postUserUid", "==", filters.postUserUid),
        );
      }

      if (filters.companyGoalId) {
        baseQuery = query(
          baseQuery,
          where("companyGoalId", "==", filters.companyGoalId),
        );
      }

      // if (filters.brandId) {
      //   baseQuery = query(
      //     baseQuery,
      //     where("brandIds", "array-contains", filters.brandId),
      //   );
      // }

      if (filters.dateRange?.startDate) {
        baseQuery = query(
          baseQuery,
          where(
            "displayDate",
            ">=",
            Timestamp.fromDate(new Date(filters.dateRange.startDate)),
          ),
        );
      }

      if (filters.dateRange?.endDate) {
        baseQuery = query(
          baseQuery,
          where(
            "displayDate",
            "<=",
            Timestamp.fromDate(
              new Date(`${filters.dateRange.endDate}T23:59:59.999Z`),
            ),
          ),
        );
      }

      const snapshot = await getDocs(baseQuery);

      const posts: PostWithID[] = snapshot.docs.map((docSnap) =>
        normalizePost({
          id: docSnap.id,
          ...(docSnap.data() as PostType),
        }),
      );

      // Keeps unsupported/shared edge filters working without adding risky Firestore clauses.
      // Examples: hashtag, starTag, accountType, chain, chainType, minCaseCount,
      // productType, state/city, legacy brand text fallback.
      const fullyFilteredPosts = locallyFilterPosts(posts, {
        ...filters,
        feedType: "shared",
      });

      return {
        posts: fullyFilteredPosts,
        count: fullyFilteredPosts.length,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Error fetching filtered shared posts:", error);
      return rejectWithValue(error.message || "Error fetching filtered shared posts");
    }
  },
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

export const fetchMoreSharedPostsBatch = createAsyncThunk<
  { postsWithIds: PostWithID[]; lastVisible: string | null; hasMore: boolean },
  FetchMoreSharedPostsArgs
  // AsyncThunkConfig
>(
  "sharedPosts/fetchMoreBatch",
  async (
    {
      lastVisible,
      limit: batchSize = 10,
      currentUser,
    }: FetchMoreSharedPostsArgs,
    { rejectWithValue }
  ) => {
    try {
      const companyId = currentUser?.companyId;
      if (!companyId) {
        console.warn("⚠️ Missing companyId — cannot fetch shared posts");
        return { postsWithIds: [], lastVisible: null, hasMore: false };
      }

      const postsCollectionRef = collection(db, "posts");

      // build query
      let postsQuery;
      if (lastVisible) {
        const lastVisibleSnapshot = await getDoc(doc(db, "posts", lastVisible));
        if (!lastVisibleSnapshot.exists()) {
          console.warn("⚠️ lastVisible document not found:", lastVisible);
        }

        postsQuery = query(
          postsCollectionRef,
          where("sharedWithCompanies", "array-contains", companyId),
          orderBy("displayDate", "desc"),
          startAfter(lastVisibleSnapshot),
          limit(batchSize)
        );
      } else {
        postsQuery = query(
          postsCollectionRef,
          where("sharedWithCompanies", "array-contains", companyId),
          orderBy("displayDate", "desc"),
          limit(batchSize)
        );
      }

      const snap = await getDocs(postsQuery);
      const postsWithIds: PostWithID[] = snap.docs.map((doc) =>
        normalizePost({ id: doc.id, ...(doc.data() as PostType) })
      );

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
