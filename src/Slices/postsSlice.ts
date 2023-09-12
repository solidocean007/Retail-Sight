// Slices/postsSlice.ts

import { createSlice } from "@reduxjs/toolkit";
import { PostType } from "../utils/types";

const postsSlice = createSlice({
  name: "posts",
  initialState: [] as PostType[],
  reducers: {
    setPosts: (state, action) => action.payload,
    deletePost: (state, action) => state.filter(post => post.id !== action.payload),
    updatePost: (state, action) => state.map(post => post.id === action.payload.id ? action.payload : post),
  }
});

export const { setPosts, deletePost, updatePost } = postsSlice.actions;

export default postsSlice.reducer;
