import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { doc, getDoc } from "firebase/firestore";
import { CompanyType } from "../utils/types";
import { db } from "../utils/firebase";
import { RootState } from "../utils/store";
import { normalizeFirestoreData } from "../utils/normalize"; // ✅ add this

// 🔌 one-off fetch by ID
export const fetchCurrentCompany = createAsyncThunk<
  CompanyType & { id: string },
  string,
  { rejectValue: string; state: RootState }
>(
  "currentCompany/fetch",
  async (companyId, { rejectWithValue }) => {
    try {
      const snap = await getDoc(doc(db, "companies", companyId));

      if (!snap.exists()) {
        throw new Error("Company not found");
      }

      const normalized = normalizeFirestoreData(snap.data()) as CompanyType;

      return {
        id: snap.id,
        ...normalized,
      } as CompanyType & { id: string };
    } catch (e: any) {
      return rejectWithValue(e.message);
    }
  },
  {
    condition: (companyId, { getState }) => {
      const state = getState();
      return state.currentCompany.data?.id !== companyId;
    },
  },
);

interface CurrentCompanyState {
  data: (CompanyType & { id: string }) | null;
  loading: boolean;
  error: string | null;
}

const initialState: CurrentCompanyState = {
  data: null,
  loading: false,
  error: null,
};

const currentCompanySlice = createSlice({
  name: "currentCompany",
  initialState,
  reducers: {
    // Manual setter (e.g., after profile update)
    setCurrentCompany(
      state,
      action: PayloadAction<CompanyType & { id: string }>,
    ) {
      // ✅ ensure serializable data here as well
      state.data = normalizeFirestoreData(action.payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchCurrentCompany.pending, (s) => {
      s.loading = true;
      s.error = null;
    });

    b.addCase(fetchCurrentCompany.fulfilled, (s, a) => {
      s.data = a.payload;
      s.loading = false;
    });

    b.addCase(fetchCurrentCompany.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload ?? "Failed to load company";
    });
  },
});

export const { setCurrentCompany } = currentCompanySlice.actions;
export default currentCompanySlice.reducer;

// ───────────── Selectors ─────────────
export const selectCurrentCompany = (s: RootState) => s.currentCompany.data;
export const selectCompanyLoading = (s: RootState) => s.currentCompany.loading;
export const selectCompanyError = (s: RootState) => s.currentCompany.error;
