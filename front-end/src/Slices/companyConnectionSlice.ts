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
import { db } from "../utils/firebase";
import { CompanyConnectionType, ConnectionRequest } from "../utils/types";
import { setCompanyConnectionsStore, updateCompanyConnectionInStore } from "../utils/database/companyConnectionsDBUtils";

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

export const createConnectionRequest = createAsyncThunk(
  "companyConnections/createRequest",
  async ({ currentCompanyId, user, usersCompany, emailInput, brandSelection }: any) => {
    const newRequest: ConnectionRequest = {
      emailLower: user.email,
      requestFromCompanyType: usersCompany.companyType,
      requestFromCompanyId: currentCompanyId,
      requestToCompanyId: "",
      requestedByUid: user.uid,
      status: "pending",
      sharedBrands: brandSelection,
      requestedAt: serverTimestamp() as unknown as Timestamp,
    };
    const docRef = await addDoc(collection(db, "companyConnections"), {
      ...newRequest,
      requestedEmail: emailInput,
    });
    return { id: docRef.id, ...newRequest };
  }
);


// ✅ Load all connections
export const fetchCompanyConnections = createAsyncThunk(
  "companyConnections/fetch",
  async (companyId: string) => {
    const q = query(
      collection(db, "companyConnections"),
      or(
        where("fromCompanyId", "==", companyId),
        where("toCompanyId", "==", companyId)
      )
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CompanyConnectionType[];

    // ✅ Cache offline
    await setCompanyConnectionsStore(companyId, data);

    return data;
  }
);

export const updateConnectionStatus = createAsyncThunk(
  "companyConnections/updateStatus",
  async (
    {
      id,
      status,
      companyId,
    }: { id: string; status: "approved" | "rejected"; companyId: string }
  ) => {
    const ref = doc(db, "companyConnections", id);
    await updateDoc(ref, { status });

    const snap = await getDoc(ref);
    const updatedConnection = {
      ...(snap.data() as CompanyConnectionType),
      id,
      status,
    };

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
      state.connections = action.payload;
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

