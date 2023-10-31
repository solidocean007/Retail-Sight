import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { PostType } from "../utils/types";

export const fetchAllPosts = createAsyncThunk<PostType[], void>(
  "posts/fetchAll",
  async () => {
    console.log("Fetching all posts...");
    const db = getFirestore();
    const postCollection = collection(db, "posts");
    const postSnapshot = await getDocs(postCollection);

    const postData: PostType[] = postSnapshot.docs.map((doc) => ({
      ...(doc.data() as PostType),
      id: doc.id,
    }));

    return postData;
  }
);



const initialState: PostType[] = [];

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    setPosts: (_, action) => action.payload,
    deletePost: (state, action) => state.filter(post => post.id !== action.payload),
    updatePost: (state, action) => state.map(post => post.id === action.payload.id ? action.payload : post),
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAllPosts.fulfilled, (_, action) => action.payload);
  }
});

export const { setPosts, deletePost, updatePost } = postsSlice.actions;


export default postsSlice.reducer;
