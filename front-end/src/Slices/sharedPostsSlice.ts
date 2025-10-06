import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PostWithID } from "../utils/types";

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
      const idx = state.sharedPosts.findIndex((p) => p.id === action.payload.id);
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
    clearSharedPosts(state) {
      state.sharedPosts = [];
    },
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
