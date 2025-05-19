import { createAsyncThunk, createSlice, createSelector } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { db } from "../utils/firebase";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { FireStoreGalloGoalDocType } from "../utils/types";
import { addAccountsToIndexedDB, getUserAccountsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";

// Extended Type with ID
export interface FireStoreGalloGoalWithId extends FireStoreGalloGoalDocType {
  id: string;
}

// State
interface GalloGoalsState {
  galloGoals: FireStoreGalloGoalWithId[];
  galloGoalsIsLoading: boolean;
  galloGoalsError: string | null;
  lastUpdated: string | null;
}

const initialState: GalloGoalsState = {
  galloGoals: [],
  galloGoalsIsLoading: false,
  galloGoalsError: null,
  lastUpdated: null,
};

// Thunks
export const fetchAllGalloGoals = createAsyncThunk<
  FireStoreGalloGoalWithId[],
  { companyId: string },
  { rejectValue: string }
>("galloGoals/fetchAllGalloGoals", async ({ companyId }, { rejectWithValue }) => {
  try {
    const snapshot = await getDocs(query(collection(db, "galloGoals"), where("companyId", "==", companyId)));
    return snapshot.docs.map(docSnap => ({ ...docSnap.data() as FireStoreGalloGoalDocType, id: docSnap.id }));
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
  }
});

export const fetchUserGalloGoals = createAsyncThunk<
  FireStoreGalloGoalDocType[],
  { companyId: string; salesRouteNum?: string },
  { rejectValue: string }
>(  
  "galloGoals/fetchUserGalloGoals",
  async ({ companyId, salesRouteNum }, { rejectWithValue }) => {
    try {
      let userAccounts = await getUserAccountsFromIndexedDB();
      if (!userAccounts.length) {
        userAccounts = await fetchUsersAccounts(companyId, salesRouteNum);
        if (userAccounts.length) await addAccountsToIndexedDB(userAccounts);
        else return [];
      }

      const accountNumbers = userAccounts.map(a => a.accountNumber.toString());
      const snapshot = await getDocs(query(collection(db, "galloGoals"), where("companyId", "==", companyId)));

      return snapshot.docs
        .map(docSnap => docSnap.data() as FireStoreGalloGoalDocType)
        .filter(goal => goal.accounts.some(acc => accountNumbers.includes(acc.distributorAcctId.toString())));
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

// Slice
const galloGoalsSlice = createSlice({
  name: "galloGoals",
  initialState,
  reducers: {
    setGalloGoals(state, action) {
      state.galloGoals = action.payload;
    },
    addGalloGoal(state, action) {
      state.galloGoals.push(action.payload);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAllGalloGoals.pending, state => {
        state.galloGoalsIsLoading = true;
        state.galloGoalsError = null;
      })
      .addCase(fetchAllGalloGoals.fulfilled, (state, action) => {
        state.galloGoals = action.payload;
        state.galloGoalsIsLoading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchAllGalloGoals.rejected, (state, action) => {
        state.galloGoalsIsLoading = false;
        state.galloGoalsError = action.payload || "Failed to fetch Gallo goals.";
      });
  },
});

// Actions
export const { setGalloGoals, addGalloGoal } = galloGoalsSlice.actions;

// Selectors
export const selectAllGalloGoals = (state: RootState) => state.galloGoals.galloGoals;
export const selectGalloGoalsLoading = (state: RootState) => state.galloGoals.galloGoalsIsLoading;
export const selectGalloGoalsError = (state: RootState) => state.galloGoals.galloGoalsError;
export const selectGalloGoalsLastUpdated = (state: RootState) => state.galloGoals.lastUpdated;

// Filter by user's sales route
export const selectUsersGalloGoals = createSelector(
  [
    selectAllGalloGoals,
    (state: RootState, salesRouteNum?: string) => salesRouteNum || "",
  ],
  (galloGoals, salesRouteNum) =>
    galloGoals.filter(goal =>
      goal.accounts.some(account =>
        Array.isArray(account.salesRouteNums)
          ? account.salesRouteNums.includes(salesRouteNum)
          : account.salesRouteNums === salesRouteNum
      )
    )
);

export default galloGoalsSlice.reducer;
