// postsSlice
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import { DocumentSnapshot } from "firebase/firestore";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  Query,
  DocumentData,
  // DocumentSnapshot,
  // startAfter,
  limit,
  orderBy,
} from "firebase/firestore";
// import { incrementRead } from "./firestoreReadsSlice";
import {
  filterByChannels,
  filterByCategories,
  // filterByCity,
  // filterByState,
} from "../services/postsServices";
import { PostType } from "../utils/types";
import { PayloadAction } from "@reduxjs/toolkit";

export type FilterCriteria = {
  channels?: string[];
  categories?: string[];
};

type FetchPostsArgs = {
  filters: {
    channels: string[];
    categories: string[];
  };
  // lastVisible: DocumentSnapshot; // This should be the type for your lastVisible document snapshot
};

export const fetchLatestPosts = createAsyncThunk<
  PostType[],
  void,
  { rejectValue: string }
>("posts/fetchLatest", async (_, { rejectWithValue }) => {
  // console.log("Attempting to fetch the latest posts...");
  const firestoreInstance = getFirestore();
  const postsCollectionRef = collection(firestoreInstance, "posts");
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
>(
  "posts/fetchFiltered",
  // async ({ filters, lastVisible }, { dispatch, rejectWithValue }) => {
  // async ({ filters }, { dispatch, rejectWithValue }) => {
  async ({ filters }, { rejectWithValue }) => {
    console.log("Fetching filtered posts...");
    let baseQuery: Query<DocumentData> = collection(getFirestore(), "posts");

    // Apply filters if they are present
    if (filters.channels && filters.channels.length > 0) {
      console.log(`Filtering by channels: ${filters.channels}`);
      baseQuery = filterByChannels(filters.channels, baseQuery);
    }
    if (filters.categories && filters.categories.length > 0) {
      console.log(`Filtering by categories: ${filters.categories}`);
      baseQuery = filterByCategories(filters.categories, baseQuery);
    }

    // const PAGE_SIZE = 10;
    // const paginatedQuery = lastVisible
    //   ? query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE))
    //   : query(baseQuery, limit(PAGE_SIZE));

    // Simplified query without pagination logic
    const queryToExecute = query(baseQuery, limit(10));

    try {
      // const postSnapshot = await getDocs(paginatedQuery);
      const postSnapshot = await getDocs(queryToExecute);
      console.log(`Fetched ${postSnapshot.docs.length} posts.`);

      if (postSnapshot.docs.length === 0) {
        console.warn("No documents found with the current query.");
        return [];
      }

      return postSnapshot.docs.map((doc) => ({
        ...(doc.data() as PostType),
        id: doc.id,
      }));
    } catch (error) {
      console.error("Error fetching filtered posts:", error);
      return rejectWithValue("Error fetching filtered posts.");
    }
  }
);

//       const postData: PostType[] = postSnapshot.docs.map((doc) => ({
//         ...(doc.data() as PostType),
//         id: doc.id,
//       }));

//       if (postSnapshot.docs.length > 0) {
//         const lastVisibleData = {
//           id: postSnapshot.docs[postSnapshot.docs.length - 1].id
//         };
//         dispatch(setLastVisible(lastVisibleData));
//       }
      
//       return postData;
//     } catch (error) {
//       console.error("Error fetching filtered posts:", error);
//       return rejectWithValue("Error fetching filtered posts.");
//     }
//   }
// );

// type LastVisible = {
//   id: string;
// } | null;


// New state shape including loading and error states
interface PostsState {
  posts: PostType[];
  loading: boolean;
  error: string | null;
  // lastVisible: LastVisible;
}

const initialState: PostsState = {
  posts: [],
  loading: false,
  error: null,
  // lastVisible: null,
};

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    // Adjusted to the correct state.posts property
    setPosts: (state, action) => {
      state.posts = action.payload;
    },
    // Adjusted to the correct state.posts property
    deletePost: (state, action) => {
      state.posts = state.posts.filter((post) => post.id !== action.payload);
      // i need to delete images and comments as well
    },
    // Adjusted to the correct state.posts property
    updatePost: (state, action) => {
      state.posts = state.posts.map((post) =>
        post.id === action.payload.id ? action.payload : post
      );
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Instead of storing the whole DocumentSnapshot, you can store just the ID, or necessary data.
    // setLastVisible(state, action: PayloadAction<LastVisible>) {
    //   state.lastVisible = action.payload;
    // },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFilteredPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFilteredPosts.fulfilled, (state, action) => {
        console.log("fetchAllPosts.fulfilled with payload:", action.payload);
        state.loading = false;
        state.posts = action.payload;
        // Update the lastVisible if posts are fetched
        // state.lastVisible = action.payload.length > 0 ? action.payload[action.payload.length - 1].docRef : null;
      })
      .addCase(fetchFilteredPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error fetching posts";
      })
      .addCase(fetchLatestPosts.pending, (state) => {
        // Set loading state before fetching the latest posts
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLatestPosts.fulfilled, (state, action) => {
        // Set the posts and update the lastVisible when posts are fetched
        state.loading = false;
        state.posts = action.payload;
        // state.lastVisible = action.payload.length > 0  // Type 'string | null' is not assignable to type 'WritableDraft<{ id: string; }> | null'.
        // // Type 'string' is not assignable to type 'WritableDraft<{ id: string; }>'.ts(2322
        //   ? action.payload[action.payload.length - 1].id // Assuming you want to track the last post's ID for pagination
        //   : null;
      })
      .addCase(fetchLatestPosts.rejected, (state, action) => {
        // Handle any errors if the fetch fails
        state.loading = false;
        state.error = action.error.message || "Error fetching latest posts";
      });
  },
});

export const {
  setPosts,
  deletePost,
  updatePost,
  setLoading,
  setError,
  // setLastVisible,
} = postsSlice.actions;
export default postsSlice.reducer;
