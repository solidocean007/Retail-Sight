// src/Slices/customAccountsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CompanyAccountType } from "../utils/types";

interface CustomAccountsState {
  accounts: CompanyAccountType[];
  loading: boolean;
  error: string | null;
}

const initialState: CustomAccountsState = {
  accounts: [],
  loading: false,
  error: null,
};

const customAccountsSlice = createSlice({
  name: "customAccounts",
  initialState,
  reducers: {
    setCustomAccounts(state, action: PayloadAction<CompanyAccountType[]>) {
      state.accounts = action.payload;
    },
    addCustomAccount(state, action: PayloadAction<CompanyAccountType>) {
      state.accounts.unshift(action.payload); // new ones go on top
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearCustomAccounts(state) {
      state.accounts = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setCustomAccounts,
  addCustomAccount,
  setLoading,
  setError,
  clearCustomAccounts,
} = customAccountsSlice.actions;

export default customAccountsSlice.reducer;

// Optional selectors (cleaner access)
export const selectCustomAccounts = (state: any) =>
  state.customAccounts.accounts;

export const selectCustomAccountsLoading = (state: any) =>
  state.customAccounts.loading;

export const selectCustomAccountsError = (state: any) =>
  state.customAccounts.error;
