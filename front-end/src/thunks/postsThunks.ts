// postsThunks.ts
import {
  CollectionType,
  PostQueryFilters,
  PostType,
  PostWithID,
  UserType,
} from "../utils/types";
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

import { normalizePost } from "../utils/normalize";
import { getDateRangeBounds } from "../utils/dateRange";
import { locallyFilterPosts } from "../components/FilterSideBar/utils/filterUtils";

type FetchInitialPostsArgs = {
  POSTS_BATCH_SIZE: number;
  currentUser: UserType | null;
};

export const fetchInitialPostsBatch = createAsyncThunk(
  "posts/fetchInitial",
  async (
    { POSTS_BATCH_SIZE, currentUser }: FetchInitialPostsArgs,
    { rejectWithValue },
  ) => {
    try {
      const isDeveloper = currentUser?.role === "developer";
      const companyId = currentUser?.companyId;
      const postsCollectionRef = collection(db, "posts");

      let postsQuery;

      // 🔹 Developer sees everything
      if (isDeveloper) {
        postsQuery = query(
          postsCollectionRef,
          orderBy("displayDate", "desc"),
          limit(POSTS_BATCH_SIZE),
        );
      }
      // 🔹 Regular company user: only their company posts (network or companyOnly)
      else if (companyId) {
        postsQuery = query(
          postsCollectionRef,
          where("companyId", "==", companyId),
          where("migratedVisibility", "in", ["network", "companyOnly"]),
          orderBy("displayDate", "desc"),
          limit(POSTS_BATCH_SIZE),
        );
      }
      // 🔹 Public fallback (non-auth)
      else {
        postsQuery = query(
          postsCollectionRef,
          where("visibility", "==", "public"),
          orderBy("displayDate", "desc"),
          limit(POSTS_BATCH_SIZE),
        );
      }

      const querySnapshot = await getDocs(postsQuery);
      // console.log("🔥 fetchInitialPostsBatch → Firestore returned:", querySnapshot.size);

      const postsWithIds: PostWithID[] = querySnapshot.docs.map((doc) => {
        const postData: PostType = doc.data() as PostType;
        return normalizePost({ ...postData, id: doc.id });
      });

      const lastVisible =
        querySnapshot.docs[querySnapshot.docs.length - 1]?.id || null;

      return { posts: postsWithIds, lastVisible };
    } catch (error) {
      console.error("❌ Error fetching initial posts:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : String(error),
      );
    }
  },
);

type FetchMorePostsArgs = {
  lastVisible: string | null;
  limit: number;
  currentUser: UserType | null;
};

