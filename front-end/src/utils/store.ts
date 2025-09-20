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
// import goalsSlice from "../Slices/goalsSlice";
import companyConnectionsSlice from "../Slices/companyConnectionSlice";
import allCompaniesSlice from "../Slices/allCompaniesSlice";
import companyGoalsSlice from "../Slices/companyGoalsSlice";
import galloGoalsSlice from "../Slices/galloGoalsSlice";
import productsSlice from "../Slices/productsSlice";
import notificationsSlice from "../Slices/notificationsSlice";
import currentCompanySlice from "../Slices/currentCompanySlice";
import customAccountsSlice from "../Slices/customAccountsSlice";

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
    currentCompany: currentCompanySlice, 
    allCompanies: allCompaniesSlice,
    companyConnections: companyConnectionsSlice,
    companyGoals: companyGoalsSlice, // 🆕 First-party company goals
    galloGoals: galloGoalsSlice, // 🆕 Third-party Gallo goals
    companyProducts: productsSlice,
    notifications: notificationsSlice, // 🆕 Notifications slice
    customAccounts: customAccountsSlice,
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
