// postsSlice
import { createAction, createSlice } from "@reduxjs/toolkit";
import {
  fetchFilteredPostsBatch, // i need to use this now
  // fetchLatestPosts,
  fetchInitialPostsBatch,
  fetchMorePostsBatch,
  fetchUserCreatedPosts,
} from "../thunks/postsThunks";
import { PayloadAction } from "@reduxjs/toolkit";
import { PostWithID } from "../utils/types";
import { normalizePost } from "../utils/normalize";

type CursorType = string;

// New state shape including loading and error states
interface PostsState {
  posts: PostWithID[];
  filteredPosts: PostWithID[];
  filteredPostCount: number;
  filteredPostFetchedAt: string | null;
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
  filteredPostCount: 0,
  filteredPostFetchedAt: null,
  userPosts: [],
  loading: false,
  status: "idle",
  error: null,
  lastVisible: "",
  lastVisibleFiltered: "",
  hashtagPosts: [],
  starTagPosts: [],
};

export const sortPostsByDate = (posts: PostWithID[]) => {
  return posts.sort((a, b) => {
    const dateA = a.displayDate ? new Date(a.displayDate).getTime() : 0;
    const dateB = b.displayDate ? new Date(b.displayDate).getTime() : 0;
    return dateB - dateA; // Sort in descending order
  });
};

export const setFilteredPostFetchedAt = createAction<string | null>(
  "posts/setFilteredPostFetchedAt"
);

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    // Adjusted to the correct state.posts property
    setPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.posts = sortPostsByDate(action.payload.map(normalizePost));
    },
    setFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.filteredPosts = sortPostsByDate(action.payload.map(normalizePost));
    },
    // Add setUserPosts reducer function
    setUserPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.userPosts = sortPostsByDate(action.payload);
    },
    // Adjusted to the correct state.posts property
    deletePost: (state, action: PayloadAction<string>) => {
      const postIdToDelete = action.payload;

      const keysToClean = [
        "posts",
        "filteredPosts",
        "userPosts",
        "hashtagPosts",
        "starTagPosts",
      ] as const;

      keysToClean.forEach((key) => {
        state[key] = state[key].filter((post) => post.id !== postIdToDelete);
      });
    },
    appendPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.posts = [...state.posts, ...action.payload.map(normalizePost)];
      // should i search for this instance of appendPosts to see if its causing the pop to top?
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
      const existingIds = new Set(state.posts.map((p) => p.id));

      const merged = [
        ...state.posts,
        ...newPosts.filter((p) => !existingIds.has(p.id)),
      ];

      const toTime = (val: any): number => {
        if (val instanceof Date) return val.getTime();
        const d = new Date(val);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };

      state.posts = merged.sort((a, b) => {
        return (
          toTime(b.displayDate || b.timestamp) -
          toTime(a.displayDate || a.timestamp)
        );
      });
    },
    mergeAndSetFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      const newFilteredPosts = action.payload;
      console.log("[REDUX] Merging", action.payload.length, "posts");

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
    appendFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.filteredPosts.push(...action.payload.map(normalizePost));
    },
    clearFilteredPosts: (state) => {
      state.filteredPosts = [];
      state.lastVisibleFiltered = null;
      state.filteredPostCount = 0;
    },
    setHashtagPosts(state, action) {
      state.hashtagPosts = sortPostsByDate(action.payload);
    },
    setStarTagPosts(state, action) {
      state.starTagPosts = sortPostsByDate(action.payload);
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
      .addCase(fetchFilteredPostsBatch.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFilteredPostsBatch.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Error fetching posts";
      })
      // .addCase(fetchLatestPosts.pending, (state) => {
      //   state.loading = true;
      //   state.error = null;
      // })
      // .addCase(
      //   fetchLatestPosts.fulfilled,
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
      // .addCase(fetchLatestPosts.rejected, (state, action) => {
      //   // Handle any errors if the fetch fails
      //   state.loading = false;
      //   state.error = action.error.message || "Error fetching latest posts";
      // })
      .addCase(fetchInitialPostsBatch.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInitialPostsBatch.fulfilled, (state, action) => {
        state.loading = false;
        // put your first page into state.posts, e.g.
        state.posts = action.payload.posts;
        state.lastVisible = action.payload.lastVisible;
      })
      .addCase(
        fetchFilteredPostsBatch.fulfilled,
        (
          state,
          action: PayloadAction<{
            posts: PostWithID[];
            lastVisible: any;
            count: number;
          }>
        ) => {
          const { posts, lastVisible, count } = action.payload;
          // on the very first page we want to _set_ them,
          // on subsequent pages we just append:
          if (!state.lastVisibleFiltered) {
            state.filteredPosts = posts;
          } else {
            state.filteredPosts.push(...posts);
          }
          state.lastVisibleFiltered = lastVisible?.id ?? null;
          state.filteredPostCount = count;
          state.loading = false;
        }
      )
      .addCase(setFilteredPostFetchedAt, (state, action) => {
        state.filteredPostFetchedAt = action.payload;
      })

      .addCase(fetchInitialPostsBatch.rejected, (state, action) => {
        state.error = action.error.message || "Error fetching initial posts";
        state.loading = false;
      })
      .addCase(fetchMorePostsBatch.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMorePostsBatch.fulfilled, (state, action) => {
        const newPosts = action.payload.posts;
        const existingIds = new Set(state.posts.map((p) => p.id));

        newPosts.forEach((post) => {
          if (!existingIds.has(post.id)) {
            state.posts.push(post);
          }
        });

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
  appendPosts,
  appendFilteredPosts,
  clearFilteredPosts,
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
