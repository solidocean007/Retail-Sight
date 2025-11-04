// companyThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyType } from "../utils/types";
import { setCurrentCompany } from "../Slices/currentCompanySlice";
import { fetchCompanyConnections } from "../Slices/companyConnectionSlice";

// 🔧 same helper you used elsewhere
const toIso = (v: any): string | null => {
  if (!v) return null;
  if (v.toDate) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
};

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

      const data = snap.data() as any;
      const { createdAt, updatedAt, lastUpdated, ...rest } = data;

      const normalized: CompanyType & { id: string } = {
        id: snap.id,
        ...rest,
        createdAt: toIso(createdAt),
        updatedAt: toIso(updatedAt),
        lastUpdated: toIso(lastUpdated),
      };

      dispatch(setCurrentCompany(normalized));
      return normalized;
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
