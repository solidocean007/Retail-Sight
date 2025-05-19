import { createAsyncThunk } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { setCompany } from "../Slices/companySlice";
import { CompanyType } from "../utils/types";

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
