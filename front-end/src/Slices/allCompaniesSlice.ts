// Slices/allCompaniesSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { CompanyType, CompanyTypeWithId, CompanyWithUsersAndId } from "../utils/types";          // ✅ fixed
import { getDocs, collection } from "firebase/firestore";
import { RootState } from "../utils/store";            // ✅ fixed
import { db } from "../utils/firebase";
import { fetchCompanyUsersFromFirestore } from "../thunks/usersThunks";

export const fetchAllCompanies = createAsyncThunk<
  CompanyTypeWithId[],
  void,
  { rejectValue: string }
>("companies/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const snap = await getDocs(collection(db, "companies"));
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as CompanyType),
    }) as CompanyTypeWithId);
  } catch (err: any) {
    return rejectWithValue(err.message);
  }
});

// Slices/allCompaniesSlice.ts  ➜  ADD BELOW fetchAllCompanies
// what is this for? 
export const fetchCompaniesWithUsers = createAsyncThunk<
  CompanyWithUsersAndId[],
  void,
  { rejectValue: string }
>("companies/fetchWithUsers", async (_, { dispatch, rejectWithValue }) => {
  try {
    // 1️⃣ Pull raw company docs
    const companies = await dispatch(fetchAllCompanies()).unwrap();

    // 2️⃣ Enrich with users
    const enriched = await Promise.all(
      companies.map(async (c) => {
        const users = await dispatch(fetchCompanyUsersFromFirestore(c.id)).unwrap();
        return {
          ...c,
          users,
          superAdminDetails: users.filter(u => u.role === "super-admin"), 
          adminDetails:      users.filter(u => u.role === "admin"),
          employeeDetails:   users.filter(u => u.role === "employee"),
          pendingDetails:    users.filter(u => u.role === "status-pending"),
        };
      })
    );

    return enriched;
  } catch (e:any) {
    return rejectWithValue(e.message);
  }
});


interface CompaniesState {
  plain: CompanyTypeWithId[];           // ← output of fetchAllCompanies
  withUsers: CompanyWithUsersAndId[];   // ← output of fetchCompaniesWithUsers
  loading: boolean;
  error: string | null;
}

const initialState: CompaniesState = {
  plain: [],
  withUsers: [],
  loading: false,
  error: null,
};

const allCompaniesSlice = createSlice({
  name: "allCompanies",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
  // plain list
  builder
    .addCase(fetchAllCompanies.pending,   (s) => { s.loading = true; })
    .addCase(fetchAllCompanies.fulfilled, (s, a) => {
      s.plain = a.payload;
      s.loading = false;
    })
    .addCase(fetchAllCompanies.rejected,  (s, a) => {
      s.error = a.payload ?? "Failed to fetch companies";
      s.loading = false;
    });

  // enriched list
  builder
    .addCase(fetchCompaniesWithUsers.pending,   (s) => { s.loading = true; })
    .addCase(fetchCompaniesWithUsers.fulfilled, (s, a) => {
      s.withUsers = a.payload;
      s.loading = false;
    })
    .addCase(fetchCompaniesWithUsers.rejected,  (s, a) => {
      s.error = a.payload ?? "Failed to fetch companies + users";
      s.loading = false;
    });
},
});

export default allCompaniesSlice.reducer;
export const selectAllCompanies        = (s: RootState) => s.allCompanies.plain;
export const selectCompaniesWithUsers  = (s: RootState) => s.allCompanies.withUsers;
export const selectCompaniesLoading    = (s: RootState) => s.allCompanies.loading;
export const selectCompaniesError      = (s: RootState) => s.allCompanies.error;

