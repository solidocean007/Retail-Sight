import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PostWithID } from "../utils/types";
import { fetchMoreSharedPostsBatch } from "../thunks/sharedPostsThunks";
import { removeSharedPostFromIndexedDB } from "../utils/database/sharedPostsStoreUtils";
import { sortPostsByDate } from "./postsSlice";
import { normalizePost } from "../utils/normalize";

interface SharedPostsState {
  sharedPosts: PostWithID[];

  // ✅ NEW (mirrors postsSlice)
  filteredSharedPosts: PostWithID[];
  filteredSharedPostCount: number;
  filteredSharedPostFetchedAt: string | null;

  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: SharedPostsState = {
  sharedPosts: [],

  // ✅ NEW
  filteredSharedPosts: [],
  filteredSharedPostCount: 0,
  filteredSharedPostFetchedAt: null,

  loading: false,
  error: null,
  hasMore: true,
};

const sharedPostsSlice = createSlice({
  name: "sharedPosts",
  initialState,
  reducers: {
    setSharedPosts(state, action: PayloadAction<PostWithID[]>) {
      state.sharedPosts = sortPostsByDate(action.payload.map(normalizePost));
    },

    addSharedPosts(state, action: PayloadAction<PostWithID[]>) {
      const newOnes = action.payload.filter(
        (p) => !state.sharedPosts.some((sp) => sp.id === p.id),
      );

      state.sharedPosts = sortPostsByDate([...state.sharedPosts, ...newOnes]);
    },

    updateSharedPost(state, action: PayloadAction<PostWithID>) {
      const idx = state.sharedPosts.findIndex(
        (p) => p.id === action.payload.id,
      );
      if (idx !== -1) state.sharedPosts[idx] = action.payload;

      // ✅ also update filtered if present
      const fIdx = state.filteredSharedPosts.findIndex(
        (p) => p.id === action.payload.id,
      );
      if (fIdx !== -1) state.filteredSharedPosts[fIdx] = action.payload;
    },

    setFilteredSharedPosts(state, action: PayloadAction<PostWithID[]>) {
      const posts = action.payload;
      state.filteredSharedPosts = sortPostsByDate(posts);
      state.filteredSharedPostCount = posts.length;
    },

    clearFilteredSharedPosts(state) {
      state.filteredSharedPosts = [];
      state.filteredSharedPostCount = 0;
      state.filteredSharedPostFetchedAt = null;
    },

    setFilteredSharedPostFetchedAt(
      state,
      action: PayloadAction<string | null>,
    ) {
      state.filteredSharedPostFetchedAt = action.payload;
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    setHasMore(state, action: PayloadAction<boolean>) {
      state.hasMore = action.payload;
    },

    removeSharedPost(state, action: PayloadAction<string>) {
      state.sharedPosts = state.sharedPosts.filter(
        (post) => post.id !== action.payload,
      );

      state.filteredSharedPosts = state.filteredSharedPosts.filter(
        (post) => post.id !== action.payload,
      );

      removeSharedPostFromIndexedDB(action.payload);
    },

    clearSharedPosts(state) {
      state.sharedPosts = [];
      state.filteredSharedPosts = [];
      state.filteredSharedPostCount = 0;
      state.filteredSharedPostFetchedAt = null;
      state.hasMore = true;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchMoreSharedPostsBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMoreSharedPostsBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;

        const { postsWithIds, hasMore } = action.payload;

        const newOnes = postsWithIds.filter(
          (p) => !state.sharedPosts.some((sp) => sp.id === p.id),
        );

        state.sharedPosts = sortPostsByDate([...state.sharedPosts, ...newOnes]);

        state.hasMore = hasMore;
      })
      .addCase(fetchMoreSharedPostsBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setSharedPosts,
  addSharedPosts,
  updateSharedPost,
  setFilteredSharedPosts,
  clearFilteredSharedPosts,
  setFilteredSharedPostFetchedAt,
  setLoading,
  setError,
  setHasMore,
  clearSharedPosts,
  removeSharedPost,
} = sharedPostsSlice.actions;

export default sharedPostsSlice.reducer;
