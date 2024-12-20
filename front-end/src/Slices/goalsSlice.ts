// goalsSlice
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import { FireStoreGalloGoalDocType, GalloGoalType } from "../utils/types";
import { addAccountsToIndexedDB, getUserAccountsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { RootState } from "../utils/store";
import { collection, getDocs, query, where } from "@firebase/firestore";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";

export interface FireStoreGalloGoalWithId extends FireStoreGalloGoalDocType {
  id: string; // Add the `id` field
}


interface GoalsState {
  goals: FireStoreGalloGoalDocType[];
  loading: boolean;
  currentAccountLoading: boolean;
  lastUpdated: string | null;
  error: string | null;
}

const initialState: GoalsState = {
  goals: [],
  loading: false,
  currentAccountLoading: false,
  lastUpdated: null,
  error: null,
};

export const fetchAllCompanyGoals = createAsyncThunk<
  FireStoreGalloGoalWithId[], // Array of company goals with IDs
  { companyId: string },
  { rejectValue: string }
>("goals/fetchAllCompanyGoals", async ({ companyId }, { rejectWithValue }) => {
  try {
    const goalsCollection = collection(db, "GalloGoals");
    const goalsQuery = query(goalsCollection, where("companyId", "==", companyId));
    const goalsSnapshot = await getDocs(goalsQuery);

    const allGoals: FireStoreGalloGoalWithId[] = [];
    goalsSnapshot.forEach((doc) => {
      const goalDoc = doc.data() as FireStoreGalloGoalDocType;
      allGoals.push({ ...goalDoc, id: doc.id }); // Include the `id` field
    });

    return allGoals; // Return all goals for the company
  } catch (err) {
    console.error("Error fetching all company goals:", err);
    if (err instanceof Error) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue("An unknown error occurred while fetching company goals.");
  }
});


export const fetchUserGalloGoals = createAsyncThunk<
  FireStoreGalloGoalDocType[], // Array of user-specific goals
  { companyId: string, salesRouteNum: string | undefined }, // Add salesRouteNum for fallback
  { rejectValue: string }
>("goals/fetchUserGalloGoals", async ({ companyId, salesRouteNum }, { rejectWithValue }) => {
  try {
    // Step 1: Try to load user accounts from IndexedDB
    let userAccounts = await getUserAccountsFromIndexedDB();

    if (!userAccounts.length) {
      console.log("No user accounts in IndexedDB. Fetching from Firestore...");
      // Step 2: Fallback to fetching accounts from Firestore
      userAccounts = await fetchUsersAccounts(companyId, salesRouteNum);

      if (userAccounts.length) {
        console.log("Fetched user accounts from Firestore:", userAccounts);
        // Save accounts to IndexedDB for future use
        await addAccountsToIndexedDB(userAccounts);
      } else {
        console.warn("No accounts found for the user in Firestore.");
        return []; // Exit early if no accounts
      }
    }

    console.log("Loaded user accounts:", userAccounts);

    // Step 3: Extract user account numbers
    const accountNumbers = userAccounts.map((account) => account.accountNumber.toString());

    if (!accountNumbers.length) {
      console.warn("User accounts are empty after processing.");
      return []; // Exit early if no account numbers
    }

    // Step 4: Query Firestore for goals
    const goalsCollection = collection(db, "GalloGoals");
    const goalsQuery = query(goalsCollection, where("companyId", "==", companyId));
    const goalsSnapshot = await getDocs(goalsQuery);

    const matchingGoals: FireStoreGalloGoalDocType[] = [];
    goalsSnapshot.forEach((doc) => {
      const goalDoc = doc.data() as FireStoreGalloGoalDocType;

      // Filter accounts in each goal to match user's accounts
      const matchingAccounts = goalDoc.accounts.filter((acc) =>
        accountNumbers.includes(acc.distributorAcctId.toString())
      );

      if (matchingAccounts.length > 0) {
        matchingGoals.push({
          ...goalDoc,
          accounts: matchingAccounts, // Include only matching accounts
        });
      }
    });

    return matchingGoals; // Return filtered goals
  } catch (err) {
    console.error("Error fetching user goals:", err);
    if (err instanceof Error) {
      return rejectWithValue(err.message);
    }
    return rejectWithValue("An unknown error occurred while fetching goals.");
  }
});


const goalsSlice = createSlice({
  name: "goals",
  initialState,
  reducers: {
    setGoals(state, action) {
      state.goals = action.payload;
    },
    addGoal(state, action) {
      state.goals.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserGalloGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserGalloGoals.fulfilled, (state, action) => {
        state.goals = action.payload;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchUserGalloGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch user goals.";
      })
      .addCase(fetchAllCompanyGoals.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllCompanyGoals.fulfilled, (state, action) => {
        state.goals = action.payload;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchAllCompanyGoals.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch all company goals.";
      });
  },
});

export const { setGoals, addGoal } = goalsSlice.actions;
export const selectGoals = (state: RootState) => state.goals.goals;
export const selectGoalsLoading = (state: RootState) => state.goals.loading;
export const selectLastUpdated = (state: RootState) => state.goals.lastUpdated;
export const selectGoalsError = (state: RootState) => state.goals.error;

export default goalsSlice.reducer;