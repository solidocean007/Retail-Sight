import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { CompanyAccountType } from "../utils/types";
import { getUserAccountsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { RootState } from "../utils/store";

// Thunk to load accounts from IndexedDB
export const loadUserAccounts = createAsyncThunk<CompanyAccountType[]>(
  "userAccounts/loadUserAccounts",
  async () => {
    const accounts = await getUserAccountsFromIndexedDB();
    return accounts;
  },
);

interface UserAccountsState {
  accounts: CompanyAccountType[];
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
}

const initialState: UserAccountsState = {
  accounts: [],
  loading: "idle",
  error: null,
};

const userAccountsSlice = createSlice({
  name: "userAccounts",
  initialState,
  reducers: {
    setUserAccounts: (state, action: PayloadAction<CompanyAccountType[]>) => {
      state.accounts = action.payload as CompanyAccountType[];
    },
    clearReduxAccounts: (state) => {
      state.accounts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserAccounts.pending, (state) => {
        state.loading = "pending";
      })
      .addCase(loadUserAccounts.fulfilled, (state, action) => {
        state.accounts = action.payload;
        state.loading = "succeeded";
      })
      .addCase(loadUserAccounts.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load user accounts";
        state.loading = "failed";
      });
  },
});

// Export actions and selector
export const { setUserAccounts, clearReduxAccounts, setLoadingUserAccounts } =
  userAccountsSlice.actions;
export const selectUserAccounts = (state: RootState) =>
  state.userAccounts.accounts; // 'state.userAccounts' is of type 'unknown'
export const selectUserAccountsLoading = (state: RootState) =>
  state.userAccounts.loading; // 'state.userAccounts' is of type 'unknown'.

// Export the reducer
export default userAccountsSlice.reducer;
