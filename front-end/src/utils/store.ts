// store.ts
import { configureStore, Action } from "@reduxjs/toolkit";
import { ThunkAction } from "@reduxjs/toolkit";
import snackbarReducer from "../Slices/snackbarSlice";
import userSlice from "../Slices/userSlice";
import firestoreReadsReducer from "../Slices/firestoreReadsSlice";
import postsReducer from "../Slices/postsSlice";
import locationReducer from '../Slices/locationSlice'
import { themeReducer } from "../reducers/themeReducer";
import userModalReducer from "../Slices/userModalSlice";


import { useDispatch as _useDispatch } from 'react-redux';

const store = configureStore({
  reducer: {
    snackbar: snackbarReducer,
    user: userSlice,
    firestoreReads: firestoreReadsReducer,
    posts: postsReducer,
    theme: themeReducer,
    userModal: userModalReducer,
    locations: locationReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => _useDispatch<AppDispatch>();

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export type RootState = ReturnType<typeof store.getState>;

export default store;