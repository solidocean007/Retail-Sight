// goalsSlice
import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import { CompanyGoalType, CompanyGoalWithIdType, FireStoreGalloGoalDocType } from "../utils/types";
import {
  addAccountsToIndexedDB,
  clearGoalsFromIndexedDB,
  getUserAccountsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../utils/database/indexedDBUtils";
import { RootState } from "../utils/store";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "@firebase/firestore";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";

export interface FireStoreGalloGoalWithId extends FireStoreGalloGoalDocType {
  id: string; // Add the `id` field
}

interface GoalsState {
  galloGoals: FireStoreGalloGoalDocType[];
  companyGoals: CompanyGoalType[];
  galloGoalsIsLoading: boolean;
  companyGoalsIsLoading: boolean;
  galloGoalsError: string | null; // Separate error states
  companyGoalsError: string | null;
  lastUpdated: string | null;
}

const initialState: GoalsState = {
  galloGoals: [],
  companyGoals: [],
  galloGoalsIsLoading: false,
  companyGoalsIsLoading: false,
  galloGoalsError: null,
  companyGoalsError: null,
  lastUpdated: null,
};

export const fetchAllGalloGoals = createAsyncThunk<
  FireStoreGalloGoalWithId[], // Array of company goals with IDs
  { companyId: string },
  { rejectValue: string }
>("goals/fetchAllGalloGoals", async ({ companyId }, { rejectWithValue }) => {
  try {
    const goalsCollection = collection(db, "galloGoals");
    const goalsQuery = query(
      goalsCollection,
      where("companyId", "==", companyId),
    );
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
    return rejectWithValue(
      "An unknown error occurred while fetching company goals.",
    );
  }
});

export const fetchUserGalloGoals = createAsyncThunk<
  FireStoreGalloGoalDocType[], // Array of user-specific goals
  { companyId: string; salesRouteNum: string | undefined }, // Add salesRouteNum for fallback
  { rejectValue: string }
>(
  "goals/fetchUserGalloGoals",
  async ({ companyId, salesRouteNum }, { rejectWithValue }) => {
    try {
      // Step 1: Try to load user accounts from IndexedDB
      let userAccounts = await getUserAccountsFromIndexedDB();

      if (!userAccounts.length) {
        console.log(
          "No user accounts in IndexedDB. Fetching from Firestore...",
        );
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
      const accountNumbers = userAccounts.map((account) =>
        account.accountNumber.toString(),
      );

      if (!accountNumbers.length) {
        console.warn("User accounts are empty after processing.");
        return []; // Exit early if no account numbers
      }

      // Step 4: Query Firestore for goals
      const goalsCollection = collection(db, "galloGoals");
      const goalsQuery = query(
        goalsCollection,
        where("companyId", "==", companyId),
      );
      const goalsSnapshot = await getDocs(goalsQuery);

      const matchingGoals: FireStoreGalloGoalDocType[] = [];
      goalsSnapshot.forEach((doc) => {
        const goalDoc = doc.data() as FireStoreGalloGoalDocType;

        // Filter accounts in each goal to match user's accounts
        const matchingAccounts = goalDoc.accounts.filter((acc) =>
          accountNumbers.includes(acc.distributorAcctId.toString()),
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
  },
);

// Async thunk for fetching all company goals i think i can remove this
// export const fetchAllCompanyGoals = createAsyncThunk<
//   CompanyGoalType[], // Return type
//   { companyId: string }, // Input type
//   { rejectValue: string } // Reject value type
// >("goals/fetchAllCompanyGoals", async ({ companyId }, { rejectWithValue }) => {
//   try {
//     const goalsCollection = collection(db, "companyGoals");
//     const goalsQuery = query(
//       goalsCollection,
//       where("companyId", "==", companyId),
//     );
//     const goalsSnapshot = await getDocs(goalsQuery);

//     const allCompanyGoals: CompanyGoalType[] = [];
//     goalsSnapshot.forEach((doc) => {
//       const goalDoc = doc.data() as CompanyGoalType;
//       allCompanyGoals.push({ ...goalDoc, id: doc.id }); // Add `id` field
//     });

//     return allCompanyGoals; // Return all company goals for the company
//   } catch (err) {
//     console.error("Error fetching all company goals:", err);
//     if (err instanceof Error) {
//       return rejectWithValue(err.message);
//     }
//     return rejectWithValue(
//       "An unknown error occurred while fetching company goals.",
//     );
//   }
// });

export const updateCompanyGoalInFirestore = createAsyncThunk<
  void,
  { companyId: string; goalId: string; updatedFields: Partial<CompanyGoalType> },
  { rejectValue: string }
>(
  "goals/updateCompanyGoal",
  async ({ companyId, goalId, updatedFields }, { rejectWithValue }) => {
    try {
      const goalRef = doc(db, "companies", companyId, "goals", goalId);
      await updateDoc(goalRef, updatedFields);
    } catch (err) {
      return rejectWithValue("Unknown error occurred while updating the goal.");
    }
  }
);


const goalsSlice = createSlice({
  name: "goals",
  initialState,
  reducers: {
    setGalloGoals(state, action) {
      state.galloGoals = action.payload;
    },
    addGalloGoal(state, action) {
      state.galloGoals.push(action.payload);
    },
    // setCompanyGoals(state, action) {
    //   state.companyGoals = action.payload;
    // },
    // addCompanyGoal(state, action) {
    //   state.companyGoals.push(action.payload);
    // },
  },
  extraReducers: (builder) => {
    builder
      // Gallo Goals
      .addCase(fetchAllGalloGoals.pending, (state) => {
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
        state.galloGoalsError =
          action.payload || "Failed to fetch Gallo goals.";
      })

      // Company Goals addCase.. do i delete these?
      // .addCase(fetchAllCompanyGoals.pending, (state) => {
      //   state.companyGoalsIsLoading = true;
      //   state.companyGoalsError = null;
      // })
      // .addCase(fetchAllCompanyGoals.fulfilled, (state, action) => {
      //   state.companyGoals = action.payload;
      //   state.companyGoalsIsLoading = false;
      //   state.lastUpdated = new Date().toISOString();
      // })
      // .addCase(fetchAllCompanyGoals.rejected, (state, action) => {
      //   state.companyGoalsIsLoading = false;
      //   state.companyGoalsError =
      //     action.payload || "Failed to fetch Company goals.";
      // });
  },
});

// Actions
// export const { setGalloGoals, addGalloGoal, setCompanyGoals, addCompanyGoal } =
// export const { setGalloGoals, addGalloGoal } =
//   goalsSlice.actions;

// Selectors
// export const selectAllGalloGoals = (state: RootState) => state.goals.galloGoals;
// export const selectAllCompanyGoals = (state: RootState) =>
//   state.goals.companyGoals;
// export const selectGalloGoalsLoading = (state: RootState) =>
//   state.goals.galloGoalsIsLoading;
// export const selectCompanyGoalsIsLoading = (state: RootState) =>
//   state.goals.companyGoalsIsLoading;
// export const selectGalloGoalsError = (state: RootState) =>
//   state.goals.galloGoalsError;
// export const selectCompanyGoalsError = (state: RootState) =>
//   state.goals.companyGoalsError;
// export const selectLastUpdated = (state: RootState) => state.goals.lastUpdated;

// **New selectors for user-specific goals**
// export const selectUsersGalloGoals = createSelector(
//   [
//     selectAllGalloGoals,
//     (state: RootState, salesRouteNum: string | undefined) =>
//       salesRouteNum || "",
//   ],
//   (galloGoals, salesRouteNum) =>
//     galloGoals.filter((goal) =>
//       goal.accounts.some((account) =>
//         Array.isArray(account.salesRouteNums)
//           ? account.salesRouteNums.includes(salesRouteNum)
//           : account.salesRouteNums === salesRouteNum,
//       ),
//     ),
// );

// export const selectUsersCompanyGoals = createSelector(
//   [
//     (state: RootState) => state.company.company?.goals || [],
//     (state: RootState) => state.user.currentUser?.uid,
//     (_: RootState, salesRouteNum?: string) => salesRouteNum,
//   ],
//   (allGoals, userId, salesRouteNum) => {
//     if (!userId) return [];

//     return allGoals.filter((goal) => {
//       // Match by salesRouteNum on accountNumbersForThisGoal
//       return goal.accountNumbersForThisGoal.some((accountNum) =>
//         accountNum === salesRouteNum
//       );
//     });
//   }
// );


export default goalsSlice.reducer;
