// companyConnectionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  or,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db, functions } from "../utils/firebase";
import { CompanyConnectionType } from "../utils/types";
import {
  setCompanyConnectionsStore,
  updateCompanyConnectionInStore,
} from "../utils/database/companyConnectionsDBUtils";
import { httpsCallable } from "firebase/functions";

function normalizeTimestamps<T extends Record<string, any>>(obj: T): T {
  const result: any = { ...obj };
  Object.keys(result).forEach((key) => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate().toISOString();
    }
  });
  return result;
}

interface CompanyConnectionsState {
  connections: CompanyConnectionType[];
  loading: boolean;
  error: string | null;
}

const initialState: CompanyConnectionsState = {
  connections: [],
  loading: false,
  error: null,
};

/**
 * ✅ CREATE CONNECTION (via Cloud Function ONLY)
 */
export const createConnectionRequest = createAsyncThunk(
  "companyConnections/createRequest",
  async (
    {
      currentCompanyId,
      emailInput,
      brandSelection,
      user,
    }: {
      currentCompanyId: string;
      emailInput: string;
      brandSelection: string[];
      user: any;
    },
    { rejectWithValue }
  ) => {
    try {
      const fn = httpsCallable(functions, "createConnectionRequest");

      const res = await fn({
        fromCompanyId: currentCompanyId,
        email: emailInput,
        pendingBrands: (brandSelection ?? []).map((b) => ({
          brand: b,
          proposedBy: user,
        })),
      });

      return normalizeTimestamps(res.data as CompanyConnectionType);
    } catch (err: any) {
      return rejectWithValue(err?.message || "Failed to create connection.");
    }
  }
);

/**
 * ✅ FETCH CONNECTIONS
 */
export const fetchCompanyConnections = createAsyncThunk(
  "companyConnections/fetch",
  async (companyId: string) => {
    const q = query(
      collection(db, "companyConnections"),
      or(
        where("requestFromCompanyId", "==", companyId),
        where("requestToCompanyId", "==", companyId)
      )
    );

    const snapshot = await getDocs(q);

    const data = snapshot.docs.map((d) =>
      normalizeTimestamps({
        id: d.id,
        ...(d.data() as Omit<CompanyConnectionType, "id">),
      })
    );

    await setCompanyConnectionsStore(companyId, data);
    return data;
  }
);

/**
 * ⚠️ STATUS UPDATE (OK for now, CF later)
 */
export const updateConnectionStatus = createAsyncThunk(
  "companyConnections/updateStatus",
  async ({
    id,
    status,
    companyId,
  }: {
    id: string;
    status: "approved" | "rejected" | "cancelled";
    companyId: string;
  }) => {
    const ref = doc(db, "companyConnections", id);
    await updateDoc(ref, { status });

    const snap = await getDoc(ref);
    const updated = normalizeTimestamps({
      ...(snap.data() as CompanyConnectionType),
      id,
      status,
    });

    await updateCompanyConnectionInStore(companyId, updated);
    return { id, status };
  }
);

const companyConnectionSlice = createSlice({
  name: "companyConnections",
  initialState,
  reducers: {
    setCachedConnections: (
      state,
      action: PayloadAction<CompanyConnectionType[]>
    ) => {
      state.connections = [...action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyConnections.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCompanyConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.connections = action.payload;
      })
      .addCase(createConnectionRequest.fulfilled, (state, action) => {
        state.connections.push(action.payload);
      })
      .addCase(updateConnectionStatus.fulfilled, (state, action) => {
        const target = state.connections.find(
          (c) => c.id === action.payload.id
        );
        if (target) target.status = action.payload.status;
      });
  },
});

export const { setCachedConnections } = companyConnectionSlice.actions;
export default companyConnectionSlice.reducer;
