import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CompanyType } from "../utils/types";
import { RootState } from "../utils/store";
import { loadCompanyConnections } from "../thunks/companyThunk";

export interface CompanyConnectionType {
  id: string;
  fromCompanyId: string;
  toCompanyId: string;
  status: "approved" | "pending" | "rejected";
  integration: string;
  integrationLevel: "full" | "read-only";
  createdAt: string; // or Firestore Timestamp if not normalized yet
}

interface CompanyState {
  company: CompanyType | null;
  connections: CompanyConnectionType[];
  isConnectionsLoading: boolean;
  connectionsError: string | null;
}

const initialState: CompanyState = {
  company: null,
  connections: [],
  isConnectionsLoading: false,
  connectionsError: null,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setCompany(state, action: PayloadAction<CompanyType>) {
      state.company = action.payload;
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

export const { setCompany } = companySlice.actions;
export const selectCompany = (state: RootState) => state.company.company;
export const selectCompanyConnections = (state: RootState) =>
  state.company.connections;

export const selectHasIntegration = (state: RootState, integrationName: string) =>
  state.company.connections?.some(
    (c) => c.integration === integrationName && c.status === "approved"
  );

export default companySlice.reducer;
