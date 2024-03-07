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
  dateRange?: {
    startDate: Date | null;
    endDate: Date | null;
  };
};

type CursorType = string;

// New state shape including loading and error states
interface PostsState {
  posts: PostWithID[];
  filteredPosts: PostWithID[];
  userPosts: PostWithID[];
  loading: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastVisible: CursorType | null;
  lastVisibleFiltered: CursorType | null;
  hashtagPosts: PostWithID[];
  starTagPosts: PostWithID[];
}

const initialState: PostsState = {
  posts: [],
  filteredPosts: [],
  userPosts: [],
  loading: false,
  status: "idle",
  error: null,
  lastVisible: "",
  lastVisibleFiltered: "",
  hashtagPosts: [],
  starTagPosts: [],
};

const postsSlice = createSlice({
  name: "posts", // will this no be enough to store both posts and filtered posts?  Should I create another to handle filtered posts?
  initialState,
  reducers: {
    // Adjusted to the correct state.posts property
    setPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.posts = action.payload;
    },
    setFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.filteredPosts = action.payload;
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
    setLastVisibleFiltered: (state, action: PayloadAction<string | null>) => {
      state.lastVisibleFiltered = action.payload;
    },
    addNewPost: (state, action: PayloadAction<PostWithID>) => {
      state.posts.push(action.payload);
    },
    mergeAndSetPosts: (state, action: PayloadAction<PostWithID[]>) => {
      const newPosts = action.payload;
      // Merge new posts with existing posts without duplicates
      const mergedPosts = [...state.posts, ...newPosts].reduce(
        (acc: PostWithID[], post) => {
          if (!acc.find((p) => p.id === post.id)) {
            acc.push(post);
          }
          return acc;
        },
        [] as PostWithID[]
      );

      // Sort posts by displayDate, from newest to oldest
      mergedPosts.sort((a, b) => {
        // Convert displayDate to a timestamp for comparison
        const dateA = a.displayDate ? new Date(a.displayDate).getTime() : 0;
        const dateB = b.displayDate ? new Date(b.displayDate).getTime() : 0;
        return dateB - dateA; // Sort in descending order
      });

      state.posts = mergedPosts;
    },
    mergeAndSetFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      const newFilteredPosts = action.payload;
      // Merge new filtered posts with existing filtered posts without duplicates
      const mergedFilteredPosts = [
        ...state.filteredPosts,
        ...newFilteredPosts,
      ].reduce((acc: PostWithID[], post) => {
        if (!acc.find((p) => p.id === post.id)) {
          acc.push(post);
        }
        return acc;
      }, []);

      // Sort filtered posts by displayDate, from newest to oldest
      mergedFilteredPosts.sort((a, b) => {
        const dateA = a.displayDate ? new Date(a.displayDate).getTime() : 0;
        const dateB = b.displayDate ? new Date(b.displayDate).getTime() : 0;
        return dateB - dateA;
      });

      state.filteredPosts = mergedFilteredPosts;
    },
    setHashtagPosts(state, action) {
      state.hashtagPosts = action.payload;
    },
    setStarTagPosts(state, action) {
      state.starTagPosts = action.payload;
    },
    // Reducer to clear post-related data
    clearPostsData: (state) => {
      state.posts = [];
      state.filteredPosts = [];
      state.userPosts = [];
      state.lastVisible = null;
      state.lastVisibleFiltered = null;
      state.hashtagPosts = [];
      state.starTagPosts = [];
      // Any other state properties that should be reset can go here
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFilteredPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchFilteredPosts.fulfilled,
        (state, action: PayloadAction<PostWithID[]>) => {
          // Merge and sort filtered posts directly here
          const newFilteredPosts = action.payload;
          const mergedFilteredPosts = [
            ...state.filteredPosts,
            ...newFilteredPosts,
          ].reduce((acc: PostWithID[], post) => {
            if (!acc.find((p) => p.id === post.id)) {
              acc.push(post);
            }
            return acc;
          }, []);

          mergedFilteredPosts.sort((a, b) => {
            const dateA = a.displayDate ? new Date(a.displayDate).getTime() : 0;
            const dateB = b.displayDate ? new Date(b.displayDate).getTime() : 0;
            return dateB - dateA;
          });

          state.filteredPosts = mergedFilteredPosts;
          state.loading = false;

          // Update the last visible filtered post's ID for pagination purposes
          state.lastVisibleFiltered =
            newFilteredPosts.length > 0
              ? newFilteredPosts[newFilteredPosts.length - 1].id
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
        state.status = "loading";
      })
      .addCase(fetchUserCreatedPosts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.userPosts = action.payload;
      })
      .addCase(fetchUserCreatedPosts.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          typeof action.payload === "string"
            ? action.payload
            : "An error occurred";
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
  setLastVisibleFiltered,
  addNewPost,
  mergeAndSetPosts,
  mergeAndSetFilteredPosts,
  setHashtagPosts,
  setStarTagPosts,
  clearPostsData,
} = postsSlice.actions;
export default postsSlice.reducer;
