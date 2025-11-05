// companyConnectionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  CollectionReference,
  or,
  getDoc,
  serverTimestamp,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db, functions } from "../utils/firebase";
import { CompanyConnectionType, ConnectionRequest } from "../utils/types";
import {
  setCompanyConnectionsStore,
  updateCompanyConnectionInStore,
} from "../utils/database/companyConnectionsDBUtils";
import {  httpsCallable } from "firebase/functions";

function normalizeTimestamps(obj: any) {
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

// companyConnectionSlice.ts

export const createConnectionRequest = createAsyncThunk(
  "companyConnections/createRequest",
  async (
    { currentCompanyId, user, usersCompany, emailInput, brandSelection }: any,
    { rejectWithValue }
  ) => {
    const safeBrands = Array.isArray(brandSelection) ? brandSelection : [];
    const now = new Date().toISOString();

    // const newRequest: ConnectionRequest = {
    //   emailLower: user.email,
    //   requestFromCompanyType: usersCompany.companyType,
    //   requestFromCompanyId: currentCompanyId,
    //   requestToCompanyId: "",
    //   requestedByUid: user.uid,
    //   status: "pending",
    //   sharedBrands: safeBrands,
    //   requestedAt: now,
    // };

    const resolveFn = httpsCallable(functions, "resolveCompanyEmail");

    try {
      // ✅ Try resolving before writing to Firestore
      const result: any = await resolveFn({ requestedEmail: emailInput });
      const { toCompanyId, toCompanyType, toCompanyName } = result.data;
      if (!result?.data?.toCompanyId) {
        throw new Error("Could not resolve target company.");
      }

      const newRequest: ConnectionRequest = {
        emailLower: user.email,
        requestFromCompanyType: usersCompany.companyType,
        requestFromCompanyId: currentCompanyId,
        requestFromCompanyName: usersCompany.companyName ?? "Unknown Company",
        requestToCompanyId: toCompanyId,
        requestToCompanyType: toCompanyType,
        requestToCompanyName: toCompanyName, // ✅ store here
        requestedByUid: user.uid,
        status: "pending",
        sharedBrands: safeBrands,
        requestedAt: now,
      };

      // ✅ Only create the connection after success
      const docRef = await addDoc(collection(db, "companyConnections"), {
        ...newRequest,
        requestedEmail: emailInput,
        requestToCompanyId: result.data.toCompanyId,
        requestToCompanyType: result.data.toCompanyType,
        requestedAt: serverTimestamp(),
      });

      return { id: docRef.id, ...newRequest };
    } catch (err: any) {
      console.error("createConnectionRequest error:", err);
      return rejectWithValue(err.message || "Error creating connection");
    }
  }
);

// ✅ Load all connections
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

    const data = snapshot.docs.map((d) => {
      const raw = d.data() as Omit<CompanyConnectionType, "id">;
      return { id: d.id, ...normalizeTimestamps(raw) };
    });

    // ✅ Cache offline
    await setCompanyConnectionsStore(companyId, data);

    return data;
  }
);

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
    const updatedConnection = normalizeTimestamps({
      ...(snap.data() as CompanyConnectionType),
      id,
      status,
    });

    // ✅ Update local IndexedDB (single record)
    await updateCompanyConnectionInStore(companyId, updatedConnection);

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
      const incoming = action.payload;
      const merged = [...incoming];
      state.connections = merged;
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
      .addCase(updateConnectionStatus.fulfilled, (state, action) => {
        const { id, status } = action.payload;
        const target = state.connections.find((c) => c.id === id);
        if (target) target.status = status;
      });
  },
});

export const { setCachedConnections } = companyConnectionSlice.actions;
export default companyConnectionSlice.reducer;
