import { createSelector, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { CompanyGoalWithIdType } from "../utils/types";

// Slice State
interface CompanyGoalsState {
  lastUpdated: string | null;
  goals: CompanyGoalWithIdType[];  // Add this line
}

const initialState: CompanyGoalsState = {
  lastUpdated: null,
  goals: [],  // Initialize it here
};

// Slice
const companyGoalsSlice = createSlice({
  name: "companyGoals",
  initialState,
  reducers: {
    setCompanyGoalsLastUpdated(state) {
      state.lastUpdated = new Date().toISOString();
    },
     setCompanyGoals(state, action) {
      state.goals = action.payload;
    },
  },
});

export const { setCompanyGoalsLastUpdated, setCompanyGoals } = companyGoalsSlice.actions;

export default companyGoalsSlice.reducer;

//
// Selectors
//

// Select all company goals from companySlice
export const selectAllCompanyGoals = (state: RootState): CompanyGoalWithIdType[] =>
  state.company.company?.goals || [];

// Optional: select when they were last updated
export const selectCompanyGoalsLastUpdated = (state: RootState) =>
  state.companyGoals.lastUpdated;

// Filtered goals for the logged-in user (by salesRouteNum)
export const selectUsersCompanyGoals = createSelector(
  [
    selectAllCompanyGoals,
    (state: RootState) => state.user.currentUser?.uid,
    (_: RootState, salesRouteNum?: string) => salesRouteNum,
  ],
  (allGoals, userId, salesRouteNum) => {
    if (!userId) return [];
    return allGoals.filter((goal) =>
      goal.accountNumbersForThisGoal.some((accountNum) => accountNum === salesRouteNum)
    );
  }
);


