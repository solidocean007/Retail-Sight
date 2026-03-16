import { createSlice } from "@reduxjs/toolkit";

const accountImportSlice = createSlice({
  name: "accountImports",
  initialState: {
    pending: [],
  },
  reducers: {
    setPendingAccountImports(state, action) {
      state.pending = action.payload;
    },
  },
});

export const selectPendingAccountImports = (state: RootState) =>
  state.accountImports.pending;
export const { setPendingAccountImports } = accountImportSlice.actions;
export default accountImportSlice.reducer;