export const fetchMorePostsBatch = createAsyncThunk(
  "posts/fetchMore",
  async (
    { lastVisible, limit: batchSize, currentUser }: FetchMorePostsArgs,
    { rejectWithValue },
  ) => {
    try {
      const isDeveloper = currentUser?.role === "developer";
      const companyId = currentUser?.companyId;

      if (!companyId && !isDeveloper) {
        console.warn(
          "⚠️ fetchMorePostsBatch called without a valid companyId.",
        );
        return { posts: [], lastVisible: null };
      }

      const postsCollectionRef = collection(db, "posts");
      let postsQuery;

      // ─── Developer: unrestricted ─────────────────────────────
      if (isDeveloper) {
        if (lastVisible) {
          const lastVisibleSnapshot = await getDoc(
            doc(db, "posts", lastVisible),
          );
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
      }

      // ─── Authenticated Company: network + companyOnly ─────────
      else if (companyId) {
        if (lastVisible) {
          const lastVisibleSnapshot = await getDoc(
            doc(db, "posts", lastVisible),
          );
          postsQuery = query(
            postsCollectionRef,
            where("companyId", "==", companyId),
            where("migratedVisibility", "in", ["companyOnly", "network"]),
            orderBy("displayDate", "desc"),
            startAfter(lastVisibleSnapshot),
            limit(batchSize),
          );
        } else {
          postsQuery = query(
            postsCollectionRef,
            where("companyId", "==", companyId),
            where("migratedVisibility", "in", ["companyOnly", "network"]),
            orderBy("displayDate", "desc"),
            limit(batchSize),
          );
        }
      }

      // ─── Public Fallback ─────────────────────────────────────
      else {
        if (lastVisible) {
          const lastVisibleSnapshot = await getDoc(
            doc(db, "posts", lastVisible),
          );
          postsQuery = query(
            postsCollectionRef,
            where("visibility", "==", "public"),
            orderBy("displayDate", "desc"),
            startAfter(lastVisibleSnapshot),
            limit(batchSize),
          );
        } else {
          postsQuery = query(
            postsCollectionRef,
            where("visibility", "==", "public"),
            orderBy("displayDate", "desc"),
            limit(batchSize),
          );
        }
      }

      const snapshot = await getDocs(postsQuery);
      // console.log("🔥 fetchMorePostsBatch → Firestore returned:", snapshot.size);

      const postsWithIds: PostWithID[] = snapshot.docs.map((docSnap) =>
        normalizePost({ id: docSnap.id, ...(docSnap.data() as PostType) }),
      );

      const newLastVisible =
        snapshot.docs[snapshot.docs.length - 1]?.id || null;

      // console.log("✅ Normalized posts count:", postsWithIds.length);
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

// type FetchFilteredPostsArgs = {
//   filters: {
//     channels: string[];
//     categories: string[];
//     states: string[];
//     cities: string[];
//     dateRange: { startDate: string | null; endDate: string | null };
//   };
//   currentHashtag: string | null;
//   currentStarTag?: string | null;
//   // should i rename currentHashtag to currentTag or also define a currentStarTag?
// };

export const fetchFilteredPostsBatch = createAsyncThunk(
  "posts/fetchPostsBatch",
  async ({
    filters,
    companyId,
  }: {
    filters: PostQueryFilters;
    companyId: string | null;
    lastVisible?: DocumentData | null; // now unused
    batchSize?: number; // now unused
  }) => {
    let baseQuery: Query<DocumentData> = collection(db, "posts");
    if (companyId) {
      baseQuery = query(baseQuery, where("companyId", "==", companyId));
    }

    const { start, end } = getDateRangeBounds(filters.dateRange);
    if (start) {
      baseQuery = query(
        baseQuery,
        where("displayDate", ">=", Timestamp.fromDate(start)),
      );
    }
    if (end) {
      baseQuery = query(
        baseQuery,
        where("displayDate", "<=", Timestamp.fromDate(end)),
      );
    }
    if (start || end) {
      baseQuery = query(baseQuery, orderBy("displayDate", "desc"));
    }

    // const finalQuery = query(baseQuery, orderBy("displayDate", "desc"));
    const finalQuery = baseQuery;

    const snapshot = await getDocs(finalQuery);

    const posts: PostWithID[] = snapshot.docs.map((doc) =>
      normalizePost({
        ...(doc.data() as PostType),
        id: doc.id,
      }),
    );

    // Keep Firestore queries on stable, deployed indexes. Applying the rest in
    // one place avoids composite-index failures for combinations such as
    // company + brand + date and keeps legacy normalized fields working.
    const fullyFilteredPosts = locallyFilterPosts(posts, filters);

    return {
      posts: fullyFilteredPosts,
      lastVisible: snapshot.docs[snapshot.docs.length - 1]?.id ?? null,
      count: fullyFilteredPosts.length,
    };
  },
);

// this function isnt being used:
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
      const userCreatedPosts: PostWithID[] = querySnapshot.docs.map((doc) =>
        normalizePost({
          id: doc.id,
          ...(doc.data() as PostType),
        }),
      );
      return userCreatedPosts;
    } catch (error) {
      // showMessage
      return rejectWithValue("Error fetching user posts");
    }
  },
);

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
      const response = await fetch(
        "https://my-fetch-data-api.vercel.app/api/validatePostShareToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, token: token || "" }),
        },
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
        return [];
      }

      // Step 2: Look up each post by its ID
      const postFetchPromises = collectionData.posts.map(async (postId) => {
        const postDocRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postDocRef);

        if (!postSnap.exists()) {
          console.warn(`Post with ID ${postId} not found.`);
          return null;
        }

        const rawPost = {
          id: postSnap.id,
          ...(postSnap.data() as PostType),
        };

        return normalizePost(rawPost);
      });

      const fetchedPosts = await Promise.all(postFetchPromises);
      const validPosts = fetchedPosts.filter(Boolean) as PostWithID[];

      return validPosts;
    } catch (error) {
      console.error("Error fetching posts for collection:", error);
      return rejectWithValue("Error fetching posts for collection.");
    }
  },
);
