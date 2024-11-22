import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import { GalloGoalType } from "../utils/types";
import { getUserAccountsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { RootState } from "../utils/store";
import { collection, getDocs, query, where } from "@firebase/firestore";

interface GoalsState {
  goals: GalloGoalType[];
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

export const fetchUserGalloGoals = createAsyncThunk<
  GalloGoalType[], // Return type when fulfilled
  void, // Argument type
  { rejectValue: string } // Rejected payload type
>(
  "goals/fetchUserGalloGoals",
  async (_, { rejectWithValue }) => {
    try {
      const accounts = await getUserAccountsFromIndexedDB();
      const accountNumbers = accounts.map((acc) => acc.accountNumber.toString());

      const goalsCollection = collection(db, "GalloGoals");
      const goalsSnapshot = await getDocs(goalsCollection);

      const matchingGoals: GalloGoalType[] = [];
      goalsSnapshot.forEach((doc) => {
        const goal = doc.data() as GalloGoalType;
        const matchingAccounts = goal.accounts.filter((acc) =>
          accountNumbers.includes(acc.distributorAcctId.toString())
        );

        if (matchingAccounts.length > 0) {
          matchingGoals.push({ ...goal, id: doc.id, accounts: matchingAccounts });
        }
      });

      return matchingGoals;
    } catch (err) {
      console.error("Error fetching user goals:", err);
      if (err instanceof Error) {
        return rejectWithValue(err.message);
      }
      return rejectWithValue("An unknown error occurred while fetching goals.");
    }
  }
);


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
        state.error = action.payload || "Failed to fetch user goals."; // `payload` is now explicitly a string
      });
  },
  
});

export const { setGoals, addGoal } = goalsSlice.actions;
export const selectGoals = (state: RootState) => state.goals.goals;
export const selectGoalsLoading = (state: RootState) => state.goals.loading;
export const selectLastUpdated = (state: RootState) => state.goals.lastUpdated;
export const selectGoalsError = (state: RootState) => state.goals.error;

export default goalsSlice.reducer;


