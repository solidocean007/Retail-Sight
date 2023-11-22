// postsSlice
import { createSlice } from "@reduxjs/toolkit";
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
  lastVisible: string;
};

type CursorType = string;

// New state shape including loading and error states
interface PostsState {
  posts: PostType[];
  loading: boolean;
  error: string | null;
  lastVisible: CursorType;
}

const initialState: PostsState = {
  posts: [],
  loading: false,
  error: null,
  lastVisible: '',
};

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    // Adjusted to the correct state.posts property
    setPosts: (state, action: PayloadAction<PostType[]>) => {
      state.posts = action.payload;
    },
    // Adjusted to the correct state.posts property
    deletePost: (state, action) => {
      state.posts = state.posts.filter((post) => post.id !== action.payload);
      // i need to delete images and comments as well
    },
    appendPosts: (state, action: PayloadAction<PostType[]>) => {
      state.posts = [...state.posts, ...action.payload];
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
    setLastVisible: (state, action: PayloadAction<CursorType>) => { // Cannot find CursorType
      state.lastVisible = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFilteredPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFilteredPosts.fulfilled, (state, action) => {
        state.loading = false;
        // Append new posts instead of replacing
        state.posts = [...state.posts, ...action.payload];
        // Update lastVisible based on the last post fetched
        state.lastVisible = action.payload.length > 0
          ? action.payload[action.payload.length - 1].id
          : state.lastVisible;
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
        state.loading = false;
        // Append new posts instead of replacing
        state.posts = [...state.posts, ...action.payload];
        // Update lastVisible based on the last post fetched
        state.lastVisible = action.payload.length > 0
          ? action.payload[action.payload.length - 1].id
          : state.lastVisible;
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
  setLastVisible,
} = postsSlice.actions;
export default postsSlice.reducer;
