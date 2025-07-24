import { createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
// import { setCompany } from "../Slices/companyConnectionSlice";
import { CompanyType } from "../utils/types";
import { fetchCompanyConnections } from "../utils/helperFunctions/fetchCompanyConnections";

export const loadCompany = createAsyncThunk(
  "company/loadCompany",
  async (companyId: string, { dispatch }) => {
    const companyRef = doc(db, "companies", companyId);
    const companySnap = await getDoc(companyRef);


    if (companySnap.exists()) {
      dispatch(setCompany(companySnap.data() as CompanyType));
    } else {
      console.error("Company not found.");
    }
  }
);

export const loadCompanyConnections = createAsyncThunk(
  "company/loadCompanyConnections",
  async (companyId: string, { dispatch }) => {
    // 1️⃣ Load cached connections from IndexedDB
    const cached = await getCompanyConnectionsFromIndexedDB(companyId);

    if (cached) {
      console.log("[IndexedDB] Loaded cached connections");
      dispatch(setCompanyConnections(cached.connections));
    }

    // 2️⃣ Fetch fresh connections from Firestore
    const freshConnections = await fetchCompanyConnections(companyId);

    // Compare timestamps (if you want) and update cache
    await storeCompanyConnectionsInIndexedDB(companyId, freshConnections);

    return freshConnections;
  }
);
