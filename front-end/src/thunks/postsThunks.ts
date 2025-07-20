// postsThunks.ts
import {
  CollectionType,
  PostQueryFilters,
  PostType,
  PostWithID,
} from "../utils/types";
import {
  filterExactMatch,
  filterInMatch,
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
  DocumentSnapshot,
} from "firebase/firestore";
import { normalizePost } from "../utils/normalizePost";

type FetchInitialPostsArgs = {
  POSTS_BATCH_SIZE: number;
  currentUserCompanyId: string | undefined;
};

// okay lets confirm this will retireve all posts from posts network or company only for the user nothing more
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
        where("postUserCompanyId", "==", currentUserCompanyId),
        orderBy("displayDate", "desc"),
        limit(POSTS_BATCH_SIZE) // ✅ limits Firestore read
      );

      const querySnapshot = await getDocs(postsQuery);
      const postsWithIds: PostWithID[] = querySnapshot.docs
        .map((doc) => {
          const postData: PostType = doc.data() as PostType;
          return normalizePost({ ...postData, id: doc.id });
        })

      const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];


      return { posts: postsWithIds, lastVisibleDoc };
    } catch (error) {
      console.error("Error fetching initial posts:", error);
      return rejectWithValue(error instanceof Error ? error.message : error);
    }
  }
);

// Define a type for the thunk argument
interface FetchMorePostsArgs {
  lastVisibleDoc: DocumentSnapshot | null; // Pass the actual last doc snapshot for pagination
  POSTS_BATCH_SIZE: number;
  currentUserCompanyId: string | undefined;
}

export const fetchMorePostsBatch = createAsyncThunk(
  "posts/fetchMore",
  async (
    { lastVisibleDoc, POSTS_BATCH_SIZE, currentUserCompanyId }: FetchMorePostsArgs,
    { rejectWithValue }
  ) => {
    try {
      const postsCollectionRef = collection(db, "posts");

      const postsQuery = query(
        postsCollectionRef,
        where("postUserCompanyId", "==", currentUserCompanyId),
        orderBy("displayDate", "desc"),
        startAfter(lastVisibleDoc), // Firestore pagination
        limit(POSTS_BATCH_SIZE)
      );

      const querySnapshot = await getDocs(postsQuery);

      const postsWithIds: PostWithID[] = querySnapshot.docs.map((doc) => {
        const postData: PostType = doc.data() as PostType;
        return normalizePost({ ...postData, id: doc.id });
      });

      // Get the last visible document for next pagination call
      const newLastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

      return { posts: postsWithIds, lastVisibleDoc: newLastVisibleDoc };
    } catch (error) {
      console.error("Error fetching more posts:", error);
      return rejectWithValue(error instanceof Error ? error.message : error);
    }
  }
);

export const fetchFilteredPostsBatch = createAsyncThunk(
  "posts/fetchPostsBatch",
  async ({
    filters,
  }: {
    filters: PostQueryFilters;
    lastVisible?: DocumentData | null; // now unused
    batchSize?: number; // now unused
  }) => {
    let baseQuery: Query<DocumentData> = collection(db, "posts");
    // console.log("[FILTER DEBUG] Incoming filters:", filters);

    // Date filtering
    if (filters.dateRange?.startDate) {
      const start = Timestamp.fromDate(new Date(filters.dateRange.startDate));
      baseQuery = query(baseQuery, where("displayDate", ">=", start));
    }

    if (filters.dateRange?.endDate) {
      // 🔧 Add time to include the entire end day
      const end = Timestamp.fromDate(
        new Date(`${filters.dateRange.endDate}T23:59:59.999Z`)
      );
      baseQuery = query(baseQuery, where("displayDate", "<=", end));
    }

    if (filters.companyId) {
      baseQuery = filterExactMatch(
        "postUserCompanyId",
        filters.companyId ?? undefined,
        baseQuery
      );
    }
    if (filters.postUserUid) {
      baseQuery = query(
        baseQuery,
        where("postUserUid", "==", filters.postUserUid)
      );
    }
    if (filters.accountNumber) {
      baseQuery = filterExactMatch(
        "accountNumber",
        filters.accountNumber ?? undefined,
        baseQuery
      );
    }

    if (filters.accountName) {
      baseQuery = query(
        baseQuery,
        where("accountName", "==", filters.accountName)
      );
    }
    if (filters.accountType) {
      baseQuery = query(
        baseQuery,
        where("accountType", "==", filters.accountType)
      );
    }
    if (filters.accountChain) {
      baseQuery = query(baseQuery, where("chain", "==", filters.accountChain));
    }
    if (filters.chainType) {
      baseQuery = query(baseQuery, where("chainType", "==", filters.chainType));
    }
    if (filters.minCaseCount !== null && filters.minCaseCount !== undefined) {
      baseQuery = query(
        baseQuery,
        where("totalCaseCount", ">=", filters.minCaseCount)
      );
    }
    if (filters.companyGoalId) {
      baseQuery = query(
        baseQuery,
        where("companyGoalId", "==", filters.companyGoalId)
      );
    }
    if (filters.hashtag) {
      baseQuery = filterArrayContains(
        "hashtags",
        filters.hashtag ?? undefined,
        baseQuery
      );
    }
    if (filters.starTag) {
      baseQuery = filterArrayContains(
        "starTags",
        filters.starTag ?? undefined,
        baseQuery
      );
    }
    if (filters.brand) {
      baseQuery = filterArrayContains(
        "brands",
        filters.brand ?? undefined,
        baseQuery
      );
    }
    if (filters.productType) {
      // lowercase the user’s selection so it matches the lower-case data in Firestore
      const val = filters.productType.trim().toLowerCase();
      baseQuery = filterArrayContains("productType", val, baseQuery);
    }

    // ✅ Optional: single state/city
    if (filters.states?.length === 1) {
      baseQuery = filterExactMatch("state", filters.states[0], baseQuery);
    }
    if (filters.cities?.length === 1) {
      baseQuery = filterExactMatch("city", filters.cities[0], baseQuery);
    }

    const finalQuery = baseQuery; // 👈 Just use filtered baseQuery
    // console.log("finalQuery (no sort/pagination):", finalQuery);

    const snapshot = await getDocs(finalQuery);

    const posts: PostWithID[] = snapshot.docs.map((doc) =>
      normalizePost({
        ...(doc.data() as PostType),
        id: doc.id,
      })
    );

    return {
      posts,
      lastVisible: snapshot.docs.at(-1)?.id ?? null,
      count: snapshot.size,
    };
  }
);

export const fetchUserCreatedPosts = createAsyncThunk<PostWithID[], string>(
  "posts/fetchUserPosts",
  async (userId, { rejectWithValue }) => {
    console.log(userId);
    try {
      // Firestore query to fetch user posts
      const q = query(
        collection(db, "posts"),
        where("postUserId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      console.log(querySnapshot);
      const userCreatedPosts: PostWithID[] = querySnapshot.docs.map((doc) =>
        normalizePost({
          id: doc.id,
          ...(doc.data() as PostType),
        })
      );
      return userCreatedPosts;
    } catch (error) {
      // showMessage
      return rejectWithValue("Error fetching user posts");
    }
  }
);


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
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/validatePostShareToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, token: token || "" }),
        }
      );

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

      if (
        !Array.isArray(collectionData.posts) ||
        collectionData.posts.length === 0
      ) {
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
      const validPosts = fetchedPosts.filter(
        (post) => post !== null
      ) as PostWithID[];

      return validPosts;
    } catch (error) {
      console.error("Error fetching posts for collection:", error);
      return rejectWithValue("Error fetching posts for collection.");
    }
  }
);
