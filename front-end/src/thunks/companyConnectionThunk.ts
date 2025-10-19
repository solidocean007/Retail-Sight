// companyThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyType } from "../utils/types";
import { setCurrentCompany } from "../Slices/currentCompanySlice";
import { fetchCompanyConnections } from "../Slices/companyConnectionSlice";

/**
 * Load a single company document and store it in the currentCompany slice.
 */
export const loadCompany = createAsyncThunk(
  "company/loadCompany",
  async (companyId: string, { dispatch }) => {
    try {
      const ref = doc(db, "companies", companyId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        console.error("Company not found:", companyId);
        return null;
      }

      const data = snap.data() as CompanyType;
      dispatch(setCurrentCompany({ id: snap.id, ...data }));
      return { id: snap.id, ...data };
    } catch (error) {
      console.error("Error loading company:", error);
      throw error;
    }
  }
);

/**
 * Convenience thunk — loads both company metadata and its connections.
 */
export const loadCompanyAndConnections = createAsyncThunk(
  "company/loadCompanyAndConnections",
  async (companyId: string, { dispatch }) => {
    try {
      const [companyData] = await Promise.all([
        dispatch(loadCompany(companyId)),
        dispatch(fetchCompanyConnections(companyId)),
      ]);
      return companyData;
    } catch (error) {
      console.error("Error loading company and connections:", error);
      throw error;
    }
  }
);
