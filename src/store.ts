// store.ts
import { configureStore } from "@reduxjs/toolkit";
import snackbarReducer from "./Slices/snackbarSlice";
import userSlice from "./Slices/userSlice";

const store = configureStore({
  reducer: {
    snackbar: snackbarReducer,
    user: userSlice,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
