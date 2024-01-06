// postsSlice
import { createSlice } from "@reduxjs/toolkit";
import {
  fetchFilteredPosts,
  fetchLatestPosts,
  fetchInitialPostsBatch,
  fetchMorePostsBatch,
  fetchUserCreatedPosts,
} from "../thunks/postsThunks";
import { PayloadAction } from "@reduxjs/toolkit";
import { PostWithID } from "../utils/types";

export type FilterCriteria = {
  channels?: string[];
  categories?: string[];
};

type CursorType = string;

// New state shape including loading and error states
interface PostsState {
  posts: PostWithID[];
  userPosts: PostWithID[];
  loading: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastVisible: CursorType | null;
  hashtagPosts: PostWithID[];
}

const initialState: PostsState = {
  posts: [],
  userPosts: [],
  loading: false,
  status: 'idle',
  error: null,
  lastVisible: "",
  hashtagPosts: [],
};

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    // Adjusted to the correct state.posts property
    setPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.posts = action.payload;
    },
    setFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.posts = action.payload;
    },
    // Add setUserPosts reducer function
    setUserPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.userPosts = action.payload;
    },
    // Adjusted to the correct state.posts property
    deletePost: (state, action) => {
      state.posts = state.posts.filter((post) => post.id !== action.payload);
      // i need to delete images and comments as well
    },
    appendPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.posts = [...state.posts, ...action.payload];
    },
    // Adjusted to the correct state.posts property
    updatePost: (state, action: PayloadAction<PostWithID>) => {
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
    setLastVisible: (state, action: PayloadAction<string | null>) => {
      state.lastVisible = action.payload;
    },
    addNewPost: (state, action: PayloadAction<PostWithID>) => {
      state.posts.push(action.payload);
    },
    mergeAndSetPosts: (state, action: PayloadAction<PostWithID[]>) => {
      const newPosts = action.payload;
      // Explicitly type the accumulator as PostWithID[]
      const mergedPosts = [...state.posts, ...newPosts].reduce((acc: PostWithID[], post) => {
        if (!acc.find(p => p.id === post.id)) {
          acc.push(post);
        }
        return acc;
      }, [] as PostWithID[]); // Initialize the accumulator as an empty array of PostWithID
    
      // Sort posts if necessary
      mergedPosts.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });
    
      state.posts = mergedPosts;
    },
    setHashtagPosts(state, action) {
      state.hashtagPosts = action.payload;
    },
    
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFilteredPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // .addCase(
      //   fetchFilteredPosts.fulfilled,
      //   (state, action: PayloadAction<PostWithID[]>) => {
      //     state.loading = false;
      //     // Directly append PostWithID[] to the state.posts
      //     state.posts = [...state.posts, ...action.payload];
      //     state.lastVisible =
      //       action.payload.length > 0
      //         ? action.payload[action.payload.length - 1].id
      //         : state.lastVisible;
      //   }
      // )
      .addCase(
        fetchFilteredPosts.fulfilled,
        (state, action: PayloadAction<PostWithID[]>) => {
          state.loading = false;
          // Replace existing posts with the new filtered posts
          state.posts = action.payload;
      
          // Update the last visible post's ID for pagination purposes
          state.lastVisible = action.payload.length > 0
            ? action.payload[action.payload.length - 1].id
            : null;
        }
      )
      
      .addCase(fetchFilteredPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error fetching posts";
      })
      .addCase(fetchLatestPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchLatestPosts.fulfilled,
        (state, action: PayloadAction<PostWithID[]>) => {
          state.loading = false;
          // Directly append PostWithID[] to the state.posts
          state.posts = [...state.posts, ...action.payload];
          state.lastVisible =
            action.payload.length > 0
              ? action.payload[action.payload.length - 1].id
              : state.lastVisible;
        }
      )
      .addCase(fetchLatestPosts.rejected, (state, action) => {
        // Handle any errors if the fetch fails
        state.loading = false;
        state.error = action.error.message || "Error fetching latest posts";
      })
      .addCase(fetchInitialPostsBatch.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInitialPostsBatch.fulfilled, (state, action) => {
        state.posts = action.payload.posts;
        state.lastVisible = action.payload.lastVisible;
        state.loading = false;
      })
      .addCase(fetchInitialPostsBatch.rejected, (state, action) => {
        state.error = action.error.message || "Error fetching initial posts";
        state.loading = false;
      })
      .addCase(fetchMorePostsBatch.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMorePostsBatch.fulfilled, (state, action) => {
        state.posts = [...state.posts, ...action.payload.posts];
        state.lastVisible = action.payload.lastVisible;
        state.loading = false;
      })
      .addCase(fetchMorePostsBatch.rejected, (state, action) => {
        state.error = action.error.message || "Error fetching more posts";
        state.loading = false;
      })
      .addCase(fetchUserCreatedPosts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserCreatedPosts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.userPosts = action.payload;
      })
      .addCase(fetchUserCreatedPosts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = typeof action.payload === 'string' ? action.payload : 'An error occurred';
      });
  },
});

export const {
  setPosts,
  setFilteredPosts,
  setUserPosts,
  deletePost,
  updatePost,
  setLoading,
  setError,
  setLastVisible,
  addNewPost,
  mergeAndSetPosts,
  setHashtagPosts,
} = postsSlice.actions;
export default postsSlice.reducer;