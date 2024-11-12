// store.ts
import { configureStore, Action } from "@reduxjs/toolkit";
import { ThunkAction } from "@reduxjs/toolkit";
import snackbarReducer from "../Slices/snackbarSlice";
import userSlice from "../Slices/userSlice";
import postsReducer from "../Slices/postsSlice";
import locationReducer from '../Slices/locationSlice'
import { themeReducer } from "../reducers/themeReducer";
import userModalReducer from "../Slices/userModalSlice";
import userAccountsSlice from "../Slices/userAccountsSlice";


import { useDispatch as _useDispatch } from 'react-redux';
import teamsSlice from "../Slices/teamsSlice";
import missionsSlice from "../Slices/missionsSlice";

const store = configureStore({
  reducer: {
    snackbar: snackbarReducer,
    user: userSlice,
    posts: postsReducer,
    theme: themeReducer,
    userModal: userModalReducer,
    locations: locationReducer,
    CompanyTeam: teamsSlice,
    missions: missionsSlice,
    userAccounts: userAccountsSlice,
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