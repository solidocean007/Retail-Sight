import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { loadCompanyConnections } from "../thunks/companyConnectionThunk";
import { CompanyConnectionType } from "../utils/types";

/**
 * Redux slice that stores *only* the network‑connection records between the
 * current company and its trading partners (suppliers ↔ distributors).
 *
 * ‼️  It is **deliberately** scoped to connections only.  The company object
 *     itself (name, address, etc.) should live in a dedicated `currentCompany`
 *     slice or inside your existing `userSlice` where you already keep
 *     `user.company`.
 */
export interface CompanyConnectionState {
  connections: CompanyConnectionType[];
  isConnectionsLoading: boolean;
  connectionsError: string | null;
}

const initialState: CompanyConnectionState = {
  connections: [],
  isConnectionsLoading: false,
  connectionsError: null,
};

const companyConnectionSlice = createSlice({
  name: "companyConnection",
  initialState,
  reducers: {
    /**
     * Allows manual overwrite (e.g. on logout or company switch)
     */
    clearCompanyConnections(state) {
      state.connections = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCompanyConnections.pending, (state) => {
        state.isConnectionsLoading = true;
        state.connectionsError = null;
      })
      .addCase(
        loadCompanyConnections.fulfilled,
        (state, action: PayloadAction<CompanyConnectionType[]>) => {
          state.connections = action.payload;
          state.isConnectionsLoading = false;
        }
      )
      .addCase(loadCompanyConnections.rejected, (state, action) => {
        state.connectionsError = action.error.message || "Failed to load connections";
        state.isConnectionsLoading = false;
      });
  },
});

// ───────────────────────────────────────── Selectors ───────────────────────────
export const selectCompanyConnections = (state: RootState) =>
  state.companyConnection.connections;

export const selectHasIntegration = (integrationName: string) => (state: RootState) =>
  state.companyConnection.connections.some(
    (c) => c.integration === integrationName && c.status === "approved"
  );

export const {
  clearCompanyConnections,
} = companyConnectionSlice.actions;

export default companyConnectionSlice.reducer;
