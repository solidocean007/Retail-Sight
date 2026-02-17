import {
  createAsyncThunk,
  createSlice,
  createSelector,
  PayloadAction,
} from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { db } from "../utils/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { FireStoreGalloGoalDocType } from "../utils/types";
import {
  saveUserAccountsToIndexedDB,
  getUserAccountsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";
import { markGalloAccountAsSubmitted } from "../thunks/galloGoalsThunk";
import { getGoalTimingState } from "../components/GoalIntegration/utils/getGoalTimingState";

const toIso = (v: any) =>
  v?.toDate?.()
    ? v.toDate().toISOString()
    : v instanceof Date
      ? v.toISOString()
      : typeof v === "string"
        ? v
        : v;

const normalizeDeep = (val: any): any =>
  Array.isArray(val)
    ? val.map(normalizeDeep)
    : val && typeof val === "object"
      ? Object.fromEntries(
          Object.entries(val).map(([k, v]) => [k, normalizeDeep(v)]),
        )
      : toIso(val);

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
>(
  "galloGoals/fetchAllGalloGoals",
  async ({ companyId }, { rejectWithValue }) => {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "galloGoals"),
          where("companyId", "==", companyId),
        ),
      );
      return snapshot.docs.map((docSnap) => {
        const data = normalizeDeep(docSnap.data()) as FireStoreGalloGoalDocType;

        return {
          ...data,
          id: docSnap.id,
        };
      });
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  },
);

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
        if (userAccounts.length)
          await saveUserAccountsToIndexedDB(userAccounts);
        else return [];
      }

      const accountNumbers = userAccounts.map((a) =>
        a.accountNumber.toString(),
      );
      const snapshot = await getDocs(
        query(
          collection(db, "galloGoals"),
          where("companyId", "==", companyId),
        ),
      );

      return snapshot.docs
        .map(
          (docSnap) =>
            normalizeDeep(docSnap.data()) as FireStoreGalloGoalDocType,
        )
        .filter((goal) =>
          goal.accounts.some((acc) =>
            accountNumbers.includes(acc.distributorAcctId.toString()),
          ),
        );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  },
);

// Slice
const galloGoalsSlice = createSlice({
  name: "galloGoals",
  initialState,
  reducers: {
    setGalloGoals(state, action) {
      state.galloGoals = action.payload;
    },
    // addGalloGoal(state, action) {
    //   state.galloGoals.push(action.payload);
    // },
    addOrUpdateGalloGoal: (
      state,
      action: PayloadAction<FireStoreGalloGoalWithId>,
    ) => {
      const updatedGoal = action.payload;
      const index = state.galloGoals.findIndex(
        (goal) => goal.goalDetails.goalId === updatedGoal.goalDetails.goalId,
      );

      if (index !== -1) {
        // Replace existing goal
        state.galloGoals[index] = updatedGoal;
      } else {
        // Add as new goal
        state.galloGoals.push(updatedGoal);
      }
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(markGalloAccountAsSubmitted.fulfilled, (state, action) => {
        const updatedData = normalizeDeep(
          action.payload,
        ) as FireStoreGalloGoalWithId;
        state.galloGoals = state.galloGoals.map((goal) =>
          goal.goalDetails.goalId === updatedData.goalDetails.goalId
            ? { ...updatedData, id: goal.id }
            : goal,
        );
      })

      .addCase(markGalloAccountAsSubmitted.rejected, (state, action) => {
        console.error(
          "🚨 Failed to mark account as submitted:",
          action.payload,
        );
      });
  },
});

// Actions
// export const { setGalloGoals, addGalloGoal } = galloGoalsSlice.actions;
export const { setGalloGoals, addOrUpdateGalloGoal } = galloGoalsSlice.actions;

// Selectors
export const selectAllGalloGoals = (state: RootState) =>
  state.galloGoals.galloGoals;
export const selectGalloGoalsLoading = (state: RootState) =>
  state.galloGoals.galloGoalsIsLoading;
export const selectGalloGoalsError = (state: RootState) =>
  state.galloGoals.galloGoalsError;
export const selectGalloGoalsLastUpdated = (state: RootState) =>
  state.galloGoals.lastUpdated;

export const selectGoalsByTiming = createSelector(
  [selectAllGalloGoals],
  (goals) => {
    const now = Date.now();

    return {
      scheduled: goals.filter(
        (g) => getGoalTimingState(g, now) === "scheduled",
      ),
      upcoming: goals.filter((g) => getGoalTimingState(g, now) === "upcoming"),
      current: goals.filter((g) => getGoalTimingState(g, now) === "current"),
      archived: goals.filter((g) => getGoalTimingState(g, now) === "archived"),
    };
  },
);

export const selectUpcomingGalloGoals = createSelector(
  [selectAllGalloGoals, (_: RootState, companyId: string) => companyId],
  (goals, companyId) => {
    const now = Date.now();

    return goals.filter(
      (g) =>
        g.companyId === companyId && getGoalTimingState(g, now) === "upcoming",
    );
  },
);

export const selectUsersGalloGoals = createSelector(
  [
    selectAllGalloGoals,
    (state: RootState, salesRouteNum?: string) => salesRouteNum,
  ],
  (galloGoals, salesRouteNum) => {
    if (!salesRouteNum) return [];

    const normalizedUserRoute = salesRouteNum.toString().trim();

    return galloGoals.filter((goal) =>
      goal.accounts.some((account) =>
        account.salesRouteNums
          ?.map((r) => r?.toString().trim())
          .includes(normalizedUserRoute),
      ),
    );
  },
);

export const selectUsersGoalsByTiming = createSelector(
  [
    selectAllGalloGoals,
    (_: RootState, salesRouteNum?: string) => salesRouteNum || "",
  ],
  (goals, salesRouteNum) => {
    const now = Date.now();

    const userGoals = goals.filter((goal) =>
      goal.accounts.some((account) =>
        Array.isArray(account.salesRouteNums)
          ? account.salesRouteNums.includes(salesRouteNum)
          : account.salesRouteNums === salesRouteNum,
      ),
    );

    return {
      scheduled: userGoals.filter(
        (g) => getGoalTimingState(g, now) === "scheduled",
      ),
      upcoming: userGoals.filter(
        (g) => getGoalTimingState(g, now) === "upcoming",
      ),
      current: userGoals.filter(
        (g) => getGoalTimingState(g, now) === "current",
      ),
      archived: userGoals.filter(
        (g) => getGoalTimingState(g, now) === "archived",
      ),
    };
  },
);

export const selectActiveGalloGoals = createSelector(
  [selectAllGalloGoals],
  (goals) => {
    const now = Date.now();

    return goals.filter(
      (g) =>
        g.lifeCycleStatus === "active" &&
        getGoalTimingState(g, now) === "current",
    );
  },
);

export const selectUsersActiveGalloGoals = createSelector(
  // probably should use this selector instead
  [
    selectAllGalloGoals,
    (_: RootState, salesRouteNum?: string) => salesRouteNum || "",
  ],
  (goals, salesRouteNum) =>
    goals.filter(
      (goal) =>
        goal.lifeCycleStatus === "active" &&
        getGoalTimingState(goal) === "current" &&
        goal.accounts.some((account) =>
          Array.isArray(account.salesRouteNums)
            ? account.salesRouteNums.includes(salesRouteNum)
            : account.salesRouteNums === salesRouteNum,
        ),
    ),
);

export default galloGoalsSlice.reducer;
