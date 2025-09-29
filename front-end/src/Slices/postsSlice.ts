// postsSlice
import { createAction, createSlice } from "@reduxjs/toolkit";
import {
  fetchFilteredPostsBatch, // i need to use this now
  // fetchLatestPosts,
  fetchInitialPostsBatch,
  fetchMorePostsBatch,
  fetchUserCreatedPosts,
} from "../thunks/postsThunks";
import { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { PayloadAction } from "@reduxjs/toolkit";
import { PostWithID } from "../utils/types";
import { normalizePost } from "../utils/normalizePost";

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

type CursorType = string | null;

interface PostsState {
  posts: PostWithID[];
  filteredPosts: PostWithID[];
  filteredPostCount: number;
  filteredPostFetchedAt: string | null;
  userPosts: PostWithID[];
  loading: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  lastVisible: CursorType;
  lastVisibleFiltered: CursorType;
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
  lastVisible: null,
  lastVisibleFiltered: null,
  hashtagPosts: [],
  starTagPosts: [],
};

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {
    setPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.posts = sortPostsByDate(action.payload.map(normalizePost));
    },
    setFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.filteredPosts = sortPostsByDate(action.payload.map(normalizePost));
    },
    setUserPosts: (state, action: PayloadAction<PostWithID[]>) => {
      state.userPosts = sortPostsByDate(action.payload);
    },
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
      state.posts = sortPostsByDate([
        ...state.posts,
        ...action.payload.map(normalizePost),
      ]);
    },
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
      const existingIds = new Set(state.posts.map((p) => p.id));
      const merged = [
        ...state.posts,
        ...action.payload.filter((p) => !existingIds.has(p.id)),
      ];
      state.posts = sortPostsByDate(merged);
    },

    mergeAndSetFilteredPosts: (state, action: PayloadAction<PostWithID[]>) => {
      const merged = [
        ...state.filteredPosts,
        ...action.payload.filter(
          (newPost) => !state.filteredPosts.find((p) => p.id === newPost.id)
        ),
      ];
      state.filteredPosts = sortPostsByDate(merged);
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
    clearPostsData: (state) => {
      state.posts = [];
      state.filteredPosts = [];
      state.userPosts = [];
      state.lastVisible = null;
      state.lastVisibleFiltered = null;
      state.hashtagPosts = [];
      state.starTagPosts = [];
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
      .addCase(fetchInitialPostsBatch.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInitialPostsBatch.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.posts;
        state.lastVisible = action.payload.lastVisible?.id ?? null;
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
        const existingIds = new Set(state.posts.map((p) => p.id));
        const merged = [
          ...state.posts,
          ...action.payload.posts.filter((p) => !existingIds.has(p.id)),
        ];
        state.posts = sortPostsByDate(merged);

        state.lastVisible = action.payload.lastVisible; // it's already a string | null
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
