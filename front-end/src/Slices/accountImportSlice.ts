// accountImportSlice.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AccountImport } from "../components/AccountManagement/UploadReviewModal";

interface AccountImportState {
  pending: AccountImport[];
}

const initialState: AccountImportState = {
  pending: [],
};

const accountImportSlice = createSlice({
  name: "accountImports",
  initialState,
  reducers: {
    setPendingAccountImports(state, action: PayloadAction<AccountImport[]>) {
      state.pending = action.payload;
    },
  },
});

export const { setPendingAccountImports } = accountImportSlice.actions;

export const selectPendingAccountImports = (state: any) =>
  state.accountImports.pending;

export default accountImportSlice.reducer;
