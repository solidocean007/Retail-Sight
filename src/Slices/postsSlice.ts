// Slices/postsSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { PostType } from "../utils/types";

export const fetchAllPosts = createAsyncThunk(
  "posts/fetchAll",
  async (_, { dispatch }) => { // dispatch is declared but value never read
    console.log("Fetching all posts...");
    const db = getFirestore();
    const postCollection = collection(db, "posts");
    const postSnapshot = await getDocs(postCollection);
    const postData = postSnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as PostType[];

    return postData;
  }
);

const postsSlice = createSlice({
  name: "posts",
  initialState: [] as PostType[],
  reducers: {
    setPosts: (state, action) => action.payload,
    deletePost: (state, action) => state.filter(post => post.id !== action.payload),
    updatePost: (state, action) => state.map(post => post.id === action.payload.id ? action.payload : post),
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAllPosts.fulfilled, (state: PostType[], action) => { // state is declared but value never read
      return action.payload;
    });
  }
});


export const { setPosts, deletePost, updatePost } = postsSlice.actions;

export default postsSlice.reducer;
