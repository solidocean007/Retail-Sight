import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  Query,
  DocumentData,
  DocumentSnapshot,
  startAfter,
  limit,
  orderBy,
} from "firebase/firestore";
import { PostType } from "../utils/types";
import { incrementRead } from "./firestoreReadsSlice";
import {
  filterByChannel,
  filterByCategory,
  filterByCity,
  filterByState,
} from "../services/postsServices";

type FilterCriteria = {
  channel?: string;
  category?: string;
  city?: string;
  state?: string;
};

type FetchPostsArgs = {
  filters: FilterCriteria;
  lastVisible?: DocumentSnapshot;
};

export const fetchAllPosts = createAsyncThunk<PostType[], FetchPostsArgs>(
  "posts/fetchAll",
  async ({ filters, lastVisible }) => {
    // Destructure here
    console.log("Fetching posts...");
    let baseQuery: Query<DocumentData> = collection(getFirestore(), "posts");

    // If no filters provided, get the last 10 posts
    if (
      !filters.channel &&
      !filters.category &&
      !filters.state &&
      !filters.city
    ) {
      baseQuery = query(baseQuery, orderBy("timestamp", "desc"), limit(10)); // Assuming 'timestamp' is a field in your posts
    } else {
      if (filters.channel) {
        baseQuery = filterByChannel(filters.channel, baseQuery);
      }
      if (filters.category) {
        baseQuery = filterByCategory(filters.category, baseQuery);
      }
      if (filters.state) {
        baseQuery = filterByState(filters.state, baseQuery);
      }
      if (filters.city) {
        baseQuery = filterByCity(filters.city, baseQuery);
      }
    }

    // Handle Pagination
    const PAGE_SIZE = 10;
    let paginatedQuery = query(baseQuery, limit(PAGE_SIZE));
    if (lastVisible) {
      paginatedQuery = query(baseQuery, startAfter(lastVisible), limit(PAGE_SIZE));
    }

    const postSnapshot = await getDocs(paginatedQuery);

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
    deletePost: (state, action) =>
      state.filter((post) => post.id !== action.payload),
    updatePost: (state, action) =>
      state.map((post) =>
        post.id === action.payload.id ? action.payload : post
      ),
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAllPosts.fulfilled, (state, action) => {
      state.push(...action.payload);
      incrementRead(action.payload.length);
    });
  },
});

export const { setPosts, deletePost, updatePost } = postsSlice.actions;
export default postsSlice.reducer;
