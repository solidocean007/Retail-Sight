import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CompanyAccountType } from "../utils/types";
import { RootState } from "../utils/store";
import { fetchAllAccountsFromFirestore } from "../utils/helperFunctions/fetchAllAcccountsFromFirestore";

// Thunk to load matching accounts based on Gallo distributor account IDs and companyId
export const loadMatchingAccounts = createAsyncThunk<
  CompanyAccountType[],
  { distributorIds: string[]; accountId: string } // Accepts distributorIds and companyId
>("accounts/loadMatchingAccounts", async ({ distributorIds, accountId }) => {
  // Property 'accountId' does not exist on type '{ distributorIds: string[]; companyId: string; }
  const allAccounts = await fetchAllAccountsFromFirestore(accountId);
  // Filter accounts that match the distributor account IDs
  return allAccounts.filter((account) =>
    distributorIds.includes(account.accountNumber),
  );
});

interface AllAccountsState {
  accounts: CompanyAccountType[];
  loading: "idle" | "pending" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AllAccountsState = {
  accounts: [],
  loading: "idle",
  error: null,
};

const allAccountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    setAllAccounts: (state, action: PayloadAction<CompanyAccountType[]>) => {
      state.accounts = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMatchingAccounts.pending, (state) => {
        state.loading = "pending";
      })
      .addCase(loadMatchingAccounts.fulfilled, (state, action) => {
        state.accounts = action.payload;
        state.loading = "succeeded";
      })
      .addCase(loadMatchingAccounts.rejected, (state, action) => {
        state.error = action.error.message || "Failed to load accounts";
        state.loading = "failed";
      });
  },
});

// Export the selector to access the matched accounts in components
export const selectMatchedAccounts = (state: RootState) =>
  state.allAccounts.accounts;
export const { setAllAccounts } = allAccountsSlice.actions;
export const selectAllCompanyAccounts = (state: RootState) =>
  state.allAccounts.accounts;

export default allAccountsSlice.reducer;
