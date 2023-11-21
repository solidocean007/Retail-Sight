// postsSlice
import { createSlice } from "@reduxjs/toolkit";
// import { DocumentSnapshot } from "firebase/firestore";
import { fetchFilteredPosts, fetchLatestPosts } from "../thunks/postsThunks";
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
        console.log("fetchAllPosts.fulfilled with payload:", action.payload); // shouldnt this say fetchFilteredPosts.fullfilled with payload?
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
        console.log('fetchLatestPosts.fullFilled with payload:', action.payload)
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
