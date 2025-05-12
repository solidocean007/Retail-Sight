// store.ts
import { configureStore, Action } from "@reduxjs/toolkit";
import { ThunkAction } from "@reduxjs/toolkit";
import snackbarReducer from "../Slices/snackbarSlice";
import userSlice from "../Slices/userSlice";
import postsReducer from "../Slices/postsSlice";
import themeReducer from "../Slices/themeSlice";
import locationReducer from "../Slices/locationSlice";
import userModalReducer from "../Slices/userModalSlice";
import userAccountsSlice from "../Slices/userAccountsSlice";
import allAccountsSlice from "../Slices/allAccountsSlice";
import { useDispatch as _useDispatch } from "react-redux";
import teamsSlice from "../Slices/teamsSlice";
import missionsSlice from "../Slices/missionsSlice";
import goalsSlice from "../Slices/goalsSlice";

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
    allAccounts: allAccountsSlice,
    goals: goalsSlice,
  },
  devTools: process.env.NODE_ENV !== "production",
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
