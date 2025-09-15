import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { CompanyAccountType } from "../utils/types";
import {
  getUserAccountsFromIndexedDB,
  saveUserAccountsToIndexedDB,
} from "../utils/database/indexedDBUtils";
import { RootState } from "../utils/store";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";

// The async thunk
export const loadUserAccounts = createAsyncThunk(
  "userAccounts/load",
  async (
    {
      companyId,
      salesRouteNum,
    }: { companyId: string; salesRouteNum: string },
    thunkAPI
  ) => {
    try {
      const cached = await getUserAccountsFromIndexedDB();
      if (cached?.length > 0) return cached;

      const fresh = await fetchUsersAccounts(companyId, salesRouteNum);

      await saveUserAccountsToIndexedDB(fresh);
      return fresh;
    } catch (err: any) {
      return thunkAPI.rejectWithValue(
        err?.message || "Failed to load user accounts"
      );
    }
  }
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
    clearUserAccounts: (state) => {
      state.accounts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserAccounts.pending, (state) => {
        state.loading = "pending";
        state.error = null;
      })
      .addCase(
        loadUserAccounts.fulfilled,
        (state, action: PayloadAction<CompanyAccountType[]>) => {
          state.loading = "succeeded";
          state.accounts = action.payload;
        }
      )
      .addCase(loadUserAccounts.rejected, (state, action) => {
        state.loading = "failed";
        state.error = action.payload as string;
      });
  },
});

// Export actions and selector
export const { setUserAccounts, clearUserAccounts } = userAccountsSlice.actions;

export const selectUserAccounts = (state: RootState) =>
  state.userAccounts.accounts; 
export const selectUserAccountsLoading = (state: RootState) =>
  state.userAccounts.loading;

// Export the reducer
export default userAccountsSlice.reducer;
