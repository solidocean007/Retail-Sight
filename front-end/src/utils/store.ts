import { configureStore, combineReducers, Action } from "@reduxjs/toolkit";
import { ThunkAction } from "@reduxjs/toolkit";
import { createAction } from "@reduxjs/toolkit";
import { useDispatch as _useDispatch } from "react-redux";

// slices
import snackbarReducer from "../Slices/snackbarSlice";
import userSlice from "../Slices/userSlice";
import postsReducer from "../Slices/postsSlice";
import themeReducer from "../Slices/themeSlice";
import locationReducer from "../Slices/locationSlice";
import userModalReducer from "../Slices/userModalSlice";
import userAccountsSlice from "../Slices/userAccountsSlice";
import allAccountsSlice from "../Slices/allAccountsSlice";
import teamsSlice from "../Slices/teamsSlice";
import missionsSlice from "../Slices/missionsSlice";
import companyConnectionsSlice from "../Slices/companyConnectionSlice";
import allCompaniesSlice from "../Slices/allCompaniesSlice";
import companyGoalsSlice from "../Slices/companyGoalsSlice";
import galloGoalsSlice from "../Slices/galloGoalsSlice";
import productsSlice from "../Slices/productsSlice";
import notificationsSlice from "../Slices/notificationsSlice";
import currentCompanySlice from "../Slices/currentCompanySlice";
import customAccountsSlice from "../Slices/customAccountsSlice";
import sharedPostsSlice from "../Slices/sharedPostsSlice";
import planSlice from "../Slices/planSlice";
import appSlice from "../Slices/appSlice";
import developerNotificationsSlice from "../Slices/developerNotificationSlice";
import accountImportSlice from "../Slices/accountImportSlice";

// ✅ global reset action
export const resetStore = createAction("RESET_STORE");
export const selectCanSync = (state: RootState) => !state.app.resetting;

// ✅ all reducers in ONE place
const appReducer = combineReducers({
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
  currentCompany: currentCompanySlice,
  allCompanies: allCompaniesSlice,
  companyConnections: companyConnectionsSlice,
  companyGoals: companyGoalsSlice,
  galloGoals: galloGoalsSlice,
  companyProducts: productsSlice,
  notifications: notificationsSlice,
  customAccounts: customAccountsSlice,
  sharedPosts: sharedPostsSlice,
  plans: planSlice,
  app: appSlice,
  developerNotifications: developerNotificationsSlice,
  accountImports: accountImportSlice,
});

// ✅ root reducer handles reset
const rootReducer = (state: any, action: any) => {
  if (action.type === "RESET_STORE") {
    state = undefined;
  }
  return appReducer(state, action);
};

// ✅ store uses rootReducer (THIS is the key fix)
const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== "production", // Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node` and then add 'node' to the types field in your tsconfig.ts(2591)
});

// types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => _useDispatch<AppDispatch>();

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export default store;
