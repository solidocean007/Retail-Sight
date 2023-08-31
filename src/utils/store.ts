// store.ts
import { configureStore } from "@reduxjs/toolkit";
import snackbarReducer from "../Slices/snackbarSlice";
import userSlice from "../Slices/userSlice";
import firestoreReadsReducer from "../Slices/firestoreReadsSlice";
import postsReducer from "../Slices/postsSlice";

const store = configureStore({
  reducer: {
    snackbar: snackbarReducer,
    user: userSlice,
    firestoreReads: firestoreReadsReducer,
    posts: postsReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
