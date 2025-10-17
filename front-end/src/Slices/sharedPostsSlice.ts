import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PostWithID } from "../utils/types";
import { fetchMoreSharedPostsBatch } from "../thunks/sharedPostsThunks";
import { removeSharedPostFromIndexedDB } from "../utils/database/sharedPostsStoreUtils";

interface SharedPostsState {
  sharedPosts: PostWithID[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
}

const initialState: SharedPostsState = {
  sharedPosts: [],
  loading: false,
  error: null,
  hasMore: true,
};

const sharedPostsSlice = createSlice({
  name: "sharedPosts",
  initialState,
  reducers: {
    setSharedPosts(state, action: PayloadAction<PostWithID[]>) {
      state.sharedPosts = action.payload;
    },
    addSharedPosts(state, action: PayloadAction<PostWithID[]>) {
      const newOnes = action.payload.filter(
        (p) => !state.sharedPosts.some((sp) => sp.id === p.id)
      );
      state.sharedPosts = [...state.sharedPosts, ...newOnes];
    },
    updateSharedPost(state, action: PayloadAction<PostWithID>) {
      const idx = state.sharedPosts.findIndex(
        (p) => p.id === action.payload.id
      );
      if (idx !== -1) state.sharedPosts[idx] = action.payload;
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
   removeSharedPost: (state, action: PayloadAction<string>) => {
  state.sharedPosts = state.sharedPosts.filter(
    (post) => post.id !== action.payload
  );

  // 🔹 remove from offline cache
  removeSharedPostFromIndexedDB(action.payload);
},


    clearSharedPosts(state) {
      state.sharedPosts = [];
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
          (p) => !state.sharedPosts.some((sp) => sp.id === p.id)
        );
        state.sharedPosts.push(...newOnes);
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
  setLoading,
  setError,
  setHasMore,
  clearSharedPosts,
} = sharedPostsSlice.actions;

export default sharedPostsSlice.reducer;
